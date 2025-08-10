(require '[hawk-eye.core :as hawk])
(require '[clojure.java.io :as io])
(import '[java.lang.management ManagementFactory])

(defn measure-mode-performance [mode poll-ms iterations]
  (let [test-dir (str "perf-test-" (name mode))
        latencies-ns (atom [])
        thread-bean (ManagementFactory/getThreadMXBean)
        _ (.setThreadCpuTimeEnabled thread-bean true)]

    ;; Cleanup
    (when (.exists (io/file test-dir))
      (doseq [f (reverse (file-seq (io/file test-dir)))]
        (.delete f)))

    (.mkdirs (io/file test-dir))

    (let [opts (case mode
                 :vthread {:mode :vthread}
                 :poll {:mode :poll :poll-ms poll-ms})

          ;; Store file creation times in nanoseconds
          file-times (atom {})

          ;; Start CPU timing
          start-cpu-time (.getCurrentThreadCpuTime thread-bean)
          start-wall-time (System/currentTimeMillis)

          stop-fn (hawk/watch [test-dir]
                              (fn [event]
                                (when (= (:type event) :create)
                                  (let [recv-time-ns (System/nanoTime)
                                        filename (:file event)]
                                    (when-let [create-time-ns (get @file-times filename)]
                                      (let [latency-ns (- recv-time-ns create-time-ns)]
                                        (swap! latencies-ns conj latency-ns))))))
                              (fn [e ctx]
                                (println "ERROR:" e))
                              opts)]

      ;; Let watcher settle
      (Thread/sleep 500)

      ;; Create files and measure latency
      (dotimes [i iterations]
        (let [filename (str "file" i ".txt")]
          (swap! file-times assoc filename (System/nanoTime))
          (spit (str test-dir "/" filename) (str "content " i))
          (Thread/sleep 10))) ; Small gap between files

      ;; Let file system catch up
      (Thread/sleep 1000)

      ;; Stop and measure CPU
      (stop-fn)
      (Thread/sleep 100) ; Let cleanup finish

      (let [end-cpu-time (.getCurrentThreadCpuTime thread-bean)
            end-wall-time (System/currentTimeMillis)
            cpu-millis (/ (- end-cpu-time start-cpu-time) 1000000.0)
            wall-millis (- end-wall-time start-wall-time)
            cpu-percentage (* 100.0 (/ cpu-millis wall-millis))]

        ;; Cleanup
        (doseq [f (reverse (file-seq (io/file test-dir)))]
          (.delete f))

        {:mode mode
         :poll-ms poll-ms
         :iterations iterations
         :events-captured (count @latencies-ns)
         :cpu-millis cpu-millis
         :wall-millis wall-millis
         :cpu-percentage cpu-percentage
         :latencies-ns @latencies-ns}))))

(defn format-nanoseconds [ns-val]
  (cond
    (< ns-val 1000) (format "%d ns" ns-val)
    (< ns-val 1000000) (format "%.1f μs" (/ ns-val 1000.0))
    :else (format "%.3f ms" (/ ns-val 1000000.0))))

(defn compare-modes []
  (println "\nHawk-eye Performance Comparison")
  (println "===============================")
  (println "Creating 50 files with 10ms gaps\n")

  (let [iterations 50
        results [(measure-mode-performance :vthread nil iterations)
                 (measure-mode-performance :poll 5 iterations)
                 (measure-mode-performance :poll 10 iterations)
                 (measure-mode-performance :poll 20 iterations)]]

    (println "\nResults:")
    (println "--------")
    (doseq [{:keys [mode poll-ms events-captured cpu-millis cpu-percentage latencies-ns wall-millis]} results]
      (println (format "\n%s mode (poll-ms: %s):" (name mode) (or poll-ms "N/A")))
      (println (format "  Events captured: %d/%d" events-captured iterations))
      (println (format "  Total time: %.1f seconds" (/ wall-millis 1000.0)))
      (println (format "  CPU time: %.1f ms" cpu-millis))
      (println (format "  CPU usage: %.2f%%" cpu-percentage))

      (when (seq latencies-ns)
        (let [sorted-lats (sort latencies-ns)
              avg-lat (/ (reduce + latencies-ns) (count latencies-ns))
              median-lat (nth sorted-lats (quot (count sorted-lats) 2))
              p95-lat (nth sorted-lats (min (dec (count sorted-lats))
                                            (int (* 0.95 (count sorted-lats)))))]
          (println "  Latency:")
          (println (format "    Min: %s" (format-nanoseconds (first sorted-lats))))
          (println (format "    Median: %s" (format-nanoseconds median-lat)))
          (println (format "    Average: %s" (format-nanoseconds (long avg-lat))))
          (println (format "    95th percentile: %s" (format-nanoseconds p95-lat)))
          (println (format "    Max: %s" (format-nanoseconds (last sorted-lats)))))))

    (println "\nSummary:")
    (println "- Both modes use minimal CPU during active file operations")
    (println "- Virtual thread mode uses blocking I/O (no polling)")
    (println "- Poll mode only sleeps when no events are pending")
    (println "- File system event delivery latency varies by OS"))

  ;; Ensure clean exit
  (shutdown-agents))

(compare-modes)