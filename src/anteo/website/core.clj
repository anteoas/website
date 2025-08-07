(ns anteo.website.core
  (:require [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]
            [clojure.edn :as edn]))

(defn build-page [output-dir]
  (let [landing-hiccup (edn/read-string (slurp "site/landing.edn"))
        html-str (str
                  (hp/doctype :html5)
                  "\n"
                  (h/html landing-hiccup))
        output-path (fs/path output-dir "index.html")]
    (fs/create-dirs output-dir)
    (spit (str output-path) html-str)))

(comment
  (build-page "dist/")

)
