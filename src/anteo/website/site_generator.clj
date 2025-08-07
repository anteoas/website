(ns anteo.website.site-generator)

(defn vector-of-vectors? [v]
  (and (vector? v)
       (every? vector? v)))

(defn process
  "Process a base template by replacing :sg/* directives"
  [base content]
  (if (and (vector? base) (seq base))
    (if (= (first base) :sg/body)
      content
      (let [processed-children (map #(process % content) (rest base))]
        (if (some #(and (vector-of-vectors? %) (= % content)) processed-children)
          ;; If we just replaced :sg/body with a vector of vectors, splice it
          (into [(first base)]
                (mapcat #(if (and (vector-of-vectors? %) (= % content))
                           %
                           [%])
                        processed-children))
          ;; Normal case
          (into [(first base)] processed-children))))
    base))
