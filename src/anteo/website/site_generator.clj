(ns anteo.website.site-generator
  (:require [clojure.string :as str]))

(defn vector-of-vectors? [v]
  (and (vector? v)
       (every? vector? v)))

(defn parse-sg-each-args
  "Parse :sg/each arguments into collection-key, options-map, and template"
  [args]
  (let [collection-key (first args)
        remaining (rest args)
        ;; Find the template - it's a vector that starts with a keyword (hiccup element)
        ;; Options are keyword-value pairs before that
        template-idx (loop [idx 0
                            rem remaining]
                       (cond
                         (empty? rem) idx
                         ;; Found a vector starting with keyword - this is the template
                         (and (vector? (first rem))
                              (keyword? (first (first rem))))
                         idx
                         ;; Skip option key-value pairs
                         (keyword? (first rem))
                         (recur (+ idx 2) (drop 2 rem))
                         ;; Otherwise move forward
                         :else
                         (recur (inc idx) (rest rem))))
        options-list (take template-idx remaining)
        template (nth remaining template-idx nil)
        ;; Parse options as key-value pairs
        options-map (apply hash-map options-list)]
    {:collection-key collection-key
     :options options-map
     :template template}))

(defn process
  "Process a base template by replacing :sg/* directives"
  [base content]
  (let [;; Handle both direct content and map with :body/:includes
        body-content (if (map? content) (:body content) content)
        includes (when (map? content) (:includes content))
        ;; Get data source - either from :data key or directly from content
        data-source (if (contains? content :data)
                      (:data content)
                      content)]
    (cond
      ;; Not a vector, return as-is
      (not (vector? base))
      base

      ;; Empty vector
      (empty? base)
      base

      ;; Vector of vectors - if first element is a vector with a keyword (hiccup element)
      ;; then this is a collection of elements to process
      (and (vector? (first base))
           (keyword? (first (first base))))
      (vec (mapcat (fn [elem]
                     (let [result (process elem content)]
                       ;; If this was an :sg/each that returned multiple elements
                       (if (and (vector? elem)
                                (= (first elem) :sg/each)
                                (vector? result)
                                (every? vector? result))
                         result
                         [result])))
                   base))

      ;; Handle :sg/body
      (= (first base) :sg/body)
      ;; Process body-content if it's a vector of vectors
      (if (vector-of-vectors? body-content)
        (vec (mapcat (fn [elem]
                       (let [result (process elem content)]
                         ;; If result is from :sg/each (vector of vectors), flatten it
                         (if (and (vector? elem)
                                  (= (first elem) :sg/each)
                                  (vector? result)
                                  (every? vector? result))
                           result
                           [result])))
                     body-content))
        body-content)

      ;; Handle :sg/include
      (and (= (first base) :sg/include)
           (= (count base) 2))
      (if-let [included (get includes (second base))]
        (process included content)
        base) ; Return placeholder if not found

      ;; Handle :sg/get
      (and (= (first base) :sg/get)
           (> (count base) 1))
      (let [args (rest base)
            ;; Check if last arg is not a keyword (it's a default value)
            has-default? (and (> (count args) 1)
                              (not (keyword? (last args))))
            path (if has-default? (butlast args) args)
            default-value (when has-default? (last args))
            value (get-in data-source path)]
        (if (some? value)
          value
          ;; Value not found - return default or key name
          (if has-default?
            default-value
            (let [path-str (str/join "." (map name path))
                  verbose? (:verbose content)]
              (println (str "⚠️  :sg/get key not found: " path-str))
              (when verbose?
                (println "Context keys:" (keys data-source))
                (println "Full context:" (pr-str data-source)))
              path-str)))) ; Return placeholder if not found

      ;; Handle :sg/each
      (and (= (first base) :sg/each)
           (>= (count base) 3))
      (let [{:keys [collection-key options template]} (parse-sg-each-args (rest base))
            limit (:limit options)
            order-by (:order-by options)
            ;; Get collection from data source
            collection (get data-source collection-key)]
        (if (and collection (sequential? collection))
          (let [;; Apply ordering if specified
                sorted-coll (if order-by
                              (let [;; Parse order-by: [:field :asc/:desc ...]
                                    order-specs (partition 2 order-by)
                                    comparators (map (fn [[field dir]]
                                                       (if (= dir :desc)
                                                         #(compare (get %2 field) (get %1 field))
                                                         #(compare (get %1 field) (get %2 field))))
                                                     order-specs)]
                                (sort (fn [a b]
                                        (loop [comps comparators]
                                          (if (empty? comps)
                                            0
                                            (let [result ((first comps) a b)]
                                              (if (zero? result)
                                                (recur (rest comps))
                                                result)))))
                                      collection))
                              collection)
                ;; Apply limit if specified
                limited-coll (if limit
                               (take limit sorted-coll)
                               sorted-coll)]
            ;; Process template for each item
            ;; Process template for each item
            (vec (map (fn [item]
                        (let [;; Create new content with current item data
                              item-content (merge content item)
                              processed (process template item-content)]
                          processed))
                      limited-coll)))
          ;; No collection found, return empty
          []))

      ;; Process children recursively
      :else
      (let [tag (first base)
            has-attrs? (and (> (count base) 1) (map? (second base)))
            attrs (when has-attrs? (second base))
            children (if has-attrs? (drop 2 base) (rest base))
            ;; Process attributes if they exist
            processed-attrs (when attrs
                              (reduce-kv (fn [m k v]
                                           (assoc m k (process v content)))
                                         {}
                                         attrs))
            ;; Process children
            processed-children (mapcat (fn [child]
                                         (let [result (process child content)]
                                           (cond
                                             ;; If this was an :sg/each that returned a vector of elements
                                             (and (vector? child)
                                                  (= (first child) :sg/each)
                                                  (vector? result)
                                                  (not (keyword? (first result))))
                                             result

                                             ;; If this was :sg/body that returned a vector of vectors
                                             (and (vector? child)
                                                  (= (first child) :sg/body)
                                                  (vector-of-vectors? result))
                                             result

                                             :else
                                             [result])))
                                       children)]
        ;; Reconstruct the element
        (if (some #(and (vector-of-vectors? %) (= % body-content)) processed-children)
          ;; Splice body content
          (let [spliced (mapcat #(if (and (vector-of-vectors? %) (= % body-content))
                                   %
                                   [%])
                                processed-children)]
            (if processed-attrs
              (into [tag processed-attrs] spliced)
              (into [tag] spliced)))
          ;; Normal case
          (if processed-attrs
            (into [tag processed-attrs] processed-children)
            (into [tag] processed-children)))))))

(defn extract-image-urls
  "Extract image URLs with query parameters from HTML or CSS.
   Returns a vector of maps with :url, :path, :params, and :replace-url.
   Only extracts local images (not http/https) that have query parameters."
  [content]
  (let [;; Regex to match URLs in src attributes and url() in CSS
        ;; Captures: full URL including query params
        url-pattern #"(?:src=[\"']?|url\([\"']?)(/assets/images/[^\"')\s]+\?[^\"')\s]+)"

        parse-params (fn [query-string]
                       (let [params (java.net.URLDecoder/decode query-string "UTF-8")
                             pairs (clojure.string/split params #"&")]
                         (reduce (fn [m pair]
                                   (let [[k v] (clojure.string/split pair #"=" 2)]
                                     (case k
                                       "size" (if-let [[_ w h] (re-matches #"^(\d+)x(.*)$" v)]
                                                (cond
                                                  ;; Both width and height present
                                                  (not (clojure.string/blank? h))
                                                  (if (re-matches #"\d+" h)
                                                    (assoc m :width (Long/parseLong w)
                                                           :height (Long/parseLong h))
                                                    (assoc m :error (str "Invalid height: " h)))

                                                  ;; Width only (e.g. "800x")
                                                  :else
                                                  (assoc m :width (Long/parseLong w)))

                                                ;; Doesn't match pattern at all
                                                (assoc m :error (str "Invalid size format: " v)))
                                       m)))
                                 {}
                                 pairs)))

        generate-replace-url (fn [path params]
                               (let [[base-path ext] (let [last-dot (.lastIndexOf path ".")]
                                                       [(subs path 0 last-dot)
                                                        (subs path (inc last-dot))])
                                     {:keys [width height]} params
                                     size-suffix (cond
                                                   (and width height) (str "-" width "x" height)
                                                   width (str "-" width "x")
                                                   :else "")]
                                 (str base-path size-suffix "." ext)))]

    (->> (re-seq url-pattern content)
         (map (fn [[_ url]]
                (let [[path query-string] (clojure.string/split url #"\?" 2)
                      params (parse-params query-string)]
                  (cond-> {:url url
                           :source-path path}
                    (not (:error params)) (merge (select-keys params [:width :height])
                                                 {:replace-url (generate-replace-url path params)})
                    (:error params) (assoc :error (:error params))))))
         vec)))
