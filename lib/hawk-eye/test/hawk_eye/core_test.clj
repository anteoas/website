(ns hawk-eye.core-test
  (:require [clojure.test :refer [deftest is testing]]
            [hawk-eye.core :as hawk]))

(deftest test-debounce-last
  (testing "debounce with :last (default) mode"
    (let [calls (atom [])
          f (fn [& args] (swap! calls conj args))
          df (hawk/debounce f 50)]

      ;; Make rapid calls
      (df "A")
      (Thread/sleep 10)
      (df "B")
      (Thread/sleep 10)
      (df "C")

      ;; Wait for debounce
      (Thread/sleep 100)

      ;; Should only have last call
      (is (= [["C"]] @calls)))))

(deftest test-debounce-first
  (testing "debounce with :first mode"
    (let [calls (atom [])
          f (fn [& args] (swap! calls conj args))
          df (hawk/debounce f 50 :events :first)]

      ;; Make rapid calls
      (df "A")
      (Thread/sleep 10)
      (df "B")
      (Thread/sleep 10)
      (df "C")

      ;; Wait for debounce
      (Thread/sleep 100)

      ;; Should only have first call
      (is (= [["A"]] @calls)))))

(deftest test-debounce-all
  (testing "debounce with :all mode"
    (let [calls (atom [])
          f (fn [args] (swap! calls conj args))
          df (hawk/debounce f 50 :events :all)]

      ;; Make rapid calls
      (df "A")
      (Thread/sleep 10)
      (df "B")
      (Thread/sleep 10)
      (df "C")

      ;; Wait for debounce
      (Thread/sleep 100)

      ;; Should have vector of all calls
      (is (= [[["A"] ["B"] ["C"]]] @calls)))))

(deftest test-debounce-unique
  (testing "debounce with :unique mode"
    (let [calls (atom [])
          f (fn [args] (swap! calls conj args))
          df (hawk/debounce f 50 :events :unique)]

      ;; Make rapid calls with duplicates
      (df "A")
      (Thread/sleep 10)
      (df "B")
      (Thread/sleep 10)
      (df "A") ; duplicate
      (Thread/sleep 10)
      (df "C")

      ;; Wait for debounce
      (Thread/sleep 100)

      ;; Should have vector of unique calls
      (is (= [[["A"] ["B"] ["C"]]] @calls)))))

(deftest test-debounce-multiple-batches
  (testing "debounce handles multiple batches correctly"
    (let [calls (atom [])
          f (fn [& args] (swap! calls conj args))
          df (hawk/debounce f 50)]

      ;; First batch
      (df 1)
      (df 2)
      (df 3)

      ;; Wait for first batch
      (Thread/sleep 100)

      ;; Second batch
      (df 4)
      (df 5)

      ;; Wait for second batch
      (Thread/sleep 100)

      ;; Should have two calls with last value from each batch
      (is (= [[3] [5]] @calls)))))

(deftest test-find-all-directories
  (testing "find-all-directories returns all subdirectories"
    ;; Create a temp directory structure
    (let [temp-dir (java.nio.file.Files/createTempDirectory
                    "test"
                    (make-array java.nio.file.attribute.FileAttribute 0))
          sub1 (java.nio.file.Files/createDirectory
                (.resolve temp-dir "sub1")
                (make-array java.nio.file.attribute.FileAttribute 0))
          sub2 (java.nio.file.Files/createDirectory
                (.resolve temp-dir "sub2")
                (make-array java.nio.file.attribute.FileAttribute 0))
          subsub (java.nio.file.Files/createDirectory
                  (.resolve sub1 "subsub")
                  (make-array java.nio.file.attribute.FileAttribute 0))]

      (try
        (let [dirs (set (hawk/find-all-directories (str temp-dir)))]
          ;; Should find all directories
          (is (contains? dirs (str temp-dir)))
          (is (contains? dirs (str sub1)))
          (is (contains? dirs (str sub2)))
          (is (contains? dirs (str subsub)))
          (is (= 4 (count dirs))))

        ;; Cleanup
        (finally
          (java.nio.file.Files/delete subsub)
          (java.nio.file.Files/delete sub1)
          (java.nio.file.Files/delete sub2)
          (java.nio.file.Files/delete temp-dir))))))

(deftest test-find-all-directories-nonexistent
  (testing "find-all-directories returns empty for nonexistent path"
    (is (= [] (hawk/find-all-directories "/nonexistent/path/that/does/not/exist")))))

(deftest test-find-all-directories-file
  (testing "find-all-directories returns empty for file path"
    (let [temp-file (java.nio.file.Files/createTempFile
                     "test" ".txt"
                     (make-array java.nio.file.attribute.FileAttribute 0))]
      (try
        (is (= [] (hawk/find-all-directories (str temp-file))))
        (finally
          (java.nio.file.Files/delete temp-file))))))
