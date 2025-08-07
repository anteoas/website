(ns dev
  (:require [ring.adapter.jetty :as jetty]
            [ring.middleware.file :as file]
            [ring.middleware.refresh :as refresh]
            [build :as build])
  (:import [java.nio.file FileSystems Paths StandardWatchEventKinds WatchService]
           [java.util.concurrent TimeUnit]))

(defonce server (atom nil))

(defn watch-directory [path callback]
  (let [watcher (.newWatchService (FileSystems/getDefault))
        path (Paths/get path (into-array String []))
        _ (.register path watcher
                     (into-array [StandardWatchEventKinds/ENTRY_CREATE
                                  StandardWatchEventKinds/ENTRY_DELETE
                                  StandardWatchEventKinds/ENTRY_MODIFY]))]
    (future
      (loop []
        (when-let [key (.poll watcher 100 TimeUnit/MILLISECONDS)]
          (doseq [event (.pollEvents key)]
            (callback (.context event)))
          (.reset key))
        (recur)))))

(defn start-server! []
  (when @server
    (.stop @server))

  ;; Initial build
  (println "🔨 Initial build...")
  (build/build!)

  ;; Simple file watcher
  (watch-directory "content"
                   (fn [file]
                     (println "📝 File changed:" (str file))
                     (build/build!)))

  ;; Start server with ring-refresh
  (reset! server
          (jetty/run-jetty
           (-> (fn [req] {:status 404 :body "Not found"}) ; Base handler
               (file/wrap-file "dist") ; Serve static files
               (refresh/wrap-refresh)) ; Add auto-reload!
           {:port 3000
            :join? false}))

  (println "🚀 Dev server running at http://localhost:3000")
  (println "✨ Browser will auto-refresh on changes!"))

(defn stop-server! []
  (when @server
    (.stop @server)
    (reset! server nil))
  (println "🛑 Server stopped"))

(defn -main []
  (start-server!)
  ;; Keep the main thread alive
  @(promise))

;; Auto-start in dev
(start-server!)