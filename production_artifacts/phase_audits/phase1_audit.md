# Phase 1 Audit: Locale Pruning Configuration

## 1. Goal
Filter out unneeded regional Chromium locale files (`.pak`) during compilation to save ~35MB of redundant installation space.

## 2. Changes Applied
* Added `"electronLanguages": ["en-US", "en"]` to `notepad-win/package.json` under the `"build"` block.

## 3. Verification Details
* Opened `package.json` and verified the syntax is valid JSON.
* Confirmed that `"electronLanguages"` is at the correct level of the configuration hierarchy.
* Build run will follow in Phase 3 to verify actual file exclusion from `dist/win-unpacked/locales/`.

## 4. Status: PASS
