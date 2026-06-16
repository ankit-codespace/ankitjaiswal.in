# Size Optimization Build Plan

## Phase 1: Locale Pruning Configuration
- [x] **1.1:** Add `"electronLanguages": ["en-US", "en"]` to the `build` block of `notepad-win/package.json` to filter out non-English locales during package generation.
  * *Audit Check:* Ensure it is placed directly under the root `build` object, parallel to `asar` and `compression`.

## Phase 2: Exclusions & Compression Audit
- [x] **2.1:** Verify that `"asar": true` and `"compression": "maximum"` are configured under the `build` block in `package.json` to ensure optimal file packing.
- [x] **2.2:** Audit the `"files"` exclusions array to confirm that only essential compiled assets (`dist/index.html`, assets) are bundled, ignoring all source files (`src/renderer/src/*`, `.ts`, `.tsx`).

## Phase 3: Build Verification & Telemetry
- [x] **3.1:** Run `npm run build` to compile the renderer and package the binary.
- [x] **3.2:** Verify that the `dist/win-unpacked/locales/` directory has been pruned down to English language packs only.
- [x] **3.3:** Measure the final unpacked folder size and compare it against the baseline (258.79 MB).
- [x] **3.4:** Launch the application and perform testing to verify zero regressions.
