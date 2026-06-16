# Skill: Plan Size Optimization

## Objective
Generate a step-by-step phased execution plan saved to `production_artifacts/build_plan.md` to prune unused package assets and compress the Electron application footprint.

---

## The Build Plan Schema

Your generated plan must divide the optimization process into these phases:

### Phase 1: Locale Pruning Configuration
* **Step 1.1:** Add a configuration to package.json to filter locales during packaging (using the `electronLanguages` option or custom resource filtering) to retain only the essential language packs.
* **Step 1.2:** Alternatively, write or integrate a post-packaging script (using electron-builder's `afterPack` hook) to delete unwanted `.pak` locale files from `dist/win-unpacked/locales`.

### Phase 2: File Exclusion Cleanup
* **Step 2.1:** Inspect the `"files"` array in `package.json`'s build configuration. Add exclusions for map files (`*.map`), source files (`*.ts`, `*.tsx`), markdown files (`*.md`), and test environments to make sure the packaged `app.asar` is as lean as possible.
* **Step 2.2:** Verify that development-only folders or secondary test packages (e.g. source folders, unit test configurations) are explicitly ignored.

### Phase 3: Compilation & Build Verification
* **Step 3.1:** Run `npm run build` to package the optimized application.
* **Step 3.2:** Measure the final size of `dist/win-unpacked` and the setup executable in `dist/` to calculate size savings.
* **Step 3.3:** Run the newly packaged app and perform validation tests (startup, tab switching, file opening) to guarantee that size pruning did not introduce any regressions or stability bugs.
