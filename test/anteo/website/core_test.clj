(ns anteo.website.core-test
  (:require [clojure.test :refer [deftest is testing]]
            [anteo.website.core :as core]
            [anteo.website.site-generator :as sg]
            [clojure.java.io :as io]))

(deftest test-render-page
  (testing "render-page processes content correctly"
    (let [;; Simulate what render-page receives
          page {:content {:template :test-template
                          :hero-title "Test Title"
                          :hero-subtitle "Test Subtitle"
                          :lang :no
                          :lang-prefix ""}
                :content-key :test
                :lang-code :no}

          ;; Templates - simplified versions
          templates {:test-template [[:h1 [:sg/get :hero-title]]
                                     [:h2 [:sg/get :hero-subtitle]]]
                     :wrapper [:html [:body [:sg/body]]]}

          config {:wrapper :wrapper}

          ;; Call render-page
          result (#'core/render-page {:config config :templates templates} page)]

      ;; Check the HTML contains our text
      (is (some? (:html result)))
      (is (string? (:html result)))
      (is (not (.contains (:html result) "hero-title"))) ; Should NOT contain the raw key
      (is (.contains (:html result) "Test Title")) ; Should contain the actual value
      (is (.contains (:html result) "Test Subtitle"))))

  (testing "render-page with missing content returns page unchanged"
    (let [page {:content-key :test :lang-code :no}
          templates {}
          config {:wrapper :wrapper}
          result (#'core/render-page {:config config :templates templates} page)]
      (is (= page result))))) ; Should return the page unchanged
