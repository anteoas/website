(ns anteo.server
  (:require [ring.adapter.jetty :as jetty]
            [ring.middleware.file :as file]
            [ring.middleware.content-type :as content-type]
            [ring.middleware.default-charset :as charset]))

(defn handler [request]
  {:status 404
   :headers {"Content-Type" "text/html"}
   :body "<h1>404 - Page not found</h1>"})

(def app
  (-> handler
      (file/wrap-file "dist")
      (content-type/wrap-content-type)
      (charset/wrap-default-charset "UTF-8")))

(defn start-server! [port]
  (println (str "🌐 Starting server on http://localhost:" port))
  (jetty/run-jetty app {:port port :join? false}))