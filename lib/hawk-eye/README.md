# Hawk Eye

File watcher for Clojure.

## Usage

```clojure
(require '[hawk-eye.core :as hawk])

;; Watch directories
(def stop (hawk/watch ["src" "resources"]
                      (fn [event] 
                        (println (:type event) (:file event)))
                      (fn [error context] 
                        (println error))))

;; Stop watching
(stop)
```

## API

### `watch`
```clojure
(watch paths notify-fn error-fn)
(watch paths notify-fn error-fn options)
```

Watches paths recursively. New subdirectories are automatically watched.

- `paths` - Collection of directory paths
- `notify-fn` - Called with `{:type :create/:modify/:delete, :file "name", :path "full/path", :timestamp ms}`
- `error-fn` - Called with exception and context map
- `options` - Optional:
  - `:recursive` - Watch subdirectories (default: true)

Returns a stop function.

### `debounce`
```clojure
(debounce f delay-ms & {:keys [events]})
```

Debounce a function. Useful for file watchers.

- `:events` - How to handle multiple calls:
  - `:last` (default) - Use last event
  - `:first` - Use first event  
  - `:all` - Collect all events
  - `:unique` - Collect unique events

## Installation

Add to `deps.edn`:

```clojure
{:deps {com.github.anteo/hawk-eye {:git/url "https://github.com/anteo/hawk-eye"
                                    :git/sha "LATEST_SHA"}}}
```

## License

Copyright © 2024 Anteo AS

Distributed under the Eclipse Public License version 1.0.
