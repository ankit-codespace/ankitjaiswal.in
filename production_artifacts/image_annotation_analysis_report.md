# Image Annotation Layout & Alignment Hardening Audit Report

## 1. Findings
- **Toolbar Layout Shift (CLS)**: The current horizontal layout inline text settings increase toolbar width dynamically when the text tool is active, leading to layout shifts and wrapping.
- **Coordinate-Shifting Bug**: Clicking on the canvas while editing text updates the coordinates in state before the input box finishes its blur handler. When `commitTextAnnotation` runs on blur, it saves the text at the new coordinate instead of the original editing position.
- **Plain Text Contrast & Drop Shadows**: Fuzzy drop shadows look unprofessional. Contrast-awareness is needed to automatically switch text color to black or white if the background color is too close in brightness.
- **Vertical Padding**: Em-square baseline offset leaves text misaligned relative to highlight boxes. Symmetrical half-leading vertical offset resolves this.

## 2. Plan
- Move text settings into a floating settings popover card under the "T" button.
- Fix the coordinate-shifting race condition by committing text early when clicking the canvas.
- Sample background pixel color at the text coordinate to invert text color if contrast is too low, and remove fuzzy plain text shadows.
- Calibrate canvas text vertical offset by `halfLeading`.
