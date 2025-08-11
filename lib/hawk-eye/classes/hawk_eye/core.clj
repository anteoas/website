(ns hawk-eye.core
  "Simple file watching library for Clojure.
   Provides directory watching with debouncing support."
  (:require [clojure.string :as str]
            [clojure.java.io :as io])
  (:import [java.nio.file FileSystems Files Paths StandardWatchEventKinds WatchService WatchKey WatchEvent]
           [java.nio.file LinkOption]))

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

(defn- find-all-directories
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

;; Protocol for different watch implementations
(defprotocol WatchStrategy
  (start-watching [this directories notify-fn error-fn watch-keys])
  (stop-watching [this]))

;; Common WatchService functions
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

(defn- process-watch-event
  "Process a single watch event - shared logic for all WatchService implementations."
  [^WatchEvent event ^WatchKey key ^WatchService watcher watch-keys notify-fn error-fn]
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
        (error-fn e {:file filename :path watch-path})))))

(defn- process-watch-key
  "Process all events from a watch key."
  [^WatchKey key ^WatchService watcher watch-keys notify-fn error-fn]
  (let [events (.pollEvents key)]
    (doseq [^WatchEvent event events]
      (process-watch-event event key watcher watch-keys notify-fn error-fn)))
  (.reset key))

;; Virtual threads implementation
(defrecord VirtualThreadWatcher [^WatchService watcher thread watching?]
  WatchStrategy
  (start-watching [_ directories notify-fn error-fn watch-keys]
    (reset! watch-keys (register-directories watcher directories))
    (reset! thread
            (Thread/startVirtualThread
             (fn []
               (try
                 (while @watching?
                   (try
                     (when-let [^WatchKey key (.take watcher)]
                       (when @watching? ; Only process if still watching
                         (process-watch-key key watcher watch-keys notify-fn error-fn)))
                     (catch InterruptedException _
                       ;; Thread interrupted, exit gracefully
                       nil)
                     (catch java.nio.file.ClosedWatchServiceException _
                       ;; Watcher closed, exit gracefully
                       nil)))
                 (catch Exception e
                   (when @watching?
                     (error-fn e {:phase :watch-loop}))))))))

  (stop-watching [_]
    (reset! watching? false)
    ;; Close the watcher first to unblock any .take() calls
    (try
      (.close watcher)
      (catch Exception e
        nil))
    ;; Then interrupt the thread if needed
    (when-let [t @thread]
      (.interrupt ^Thread t)
      ;; Wait for thread to finish
      (try
        (.join ^Thread t 1000)
        (catch Exception _)))))

;; Polling implementation
(defrecord PollingWatcher [^WatchService watcher thread watching? poll-ms]
  WatchStrategy
  (start-watching [_ directories notify-fn error-fn watch-keys]
    (reset! watch-keys (register-directories watcher directories))
    (reset! thread
            (future
              (try
                (while @watching?
                  ;; Poll ALL available events without blocking
                  (loop [found-events? false]
                    (if-let [^WatchKey key (.poll watcher)]
                      (do
                        (process-watch-key key watcher watch-keys notify-fn error-fn)
                        (recur true))
                      ;; No more events available, sleep if we didn't find any
                      (when-not found-events?
                        (Thread/sleep (long poll-ms))))))
                (catch Exception e
                  (when @watching?
                    (error-fn e {:phase :watch-loop})))))))

  (stop-watching [_]
    (reset! watching? false)
    ;; Close the watcher first
    (try
      (.close watcher)
      (catch Exception e
        nil))
    ;; Then cancel the future
    (when-let [f @thread]
      (future-cancel f))))

;; FSEvents implementation (stub for now)
(defrecord FSEventsWatcher [watcher watching?]
  WatchStrategy
  (start-watching [_ directories notify-fn error-fn watch-keys]
    ;; TODO: Implement using fsevents-jna
    (throw (UnsupportedOperationException. "FSEvents support not yet implemented")))

  (stop-watching [_]
    ;; TODO: Stop FSEvents watcher
    (reset! watching? false)))

;; Helper functions
(defn- virtual-threads-available?
  "Check if virtual threads are available (Java 21+)."
  []
  (try
    (let [version (System/getProperty "java.version")]
      (if (.startsWith version "1.")
        false ; Old version format (1.8.0, etc.) - definitely < 21
        (let [major (Integer/parseInt (first (str/split version #"[\._]")))]
          (>= major 21))))
    (catch Exception _
      false)))

(defn- fsevents-available?
  "Check if FSEvents is available (macOS only)."
  []
  (= "Mac OS X" (System/getProperty "os.name")))

;; Factory function
(defn- create-watcher [mode opts]
  (case mode
    :vthread (->VirtualThreadWatcher (.newWatchService (FileSystems/getDefault))
                                     (atom nil) (atom true))
    :poll (->PollingWatcher (.newWatchService (FileSystems/getDefault))
                            (atom nil) (atom true) (:poll-ms opts 10))
    :fsevents (->FSEventsWatcher nil (atom true))
    :auto (cond
            (and (= "Mac OS X" (System/getProperty "os.name"))
                 (fsevents-available?)) (create-watcher :fsevents opts)
            (virtual-threads-available?) (create-watcher :vthread opts)
            :else (create-watcher :poll opts))))

(defn watch
  "Watch directories for changes and call notify-fn with event maps.
   
   Arguments:
   - paths: Collection of directory paths to watch (recursively)
   - notify-fn: Function called with {:type :create/:modify/:delete, :file \"filename\", :path \"full/path\", :timestamp ms}
   - error-fn: Function called with exception and context map when errors occur
   
   Options (optional 4th argument map):
   - :mode - :auto (default), :vthread, :poll, or :fsevents
   - :poll-ms - Polling interval in milliseconds (default: 10)
   
   Returns a zero-argument function that stops the watcher when called.
   Automatically registers new subdirectories as they are created.
   
   Example:
   (def stop (watch [\"src\" \"resources\"]
                   (fn [event] (println (:type event) (:file event)))
                   (fn [e ctx] (println \"Error:\" e))))
   (stop)"
  ([paths notify-fn error-fn]
   (watch paths notify-fn error-fn {}))
  ([paths notify-fn error-fn {:keys [mode] :or {mode :auto} :as opts}]
   (let [;; Always expand paths recursively
         directories (mapcat find-all-directories paths)
         watch-keys (atom {})
         watcher (create-watcher mode opts)]

     ;; Start watching
     (try
       (start-watching watcher directories notify-fn error-fn watch-keys)
       (catch Exception e
         (error-fn e {:phase :registration :directories directories})))

     ;; Return stop function with metadata about mode used
     (with-meta
       (fn [] (stop-watching watcher))
       {:hawk-eye/mode mode}))))