(ns anteo.website.core
  (:require [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [anteo.website.site-generator :as sg]))

(defn load-site-files
  "Load all EDN files from the site directory into a map"
  [site-path]
  (let [files (fs/glob site-path "*.edn")
        load-file (fn [file]
                    (let [name (-> (fs/file-name file)
                                   (str/replace #"\.edn$" "")
                                   keyword)]
                      [name (edn/read-string (slurp (str file)))]))]
    (into {} (map load-file files))))

(defn build-page
  "Build a specific page using the site generator"
  [site-data page-name output-path]
  (let [base (:base site-data)
        content (get site-data page-name)
        processed (sg/process base {:body content
                                    :includes site-data})
        html-str (str
                  (hp/doctype :html5)
                  "\n"
                  (h/html processed))]
    (spit (str output-path) html-str)
    (println "Built:" page-name "→" (str output-path))))

(defn build-site [output-dir]
  (let [site-data (load-site-files "site")]
    (fs/create-dirs output-dir)

    ;; Copy assets
    (let [assets-source "assets"
          assets-target (fs/path output-dir "assets")]
      (when (fs/exists? assets-source)
        (fs/copy-tree assets-source assets-target {:replace-existing true})
        (println "✓ Copied assets")))

    ;; Build index page
    (build-page site-data :landing (fs/path output-dir "index.html"))
    ;; Build about page  
    (build-page site-data :about (fs/path output-dir "about.html"))))

(comment
  (build-site "dist/"))
