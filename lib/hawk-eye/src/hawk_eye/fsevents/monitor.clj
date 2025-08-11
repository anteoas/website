(ns hawk-eye.fsevents.monitor
  "FSEvents integration for hawk-eye."
  (:require [hawk-eye.fsevents.core :as fs]
            [clojure.java.io :as io]))

(defn- normalize-event
  "Convert FSEvents event to hawk-eye format."
  [event]
  (let [path (:path event)
        file (io/file path)
        flags (:flag-names event)]
    {:type (cond
             (contains? flags :created) :create
             (contains? flags :removed) :delete
             (contains? flags :modified) :modify
             (contains? flags :renamed) :modify
             :else :modify)
     :file (.getName file)
     :path path
     :timestamp (System/currentTimeMillis)}))

(defn watch-paths
  "Watch multiple paths using FSEvents.
   Returns a monitor object."
  [paths handler error-fn]
  (try
    (fs/watch-async paths
                    (fn [event]
                      (try
                        (handler (normalize-event event))
                        (catch Exception e
                          (error-fn e {:event event})))))
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