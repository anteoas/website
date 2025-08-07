(ns anteo.website.pages.landing
  (:require [hiccup2.core :as h]
            [components :as c]))

(defn render [context]
  [:div
   ;; Hero Section 1 - Headline
   [:section.hero-headline
    [:div.container
     [:h1 "Internettbasert sanntidssystemer for planlegging, overvåking og varsling"]]]

   ;; Hero Section 2 - Main
   [:section.hero-main
    [:div.container
     [:div.column-wrap
      [:div.content-block-left
       [:div.content-wrap
        [:p.title "Anteo"]
        [:h2.heading-primary "Beslutningstøttesystemer for bærekraftig havnæring."]
        [:p.paragraph.blue "Anteo er et selskap som utvikler beslutningsstøttesystemer som skal bidra til en bærekraftig utvikling av norsk havbruksnæringen. Vi leverer sann tids løsninger for overvåkning og varsling av aktiviteter som kan være i strid med biosikkerhetsprinsippet, samtidig som løsningene skal bidra til forslag til risikoreduserende tiltak."]
        [:a.btn.btn-primary {:href "/about.html"} "Les mer"]]]
      [:div.image-block
       [:img {:src "/assets/images/hero-about.jpg" :alt "Anteo havbruk"}]]]]]

   ;; Product Section 1 - Anteo Logistikk
   [:section.product-section
    [:div.container
     [:div.product-wrap
      [:div.product-image
       [:img {:src [:anteo/img :logistics-image] :alt [:anteo/alt :logistics-image]}]]
      [:div.product-content
       [:h2 [:anteo/t :logistics]]
       [:p [:anteo/t :the-content]]
       [:a.btn.btn-primary {:href [:anteo/href :logistics]} [:antoe/t :link-text]]]]]]

   ;; Product Section 2 - Anteo Fiskehelse  
   [:section.product-section
    [:div.container
     [:div.product-wrap.reversed
      [:div.product-image
       [:img {:src "/assets/images/product-fish-health.jpg" :alt "Anteo Fiskehelse"}]]
      [:div.product-content
       [:h2 "Anteo Fiskehelse"]
       [:p "Digital journalføring og analyse av fiskehelsedata. Fra daglige observasjoner til behandlingshistorikk."]
       [:a.btn.btn-primary {:href "/products/fish-health.html"} "Les mer om fiskehelseløsninger"]]]]]

   ;; News Section
   [:section.news-section
    [:div.container
     [:div.section-header
      [:p.title "Aktuelt"]
      [:h2 "Nyheter & Oppdateringer"]]
     [:div.news-grid
      [:anteo/for {:type :news-card :limit 3 :order-by :date}]]

     [:div.news-more
      [:a.read-more {:href "/news.html"} "Se alle nyheter →"]]]]])

;; This would be called by the build system
(def page-meta
  {:title "Anteo - Bærekraftige løsninger for havbruk"
   :description "Beslutningsstøttesystemer for en bærekraftig havbruksnæring"})
