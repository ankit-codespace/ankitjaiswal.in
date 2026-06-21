# Image Annotation & CLS Audit Report

## 1. Findings
- **Cumulative Layout Shift (CLS)**: The annotation toolbar experiences CLS because when `currentTool === 'text'`, a font-size control and style selection buttons are rendered. Otherwise, stroke-width selection buttons are rendered. These two sets of controls have different widths, causing adjacent tools (Undo, Clear, Copy, Download) to shift left or right.
- **Canvas Text Alignment**: Text drawn on the canvas uses `ctx.textBaseline = 'top'`. This creates an asymmetric vertical layout inside the background boxes (especially for highlight and solid text styles), because font metrics have implicit top leading. Shifting the text baseline offset downward by `halfLeading = (lineHeight - fontSize) / 2` will center the text lines relative to the background boxes.

## 2. Recommendation
- Wrap the conditional rendering blocks inside a static-width `w-[270px]` flex container.
- Calculate and apply `halfLeading` to both the display and download canvas text rendering loops.
