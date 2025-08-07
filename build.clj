(ns build
  (:require [clojure.string :as str]
            [clojure.edn :as edn]
            [markdown.core :as md]
            [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]))

;; Component templates
(defn hero-headline [{:keys [content]}]
  [:section.hero-headline
   [:div.container
    [:h1 content]]])

(defn hero-main [{:keys [title text link-text image]}]
  [:section.hero-main
   [:div.container
    [:div.column-wrap
     [:div.content-block-left
      [:div.content-wrap
       [:p.title "Anteo"]
       [:h2.heading-primary title]
       [:p.paragraph.blue text]
       [:a.btn.btn-primary {:href "/about.html"} link-text]]]
     [:div.image-block
      [:img {:src image :alt "Anteo havbruk"}]]]]])

;; Template functions by template type
(def templates
  {:landing (fn [{:keys [sections] :as page-data}]
              (for [section sections]
                (case (:type section)
                  :hero-headline (hero-headline {:content (get page-data (:content section))})
                  :hero-main (hero-main (get page-data (:content section)))
                  ;; Add more section types as needed
                  [:div.placeholder (str "Section type not implemented: " (:type section))])))

   ;; Default template for pages with markdown content
   :page (fn [{:keys [content]}]
           [:article
            [:div.container
             (h/raw content)]])})

;; Base layout
(defn base-layout [{:keys [title] :as page-data} & body]
  (str
   (h/html
    {:mode :html}
    (hp/doctype :html5)
    [:html {:lang "no"}
     [:head
      [:meta {:charset "UTF-8"}]
      [:meta {:name "viewport" :content "width=device-width, initial-scale=1.0"}]
      [:title title " - Anteo"]
      [:link {:rel "stylesheet" :href "/assets/css/style.css"}]]
     [:body
      [:header
       [:div.container
        [:a {:href "/"}
         [:img {:src "/assets/images/anteo-logo.png" :alt "Anteo" :height "80"}]]]]
      [:main body]
      [:footer
       [:div.container
        [:p "© 2025 Anteo AS"]]]]])))

;; Parse files
(defn parse-edn-file [file]
  (-> (slurp file)
      edn/read-string
      (assoc :file file)))

(defn parse-markdown-file [file]
  (let [content (slurp file)
        parts (str/split content #"---\n" 3)
        [frontmatter body] (if (= 3 (count parts))
                             [(nth parts 1) (nth parts 2)]
                             [(first parts) (second parts)])
        title-line (first (filter #(str/starts-with? % "title:")
                                  (str/split-lines frontmatter)))
        title (if title-line
                (str/trim (subs title-line 6))
                "Untitled")]
    {:title title
     :content (md/md-to-html-string body)
     :template :page
     :file file}))

(defn parse-file [file]
  (cond
    (str/ends-with? file ".edn") (parse-edn-file file)
    (str/ends-with? file ".md") (parse-markdown-file file)
    :else (throw (ex-info "Unknown file type" {:file file}))))

;; Build a single file
(defn build-file [file]
  (println "Building:" file)
  (let [page-data (parse-file file)
        template-fn (get templates (:template page-data) (:page templates))
        content (template-fn page-data)
        html (base-layout page-data content)
        filename (-> (fs/file-name file)
                     (str/replace #"\.(edn|md)$" ".html"))
        output-file (str "dist/" filename)]
    (fs/create-dirs "dist")
    (spit output-file html)
    (println "  → Created:" output-file)))

;; Main build function
(defn build! []
  (println "🚀 Starting build...")

  ;; Clean dist
  (when (fs/exists? "dist")
    (fs/delete-tree "dist"))
  (fs/create-dirs "dist")

  ;; Build all content files
  (let [files (concat (fs/glob "content/no" "*.edn")
                      (fs/glob "content/no" "*.md"))]
    (doseq [file files]
      (build-file (str file))))

  ;; Copy assets
  (when (fs/exists? "old/src/assets")
    (fs/copy-tree "old/src/assets" "dist/assets")
    (println "  → Copied assets"))

  (println "✅ Build complete!"))

;; Only run if executed directly
(when (= *file* (System/getProperty "babashka.file"))
  (build!))