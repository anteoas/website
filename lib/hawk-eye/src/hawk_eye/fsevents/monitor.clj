(ns hawk-eye.fsevents.monitor
  "FSEvents integration for hawk-eye."
  (:require [hawk-eye.fsevents.core :as fs]
            [clojure.java.io :as io])
  (:import [java.io File]))

(defn- normalize-event
  "Convert FSEvents event to hawk-eye format.
   Uses known-files atom to track whether files existed before."
  [event known-files]
  (let [path (:path event)
        file (io/file path)
        flags (:flag-names event)
        file-path (.getAbsolutePath file)]
    ;; Skip directory events - only process files
    (when (or (.isFile file)
              ;; For delete events, we can't check if it's a file, so check flags
              (and (contains? flags :removed)
                   (contains? flags :is-file)))
      ;; Determine the event type
      (let [event-type (cond
                         ;; Removed is always delete
                         (contains? flags :removed) :delete

                         ;; For modified/created flags, check if we've seen this file before
                         (contains? flags :modified)
                         (if (contains? @known-files file-path)
                           :modify
                           :create)

                         ;; Shouldn't happen, but default to modify
                         :else :modify)]

        ;; Update known files based on event type
        (case event-type
          :create (swap! known-files conj file-path)
          :delete (swap! known-files disj file-path)
          nil)

        ;; Return normalized event
        {:type event-type
         :file (.getName file)
         :path path
         :timestamp (System/currentTimeMillis)}))))

(defn watch-paths
  "Watch multiple paths using FSEvents.
   Returns a monitor object."
  [paths handler error-fn]
  (try
    (let [;; Track files that exist when we start watching
          known-files (atom (set (for [path paths
                                       file (file-seq (io/file path))
                                       :when (.isFile file)]
                                   (.getAbsolutePath file))))
          ;; Track when we started watching to filter historical events
          start-time (System/currentTimeMillis)]
      (fs/watch-async paths
                      (fn [event]
                        (try
                          ;; Only process events if they're not from the past
                          ;; FSEvents sometimes reports historical events on startup
                          (when-let [normalized (normalize-event event known-files)]
                            ;; Give a small grace period (100ms) for startup
                            (when (> (:timestamp normalized) (- start-time 100))
                              (handler normalized)))
                          (catch Exception e
                            (error-fn e {:event event}))))))
    (catch Exception e
      (error-fn e {:phase :start-fsevents})
      (throw e))))

(defn stop-all
  "Stop the FSEvents monitor."
  [monitor]
  (try
    (fs/stop monitor)
    (catch Exception e
      ;; Log but don't throw - best effort
      (println "Error stopping FSEvents monitor:" e))))
