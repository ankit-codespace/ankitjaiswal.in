# Skill: Plan Image Annotation Fixing

This skill establishes a phased implementation plan for resolving toolbar layout shifts (CLS), removing text shadows, adding contrast-aware coloring, fixing the text placement shift, and centering text padding inside background boxes in `paste-to-image.tsx`.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_annotation_fixes_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: Canvas Text Placement Shift Fix
- **Step 2.1:** Edit `handleMouseDown` in `paste-to-image.tsx` (around lines 773-795).
- **Step 2.2:** Add a check at the top of the "text" tool block: if `activeTextPos` is truthy, call `commitTextAnnotation()` and return early.

### Phase 3: Text Settings Dropdown (Popover) implementation
- **Step 3.1:** Create a new state variable: `const [showTextSettings, setShowTextSettings] = useState(false);`
- **Step 3.2:** Modify the tools mapping loop in the toolbar. Wrap the "text" button in a relative container and add a click-outside handler to close `showTextSettings`.
- **Step 3.3:** Remove the inline Text controls block (lines 1832-1879) from the horizontal toolbar flex layout.
- **Step 3.4:** Implement the floating text settings card under the "text" tool button inside the tools mapping. The card will contain:
  - Font size stepper.
  - Text style segmented control (`Plain`, `Highlight`, `Solid`).

### Phase 4: Contrast-Aware Text & Shadow Removal
- **Step 4.1:** Add a new state for background brightness under the cursor: `const [bgBrightnessUnderText, setBgBrightnessUnderText] = useState<'light' | 'dark' | null>(null);`
- **Step 4.2:** Update `handleMouseDown` to sample the canvas image data at the click coordinate when the text tool is clicked, and set `bgBrightnessUnderText` to `'light'` or `'dark'`.
- **Step 4.3:** Update the HTML overlay style: remove text shadows, and set text color for plain text based on `bgBrightnessUnderText` vs. the selected color.
- **Step 4.4:** Update `drawAnnotations` (display canvas) and `buildExportCanvas` (export canvas) to sample image data at the text coordinate, remove the text shadow, and dynamically select a contrasting color for plain text.

### Phase 5: Canvas Text Vertical Padding Alignment
- **Step 5.1:** Update `drawAnnotations` text loop: shift drawing coordinates downward by `halfLeading = (lineHeight - displayFontSize) / 2`.
- **Step 5.2:** Update `buildExportCanvas` text loop: shift drawing coordinates downward by `halfLeading = (lineHeight - fs) / 2`.

### Phase 6: Verification, Compilation, and Deployment
- **Step 6.1:** Run `npm run build` in the workspace root to check for compiler errors.
- **Step 6.2:** Verify that all layout shifts, contrast adaptions, and padding alignments look flawless.
- **Step 6.3:** Commit changes and deploy using the live deployment script.
