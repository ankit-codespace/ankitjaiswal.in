# Build Plan: Image Annotation Hardening

## Phase 1: Coordinate-Shifting Bug Fix
In `handleMouseDown`, check if `activeTextPos` is open. If it is, call `commitTextAnnotation()` and return early.

## Phase 2: Text Settings Dropdown (Popover) implementation
Remove inline text options from the toolbar. Implement a floating absolute-positioned settings popover card under the "T" button with click-outside handlers.

## Phase 3: Contrast-Aware Text & Shadow Removal
- Remove plain text drop shadows.
- Sample canvas pixel brightness under the text coordinate and automatically toggle text color between black and white to ensure perfect legibility.

## Phase 4: Canvas Display and Export Text Centering
- Shift canvas display text downward by `halfLeading = (lineHeight - displayFontSize) / 2`.
- Shift canvas export text downward by `halfLeading = (lineHeight - fs) / 2`.
