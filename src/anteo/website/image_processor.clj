(ns anteo.website.image-processor
  "Image processing wrapper using Thumbnailator and TwelveMonkeys.
   
   Usage:
   (process-image {:source-path \"src/assets/images/hero.jpg\"
                   :width 800
                   :height 600
                   :format \"webp\"  ; optional, defaults to source format
                   :quality 85      ; optional, defaults to 80
                   :output-dir \".temp/images\"})
   
   Supported output formats: JPEG, PNG, BMP, GIF"
  (:require [clojure.java.io :as io]
            [clojure.string :as str])
  (:import [net.coobird.thumbnailator Thumbnails Thumbnails$Builder]
           [javax.imageio ImageIO]
           [java.io File]
           [java.awt Graphics2D Color Font BasicStroke]
           [java.awt.image BufferedImage]))

(set! *warn-on-reflection* true)

(defn- get-image-format
  "Determine output format from source extension and format parameter"
  [source-path format]
  (or format
      (when source-path
        (let [ext (-> source-path
                      (str/split #"\.")
                      last
                      str/lower-case)]
          (case ext
            "jpg" "jpeg"
            "jpeg" "jpeg"
            "png" "png"
            "gif" "gif"
            "bmp" "bmp"
            ;; Default to PNG for unsupported formats
            "png")))))

(defn- generate-output-filename
  "Generate output filename with dimensions and format"
  [source-path width height format]
  (let [file (io/file source-path)
        file-name (.getName ^File file)
        parts (str/split file-name #"\.")
        name-without-ext (if (> (count parts) 1)
                           (str/join "." (butlast parts))
                           file-name)
        actual-format (get-image-format source-path format)
        ;; Build filename based on what processing is needed
        output-name (cond
                      ;; Both width and height specified
                      (and width height)
                      (str name-without-ext "-" width "x" height "." actual-format)

                      ;; Only width specified
                      width
                      (str name-without-ext "-" width "x." actual-format)

                      ;; No dimensions but format conversion
                      format
                      (str name-without-ext "." actual-format)

                      ;; No processing - keep original name
                      :else
                      file-name)]
    output-name))

(defn- create-placeholder-image
  "Create a simple placeholder BufferedImage"
  [^Integer width ^Integer height ^String text]
  (let [img (BufferedImage. width height BufferedImage/TYPE_INT_RGB)
        g ^Graphics2D (.createGraphics img)]
    ;; Enable antialiasing
    (.setRenderingHint g java.awt.RenderingHints/KEY_ANTIALIASING
                       java.awt.RenderingHints/VALUE_ANTIALIAS_ON)
    (.setRenderingHint g java.awt.RenderingHints/KEY_TEXT_ANTIALIASING
                       java.awt.RenderingHints/VALUE_TEXT_ANTIALIAS_ON)

    ;; Background
    (.setColor g (Color. 224 224 224)) ; #e0e0e0
    (.fillRect g 0 0 width height)

    ;; Border
    (.setColor g (Color. 153 153 153)) ; #999
    (.setStroke g (BasicStroke. 2.0))
    (let [margin (int (* 0.1 (min width height)))]
      (.drawRect g margin margin (- width (* 2 margin)) (- height (* 2 margin))))

    ;; Text
    (.setColor g (Color. 51 51 51)) ; #333 - darker for better contrast
    (let [font-size (int (* 0.1 (min width height)))
          font (Font. "Arial" Font/BOLD font-size)] ; Use bold font
      (.setFont g font)
      (let [fm (.getFontMetrics g)
            text-width (.stringWidth fm text)]
        (.drawString g text
                     (int (/ (- width text-width) 2))
                     (int (* 0.45 height)))))

    ;; Dimensions text
    (let [dims-text (str width "×" height)
          font-size (int (* 0.08 (min width height)))
          font (Font. "Arial" Font/PLAIN font-size)]
      (.setFont g font)
      (.setColor g (Color. 153 153 153)) ; #999
      (let [fm (.getFontMetrics g)
            text-width (.stringWidth fm dims-text)]
        (.drawString g dims-text
                     (int (/ (- width text-width) 2))
                     (int (* 0.55 height)))))

    (.dispose g)
    img))

(defn- generate-placeholder
  "Generate placeholder image when source is missing"
  [{:keys [output-path width height source-path format]
    :or {}}]
  (let [file (io/file source-path)
        filename (.getName ^File file)
        buffered-image (create-placeholder-image width height filename)
        output-format (get-image-format source-path format)
        output-file (io/file output-path)]

    ;; Ensure parent directory exists
    (io/make-parents output-file)

    ;; Write the image using ImageIO
    (ImageIO/write ^BufferedImage buffered-image ^String output-format ^File output-file)

    {:output-path (.getAbsolutePath ^File output-file)
     :processed? true
     :placeholder? true}))

(defn process-image
  "Process a single image with given options.
   Generates placeholder if source doesn't exist.
   Copies as-is if no width/height/format specified.
   No-op if output already exists."
  [{:keys [source-path width height format quality output-dir]
    :or {quality 80}}]
  (try
    (let [output-filename (generate-output-filename source-path width height format)
          output-file (io/file output-dir output-filename)
          output-path (.getAbsolutePath ^File output-file)]

      ;; Check if output already exists
      (if (.exists ^File output-file)
        {:output-path output-path
         :processed? false
         :placeholder? false
         :error nil}

        ;; Check if source exists
        (let [source-file (io/file source-path)]
          (if (.exists ^File source-file)
            ;; Process or copy the actual image
            (do
              ;; Ensure output directory exists
              (io/make-parents output-file)

              (if (or width height format)
                ;; Process with Thumbnailator
                (let [quality-decimal (/ quality 100.0)
                      files ^"[Ljava.io.File;" (into-array File [source-file])
                      builder ^Thumbnails$Builder (Thumbnails/of files)]
                  ;; Only set size if dimensions are provided
                  (when (and width height)
                    (.size builder width height))
                  ;; Set quality
                  (.outputQuality builder quality-decimal)
                  ;; Write to file
                  (.toFile builder output-file)

                  {:output-path output-path
                   :processed? true
                   :placeholder? false
                   :error nil})

                ;; Just copy the file as-is
                (do
                  (io/copy source-file output-file)
                  {:output-path output-path
                   :processed? true
                   :placeholder? false
                   :error nil})))

            ;; Generate placeholder
            (generate-placeholder {:output-path output-path
                                   :width (or width 400)
                                   :height (or height 300)
                                   :source-path source-path
                                   :format format})))))

    (catch Exception e
      {:output-path nil
       :processed? false
       :placeholder? false
       :error (.getMessage e)})))
