;; Example usage of hawk-eye in the website dev mode

(require '[hawk-eye.core :as hawk])

(defn dev-with-watch
  "Development mode with automatic rebuilding on file changes"
  [& {:keys [site-edn output-dir] :or {output-dir "dist"}}]
  ;; Initial build
  (build :site-edn site-edn :output-dir output-dir :mode :dev)

  ;; Set up file watching
  (let [site-data (load-site-data site-edn output-dir)
        root-path (:root-path (:config site-data))
        dirs (hawk/find-all-directories root-path)

        rebuild! (fn [event]
                   (println "\n♻️  File changed:" (:file event))
                   (try
                     (build :site-edn site-edn :output-dir output-dir :mode :dev)
                     (println "✅ Rebuild complete!")
                     (catch Exception e
                       (println "❌ Build failed:" (.getMessage e)))))

        debounced-rebuild (hawk/debounce rebuild! 200)

        stop-fn (hawk/watch dirs
                            debounced-rebuild
                            (fn [e ctx]
                              (println "Watch error:" (.getMessage e) ctx)))]

    ;; Start dev server
    (let [server (start-dev-server output-dir)]
      (println "\n👁️  Watching" (count dirs) "directories for changes...")
      (println "Press Ctrl+C to stop.\n")

      ;; Wait for interrupt
      (try
        (.waitFor server)
        (finally
          (stop-fn)
          (println "\nStopped watching."))))))
