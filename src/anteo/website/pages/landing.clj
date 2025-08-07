(ns anteo.website.pages.landing
  (:require [hiccup2.core :as h]))

(defn render [context]
  [:div
   [:section.hero-headline
    [:div.container
     [:h1 :anteo/hero-headline]]]

   [:section.hero-main
    [:div.container
     [:div.column-wrap
      [:div.content-block-left
       [:div.content-wrap
        [:p.title "Anteo"]
        [:h2.heading-primary :anteo/hero-title]
        [:p.paragraph.blue :anteo/hero-text]
        [:a.btn.btn-primary {:href :anteo.link/about} :anteo/hero-link-text]]]
      [:div.image-block
       [:img {:src :anteo.asset/hero-image :alt :anteo/hero-alt}]]]]]

   [:section.product-section
    [:div.container
     [:div.product-wrap
      [:div.product-image
       [:img {:src :anteo.asset/logistics-image :alt :anteo/logistics-alt}]]
      [:div.product-content
       [:h2 :anteo/logistics-title]
       [:p :anteo/logistics-text]
       [:a.btn.btn-primary {:href :anteo.link/logistics} :anteo/logistics-link-text]]]]]

   [:section.product-section
    [:div.container
     [:div.product-wrap.reversed
      [:div.product-image
       [:img {:src :anteo.asset/fishhealth-image :alt :anteo/fishhealth-alt}]]
      [:div.product-content
       [:h2 :anteo/fishhealth-title]
       [:p :anteo/fishhealth-text]
       [:a.btn.btn-primary {:href :anteo.link/fishhealth} :anteo/fishhealth-link-text]]]]]

   [:section.news-section
    [:div.container
     [:div.section-header
      [:p.title :anteo/news-section-title]
      [:h2 :anteo/news-section-heading]]
     [:div.news-grid
      [:anteo/for {:type :news-card :limit 3 :order-by [:date :desc]}]]
     [:div.news-more
      [:a.read-more {:href :anteo.link/news} :anteo/news-more-text]]]]])

;; This would be called by the build system
(def page-meta
  {:title "Anteo - Bærekraftige løsninger for havbruk"
   :description "Beslutningsstøttesystemer for en bærekraftig havbruksnæring"})
