(ns hawk-eye.core
  "Simple file watching library for Clojure.
   Provides directory watching with debouncing support."
  (:import [java.nio.file FileSystems Files Paths StandardWatchEventKinds WatchService WatchKey WatchEvent]
           [java.nio.file LinkOption]
           [java.util.concurrent TimeUnit]))

(set! *warn-on-reflection* true)

(defn debounce
  "Returns a debounced version of the given function.
   The function will only be called after no new calls have been made for the specified delay.
   
   Options:
   - :events - How to handle multiple calls during the delay period:
     - :last (default) - Only pass the last set of arguments
     - :all - Pass a vector of all argument sets
     - :first - Only pass the first set of arguments
     - :unique - Pass a vector of unique argument sets (by =)
   
   Examples:
   (def f-last (debounce println 100))                          ; prints last value
   (def f-all (debounce println 100 :events :all))             ; prints vector of all values
   (def f-first (debounce println 100 :events :first))         ; prints first value
   (def f-unique (debounce println 100 :events :unique))       ; prints vector of unique values"
  [f delay-ms & {:keys [events] :or {events :last}}]
  (let [last-call-time (atom 0)
        pending (atom nil)
        delay-ms (long delay-ms)
        ;; Determine collection strategy
        [init-val collect-fn call-fn reset-fn]
        (case events
          :last [nil
                 (fn [_ args] args)
                 (fn [f args] (apply f args))
                 (fn [] nil)]
          :first [nil
                  (fn [current args] (or current args))
                  (fn [f args] (apply f args))
                  (fn [] nil)]
          :all [[]
                (fn [coll args] (conj coll args))
                (fn [f coll] (f coll))
                (fn [] [])]
          :unique [[]
                   (fn [coll args]
                     (if (some #(= % args) coll)
                       coll
                       (conj coll args)))
                   (fn [f coll] (f coll))
                   (fn [] [])])
        collected-args (atom init-val)]
    (fn [& args]
      (reset! last-call-time (System/currentTimeMillis))
      (swap! collected-args collect-fn args)

      (when (compare-and-set! pending nil true)
        (future
          (loop []
            (Thread/sleep delay-ms)
            (let [time-since-last (- (System/currentTimeMillis) @last-call-time)]
              (if (>= time-since-last delay-ms)
                (do
                  (reset! pending nil)
                  (call-fn f @collected-args)
                  (reset! collected-args (reset-fn)))
                (recur)))))))))

(defn find-all-directories
  "Recursively find all directories under the given path.
   Returns a sequence of absolute path strings including the root."
  [^String path]
  (let [root-path (Paths/get path (make-array String 0))]
    (if (Files/isDirectory root-path (make-array LinkOption 0))
      (cons path
            (->> (Files/walk root-path (make-array java.nio.file.FileVisitOption 0))
                 .iterator
                 iterator-seq
                 (filter #(Files/isDirectory % (make-array LinkOption 0)))
                 (map str)
                 (remove #(= % path))))
      [])))

(defn- register-directories
  "Register directories with the watch service. Returns a map of path->WatchKey."
  [^WatchService watcher directories]
  (reduce (fn [keys dir-path]
            (let [path (Paths/get dir-path (make-array String 0))]
              (if (Files/exists path (make-array LinkOption 0))
                (let [key (.register path watcher
                                     (into-array [StandardWatchEventKinds/ENTRY_CREATE
                                                  StandardWatchEventKinds/ENTRY_MODIFY
                                                  StandardWatchEventKinds/ENTRY_DELETE]))]
                  (assoc keys dir-path key))
                keys)))
          {}
          directories))

(defn- watch-loop
  "Main watch loop that polls for events and notifies."
  [^WatchService watcher watching? notify-fn error-fn watch-keys]
  (try
    (while @watching?
      (try
        (when-let [^WatchKey key (.take watcher)]
          (let [events (.pollEvents key)]
            ;; Only notify if still watching
            (when @watching?
              (doseq [^WatchEvent event events]
                (let [kind (.kind event)
                      filename (str (.context event))
                      watch-path (str (.watchable key))
                      full-path (str watch-path "/" filename)
                      event-type (case (.name kind)
                                   "ENTRY_CREATE" :create
                                   "ENTRY_MODIFY" :modify
                                   "ENTRY_DELETE" :delete
                                   :unknown)]
                  (try
                    ;; Check if it's a directory for create/delete events
                    (when (contains? #{:create :delete} event-type)
                      (let [path (Paths/get full-path (make-array String 0))]
                        (cond
                          ;; New directory created
                          (and (= event-type :create)
                               (Files/isDirectory path (make-array LinkOption 0)))
                          (let [new-key (.register path watcher
                                                   (into-array [StandardWatchEventKinds/ENTRY_CREATE
                                                                StandardWatchEventKinds/ENTRY_MODIFY
                                                                StandardWatchEventKinds/ENTRY_DELETE]))]
                            (swap! watch-keys assoc full-path new-key))

                          ;; Directory deleted
                          (= event-type :delete)
                          (when-let [old-key (get @watch-keys full-path)]
                            (.cancel ^WatchKey old-key)
                            (swap! watch-keys dissoc full-path)))))

                    ;; Always notify about the event
                    (notify-fn {:type event-type
                                :file filename
                                :path full-path
                                :timestamp (System/currentTimeMillis)})
                    (catch Exception e
                      (error-fn e {:file filename :path watch-path})))))))
          (.reset key))
        (catch InterruptedException _
          ;; Thread interrupted, exit gracefully
          nil)
        (catch java.nio.file.ClosedWatchServiceException _
          ;; Watcher closed, exit gracefully
          nil)))
    (catch Exception e
      (when @watching?
        (error-fn e {:phase :watch-loop})))))

(defn- virtual-threads-available?
  "Check if virtual threads are available (Java 21+)."
  []
  (try
    (let [version (System/getProperty "java.version")
          ;; Parse major version - handles both "21" and "1.8.0_345" formats
          major (if (.startsWith version "1.")
                  (Integer/parseInt (second (clojure.string/split version #"\.")))
                  (Integer/parseInt (first (clojure.string/split version #"[\._]"))))]
      (>= major 21))
    (catch Exception _
      false)))

(defn- watch-loop-poll
  "Main watch loop that polls for events - polls all keys then sleeps."
  [^WatchService watcher watching? notify-fn error-fn watch-keys poll-ms]
  (try
    (loop []
      (when @watching?
        ;; Poll ALL available events without blocking
        (loop [found-events? false]
          (if-let [^WatchKey key (.poll watcher)]
            (do
              (let [events (.pollEvents key)]
                (doseq [^WatchEvent event events]
                  (let [kind (.kind event)
                        filename (str (.context event))
                        watch-path (str (.watchable key))
                        full-path (str watch-path "/" filename)
                        event-type (case (.name kind)
                                     "ENTRY_CREATE" :create
                                     "ENTRY_MODIFY" :modify
                                     "ENTRY_DELETE" :delete
                                     :unknown)]
                    (try
                      ;; Check if it's a directory for create/delete events
                      (when (contains? #{:create :delete} event-type)
                        (let [path (Paths/get full-path (make-array String 0))]
                          (cond
                            ;; New directory created
                            (and (= event-type :create)
                                 (Files/isDirectory path (make-array LinkOption 0)))
                            (let [new-key (.register path watcher
                                                     (into-array [StandardWatchEventKinds/ENTRY_CREATE
                                                                  StandardWatchEventKinds/ENTRY_MODIFY
                                                                  StandardWatchEventKinds/ENTRY_DELETE]))]
                              (swap! watch-keys assoc full-path new-key))

                            ;; Directory deleted
                            (= event-type :delete)
                            (when-let [old-key (get @watch-keys full-path)]
                              (.cancel ^WatchKey old-key)
                              (swap! watch-keys dissoc full-path)))))

                      ;; Always notify about the event
                      (notify-fn {:type event-type
                                  :file filename
                                  :path full-path
                                  :timestamp (System/currentTimeMillis)})
                      (catch Exception e
                        (error-fn e {:file filename :path watch-path}))))))
              (.reset key)
              (recur true))
            ;; No more events available, sleep if we didn't find any
            (when-not found-events?
              (Thread/sleep (long poll-ms)))))
        (recur)))
    (catch Exception e
      (when @watching?
        (error-fn e {:phase :watch-loop})))))

(defn watch
  "Watch directories for changes and call notify-fn with event maps.
   
   Arguments:
   - paths: Collection of directory paths to watch
   - notify-fn: Function called with {:type :create/:modify/:delete, :file \"filename\", :path \"full/path\", :timestamp ms}
   - error-fn: Function called with exception and context map when errors occur
   
   Options (optional 4th argument map):
   - :recursive - Watch subdirectories (default: true)
   
   Returns a zero-argument function that stops the watcher when called.
   Automatically registers new subdirectories as they are created.
   
   Example:
   (def stop (watch [\"src\" \"resources\"]
                   (fn [event] (println (:type event) (:file event)))
                   (fn [e ctx] (println \"Error:\" e))))
   (stop)"
  ([paths notify-fn error-fn]
   (watch paths notify-fn error-fn {}))
  ([paths notify-fn error-fn {:keys [recursive mode poll-ms]
                              :or {recursive true mode :auto poll-ms 10}}]
   (let [;; Expand paths recursively if requested
         directories (if recursive
                       (mapcat find-all-directories paths)
                       paths)
         ^WatchService watcher (.newWatchService (FileSystems/getDefault))
         watching? (atom true)
         watch-keys (atom {})
         watcher-thread (atom nil)
         ;; Determine actual mode
         actual-mode (case mode
                       :auto (if (virtual-threads-available?) :vthread :poll)
                       mode)]

     ;; Register directories
     (try
       (reset! watch-keys (register-directories watcher directories))
       (catch Exception e
         (error-fn e {:phase :registration :directories directories})))

     ;; Start watcher thread
     (case actual-mode
       :vthread
       (reset! watcher-thread
               (Thread/startVirtualThread
                (fn [] (watch-loop watcher watching? notify-fn error-fn watch-keys))))

       :poll
       (reset! watcher-thread
               (future (watch-loop-poll watcher watching? notify-fn error-fn watch-keys poll-ms))))

     ;; Return stop function with metadata about mode used
     (with-meta
       (fn []
         (reset! watching? false)
         ;; Close the watcher first to unblock any .take() calls
         (try
           (.close watcher)
           (catch Exception e
             (error-fn e {:phase :shutdown})))
         ;; Then interrupt the thread if needed
         (when-let [thread @watcher-thread]
           (if (instance? Thread thread)
             (do
               (.interrupt ^Thread thread)
               ;; Wait for thread to finish
               (try
                 (.join ^Thread thread 1000)
                 (catch Exception _)))
             (future-cancel thread))))
       {:hawk-eye/mode actual-mode}))))
