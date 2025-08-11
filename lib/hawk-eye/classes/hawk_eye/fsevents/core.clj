(ns hawk-eye.fsevents.core
  "JNA-based FSEvents monitor for macOS.
   
   A lightweight file system events monitor using JNA to interface with
   macOS's FSEvents API. Monitors directories for file changes including
   creation, modification, deletion, and renaming."
  (:import [com.sun.jna Native Function Pointer Memory]
           [java.nio.file Paths]))

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
    (callback [_ streamRef clientCallBackInfo numEvents eventPaths eventFlags eventIds]
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
  "Start watching a directory for file system events.
   
   Parameters:
   - path: Directory path to watch (string)
   - handler: Function called with event maps containing:
     - :path - The file path that changed
     - :event-id - Unique event identifier
     - :flags - Raw event flags
     - :flag-names - Set of keywords (:created, :modified, :removed, etc.)
   
   Returns a monitor object that should be passed to `stop` to cease monitoring."
  [path handler]
  (let [;; Create CFString for path
        cf-path (.invoke CFStringCreateWithCString
                         Pointer
                         (to-array [kCFAllocatorDefault path (long kCFStringEncodingUTF8)]))]

    (when (nil? cf-path)
      (throw (Exception. "Failed to create CFString")))

    (let [;; Create CFArray with single path
          paths-array (doto (Memory. (Native/POINTER_SIZE))
                        (.setPointer 0 cf-path))
          cf-paths (.invoke CFArrayCreate
                            Pointer
                            (to-array [kCFAllocatorDefault paths-array 1 nil]))]

      (when (nil? cf-paths)
        (.invoke CFRelease Void/TYPE (to-array [cf-path]))
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
          (.invoke CFRelease Void/TYPE (to-array [cf-path]))
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
               :cf-path cf-path
               :cf-paths cf-paths
               :callback callback
               :thread (Thread/currentThread)}

              (do
                (.invoke FSEventStreamRelease Void/TYPE (to-array [stream]))
                (.invoke CFRelease Void/TYPE (to-array [cf-paths]))
                (.invoke CFRelease Void/TYPE (to-array [cf-path]))
                (throw (Exception. "Failed to start FSEventStream"))))))))))

(defn stop
  "Stop watching a directory.
   
   Parameters:
   - monitor: The monitor object returned by `watch`"
  [monitor]
  (when monitor
    (.invoke FSEventStreamStop Void/TYPE (to-array [(:stream monitor)]))
    (.invoke FSEventStreamInvalidate Void/TYPE (to-array [(:stream monitor)]))
    (.invoke FSEventStreamRelease Void/TYPE (to-array [(:stream monitor)]))
    (.invoke CFRelease Void/TYPE (to-array [(:cf-paths monitor)]))
    (.invoke CFRelease Void/TYPE (to-array [(:cf-path monitor)]))
    (.invoke CFRunLoopStop Void/TYPE (to-array [(:run-loop monitor)]))))

(defn run-loop
  "Run the event loop for a monitor. Blocks until the monitor is stopped.
   
   Parameters:
   - monitor: The monitor object returned by `watch`"
  [monitor]
  (.invoke CFRunLoopRun Void/TYPE (to-array [])))

(defn watch-async
  "Start watching a directory in a background thread.
   
   Same as `watch` but runs the event loop in a separate thread,
   returning immediately.
   
   Parameters:
   - path: Directory path to watch
   - handler: Event handler function
   
   Returns a monitor object that should be passed to `stop`."
  [path handler]
  (let [monitor-promise (promise)]
    (future
      (try
        (let [monitor (watch path handler)]
          (deliver monitor-promise monitor)
          (run-loop monitor))
        (catch Exception e
          (deliver monitor-promise e))))
    (let [result @monitor-promise]
      (if (instance? Exception result)
        (throw result)
        result))))