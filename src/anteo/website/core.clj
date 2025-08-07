(ns anteo.website.core
  (:require [anteo.website.content :as content]
            [hiccup2.core :as h]
            [hiccup.page :as hp]
            [babashka.fs :as fs]
            [clojure.string :as str]))

(defn footer []
  [:footer
   [:div.footer-content
    [:div.footer-left
     [:img {:src "/assets/images/anteo-logo-white.svg" :alt "Anteo" :width "180"}]
     [:div.footer-box
      [:p
       "Vågsallmenningen 6, 5040 Bergen" [:br]
       "Industrivegen 12, 7900 Rørvik" [:br]
       "Krambugata 2 (Digs), 7011 Trondheim" [:br]
       "Fugleskjærgata 16, 6905 Florø" [:br]]
      [:p {:style "color: var(--light-blue);"} "Org. nr. 999 168 817"]
      [:p [:a {:href "mailto:post@anteo.no"} "post@anteo.no"]]
      [:p [:a {:href "tel:+47 952 84 007"} "+47 952 84 007"]]]]

    [:div.footer-right
     [:div.sitemap-container
      [:div.footer-section
       [:h4 "Anteo Logistikk"]
       [:a {:href "/products/logistics/logifish.html"} "Logifish"]
       [:a {:href "/products/logistics/kartverktoy.html"} "Kartverktøy"]
       [:a {:href "/products/logistics/boatcheck.html"} "Boatcheck"]
       [:a {:href "/products/logistics/anteo-re.html"} "Anteo RE"]]

      [:div.footer-section
       [:h4 "Anteo Fiskehelse"]
       [:a {:href "/products/fish-health/fishjrnl.html"} "FishJrnl"]
       [:a {:href "/products/fish-health/fishctrl.html"} "FishCtrl"]]

      [:div.footer-section
       [:h4 "Anteo AS"]
       [:a {:href "/products.html"} "Produkter"]
       [:a {:href "/news.html"} "Aktuelt"]
       [:a {:href "/sustainability.html"} "Bærekraft"]
       [:a {:href "/about.html"} "Om oss"]
       [:a {:href "/contact.html"} "Kontakt oss"]

       [:div.footer-social
        [:a {:href "https://www.facebook.com/anteoas" :target "_blank"}
         [:img {:src "/assets/images/facebook-icon.svg" :width "40" :height "40" :alt "facebook"}]]
        [:a {:href "https://www.instagram.com/anteo_softwaresolutions/" :target "_blank"}
         [:img {:src "/assets/images/instagram-icon.svg" :width "40" :height "40" :alt "instagram"}]]]]]]]])

(defn base-layout [{:keys [title lang body-class] :or {lang "no"}} & body]
  (str
   (h/html
    {:mode :html}
    (hp/doctype :html5)
    [:html {:lang lang}
     [:head
      [:meta {:charset "UTF-8"}]
      [:meta {:name "viewport" :content "width=device-width, initial-scale=1.0"}]
      [:title title " - Anteo AS"]
      [:link {:rel "stylesheet" :href "/assets/css/style.css"}]]
     [:body (when body-class {:class body-class})
      [:header
       [:nav
        [:div.container
         [:a.logo {:href "/"}
          [:img {:src "/assets/images/anteo-logo.png" :alt "Anteo" :height "80"}]]
         [:button.mobile-menu-toggle {:aria-label "Toggle menu" :aria-expanded "false"}
          [:span.hamburger-line]
          [:span.hamburger-line]
          [:span.hamburger-line]]
         [:ul.nav-menu
          [:li [:a {:href "/products.html"} "Produkter"]]
          [:li [:a {:href "/news.html"} "Aktuelt"]]
          [:li [:a {:href "/sustainability.html"} "Bærekraft"]]
          [:li [:a {:href "/about.html"} "Om oss"]]
          [:li [:a {:href "/contact.html"} "Kontakt oss"]]]]]]
      (into [:main] body)
      (footer)]])))

(defmulti select-template
  (fn [content-data file-path]
    (or (:template content-data)
        (cond
          (str/ends-with? file-path "index.edn") :landing
          (str/includes? file-path "/news/") :article
          (str/ends-with? file-path ".md") :page
          :else :page))))

(defn require-page-template [template-name]
  (let [ns-sym (symbol (str "anteo.website.pages." (name template-name)))]
    (try
      (require ns-sym)
      (resolve (symbol (str ns-sym) "render"))
      (catch Exception _
        nil))))

(defmethod select-template :landing [content-data file-path]
  (if-let [render-fn (require-page-template :landing)]
    render-fn
    (fn [content]
      [:div.container
       [:h1 (:title content)]
       [:p "Landing page template not found"]])))

(defmethod select-template :page [content-data file-path]
  (fn [content]
    [:article.page
     [:div.container
      (when (:title content)
        [:h1 (:title content)])
      (when (:content content)
        [:div.content (h/raw (:content content))])]]))

(defmethod select-template :article [content-data file-path]
  (fn [content]
    [:article.article-page
     [:div.container
      [:header.article-header
       [:h1 (:title content)]
       [:div.article-meta
        [:time (:date content)]
        (when (:author content)
          [:span.author " - " (:author content)])]]
      [:div.article-content (h/raw (:content content))]]]))

(defn build-page [file-path output-dir lang]
  (let [content-data (content/load-content file-path)
        template-fn (select-template content-data file-path)
        page-structure (template-fn content-data)
        resolved-content (content/resolve-content page-structure content-data)
        html-body (h/html resolved-content)
        full-html (base-layout (assoc content-data :lang lang) html-body)
        output-filename (-> (fs/file-name file-path)
                            (str/replace #"\.(edn|md)$" ".html"))
        output-path (fs/path output-dir output-filename)]
    (fs/create-dirs output-dir)
    (spit (str output-path) full-html)
    (println "Built:" file-path "→" (str output-path))))