# Development Workflow

## Core Principles

### 0. Stick to the Plan (MOST IMPORTANT)

**Only do what was explicitly discussed and agreed upon.**

**Why:** Scope creep and unauthorized changes break trust and create unexpected issues.

**Rules:**
1. If it wasn't discussed, don't do it
2. If you notice something that could be improved, ASK FIRST
3. Never "fix" things that aren't part of the current task
4. Complete the agreed work, then stop

**Example from this session:**
```
Human: "add a comment form at the bottom of core with code to run a build"
Assistant: [adds the comment block, then STOPS]

NOT:
Assistant: [adds comment block, then also creates CLAUDE.md file without being asked]
```

**Good pattern:**
```
Assistant: "I notice the footer isn't rendering. Should I fix that?"
Human: "Yes"
Assistant: [fixes the footer]
```

**Bad pattern:**
```
Assistant: [notices issue, fixes it without asking]
```

### 1. Bottom-Up Development
Build and validate small pieces before combining them into larger solutions.

**Why:** This approach catches errors early and ensures each component works correctly before integration.

**Example from this session:**
```clojure
;; WRONG: Writing a complete function without testing parts
(defn build-site [...] 
  ;; 100 lines of untested code
  )

;; RIGHT: Test each piece first
;; Test language detection
(let [lang-config {:no {:default true}}]
  (some (fn [[k v]] (when (:default v) k)) lang-config))
;; => :no

;; Test path calculation  
(defn calculate-output-path [path lang-code default-lang] ...)
;; Test it works correctly

;; THEN combine into build-site
```

### 2. No Shortcuts
Every shortcut creates technical debt and bugs. Think through the problem properly.

**Example from this session:**
```clojure
;; WRONG: Hardcoding assumptions
(if (#{:footer :nav :header} k)  ; Why these? What about :sidebar?
  (assoc m k v))

;; RIGHT: Let the system work it out
:includes templates  ; Just pass all templates, let :sg/include decide
```

### 3. Test-Driven Development (TDD)

Always write tests first, watch them fail, then implement.

**Workflow:**
1. Write test that describes what you want
2. Run test - confirm it fails
3. Write minimal code to pass
4. Refactor if needed

**Example from this session:**
```clojure
;; 1. Write test first
(deftest test-sg-get
  (testing "Basic :sg/get replacement"
    (let [template [:div [:h1 [:sg/get :title]]]
          content {:title "Welcome"}
          expected [:div [:h1 "Welcome"]]]
      (is (= expected (sg/process template content))))))

;; 2. Run and see it fail
;; 3. Implement :sg/get in process function
;; 4. Run test again - green!
```

### 4. REPL-Driven Verification

Before implementing anything substantial, validate your approach in the REPL.

**Example from this session:**
```clojure
;; Before implementing language prefixes, test the logic:
(calculate-output-path "/" :no :no)     ; => "/"
(calculate-output-path "/" :en :no)     ; => "/en/"
(calculate-output-path "/about.html" :en :no) ; => "/en/about.html"

;; Validated? Now implement in build-site
```

### 5. Handle All Cases Properly

When you discover an edge case, handle it properly, don't hack around it.

**Example from this session:**
```clojure
;; WRONG: My sg/process doesn't handle vectors, so I'll map over them
(mapv #(sg/process % content) template)

;; RIGHT: Make sg/process handle vectors properly
(cond
  (and (vector? (first base))
       (keyword? (first (first base))))
  (mapv #(process % content) base)
  ...)
```

## Practical Workflow Steps

### When Adding a New Feature

1. **Understand the requirement**
   - What should it do?
   - What are the edge cases?

2. **Write tests first**
   - Start with the simplest case
   - Add tests for edge cases
   - Run tests to see them fail

3. **Prototype in REPL**
   - Test your logic with simple examples
   - Validate each piece works

4. **Implement incrementally**
   - Start with minimal implementation
   - Run tests after each change
   - Add complexity gradually

5. **Clean up**
   - Remove unused code
   - Add helpful error messages
   - Update documentation

### When Debugging

1. **Reproduce in REPL**
   - Isolate the failing case
   - Test with minimal data

2. **Trace execution**
   - Add println statements
   - Check intermediate values
   - Verify assumptions

3. **Fix root cause**
   - Don't paper over issues
   - Fix the actual problem
   - Add test to prevent regression

## Code Review Checklist

Before considering work complete:

- [ ] All tests pass
- [ ] New functionality has tests
- [ ] No hardcoded assumptions
- [ ] Error messages are helpful
- [ ] Unused code is removed
- [ ] REPL examples in comment block
- [ ] Complex logic is documented

## Common Anti-Patterns to Avoid

1. **"It works, ship it"** - Always test edge cases
2. **Copy-paste programming** - Extract common patterns
3. **Ignoring warnings** - Fix them or understand why they're safe
4. **"Temporary" hacks** - Do it right the first time
5. **Assuming instead of checking** - Validate your assumptions

## REPL Development Tips

Keep a scratch namespace for experiments:
```clojure
(ns scratch
  (:require [anteo.website.core :as core]))

;; Test ideas here before implementing
```

Use the comment block at the bottom of files for common operations:
```clojure
(comment
  ;; Quick build
  (-main "site/site.edn")
  
  ;; Test specific function
  (build-site (load-site-data "site/site.edn") {})
  )
```
