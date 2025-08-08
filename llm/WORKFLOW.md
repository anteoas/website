# Development Workflow

## ⚠️ CRITICAL LESSONS FROM SESSIONS ⚠️

### 🚨 SYSTEMATIC DEBUGGING IS NON-NEGOTIABLE 🚨

**The "hero-title" incident:** We spent 30+ minutes chasing a phantom bug because we didn't follow systematic debugging:

**WHAT WENT WRONG:**
1. Saw `<get>hero-title</get>` in HTML output
2. Immediately started editing site-generator.clj 
3. Created cascading failures and corrupted files
4. Realized we were checking output in the wrong directory

**WHAT WE SHOULD HAVE DONE:**
1. ✅ Run existing tests FIRST
2. ✅ Add test cases for the specific issue
3. ✅ Verify assumptions about inputs/outputs
4. ✅ Check which files we're actually reading

**THE RULE:** When debugging, ALWAYS follow this order:
1. **TEST** - Run existing tests
2. **ISOLATE** - Create minimal test case
3. **VERIFY** - Check your assumptions
4. **TRACE** - Follow data flow systematically
5. **FIX** - Only after understanding the issue

### 🚨 ALWAYS CHECK OUTPUT DIRECTORIES 🚨

**We had TWO dist folders:**
- `dist/` (root) - where we should write
- `site/dist/` - old location

**THE RULE:** Before debugging output issues:
```bash
ls -la dist/ site/dist/  # Check ALL possible output locations
pwd                      # Verify working directory
```

### 🚨 RUN CLJ-KONDO BEFORE COMPLETING ANY TASK 🚨

**THIS IS NOT OPTIONAL.** Every file you modify must pass clj-kondo.

```bash
clj-kondo --lint src/anteo/website/core.clj
```

Common issues to fix:
- Unused namespaces (remove them)
- Misplaced docstrings (put before argument list)
- Unused bindings (use `_` prefix or remove)

### 🚨 NEW LESSON: RELOAD NAMESPACES PROPERLY 🚨

**The vector-of-vectors bug:** We fixed the issue in REPL but the file system still had the old code.

**WHAT WENT WRONG:**
1. Fixed `:sg/each` flattening in REPL
2. Tested and it worked
3. But `clj -X:build` still failed
4. Realized we hadn't reloaded the namespace from disk

**THE RULE:** Always reload with `:reload-all` when testing fixes:
```clojure
(require '[namespace] :reload-all)
```

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
Human: "we're in the middle of implementing sg/each"
Assistant: [focuses only on sg/each implementation]
```

### 1. Bottom-Up Development
Build and validate small pieces before combining them into larger solutions.

**Why:** This approach catches errors early and ensures each component works correctly before integration.

**Example from this session:**
```clojure
;; Test :sg/each parsing first
(parse-sg-each-args [:items :limit 2 [:div "template"]])
;; => {:collection-key :items, :options {:limit 2}, :template [:div "template"]}

;; Test ordering logic
(sort-by-options [{:date "2024-01"} {:date "2024-03"}] [:date :desc])
;; => ({:date "2024-03"} {:date "2024-01"})

;; THEN implement full :sg/each
```

### 2. No Shortcuts
Every shortcut creates technical debt and bugs. Think through the problem properly.

**Example from this session:**
```clojure
;; WRONG: String concatenation hack
(defn concatenate-adjacent-strings [v] ...)  ; Complex, fragile

;; RIGHT: Question the requirement
;; "Does Hiccup actually need concatenated strings?"
;; Answer: No! Remove unnecessary code
```

### 3. Test-Driven Development (TDD)

Always write tests first, watch them fail, then implement.

**Examples from this session:**

1. **:sg/each implementation**
   - Wrote 6 comprehensive tests covering all features
   - Tests failed as expected
   - Implemented step by step until all passed

2. **Vector-of-vectors flattening**
   - Reproduced exact error with test
   - Test failed showing double-wrapped vectors
   - Fixed and test passed

3. **:sg/get missing values**
   - Wrote test expecting key name as string
   - Test failed (was returning directive)
   - Implemented with logging

### 4. REPL-Driven Verification

Before implementing anything substantial, validate your approach in the REPL.

**Example from this session:**
```clojure
;; Testing what Hiccup does with mixed content
(str (h/html [:div 1 "-" "C"]))
;; => "<div>1-C</div>"  ; Hiccup concatenates!

;; So our test expecting [:div "1-C"] was wrong
;; Fixed test to expect [:div 1 "-" "C"]
```

### 5. Trace Through Complex Issues

When facing mysterious errors, trace systematically.

**Example from this session:**
```clojure
;; Error: "[:section.product-section ...] is not a valid element name"

;; Step 1: Check if HTML files are strings
(string? (:html (first html-files))) ; => true

;; Step 2: Check where error occurs
"Processing images..." ; After HTML generation!

;; Step 3: Isolate the issue
; Found :sg/each was returning [[:section ...] [:section ...]]
; Instead of splicing

;; Step 4: Write minimal reproduction
(test-sg-each-in-vector-of-vectors)
```

### 6. Edit Files Carefully

**NEVER make large, untested edits to files.**

**THE RULE:** 
- Make small, focused edits
- Test after each edit
- Use `git status` and `git diff` to verify changes
- **If you mess up, USE GIT TO REVERT**

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

- [ ] All tests pass (`clj -M:test`)
- [ ] **CLJ-KONDO PASSES** (`clj-kondo --lint <file>`)
- [ ] New functionality has tests
- [ ] No hardcoded assumptions
- [ ] Error messages are helpful
- [ ] Unused code is removed
- [ ] REPL examples in comment block
- [ ] Complex logic is documented
- [ ] Check correct output directories
- [ ] **Build succeeds** (`clj -X:build`)
- [ ] Update planning documents (TODO.md, DECISIONS.md, etc.)

## Common Anti-Patterns to Avoid

1. **"It works, ship it"** - Always test edge cases
2. **Copy-paste programming** - Extract common patterns
3. **Ignoring warnings** - Fix them or understand why they're safe
4. **"Temporary" hacks** - Do it right the first time
5. **Assuming instead of checking** - Validate your assumptions
6. **Over-engineering** - Question if complexity is needed (concatenate-adjacent-strings!)

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

## Testing Private Functions

When tests need private functions, use the var:
```clojure
;; Instead of
(core/render-page ...)  ; Fails if private

;; Use
(#'core/render-page ...)  ; Works with private functions
```