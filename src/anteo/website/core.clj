(ns anteo.website.core
  (:require [hiccup2.core :as h]
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
  (let [path (.getPath template-file)]
    (cond
      (str/ends-with? path ".edn")
      (edn/read-string (slurp template-file))

      (str/ends-with? path ".clj")
      ;; Use SCI to evaluate Clojure template files
      (sci/eval-string (slurp template-file))

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
  (let [path (str file)]
    (cond
      (str/ends-with? path ".edn")
      (edn/read-string (slurp (str file)))

      (str/ends-with? path ".md")
      (parse-markdown (slurp (str file)))

      :else nil)))

(defn load-content-directory
  "Load all content files from a directory"
  [dir]
  (when (fs/exists? dir)
    (let [files (fs/glob dir "*.{edn,md}")]
      (vec (keep load-content-file files)))))

(defn load-site-data
  "Load all site data from filesystem."
  [site-edn-path]
  (let [root-path (-> site-edn-path io/file .getParentFile .getAbsolutePath)
        config (-> (slurp site-edn-path)
                   edn/read-string
                   (assoc :root-path root-path))]
    {:config config
     :templates (load-templates (io/file root-path "templates"))}))

(defn find-default-language
  "Find the default language and assoc it to context"
  [{:keys [config] :as ctx}]
  (let [lang-config (:lang config)
        default-lang (or (some (fn [[code cfg]] (when (:default cfg) code)) lang-config)
                         (first (keys lang-config)))]
    (assoc ctx :default-lang default-lang)))

(defn expand-render-targets
  "Expand render targets into individual page specs"
  [{:keys [config] :as ctx}]
  (let [pages (for [[lang-code lang-config] (:lang config)
                    [content-key output-path] (:render config)]
                {:lang-code lang-code
                 :lang-config lang-config
                 :content-key content-key
                 :output-path output-path})]
    (assoc ctx :pages pages)))

(defn load-page-content
  "Load content file for a specific page/language combination"
  [{:keys [config]} page]
  (let [lang-code (name (:lang-code page))
        content-name (name (:content-key page))
        root-path (:root-path config)
        content-dir (fs/path root-path "content" lang-code)
        ;; Try .edn first, then .md
        content-file (or (fs/file content-dir (str content-name ".edn"))
                         (fs/file content-dir (str content-name ".md")))
        ;; Load the main content file
        base-content (when (fs/exists? content-file)
                       (load-content-file content-file))
        ;; Load subdirectory content
        products (load-content-directory (fs/path content-dir "products"))
        news (load-content-directory (fs/path content-dir "news"))]
    (assoc page :content
           (when base-content
             (cond-> base-content
               (seq products) (assoc :products products)
               (seq news) (assoc :news news))))))

(defn load-all-content
  "Load content for all pages"
  [{:keys [pages] :as ctx}]
  (assoc ctx :pages (map #(load-page-content ctx %) pages)))

(defn process-page-content
  "Process markdown and add language info"
  [{:keys [default-lang]} page]
  (if-let [content (:content page)]
    (let [lang-code (:lang-code page)
          processed (cond-> content
                      (:markdown/content content)
                      (assoc :rendered-html (md/md-to-html-string (:markdown/content content)))

                      true
                      (assoc :lang lang-code
                             :lang-prefix (if (= lang-code default-lang) "" (str "/" (name lang-code)))))]
      (assoc page :content processed))
    page))

(defn process-all-content
  "Process content for all pages"
  [{:keys [pages default-lang] :as ctx}]
  (assoc ctx :pages (map #(process-page-content {:default-lang default-lang} %) pages)))

(defn calculate-page-path
  "Calculate final output path with language prefix"
  [{:keys [default-lang]} page]
  (let [{:keys [output-path lang-code]} page
        final-path (if (= lang-code default-lang)
                     output-path
                     (str "/" (name lang-code) "/" (str/replace output-path #"^/" "")))]
    (assoc page :path final-path)))

(defn calculate-all-paths
  "Calculate paths for all pages"
  [{:keys [pages default-lang] :as ctx}]
  (assoc ctx :pages (map #(calculate-page-path {:default-lang default-lang} %) pages)))

(defn render-page
  "Render page HTML if content exists"
  [{:keys [config templates]} page]
  (if-let [content (:content page)]
    (let [template-name (or (:template content) (:content-key page))
          template (get templates template-name)
          wrapper (get templates (:wrapper config))]
      (if template
        (let [page-html (sg/process template content)
              wrapped-html (sg/process wrapper {:body page-html
                                                :includes templates
                                                :data content})]
          (assoc page :html (str (h/html wrapped-html))))
        (do
          (println (str "ERROR: Template '" template-name "' not found"))
          page)))
    (do
      (println (str "ERROR: No content for " (:content-key page) " in " (:lang-code page)))
      page)))

(defn render-all-pages
  "Render all pages"
  [{:keys [pages config templates] :as ctx}]
  (assoc ctx :pages (map #(render-page {:config config :templates templates} %) pages)))

(defn build-site
  "Build static site from prepared data (content-driven).
   Data map should contain:
     :config - Original site.edn data with :root-path
     :templates - Map of template-name -> template data/fn
   Options:
     :output-dir - Output directory
     :verbose - Enable verbose logging"
  [{:keys [config templates]} _opts]
  ;; Validate wrapper template exists
  (when-not (get templates (:wrapper config))
    (throw (ex-info (str "Wrapper template '" (:wrapper config) "' not found")
                    {:wrapper (:wrapper config)
                     :available (keys templates)})))

  ;; Build pipeline
  (-> {:config config :templates templates}
      find-default-language
      expand-render-targets
      load-all-content
      process-all-content
      calculate-all-paths
      render-all-pages
      :pages
      (->> (filter :html)
           (map #(select-keys % [:path :html])))))

(defn process-images
  "Process images in HTML and CSS files based on query parameters."
  [html-files css-files root-path]
  (let [;; Extract image URLs from all HTML and CSS
        html-image-urls (mapcat #(sg/extract-image-urls (:html %)) html-files)
        css-image-urls (mapcat #(sg/extract-image-urls (slurp %)) css-files)
        all-image-urls (concat html-image-urls css-image-urls)

        ;; Ensure .temp/images directory exists
        temp-dir (io/file ".temp/images")
        _ (io/make-parents (io/file temp-dir "dummy.txt"))

        ;; Process each unique image
        _ (doall
           (for [img-data all-image-urls]
             (when-not (:error img-data)
               (let [;; Convert web path to file system path
                     source-path (str root-path (:source-path img-data))
                     output-dir ".temp/images"]
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

(defn build
  "Build the site. Suitable for clj -X invocation.
   Example: clj -X anteo.website.core/build :site-edn '\"site/site.edn\"' :output-dir '\"dist\"' :mode :prod"
  [{:keys [site-edn output-dir mode] :or {mode :prod}}]
  (when-not site-edn
    (throw (ex-info "Missing required :site-edn parameter" {})))

  (let [site-data (load-site-data site-edn)
        root-path (:root-path (:config site-data))
        output-dir (io/file (or output-dir "dist"))

        ;; Build HTML
        html-output (build-site site-data {:verbose true})
        final-html (if (:image-processor (:config site-data))
                     (do
                       (println "Processing images...")
                       (process-images html-output [] root-path))
                     html-output)]

    (println "Building site from:" site-edn)
    (println "Output directory:" (.getPath output-dir))
    (println "Build mode:" mode)

    ;; Bundle CSS and JS
    (bundle-assets root-path (.getPath output-dir) mode)

    ;; Copy static assets (excluding CSS/JS which are bundled)
    (let [assets-source (io/file root-path "assets")
          assets-target (io/file output-dir "assets")]
      (when (.exists assets-source)
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
      (let [temp-images (io/file ".temp/images")
            dist-images (io/file output-dir "assets/images")]
        (when (.exists temp-images)
          (fs/copy-tree temp-images dist-images {:replace-existing true})
          (println "✓ Copied processed images"))))

    (println "Build complete!")))

(defn dev
  "Build and start dev server. Suitable for clj -X invocation.
   Example: clj -X anteo.website.core/dev :site-edn '\"site/site.edn\"'"
  [{:keys [site-edn output-dir] :or {output-dir "dist"}}]
  ;; Build with dev mode
  (build {:site-edn site-edn
          :output-dir output-dir
          :mode :dev})

  ;; Start dev server
  (let [proc (start-dev-server output-dir)]
    (println "Dev server running. Press Ctrl+C to stop.")
    (.waitFor proc)))

(defn clean
  "Clean build artifacts. Suitable for clj -X invocation.
   Example: clj -X anteo.website.core/clean"
  [{:keys [output-dir temp-dir site-edn]
    :or {output-dir "dist" temp-dir ".temp"}}]
  ;; If site-edn provided, use its root path
  (let [dirs-to-clean (if site-edn
                        (let [root-path (-> site-edn load-site-data :config :root-path)]
                          [(io/file root-path output-dir)
                           (io/file root-path temp-dir)])
                        [(io/file output-dir)
                         (io/file temp-dir)])]
    (doseq [dir dirs-to-clean]
      (when (.exists dir)
        (fs/delete-tree dir)
        (println "✓ Cleaned" (.getPath dir))))
    (println "Clean complete!")))

(defn -main
  "CLI entry point for site generator.
   Usage: clojure -M:run path/to/site.edn [options]
   Options:
     --output-dir PATH  Output directory (default: dist)
     --mode MODE        Build mode: dev or prod (default: prod)
     --serve            Start dev server after build
     --clean            Clean build artifacts"
  [& args]
  (let [parsed (parse-args args)]
    (cond
      ;; Clean command
      (some #{"--clean"} args)
      (clean {:site-edn (:site-edn parsed)
              :output-dir (:output-dir parsed)})

      ;; Build/serve commands
      (:site-edn parsed)
      (if (:serve parsed)
        (dev {:site-edn (:site-edn parsed)
              :output-dir (:output-dir parsed)})
        (build {:site-edn (:site-edn parsed)
                :output-dir (:output-dir parsed)
                :mode (or (:mode parsed) :prod)}))

      ;; No site-edn provided
      :else
      (do
        (println "Usage: clojure -M:run path/to/site.edn [options]")
        (println "Options:")
        (println "  --output-dir PATH  Output directory (default: dist)")
        (println "  --mode MODE        Build mode: dev or prod (default: prod)")
        (println "  --serve            Start dev server after build (implies --mode dev)")
        (println "  --clean            Clean build artifacts")
        (System/exit 1)))))

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
  ;; Full build with image processing
  (-main "site/site.edn" "--output-dir" "dist-test")

  ;; Build and serve
  (-main "site/site.edn" "--serve")

  ;; Using -X style invocations
  (build {:site-edn "site/site.edn" :output-dir "dist-test" :mode :prod})
  (dev {:site-edn "site/site.edn"})
  (clean {:site-edn "site/site.edn"})
  ;; => {:template :landing, 
  ;;     :hero-title "Internettbasert...", 
  ;;     :hero-subtitle "Beslutningsstøttesystemer..."}

  ;; Test template processing

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

    (fs/delete-tree "dist")
    (fs/delete-tree ".temp")
    (println "Cleaned build directories")))

