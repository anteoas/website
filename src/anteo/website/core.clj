(ns anteo.website.core
  (:require [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]
            [clojure.edn :as edn]
            [anteo.website.site-generator :as sg]))

(defn build-page [output-dir]
  (let [base (edn/read-string (slurp "site/base.edn"))
        landing (edn/read-string (slurp "site/landing.edn"))
        footer (edn/read-string (slurp "site/footer.edn"))
        processed (sg/process base {:body landing
                                    :includes {:footer footer}})
        html-str (str
                  (hp/doctype :html5)
                  "\n"
                  (h/html processed))
        output-path (fs/path output-dir "index.html")]
    (fs/create-dirs output-dir)
    (spit (str output-path) html-str)))

(comment
  (build-page "dist/"))
