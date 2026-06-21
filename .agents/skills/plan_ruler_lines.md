# Skill: Plan Ruler Lines Customization

This skill establishes a phased implementation plan for extending settings interfaces, updating stylesheet variables, injecting reactive inline CSS custom properties, and integrating line opacity selection controls in the settings modal.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_ruler_opacity_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: CSS Stylesheet Configuration
- **Step 2.1:** Edit `notepad-win/src/renderer/src/index.css`.
- **Step 2.2:** Update the `.notepad-ruled` block to use `var(--np-ruler-opacity, 0.07)` for repeating linear gradient transparency.
- **Step 2.3:** Update the `.surface-light .notepad-ruled` block to use `var(--np-ruler-opacity-light, 0.08)`.
- **Step 2.4:** Replicate these edits in the web client stylesheet if they are defined separately (check project resources).

### Phase 3: Settings Interface and Defaults
- **Step 3.1:** Edit `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- **Step 3.2:** Extend the `NotepadSettings` typescript interface with `rulerOpacity?: "less" | "normal" | "more";`.
- **Step 3.3:** Add `rulerOpacity: "normal"` inside `DEFAULT_SETTINGS` object.

### Phase 4: CSS Variable Style Injection
- **Step 4.1:** Edit `editorInnerStyle` styling block in both `App.tsx` and `notepad.tsx`.
- **Step 4.2:** Compute `rulerOpacityVal` and `rulerOpacityLightVal` mappings.
- **Step 4.3:** Inject the custom variables `["--np-ruler-opacity" as string]` and `["--np-ruler-opacity-light" as string]` into the returned styling mapping object.

### Phase 5: Settings Modal UI Integration
- **Step 5.1:** Locate the toggle buttons grid inside the Settings panel JSX structure.
- **Step 5.2:** Add a conditional block rendering the "Line Opacity" option when `settings.ruledLines` is active.
- **Step 5.3:** Map button clicks to `updateSetting("rulerOpacity", value)` with option labels "Faint" (less), "Normal" (normal), and "Distinct" (more).

### Phase 6: Dev Verification & Compilation
- **Step 6.1:** Run compiler checks for desktop renderer: `npm run build:renderer`.
- **Step 6.2:** Run compiler checks for website client: `npm run build`.
- **Step 6.3:** Re-pack Electron installers and visually verify performance and look.
- **Step 6.4:** Commit and push changes.
