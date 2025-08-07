(ns anteo.website.site-generator)

(defn vector-of-vectors? [v]
  (and (vector? v)
       (every? vector? v)))

(defn process
  "Process a base template by replacing :sg/* directives"
  [base content]
  (let [;; Handle both direct content and map with :body/:includes
        body-content (if (map? content) (:body content) content)
        includes (when (map? content) (:includes content))]
    (cond
      ;; Not a vector, return as-is
      (not (and (vector? base) (seq base)))
      base

      ;; Handle :sg/body
      (= (first base) :sg/body)
      body-content

      ;; Handle :sg/include
      (and (= (first base) :sg/include)
           (= (count base) 2))
      (if-let [included (get includes (second base))]
        included
        base) ; Return placeholder if not found

      ;; Process children
      :else
      (let [processed-children (map #(process % content) (rest base))]
        (if (some #(and (vector-of-vectors? %) (= % body-content)) processed-children)
          ;; If we just replaced :sg/body with a vector of vectors, splice it
          (into [(first base)]
                (mapcat #(if (and (vector-of-vectors? %) (= % body-content))
                           %
                           [%])
                        processed-children))
          ;; Normal case
          (into [(first base)] processed-children))))))
