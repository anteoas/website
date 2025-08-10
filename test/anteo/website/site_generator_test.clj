(ns anteo.website.site-generator-test
  (:require [clojure.test :refer [deftest is testing]]
            [anteo.website.site-generator :as sg]))

(deftest test-body-replacement
  (testing "Basic :sg/body replacement"
    (let [base [:div [:sg/body]]
          content [:p "Hi"]
          expected [:div [:p "Hi"]]]
      (is (= expected (sg/process base content)))))

  (testing "Nested :sg/body"
    (let [base [:div [:main [:sg/body]]]
          content [:p "Hi"]
          expected [:div [:main [:p "Hi"]]]]
      (is (= expected (sg/process base content)))))

  (testing "No :sg/body"
    (let [base [:div "Hi"]
          content [:p "Ignored"]]
      (is (= base (sg/process base content)))))

  (testing "Vector of vectors splices elements"
    (let [base [:main [:sg/body]]
          content [[:h1 "Title"]
                   [:p "Paragraph"]]
          expected [:main [:h1 "Title"] [:p "Paragraph"]]]
      (is (= expected (sg/process base content)))))

  (testing "Vector of vectors with multiple children"
    (let [base [:div
                [:header "Header"]
                [:sg/body]
                [:footer "Footer"]]
          content [[:section "One"]
                   [:section "Two"]]
          expected [:div
                    [:header "Header"]
                    [:section "One"]
                    [:section "Two"]
                    [:footer "Footer"]]]
      (is (= expected (sg/process base content))))))

(deftest test-include
  (testing "Basic include"
    (let [base [:div [:sg/include :footer]]
          includes {:footer [:footer "Footer content"]}
          expected [:div [:footer "Footer content"]]]
      (is (= expected (sg/process base {:includes includes})))))

  (testing "Include with body"
    (let [base [:div
                [:sg/body]
                [:sg/include :footer]]
          content {:body [:p "Content"]
                   :includes {:footer [:footer "Footer"]}}
          expected [:div
                    [:p "Content"]
                    [:footer "Footer"]]]
      (is (= expected (sg/process base content)))))

  (testing "Missing include returns placeholder"
    (let [base [:div [:sg/include :missing]]
          includes {}
          expected [:div [:sg/include :missing]]]
      (is (= expected (sg/process base {:includes includes}))))))

(deftest test-extract-image-urls
  (testing "Extract image URLs with query parameters from HTML"
    (let [html "<div>
                  <img src=\"/assets/images/hero.jpg?size=800x600&format=webp\" alt=\"Hero\">
                  <img src=\"/assets/images/logo.png?size=200x100\" alt=\"Logo\">
                  <div style=\"background-image: url('/assets/images/bg.jpg?size=1920x1080&format=webp')\"></div>
                </div>"
          expected [{:url "/assets/images/hero.jpg?size=800x600&format=webp"
                     :source-path "/assets/images/hero.jpg"
                     :width 800 :height 600
                     :replace-url "/assets/images/hero-800x600.jpg"}
                    {:url "/assets/images/logo.png?size=200x100"
                     :source-path "/assets/images/logo.png"
                     :width 200 :height 100
                     :replace-url "/assets/images/logo-200x100.png"}
                    {:url "/assets/images/bg.jpg?size=1920x1080&format=webp"
                     :source-path "/assets/images/bg.jpg"
                     :width 1920 :height 1080
                     :replace-url "/assets/images/bg-1920x1080.jpg"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Extract images without query parameters"
    (let [html "<img src=\"/assets/images/simple.jpg\" alt=\"Simple\">"
          expected []]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Skip external URLs"
    (let [html "<img src=\"https://example.com/image.jpg?size=100x100\" alt=\"External\">"
          expected []]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Handle images in various contexts"
    (let [html "<html>
                  <img src='/assets/images/photo.png?size=400x300&quality=85'>
                  <div style='background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(\"/assets/images/hero.jpg?size=1200x800\")'>
                  <img src=\"/assets/images/icon.svg?size=32x32\"/>
                </html>"
          expected [{:url "/assets/images/photo.png?size=400x300&quality=85"
                     :source-path "/assets/images/photo.png"
                     :width 400 :height 300
                     :replace-url "/assets/images/photo-400x300.png"}
                    {:url "/assets/images/hero.jpg?size=1200x800"
                     :source-path "/assets/images/hero.jpg"
                     :width 1200 :height 800
                     :replace-url "/assets/images/hero-1200x800.jpg"}
                    {:url "/assets/images/icon.svg?size=32x32"
                     :source-path "/assets/images/icon.svg"
                     :width 32 :height 32
                     :replace-url "/assets/images/icon-32x32.svg"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Handle width-only sizing"
    (let [html "<img src='/assets/images/wide.jpg?size=800x&format=webp'>"
          expected [{:url "/assets/images/wide.jpg?size=800x&format=webp"
                     :source-path "/assets/images/wide.jpg"
                     :width 800
                     :replace-url "/assets/images/wide-800x.jpg"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Handle malformed parameters gracefully"
    (let [html "<div>
                  <img src='/assets/images/bad1.jpg?size=notanumber'>
                  <img src='/assets/images/bad2.jpg?size=800xabc'>
                  <img src='/assets/images/bad3.jpg?quality=high'>
                </div>"
          expected [{:url "/assets/images/bad1.jpg?size=notanumber"
                     :source-path "/assets/images/bad1.jpg"
                     :error "Invalid size format: notanumber"}
                    {:url "/assets/images/bad2.jpg?size=800xabc"
                     :source-path "/assets/images/bad2.jpg"
                     :error "Invalid height: abc"}
                    {:url "/assets/images/bad3.jpg?quality=high"
                     :source-path "/assets/images/bad3.jpg"
                     :replace-url "/assets/images/bad3.jpg"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Extract from CSS files"
    (let [css ".team-member {
                 background-image: url('/assets/images/team/christine-nordal-sunde.jpg?size=400x400');
               }
               .hero {
                 background-image: linear-gradient(130deg, #003f7e4d, #3fb4984d), 
                                  url('/assets/images/hero-bg.svg?format=webp'), 
                                  url('/assets/images/hero-main.png?size=1920x1080&quality=90');
               }"
          expected [{:url "/assets/images/team/christine-nordal-sunde.jpg?size=400x400"
                     :source-path "/assets/images/team/christine-nordal-sunde.jpg"
                     :width 400 :height 400
                     :replace-url "/assets/images/team/christine-nordal-sunde-400x400.jpg"}
                    {:url "/assets/images/hero-bg.svg?format=webp"
                     :source-path "/assets/images/hero-bg.svg"
                     :replace-url "/assets/images/hero-bg.svg"}
                    {:url "/assets/images/hero-main.png?size=1920x1080&quality=90"
                     :source-path "/assets/images/hero-main.png"
                     :width 1920 :height 1080
                     :replace-url "/assets/images/hero-main-1920x1080.png"}]]
      (is (= expected (sg/extract-image-urls css)))))

  (testing "Skip external URLs in CSS"
    (let [css ".bg {
                 background-image: url('https://cdn.prod.website-files.com/bg.svg?size=100x100'),
                                  url('/assets/images/local.jpg?size=200x200');
               }"
          expected [{:url "/assets/images/local.jpg?size=200x200"
                     :source-path "/assets/images/local.jpg"
                     :width 200 :height 200
                     :replace-url "/assets/images/local-200x200.jpg"}]]
      (is (= expected (sg/extract-image-urls css))))))

(deftest test-sg-get
  (testing "Basic :sg/get replacement"
    (let [template [:div [:h1 [:sg/get :title]]]
          content {:data {:title "Welcome"}}
          expected [:div [:h1 "Welcome"]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/get without :data key looks in content directly"
    (let [template [:div [:h1 [:sg/get :title]]]
          content {:title "Welcome"
                   :body [:p "Content"]}
          expected [:div [:h1 "Welcome"]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/get with missing key returns key name"
    (let [template [:div [:h1 [:sg/get :missing-key]]]
          content {:data {:title "Welcome"}}
          expected [:div [:h1 "missing-key"]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/get nested in attributes"
    (let [template [:a {:href [:sg/get :link]} "Click here"]
          content {:data {:link "/about.html"}}
          expected [:a {:href "/about.html"} "Click here"]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/get with nested data access"
    (let [template [:div [:sg/get :user :name]]
          content {:data {:user {:name "John Doe"}}}
          expected [:div "John Doe"]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/get combined with :sg/body"
    (let [template [:article
                    [:h1 [:sg/get :title]]
                    [:sg/body]]
          content {:body [:p "Article content"]
                   :data {:title "My Article"}}
          expected [:article
                    [:h1 "My Article"]
                    [:p "Article content"]]]
      (is (= expected (sg/process template content))))))

(deftest test-sg-each
  (testing "Basic :sg/each iteration"
    (let [template [:div
                    [:sg/each :news :limit 2
                     [:div.item [:sg/get :title]]]]
          content {:news [{:title "News 1"}
                          {:title "News 2"}
                          {:title "News 3"}]}
          expected [:div
                    [:div.item "News 1"]
                    [:div.item "News 2"]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/each with ordering"
    (let [template [:ul
                    [:sg/each :items :order-by [:date :desc]
                     [:li [:sg/get :date] " - " [:sg/get :name]]]]
          content {:items [{:date "2024-01-01" :name "First"}
                           {:date "2024-03-01" :name "Third"}
                           {:date "2024-02-01" :name "Second"}]}
          expected [:ul
                    [:li "2024-03-01" " - " "Third"]
                    [:li "2024-02-01" " - " "Second"]
                    [:li "2024-01-01" " - " "First"]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/each with nested template"
    (let [template [:section
                    [:sg/each :products :limit 2
                     [:article
                      [:h3 [:sg/get :name]]
                      [:p [:sg/get :description]]]]]
          content {:products [{:name "Product A" :description "Description A"}
                              {:name "Product B" :description "Description B"}
                              {:name "Product C" :description "Description C"}]}
          expected [:section
                    [:article
                     [:h3 "Product A"]
                     [:p "Description A"]]
                    [:article
                     [:h3 "Product B"]
                     [:p "Description B"]]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/each with missing collection"
    (let [template [:div
                    [:sg/each :missing :limit 5
                     [:span "Item"]]]
          content {}
          expected [:div]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/each with :sg/include"
    (let [template [:div.news-grid
                    [:sg/each :news :limit 2
                     [:sg/include :news-card]]]
          content {:news [{:title "News 1" :date "2024-04-15"}
                          {:title "News 2" :date "2024-04-01"}]
                   :includes {:news-card [:div.card
                                          [:h4 [:sg/get :title]]
                                          [:time [:sg/get :date]]]}}
          expected [:div.news-grid
                    [:div.card
                     [:h4 "News 1"]
                     [:time "2024-04-15"]]
                    [:div.card
                     [:h4 "News 2"]
                     [:time "2024-04-01"]]]]
      (is (= expected (sg/process template content)))))

  (testing ":sg/each with complex ordering"
    (let [template [:div
                    [:sg/each :items :order-by [:priority :asc :name :desc]
                     [:div [:sg/get :priority] "-" [:sg/get :name]]]]
          content {:items [{:priority 2 :name "B"}
                           {:priority 1 :name "A"}
                           {:priority 1 :name "C"}
                           {:priority 2 :name "A"}]}
          expected [:div
                    [:div 1 "-" "C"]
                    [:div 1 "-" "A"]
                    [:div 2 "-" "B"]
                    [:div 2 "-" "A"]]]
      (is (= expected (sg/process template content))))))

(testing ":sg/get in nested vector structure (like landing template)"
  (let [template [[:section.hero [:h1 [:sg/get :hero-title]]]
                  [:section.main [:h2 [:sg/get :hero-subtitle]]]]
        content {:hero-title "Title Text"
                 :hero-subtitle "Subtitle Text"}
        expected [[:section.hero [:h1 "Title Text"]]
                  [:section.main [:h2 "Subtitle Text"]]]]
    (is (= expected (sg/process template content)))))

(deftest test-vector-of-vectors-processing
  (testing "Processing a vector of elements"
    (let [template [[:h1 [:sg/get :title]]
                    [:p [:sg/get :description]]]
          content {:title "Welcome"
                   :description "Hello world"}
          expected [[:h1 "Welcome"]
                    [:p "Hello world"]]]
      (is (= expected (sg/process template content)))))

  (testing "Processing nested vectors with :sg/body"
    (let [wrapper [:div [:sg/body]]
          content {:body [[:h1 "Title"]
                          [:p "Paragraph"]]}
          expected [:div [:h1 "Title"] [:p "Paragraph"]]]
      (is (= expected (sg/process wrapper content))))

    (testing "should splice vector of vectors"
      (let [wrapper [:article [:sg/body]]
            content {:body [[:h1 "Title"]
                            [:p "First"]
                            [:p "Second"]]}
            expected [:article [:h1 "Title"] [:p "First"] [:p "Second"]]]
        (is (= expected (sg/process wrapper content))))))

  (testing "Processing :sg/get in vector of elements"
    (let [template [[:h1 [:sg/get :title]]
                    [:section [:p [:sg/get :intro]]]
                    [:footer "Copyright"]]
          content {:title "My Page"
                   :intro "Welcome to our site"}
          expected [[:h1 "My Page"]
                    [:section [:p "Welcome to our site"]]
                    [:footer "Copyright"]]]
      (is (= expected (sg/process template content)))))

  (testing "Combining :sg/body with vector of elements"
    (let [template [:main
                    [:header [:h1 [:sg/get :title]]]
                    [:sg/body]
                    [:footer "© 2024"]]
          content {:title "Page Title"
                   :body [[:section [:p "Content 1"]]
                          [:section [:p "Content 2"]]]}
          expected [:main
                    [:header [:h1 "Page Title"]]
                    [:section [:p "Content 1"]]
                    [:section [:p "Content 2"]]
                    [:footer "© 2024"]]]
      (is (= expected (sg/process template content)))))

  (testing "Vector template with includes"
    (let [template [[:header [:sg/include :nav]]
                    [:main [:sg/body]]
                    [:sg/include :footer]]
          content {:body [:p "Main content"]
                   :includes {:nav [:nav "Navigation"]
                              :footer [:footer "Footer text"]}}
          expected [[:header [:nav "Navigation"]]
                    [:main [:p "Main content"]]
                    [:footer "Footer text"]]]
      (is (= expected (sg/process template content))))))

(deftest test-sg-body-with-sg-each
  (testing ":sg/body with vector of vectors containing :sg/each"
    (let [base-template [:main [:sg/body]]
          body-content [[:h1 "Title"]
                        [:sg/each :items [:div [:sg/get :name]]]
                        [:p "Footer"]]
          content {:body body-content
                   :items [{:name "Item 1"} {:name "Item 2"}]}
          expected [:main
                    [:h1 "Title"]
                    [:div "Item 1"]
                    [:div "Item 2"]
                    [:p "Footer"]]
          actual (sg/process base-template content)]
      (is (= expected actual)))))

(deftest test-sg-get-in-attributes
  (testing ":sg/get in attributes when value exists"
    (let [template [:div {:class [:sg/get :wrap-class]} "Content"]
          content {:wrap-class "reversed"}
          expected [:div {:class "reversed"} "Content"]
          actual (sg/process template content)]
      (is (= expected actual)))))

(deftest test-sg-each-in-vector-of-vectors
  (testing ":sg/each in a vector of vectors should splice results properly"
    (let [;; Template is a vector of vectors (like landing.edn)
          template [[:h1 "Title"]
                    [:sg/each :products
                     [:section [:sg/get :name]]]]
          content {:products [{:name "P1"} {:name "P2"}]}

          ;; Process the template
          result (sg/process template content)

          ;; We expect the products to be spliced at the same level
          expected [[:h1 "Title"]
                    [:section "P1"]
                    [:section "P2"]]]
      (is (= expected result)))))

(deftest test-sg-get-missing-value
  (testing ":sg/get with missing value should return the key name as string"
    (let [template [:div [:sg/get :missing-key]]
          content {:other-key "value"}
          expected [:div "missing-key"]
          actual (sg/process template content)]
      (is (= expected actual))))

  (testing ":sg/get with nested missing value"
    (let [template [:div [:sg/get :deeply :nested :missing]]
          content {:deeply {:nested {:other "value"}}}
          expected [:div "deeply.nested.missing"]
          actual (sg/process template content)]
      (is (= expected actual))))

  (testing ":sg/get in attributes with missing value"
    (let [template [:div {:class [:sg/get :missing-class]} "Content"]
          content {}
          expected [:div {:class "missing-class"} "Content"]
          actual (sg/process template content)]
      (is (= expected actual)))))

(deftest test-sg-get-with-default
  (testing ":sg/get with default value when key is missing"
    (let [template [:div {:class [:sg/get :wrap-class ""]} "Content"]
          content {:title "Product"}
          expected [:div {:class ""} "Content"]
          actual (sg/process template content)]
      (is (= expected actual) "Should return default empty string when key is missing")))

  (testing ":sg/get with default value when key exists"
    (let [template [:div {:class [:sg/get :wrap-class ""]} "Content"]
          content {:wrap-class "reversed"}
          expected [:div {:class "reversed"} "Content"]
          actual (sg/process template content)]
      (is (= expected actual) "Should return actual value when key exists"))))

