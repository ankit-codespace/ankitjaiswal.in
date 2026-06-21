# Skill: Plan Image Annotation Fixing

This skill establishes a phased implementation plan for resolving the toolbar layout shift (CLS) and canvas text padding alignment in `paste-to-image.tsx`.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_annotation_fixes_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: Toolbar Layout CLS Stabilization
- **Step 2.1:** Locate the toolbar tool-specific conditional rendering block in `paste-to-image.tsx` (around lines 1832-1900).
- **Step 2.2:** Wrap the conditional block in a fixed-width container with layout properties:
  `className="w-[270px] flex items-center justify-center shrink-0"`
- **Step 2.3:** Align the internal text tools wrapper and stroke width wrapper to use `w-full justify-center` so that their elements are centered inside the fixed-width box.
- **Step 2.4:** Open the browser and test selecting the "Text" tool and other tools. Verify that the toolbar buttons to the left and right remain completely static with zero layout displacement.

### Phase 3: Canvas Display Text Centering
- **Step 3.1:** Locate the display canvas text rendering code block in `paste-to-image.tsx` (around lines 440-484).
- **Step 3.2:** Define the half-leading offset:
  `const halfLeading = (lineHeight - displayFontSize) / 2;`
- **Step 3.3:** Modify the text line drawer loop to offset the text downward by `halfLeading`:
  `ctx.fillText(line, sx, sy + halfLeading + i * lineHeight);`

### Phase 4: Canvas Download Export Text Centering
- **Step 4.1:** Locate the download export canvas text rendering block in `paste-to-image.tsx` (around lines 1010-1055).
- **Step 4.2:** Define the half-leading offset:
  `const halfLeading = (lineHeight - fs) / 2;`
- **Step 4.3:** Modify the download export line drawer loop to offset the text downward:
  `ctx.fillText(line, px, py + halfLeading + i * lineHeight);`

### Phase 5: Verification, Compilation, and Deployment
- **Step 5.1:** Compile the website client bundle using `npm run build` in the workspace root to check for syntax and type correctness.
- **Step 5.2:** Verify that the padding looks perfectly symmetrical and matches the edit preview overlay.
- **Step 5.3:** Commit all changes to the repository and push to GitHub.
- **Step 5.4:** Deploy the changes to the live site via `deploy/cyberpanel-deploy.sh`.
