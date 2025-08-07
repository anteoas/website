(ns anteo.build
  (:require [anteo.website.core :as core]
            [babashka.fs :as fs]
            [clojure.string :as str]))

(defn clean-dist! []
  (when (fs/exists? "dist")
    (fs/delete-tree "dist"))
  (fs/create-dirs "dist"))

(defn copy-assets! []
  (let [assets-src "assets"
        assets-dest "dist/assets"]
    (when (fs/exists? assets-src)
      (fs/copy-tree assets-src assets-dest {:replace-existing true})
      (println "✓ Copied assets"))))

(defn build-language! [lang]
  (let [content-dir (str "content/" lang "/")
        output-dir (str "dist/" (when (not= lang "no") (str lang "/")))
        files (concat (fs/glob content-dir "*.edn")
                      (fs/glob content-dir "*.md"))]
    (println (str "\n📁 Building " lang " content..."))
    (doseq [file files]
      (core/build-page (str file) output-dir lang))))

(defn build! []
  (println "🚀 Starting Anteo website build...\n")

  (clean-dist!)
  (copy-assets!)

  (build-language! "no")

  (when (fs/exists? "content/en")
    (build-language! "en"))

  (println "\n✅ Build complete!"))

(defn -main [& args]
  (build!))