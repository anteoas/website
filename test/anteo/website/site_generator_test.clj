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
