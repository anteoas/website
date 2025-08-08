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

      ;; Handle :sg/img
      (and (= (first base) :sg/img)
           (= (count base) 2)
           (map? (second base)))
      (let [img-config (second base)
            {:keys [src width height format]} img-config
            ;; Generate new src based on processing needs
            new-src (if (or width height format)
                      (let [path-parts (clojure.string/split src #"\.")
                            base-path (clojure.string/join "." (butlast path-parts))
                            extension (or format (last path-parts))
                            dimension-part (cond
                                             (and width height) (str "-" width "x" height)
                                             width (str "-" width "x")
                                             :else "")]
                        (str base-path dimension-part "." extension))
                      src)
            ;; Build img attributes, preserving all except format
            img-attrs (-> img-config
                          (dissoc :format)
                          (assoc :src new-src))]
        [:img img-attrs])

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
                                       "quality" (if-let [q (try (Long/parseLong v) (catch Exception _ nil))]
                                                   (assoc m :quality q)
                                                   (assoc m :error (str "Invalid quality: " v)))
                                       "format" (assoc m :format v)
                                       m)))
                                 {}
                                 pairs)))

        generate-replace-url (fn [path params]
                               (let [[base-path ext] (let [last-dot (.lastIndexOf path ".")]
                                                       [(subs path 0 last-dot)
                                                        (subs path (inc last-dot))])
                                     {:keys [width height format]} params
                                     new-ext (or format ext)
                                     size-suffix (cond
                                                   (and width height) (str "-" width "x" height)
                                                   width (str "-" width "x")
                                                   :else "")]
                                 (str base-path size-suffix "." new-ext)))]

    (->> (re-seq url-pattern content)
         (map (fn [[_ url]]
                (let [[path query-string] (clojure.string/split url #"\?" 2)
                      params (parse-params query-string)]
                  (cond-> {:url url
                           :source-path path}
                    (not (:error params)) (merge (select-keys params [:width :height :format :quality])
                                                 {:replace-url (generate-replace-url path params)})
                    (:error params) (assoc :error (:error params))))))
         vec)))
