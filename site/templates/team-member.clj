(fn team-member [{:keys [photo name position markdown/content email phone]}]
  [:div.team-member
   [:div.team-card
    [:div.team-image {:style (str "background-image: url('" photo "?size=400x600&format=jpg')")}]
    [:div.team-content
     [:h3 name]
     [:p.position position]
     (when content [:p.bio content])
     [:div.contact-info
      (when email [:p [:strong "E-post:"] " " [:a {:href (str "mailto:" email)} email]])
      (when phone [:p [:strong "Tel:"] " " [:a {:href (str "tel:" phone)} phone]])]]]])


