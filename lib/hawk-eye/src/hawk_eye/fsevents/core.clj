(ns hawk-eye.fsevents.core
  "JNA-based FSEvents monitor for macOS.
   
   A lightweight file system events monitor using JNA to interface with
   macOS's FSEvents API. Monitors directories for file changes including
   creation, modification, deletion, and renaming."
  (:import [com.sun.jna Native Pointer Memory]))

;; Load native libraries
(def ^:private cf-lib (com.sun.jna.NativeLibrary/getInstance "CoreFoundation"))
(def ^:private cs-lib (com.sun.jna.NativeLibrary/getInstance "CoreServices"))

;; Constants
(def ^:private kCFAllocatorDefault nil)
(def ^:private kCFStringEncodingUTF8 0x08000100)
(def ^:private kFSEventStreamEventIdSinceNow -1)
(def ^:private kFSEventStreamCreateFlagFileEvents 0x10)

;; Event flags
(def event-flags
  "FSEvents flag constants mapped to keywords"
  {:created 0x100
   :removed 0x200
   :modified 0x1000
   :renamed 0x800
   :is-file 0x10000
   :is-dir 0x20000})

;; Native functions
(def ^:private CFStringCreateWithCString
  (.getFunction cf-lib "CFStringCreateWithCString"))
(def ^:private CFArrayCreate
  (.getFunction cf-lib "CFArrayCreate"))
(def ^:private CFRelease
  (.getFunction cf-lib "CFRelease"))
(def ^:private FSEventStreamCreate
  (.getFunction cs-lib "FSEventStreamCreate"))
(def ^:private FSEventStreamStart
  (.getFunction cs-lib "FSEventStreamStart"))
(def ^:private FSEventStreamStop
  (.getFunction cs-lib "FSEventStreamStop"))
(def ^:private FSEventStreamInvalidate
  (.getFunction cs-lib "FSEventStreamInvalidate"))
(def ^:private FSEventStreamRelease
  (.getFunction cs-lib "FSEventStreamRelease"))
(def ^:private FSEventStreamScheduleWithRunLoop
  (.getFunction cs-lib "FSEventStreamScheduleWithRunLoop"))
(def ^:private CFRunLoopGetCurrent
  (.getFunction cf-lib "CFRunLoopGetCurrent"))
(def ^:private CFRunLoopRun
  (.getFunction cf-lib "CFRunLoopRun"))
(def ^:private CFRunLoopStop
  (.getFunction cf-lib "CFRunLoopStop"))

(def ^:private kCFRunLoopDefaultMode
  (let [sym (.getGlobalVariableAddress cf-lib "kCFRunLoopDefaultMode")]
    (.getPointer sym 0)))

(defn- decode-flags
  "Convert FSEvents flag bits to a set of keywords"
  [flags]
  (reduce-kv (fn [acc k v]
               (if (pos? (bit-and flags v))
                 (conj acc k)
                 acc))
             #{}
             event-flags))

(defn- create-callback
  "Create a JNA callback for FSEvents"
  [handler]
  (reify hawk_eye.fsevents.FSEventCallback
    (callback [_ _ _ numEvents eventPaths eventFlags eventIds]
      (let [paths-ptr eventPaths]
        (dotimes [i (int numEvents)]
          (let [path-ptr (.getPointer paths-ptr (* i (Native/POINTER_SIZE)))
                path (.getString path-ptr 0)
                flag (.getInt eventFlags (* i 4))
                event-id (.getLong eventIds (* i 8))]
            (handler {:path path
                      :event-id event-id
                      :flags flag
                      :flag-names (decode-flags flag)})))))))

(defn watch
  "Start watching directories for file system events.
   
   Parameters:
   - paths: Collection of directory paths to watch (strings)
   - handler: Function called with event maps containing:
     - :path - The file path that changed
     - :event-id - Unique event identifier
     - :flags - Raw event flags
     - :flag-names - Set of keywords (:created, :modified, :removed, etc.)
   
   Returns a monitor object that should be passed to `stop` to cease monitoring."
  [paths handler]
  ;; Check for empty paths
  (when (empty? paths)
    (throw (IllegalArgumentException. "No paths provided to watch")))

  (let [;; Create CFStrings for all paths
        cf-paths-vec (mapv (fn [path]
                             (let [cf-str (.invoke CFStringCreateWithCString
                                                   Pointer
                                                   (to-array [kCFAllocatorDefault path (long kCFStringEncodingUTF8)]))]
                               (when (nil? cf-str)
                                 (throw (Exception. (str "Failed to create CFString for path: " path))))
                               cf-str))
                           paths)

        ;; Create array of path pointers
        paths-array (doto (Memory. (* (count cf-paths-vec) Native/POINTER_SIZE))
                      (as-> mem
                            (doseq [[idx cf-path] (map-indexed vector cf-paths-vec)]
                              (.setPointer mem (* idx Native/POINTER_SIZE) cf-path))))

        ;; Create CFArray with all paths
        cf-paths (.invoke CFArrayCreate
                          Pointer
                          (to-array [kCFAllocatorDefault paths-array (count cf-paths-vec) nil]))]

    (when (nil? cf-paths)
      (doseq [cf-path cf-paths-vec]
        (.invoke CFRelease Void/TYPE (to-array [cf-path])))
      (throw (Exception. "Failed to create CFArray")))

    (let [;; Create callback and event stream
          callback (create-callback handler)
          stream (.invoke FSEventStreamCreate
                          Pointer
                          (to-array [kCFAllocatorDefault
                                     callback
                                     nil
                                     cf-paths
                                     (long kFSEventStreamEventIdSinceNow)
                                     (double 0.0)
                                     (int kFSEventStreamCreateFlagFileEvents)]))]

      (when (nil? stream)
        (.invoke CFRelease Void/TYPE (to-array [cf-paths]))
        (doseq [cf-path cf-paths-vec]
          (.invoke CFRelease Void/TYPE (to-array [cf-path])))
        (throw (Exception. "Failed to create FSEventStream")))

      (let [run-loop (.invoke CFRunLoopGetCurrent Pointer (to-array []))]

        ;; Schedule the stream
        (.invoke FSEventStreamScheduleWithRunLoop
                 Void/TYPE
                 (to-array [stream run-loop kCFRunLoopDefaultMode]))

        ;; Start the stream
        (let [started (.invoke FSEventStreamStart Boolean (to-array [stream]))]
          (if started
            {:stream stream
             :run-loop run-loop
             :cf-paths-vec cf-paths-vec
             :cf-paths cf-paths
             :callback callback
             :thread (Thread/currentThread)}

            (do
              (.invoke FSEventStreamRelease Void/TYPE (to-array [stream]))
              (.invoke CFRelease Void/TYPE (to-array [cf-paths]))
              (doseq [cf-path cf-paths-vec]
                (.invoke CFRelease Void/TYPE (to-array [cf-path])))
              (throw (Exception. "Failed to start FSEventStream")))))))))

(defn stop
  "Stop watching directories.
   
   Parameters:
   - monitor: The monitor object returned by `watch`"
  [monitor]
  (when monitor
    ;; Check if already stopped by looking at the stream
    (when-let [stream (:stream monitor)]
      (try
        (.invoke FSEventStreamStop Void/TYPE (to-array [stream]))
        (.invoke FSEventStreamInvalidate Void/TYPE (to-array [stream]))
        (.invoke FSEventStreamRelease Void/TYPE (to-array [stream]))
        (catch Exception e
          ;; Ignore errors - might already be stopped
          nil))

      ;; Release other resources
      (when-let [cf-paths (:cf-paths monitor)]
        (try
          (.invoke CFRelease Void/TYPE (to-array [cf-paths]))
          (catch Exception e nil)))

      (when-let [cf-paths-vec (:cf-paths-vec monitor)]
        (doseq [cf-path cf-paths-vec]
          (try
            (.invoke CFRelease Void/TYPE (to-array [cf-path]))
            (catch Exception e nil))))

      (when-let [run-loop (:run-loop monitor)]
        (try
          (.invoke CFRunLoopStop Void/TYPE (to-array [run-loop]))
          (catch Exception e nil))))))

(defn run-loop
  "Run the event loop for a monitor. Blocks until the monitor is stopped.
   
   Parameters:
   - monitor: The monitor object returned by `watch`"
  [_]
  (.invoke CFRunLoopRun Void/TYPE (to-array [])))

(defn watch-async
  "Start watching directories in a background thread.
   
   Same as `watch` but runs the event loop in a separate thread,
   returning immediately.
   
   Parameters:
   - paths: Collection of directory paths to watch
   - handler: Event handler function
   
   Returns a monitor object that should be passed to `stop`."
  [paths handler]
  (let [monitor-promise (promise)]
    (future
      (try
        (let [monitor (watch paths handler)]
          (deliver monitor-promise monitor)
          (run-loop monitor))
        (catch Exception e
          (deliver monitor-promise e))))
    (let [result @monitor-promise]
      (if (instance? Exception result)
        (throw result)
        result))))