(ns build
  (:require [clojure.tools.build.api :as b]))

(def lib 'hawk-eye/hawk-eye)
(def version "0.1.0")
(def class-dir "classes")
(def basis (b/create-basis {:project "deps.edn"}))
(def jar-file (format "target/%s-%s.jar" (name lib) version))

(defn clean [_]
  (b/delete {:path "target"})
  (b/delete {:path "classes/hawk_eye/fsevents/FSEventCallback.class"}))

(defn compile-java [_]
  (println "Compiling Java sources...")
  (b/javac {:src-dirs ["src"]
            :class-dir class-dir
            :basis basis
            :javac-opts ["--release" "11"]})
  (println "Java compilation complete."))

(defn jar [_]
  (clean nil)
  (compile-java nil)
  (println "Building JAR...")
  (b/write-pom {:class-dir class-dir
                :lib lib
                :version version
                :basis basis
                :src-dirs ["src"]})
  (b/copy-dir {:src-dirs ["src" "classes"]
               :target-dir class-dir})
  (b/jar {:class-dir class-dir
          :jar-file jar-file})
  (println "JAR built:" jar-file))

(defn install [_]
  (jar nil)
  (println "Installing to local repository...")
  (b/install {:basis basis
              :lib lib
              :version version
              :jar-file jar-file
              :class-dir class-dir})
  (println "Installation complete."))

(defn all [_]
  (jar nil))