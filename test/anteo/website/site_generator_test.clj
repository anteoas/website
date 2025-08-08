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
                     :path "/assets/images/hero.jpg"
                     :params {:width 800 :height 600 :format "webp"}
                     :replace-url "/assets/images/hero-800x600.webp"}
                    {:url "/assets/images/logo.png?size=200x100"
                     :path "/assets/images/logo.png"
                     :params {:width 200 :height 100}
                     :replace-url "/assets/images/logo-200x100.png"}
                    {:url "/assets/images/bg.jpg?size=1920x1080&format=webp"
                     :path "/assets/images/bg.jpg"
                     :params {:width 1920 :height 1080 :format "webp"}
                     :replace-url "/assets/images/bg-1920x1080.webp"}]]
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
                     :path "/assets/images/photo.png"
                     :params {:width 400 :height 300 :quality 85}
                     :replace-url "/assets/images/photo-400x300.png"}
                    {:url "/assets/images/hero.jpg?size=1200x800"
                     :path "/assets/images/hero.jpg"
                     :params {:width 1200 :height 800}
                     :replace-url "/assets/images/hero-1200x800.jpg"}
                    {:url "/assets/images/icon.svg?size=32x32"
                     :path "/assets/images/icon.svg"
                     :params {:width 32 :height 32}
                     :replace-url "/assets/images/icon-32x32.svg"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Handle width-only sizing"
    (let [html "<img src='/assets/images/wide.jpg?size=800x&format=webp'>"
          expected [{:url "/assets/images/wide.jpg?size=800x&format=webp"
                     :path "/assets/images/wide.jpg"
                     :params {:width 800 :format "webp"}
                     :replace-url "/assets/images/wide-800x.webp"}]]
      (is (= expected (sg/extract-image-urls html)))))

  (testing "Handle malformed parameters gracefully"
    (let [html "<div>
                  <img src='/assets/images/bad1.jpg?size=notanumber'>
                  <img src='/assets/images/bad2.jpg?size=800xabc'>
                  <img src='/assets/images/bad3.jpg?quality=high'>
                </div>"
          expected [{:url "/assets/images/bad1.jpg?size=notanumber"
                     :path "/assets/images/bad1.jpg"
                     :error "Invalid size format: notanumber"}
                    {:url "/assets/images/bad2.jpg?size=800xabc"
                     :path "/assets/images/bad2.jpg"
                     :error "Invalid height: abc"}
                    {:url "/assets/images/bad3.jpg?quality=high"
                     :path "/assets/images/bad3.jpg"
                     :error "Invalid quality: high"}]]
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
                     :path "/assets/images/team/christine-nordal-sunde.jpg"
                     :params {:width 400 :height 400}
                     :replace-url "/assets/images/team/christine-nordal-sunde-400x400.jpg"}
                    {:url "/assets/images/hero-bg.svg?format=webp"
                     :path "/assets/images/hero-bg.svg"
                     :params {:format "webp"}
                     :replace-url "/assets/images/hero-bg.webp"}
                    {:url "/assets/images/hero-main.png?size=1920x1080&quality=90"
                     :path "/assets/images/hero-main.png"
                     :params {:width 1920 :height 1080 :quality 90}
                     :replace-url "/assets/images/hero-main-1920x1080.png"}]]
      (is (= expected (sg/extract-image-urls css)))))

  (testing "Skip external URLs in CSS"
    (let [css ".bg {
                 background-image: url('https://cdn.prod.website-files.com/bg.svg?size=100x100'),
                                  url('/assets/images/local.jpg?size=200x200');
               }"
          expected [{:url "/assets/images/local.jpg?size=200x200"
                     :path "/assets/images/local.jpg"
                     :params {:width 200 :height 200}
                     :replace-url "/assets/images/local-200x200.jpg"}]]
      (is (= expected (sg/extract-image-urls css))))))

