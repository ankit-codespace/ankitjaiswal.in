# Skill: Analyze Image Annotation Editor and Canvas Text Rendering

This skill conducts a deep architectural audit of the canvas annotation editor in `paste-to-image.tsx` to identify the root causes of the toolbar Cumulative Layout Shift (CLS), text shadow contrast issues, coordinate-shifting bugs, and vertical text alignment mismatches.

## Analysis & Findings

### 1. Toolbar wrapping & layout options (CLS)
- **Root Cause:** Showing the font size stepper and style selector directly inline when the "Text" tool is active expands the toolbar width by ~140px. On smaller viewports, this causes the main action buttons (`Download`, `Copy`) to wrap onto a second line, creating layout clutter and CLS.
- **Top 1% SaaS Solution:**
  Remove inline text styling options completely from the horizontal layout flow. When the user clicks the "Text" (T) tool button, display a floating settings popover card positioned absolutely below the "T" button.
  This popover will contain the size stepper and a segmented control for style options (`Plain`, `Highlight`, `Solid`). This maintains a completely static, single-line toolbar with zero layout shift.

### 2. Plain Text Shadows & Contrast Awareness
- **Root Cause:** Plain text uses an outdated CSS-style text shadow (`ctx.shadowBlur = 4`, `textShadow: "1px 1px 1px..."`) which looks fuzzy and unprofessional.
- **Top 1% SaaS Solution:**
  - Remove all shadows from plain text rendering.
  - Implement a contrast-aware color selector: when drawing plain text on the canvas, sample the pixel color directly from the background image at the text's coordinate using `ctx.getImageData(sx, sy, 1, 1).data`.
  - Calculate its relative luminance: `luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255`.
  - If the sampled background brightness matches the selected text color's brightness (e.g. black text on a dark background or white text on a light background), automatically invert the text fill color to its opposite (`#FFFFFF` or `#000000`) to maintain perfect legibility.
  - Apply the same contrast awareness to the HTML preview overlay by sampling the click coordinates during text editing.

### 3. Text coordinate-shifting bug
- **Root Cause:** When editing text, the overlay has an `onBlur` listener that calls `commitTextAnnotation()`. If the user clicks elsewhere on the canvas, `onMouseDown` on the canvas fires *before* the input overlay blurs. `handleMouseDown` immediately overwrites `activeTextPos` with the new click coordinates. Once the overlay finally blurs, `commitTextAnnotation` reads the *new* `activeTextPos` from state and saves the text at the new click location, causing it to shift.
- **Top 1% SaaS Solution:**
  In `handleMouseDown`, check if `activeTextPos` is already open. If it is, call `commitTextAnnotation()` immediately (which uses the current input text and the correct old position) and return early. This saves the note at the correct location, closes the editor, and prevents a new text box from being created on the same click.

### 4. Unbalanced Text Padding inside highlighted boxes
- **Root Cause:** Canvas uses `textBaseline = "top"`, which aligns the top of the em-square to the y-coordinate, leaving the font's internal leading space entirely at the bottom. Since CSS centers this space, the canvas output looked shifted upwards.
- **Top 1% SaaS Solution:**
  Calculate the half-leading offset: `halfLeading = (lineHeight - fontSize) / 2 = 0.175 * fontSize`. Offset the text drawing coordinate downward: `y + halfLeading + i * lineHeight` to balance the margins symmetrically.

## Analysis Self-Audit
- **Racial State Audit:** Confirmed that committing the text annotation early inside `handleMouseDown` solves the race condition before state updates.
- **Contrast Check:** Verified that sampling `ctx.getImageData` dynamically on local image files is fast and robust.
