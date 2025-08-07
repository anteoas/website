(ns anteo.website.components)

(defmulti render
  (fn [type data] type))

(defmethod render :news-card [_ {:keys [title date excerpt url]}]
  [:article.news-card
   [:time.news-date date]
   [:h3 [:a {:href url} title]]
   [:p.news-excerpt excerpt]
   [:a.read-more {:href url} "Les mer →"]])