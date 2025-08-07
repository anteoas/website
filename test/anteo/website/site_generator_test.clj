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