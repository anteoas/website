(ns anteo.website.content
  (:require [clojure.string :as str]
            [clojure.edn :as edn]
            [clojure.walk :as walk]
            [markdown.core :as md]
            [babashka.fs :as fs]
            [anteo.website.components :as components]))

(defn parse-edn-file [file]
  (-> (slurp file)
      edn/read-string
      (assoc :file file)))

(defn parse-yaml-frontmatter [content]
  (if (str/starts-with? content "---")
    (let [parts (str/split content #"---\n" 3)]
      (if (>= (count parts) 3)
        (let [yaml-str (nth parts 1)
              body (nth parts 2)
              yaml-lines (str/split-lines yaml-str)
              parsed-data (reduce (fn [acc line]
                                    (if-let [[_ k v] (re-matches #"(\w+):\s*['\"]?(.+?)['\"]?\s*$" line)]
                                      (assoc acc (keyword k) (str/trim v))
                                      acc))
                                  {}
                                  yaml-lines)]
          [parsed-data body])
        [{} content]))
    [{} content]))

(defn parse-markdown-file [file]
  (let [content (slurp file)
        [metadata body] (cond
                          ;; EDN frontmatter
                          (str/starts-with? content "{")
                          (let [end-idx (str/index-of content "\n---\n")]
                            (if end-idx
                              [(edn/read-string (subs content 0 end-idx))
                               (subs content (+ end-idx 4))]
                              [{} content]))

                          ;; YAML frontmatter (for backwards compatibility)
                          (str/starts-with? content "---")
                          (parse-yaml-frontmatter content)

                          :else [{} content])]
    (assoc metadata
           :content (md/md-to-html-string (str/trim body))
           :file file)))

(defn load-content [file]
  (cond
    (str/ends-with? file ".edn") (parse-edn-file file)
    (str/ends-with? file ".md") (parse-markdown-file file)
    :else (throw (ex-info "Unknown file type" {:file file}))))

(declare load-news-items)

(defn anteo-keyword? [k]
  (and (keyword? k)
       (namespace k)
       (str/starts-with? (namespace k) "anteo")))

(defn resolve-placeholder [k content-map]
  (when (anteo-keyword? k)
    (let [ns (namespace k)
          n (name k)]
      (case ns
        "anteo" (get content-map (keyword n))
        "anteo.asset" (get content-map (keyword n))
        "anteo.link" (get content-map (keyword n))
        nil))))

(defn resolve-content
  [structure content-map]
  (walk/postwalk
   (fn [node]
     (cond
       (anteo-keyword? node)
       (or (resolve-placeholder node content-map) node)

       (and (vector? node)
            (= :anteo/for (first node))
            (map? (second node)))
       (let [{:keys [type limit order-by]} (second node)]
         (if (= type :news-card)
           (let [news-items (load-news-items "no" (or limit 3))]
             [:div.news-cards
              (for [item news-items]
                (components/render :news-card item))])
           [:div.dynamic-content "Dynamic content placeholder"]))

       (and (vector? node)
            (= :when (first node))
            (qualified-keyword? (second node)))
       (let [condition-key (second node)
             condition-val (resolve-placeholder condition-key content-map)]
         (if condition-val
           (into [:div] (drop 2 node))
           nil))

       :else node))
   structure))

(defn load-news-items [lang limit]
  (let [news-dir (str "content/" lang "/articles/")
        news-files (when (fs/exists? news-dir)
                     (->> (fs/glob news-dir "*.md")
                          (map str)
                          (sort)
                          (reverse)
                          (take limit)))]
    (mapv (fn [file]
            (let [content (load-content file)
                  filename (fs/file-name file)
                  url-slug (-> filename
                               (str/replace #"\.md$" "")
                               (str/replace #"^\d{4}-\d{2}-\d{2}-" ""))
                  ;; Extract excerpt from content if not available
                  excerpt (if (or (str/blank? (:excerpt content))
                                  (str/starts-with? (str (:excerpt content)) ">"))
                            (let [html-content (:content content)
                                  ;; Extract first paragraph after h1
                                  match (re-find #"</h1><p>(.+?)</p>" html-content)]
                              (if match
                                (-> (second match)
                                    (str/replace #"<[^>]+>" "")
                                    (subs 0 (min 150 (count (second match))))
                                    (str "..."))
                                "Les mer om denne artikkelen"))
                            (:excerpt content))]
              (assoc content
                     :url (str "/articles/" url-slug ".html")
                     :excerpt excerpt)))
          news-files)))