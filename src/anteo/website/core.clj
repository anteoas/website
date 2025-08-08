(ns anteo.website.core
  (:require [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.java.process :as process]
            [markdown.core :as md]
            [sci.core :as sci]
            [anteo.website.site-generator :as sg]
            [anteo.website.image-processor :as img]))

(defn load-template
  "Load a single template file. Returns template data or function."
  [template-file]
  (let [path (.getPath template-file)
        name (-> (.getName template-file)
                 (str/replace #"\.(edn|clj)$" "")
                 keyword)]
    (cond
      (str/ends-with? path ".edn")
      (edn/read-string (slurp template-file))

      (str/ends-with? path ".clj")
      ;; Use SCI to evaluate Clojure template files
      ;; For now, skip CLJ templates until we properly set up SCI
      (do
        (println "Skipping CLJ template:" path)
        nil)

      :else nil)))

(defn load-templates
  "Load all templates from a directory into a map."
  [templates-dir]
  (reduce (fn [templates file]
            (if-let [template (load-template file)]
              (let [name (-> (.getName file)
                             (str/replace #"\.(edn|clj)$" "")
                             keyword)]
                (assoc templates name template))
              templates))
          {}
          (filter #(re-matches #".*\.(edn|clj)$" (.getName %))
                  (file-seq templates-dir))))

(defn parse-markdown
  "Parse markdown file with metadata. Returns map with metadata and :markdown/content."
  [content]
  (let [;; Simple metadata parser - looks for key: value lines at start
        lines (str/split-lines content)
        metadata-lines (take-while #(re-matches #"^[^:]+:.*" %) lines)
        content-start (+ (count metadata-lines)
                         (if (and (< (count metadata-lines) (count lines))
                                  (str/blank? (nth lines (count metadata-lines))))
                           1 0))
        content-lines (drop content-start lines)

        ;; Parse metadata
        metadata (reduce (fn [m line]
                           (let [[_ k v] (re-matches #"^([^:]+):\s*(.*)$" line)]
                             (if k
                               (assoc m (keyword (str/trim k)) (str/trim v))
                               m)))
                         {}
                         metadata-lines)]
    (assoc metadata :markdown/content (str/join "\n" content-lines))))

(defn load-content-file
  "Load a single content file."
  [file]
  (let [path (.getPath file)]
    (cond
      (str/ends-with? path ".edn")
      (edn/read-string (slurp file))

      (str/ends-with? path ".md")
      (parse-markdown (slurp file))

      :else nil)))

(defn load-site-data
  "Load all site data from filesystem."
  [site-edn-path]
  (let [root-path (-> site-edn-path io/file .getParentFile .getAbsolutePath)
        config (-> (slurp site-edn-path)
                   edn/read-string
                   (assoc :root-path root-path))]
    {:config config
     :templates (load-templates (io/file root-path "templates"))}))

(defn build-site
  "Build static site from prepared data (content-driven).
   Data map should contain:
     :config - Original site.edn data with :root-path
     :templates - Map of template-name -> template data/fn
   Options:
     :output-dir - Output directory
     :verbose - Enable verbose logging"
  [{:keys [config templates]} {:keys [output-dir verbose]
                               :or {output-dir "dist"}}]
  (let [wrapper-name (:wrapper config)
        wrapper-template (get templates wrapper-name)
        root-path (:root-path config)
        ;; Find the default language (one with :default true)
        ;; If none marked as default, use the first one
        default-lang (or (some (fn [[lang-code lang-config]]
                                 (when (:default lang-config)
                                   lang-code))
                               (:lang config))
                         (first (keys (:lang config))))]

    ;; Check for required wrapper template
    (when-not wrapper-template
      (throw (ex-info (str "Wrapper template '" wrapper-name "' not found")
                      {:wrapper wrapper-name
                       :available-templates (keys templates)})))

    ;; Process each language
    (let [html-files (for [[lang-code lang-config] (:lang config)]
                       (let [lang-content-dir (io/file root-path "content" (name lang-code))
                             ;; Process each render target
                             pages (for [[content-key output-path] (:render config)]
                                     (let [;; Try to load content file (.edn or .md)
                                           content-file-edn (io/file lang-content-dir (str (name content-key) ".edn"))
                                           content-file-md (io/file lang-content-dir (str (name content-key) ".md"))
                                           content-data (cond
                                                          (.exists content-file-edn) (load-content-file content-file-edn)
                                                          (.exists content-file-md) (load-content-file content-file-md)
                                                          :else nil)
                                           ;; Calculate final output path with language prefix
                                           final-output-path (if (= lang-code default-lang)
                                                               output-path
                                                               (let [clean-path (if (str/starts-with? output-path "/")
                                                                                  (subs output-path 1)
                                                                                  output-path)]
                                                                 (str "/" (name lang-code) "/" clean-path)))]
                                       (if content-data
                                         (let [;; Get template name from content
                                               template-name (or (:template content-data) content-key)
                                               template (get templates template-name)]
                                           (if template
                                             (let [;; Process markdown if needed
                                                   processed-content (if (:markdown/content content-data)
                                                                       (assoc content-data
                                                                              :rendered-html
                                                                              (md/md-to-html-string (:markdown/content content-data)))
                                                                       content-data)
                                                   ;; Add language info to content
                                                   content-with-lang (assoc processed-content
                                                                            :lang lang-code
                                                                            :lang-prefix (if (= lang-code default-lang)
                                                                                           ""
                                                                                           (str "/" (name lang-code))))
                                                   ;; Process template with content data
                                                   page-html (sg/process template content-with-lang)
                                                   ;; Wrap with wrapper template
                                                   wrapped-html (sg/process wrapper-template
                                                                            {:body page-html
                                                                             :includes templates ; Just pass all templates
                                                                             :data content-with-lang})]
                                               {:path final-output-path
                                                :html (str (h/html wrapped-html))})
                                             (do
                                               (println (str "ERROR: Template '" template-name "' not found for content '" content-key "'"))
                                               (println "  Available templates:" (keys templates))
                                               nil)))
                                         (do
                                           (println (str "ERROR: No content file found for '" content-key "'"))
                                           (println "  Looked for:" (.getPath content-file-edn))
                                           (println "          or:" (.getPath content-file-md))
                                           nil))))]
                         (filter some? pages)))]
      (apply concat html-files))))

(defn process-images
  "Process images in HTML and CSS files based on query parameters."
  [html-files css-files root-path]
  (let [;; Extract image URLs from all HTML and CSS
        html-image-urls (mapcat #(sg/extract-image-urls (:html %)) html-files)
        css-image-urls (mapcat #(sg/extract-image-urls (slurp %)) css-files)
        all-image-urls (concat html-image-urls css-image-urls)

        ;; Ensure .temp/images directory exists
        temp-dir (io/file root-path ".temp/images")
        _ (io/make-parents (io/file temp-dir "dummy.txt"))

        ;; Process each unique image
        processed-images (doall
                          (for [img-data all-image-urls]
                            (when-not (:error img-data)
                              (let [;; Convert web path to file system path
                                    source-path (str root-path (:source-path img-data))
                                    output-dir (str root-path "/.temp/images")]
                                ;; Call image processor with consistent keys
                                (img/process-image (merge {:source-path source-path
                                                           :output-dir output-dir}
                                                          (select-keys img-data [:width :height :format :quality])))))))

        ;; Build URL replacement map
        url-replacements (reduce (fn [m img-data]
                                   (if (:error img-data)
                                     m
                                     (assoc m (:url img-data) (:replace-url img-data))))
                                 {}
                                 all-image-urls)]

    ;; Replace URLs in HTML files
    (map (fn [html-file]
           (let [updated-html (reduce (fn [html [old-url new-url]]
                                        (str/replace html old-url new-url))
                                      (:html html-file)
                                      url-replacements)]
             (assoc html-file :html updated-html)))
         html-files)))

(defn bundle-css
  "Bundle CSS with esbuild"
  [site-root output-dir mode]
  (let [css-path "assets/css/style.css"
        out-dir (str output-dir "/assets/css")
        args (cond-> ["npx" "esbuild" css-path "--bundle"
                      (str "--outdir=" out-dir)
                      "--external:/assets/*"]
               (= mode :prod) (conj "--minify"))]
    (println "Bundling CSS...")
    (try
      (apply process/exec {:dir site-root} args)
      (println "✓ CSS bundled")
      (catch Exception e
        (println "✗ CSS bundling failed:" (.getMessage e))))))

(defn bundle-js
  "Bundle JavaScript with esbuild"
  [site-root output-dir mode]
  (let [js-path "assets/js/index.js"
        out-file (if (= mode :prod)
                   (str output-dir "/assets/js/bundle.min.js")
                   (str output-dir "/assets/js/bundle.js"))
        args (cond-> ["npx" "esbuild" js-path "--bundle"
                      (str "--outfile=" out-file)
                      "--format=iife"]
               (= mode :dev) (conj "--sourcemap")
               (= mode :prod) (conj "--minify"))]
    (println "Bundling JavaScript...")
    (try
      (apply process/exec {:dir site-root} args)
      (println "✓ JavaScript bundled")
      (catch Exception e
        (println "✗ JavaScript bundling failed:" (.getMessage e))))))

(defn bundle-assets
  "Bundle all CSS and JS assets"
  [site-root output-dir mode]
  (bundle-css site-root output-dir mode)
  (bundle-js site-root output-dir mode))

(defn start-dev-server
  "Start browser-sync dev server"
  [output-dir]
  (println "Starting development server...")
  (let [proc (process/start
              {:out :inherit ; Send output to console
               :err :inherit ; Send errors to console
               :dir "."} ; Run from current dir
              "npx" "browser-sync" "start"
              "--server" output-dir
              "--files" (str output-dir "/**/*")
              "--no-notify"
              "--open" "false")]
    (println "Dev server starting at http://localhost:3000")
    ;; Return process so it can be managed
    proc))

(defn write-output
  "Write HTML files to disk."
  [html-files output-dir]
  (doseq [{:keys [path html]} html-files]
    (let [;; Handle both absolute paths (/) and relative paths
          clean-path (cond
                       (= path "/") "index.html"
                       (= path "") "index.html"
                       (str/ends-with? path "/") (str path "index.html")
                       (str/starts-with? path "/") (subs path 1)
                       :else path)
          output-file (io/file output-dir clean-path)]
      (io/make-parents output-file)
      (spit output-file html)
      (println "Wrote:" (.getPath output-file)))))

(defn parse-args
  "Parse command line arguments"
  [args]
  (loop [args args
         result {}]
    (if (empty? args)
      ;; If serve is set but mode isn't, default to dev
      (if (and (:serve result) (not (:mode result)))
        (assoc result :mode :dev)
        result)
      (let [arg (first args)]
        (cond
          (= arg "--output-dir")
          (recur (drop 2 args) (assoc result :output-dir (second args)))

          (= arg "--mode")
          (recur (drop 2 args) (assoc result :mode (keyword (second args))))

          (= arg "--serve")
          (recur (rest args) (assoc result :serve true))

          (not (.startsWith arg "--"))
          (recur (rest args) (assoc result :site-edn arg))

          :else
          (do
            (println "Unknown option:" arg)
            (recur (rest args) result)))))))

(defn -main
  "CLI entry point for site generator.
   Usage: clojure -M:run path/to/site.edn [options]
   Options:
     --output-dir PATH  Output directory (default: dist)
     --mode MODE        Build mode: dev or prod (default: prod)
     --serve            Start dev server after build"
  [& args]
  (let [parsed (parse-args args)
        site-edn-path (:site-edn parsed)]

    (when-not site-edn-path
      (println "Usage: clojure -M:run path/to/site.edn [options]")
      (println "Options:")
      (println "  --output-dir PATH  Output directory (default: dist)")
      (println "  --mode MODE        Build mode: dev or prod (default: prod)")
      (println "  --serve            Start dev server after build (implies --mode dev)")
      (System/exit 1))

    (let [site-data (load-site-data site-edn-path)
          root-path (:root-path (:config site-data))
          output-dir (io/file (or (:output-dir parsed)
                                  (str root-path "/dist")))
          mode (or (:mode parsed) :prod)

          ;; Process images if enabled
          html-output (build-site site-data {:verbose true})
          final-html (if (:image-processor (:config site-data))
                       (do
                         (println "Processing images...")
                         (process-images html-output [] root-path))
                       html-output)]

      (println "Building site from:" site-edn-path)
      (println "Output directory:" (.getPath output-dir))
      (println "Build mode:" mode)

      ;; Bundle CSS and JS
      (bundle-assets root-path (.getPath output-dir) mode)

      ;; Copy static assets (excluding CSS/JS which are bundled)
      (let [assets-source (io/file root-path "assets")
            assets-target (io/file output-dir "assets")]
        (when (.exists assets-source)
          ;; Copy everything except css and js directories
          (doseq [file (file-seq assets-source)]
            (when (and (.isFile file)
                       (not (str/includes? (.getPath file) "/css/"))
                       (not (str/includes? (.getPath file) "/js/")))
              (let [source-path (.toPath assets-source)
                    file-path (.toPath file)
                    relative-path (.relativize source-path file-path)
                    target-file (io/file assets-target (.toString relative-path))]
                (io/make-parents target-file)
                (io/copy file target-file))))
          (println "✓ Copied static assets")))

      ;; Write HTML files
      (write-output final-html output-dir)

      ;; Copy processed images from .temp to dist
      (when (:image-processor (:config site-data))
        (let [temp-images (io/file root-path ".temp/images")
              dist-images (io/file output-dir "assets/images")]
          (when (.exists temp-images)
            (fs/copy-tree temp-images dist-images {:replace-existing true})
            (println "✓ Copied processed images"))))

      (println "Build complete!")

      ;; Start dev server if requested
      (when (:serve parsed)
        (let [proc (start-dev-server (.getPath output-dir))]
          ;; Wait for the process to complete
          (.waitFor proc))))))

(comment
  ;; Development helper functions

  ;; Load and inspect site data
  (def site-data (load-site-data "site/site.edn"))

  ;; Check what templates are loaded
  (keys (:templates site-data))
  ;; => (:about :base :footer :landing)

  ;; Check site configuration
  (:config site-data)

  ;; Build the site to dist directory
  (do
    (def site-data (load-site-data "site/site.edn"))
    (def html-files (build-site site-data {:verbose true}))
    (println "Generated" (count html-files) "pages"))

  ;; Quick build - no image processing
  (let [site-data (load-site-data "site/site.edn")
        output-dir "dist-dev"]
    (write-output (build-site site-data {:verbose true}) (io/file output-dir))
    (bundle-assets (:root-path (:config site-data)) output-dir :dev)
    (println "Quick build complete!"))

  ;; Full build with image processing
  (-main "site/site.edn" "--output-dir" "dist-test")

  ;; Build and serve
  (-main "site/site.edn" "--serve")

  ;; Test loading specific content
  (load-content-file (io/file "site/content/no/landing.edn"))
  ;; => {:template :landing, 
  ;;     :hero-title "Internettbasert...", 
  ;;     :hero-subtitle "Beslutningsstøttesystemer..."}

  ;; Test template processing
  (require '[anteo.website.site-generator :as sg])
  (let [template [:h1 [:sg/get :title]]
        content {:title "Test"}]
    (sg/process template content))
  ;; => [:h1 "Test"]

  ;; Debug a specific page build
  (let [site-data (load-site-data "site/site.edn")
        templates (:templates site-data)
        landing-content (load-content-file (io/file "site/content/no/landing.edn"))
        landing-template (get templates :landing)
        processed (sg/process landing-template landing-content)]
    (println "First element of processed landing:")
    (prn (first processed)))

  ;; Check why footer might not be rendering
  (let [site-data (load-site-data "site/site.edn")
        templates (:templates site-data)]
    (println "Footer template exists?" (some? (:footer templates)))
    (println "Footer template type:" (type (:footer templates))))

  ;; Test language prefix calculation
  (let [config {:lang {:no {:name "Norsk" :default true}
                       :en {:name "English"}}}
        default-lang (or (some (fn [[lang-code lang-config]]
                                 (when (:default lang-config)
                                   lang-code))
                               (:lang config))
                         (first (keys (:lang config))))]
    (println "Default language:" default-lang)
    (println "Path for :no:" (if (= :no default-lang) "/" "/no/"))
    (println "Path for :en:" (if (= :en default-lang) "/" "/en/")))

  ;; Clean build directories
  (do
    (require '[babashka.fs :as fs])
    (fs/delete-tree "dist")
    (fs/delete-tree ".temp")
    (println "Cleaned build directories")))

