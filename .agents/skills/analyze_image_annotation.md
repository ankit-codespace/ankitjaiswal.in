# Skill: Analyze Paste-to-Image Annotation Upgrades

This skill conducts a deep technical analysis of clipboard image annotation, canvas context text rendering, and overlay styling inside `paste-to-image.tsx`.

## Analysis Findings

1. **Text Rendering Architecture**:
   - The tool uses a temporary contentEditable `div` overlay (`textOverlayRef`) positioned absolutely over the canvas at `activeTextPos` to capture user input.
   - Once blurred, `commitTextAnnotation()` reads the `innerText`, normalizes the coordinate bounds, and appends a `"text"` annotation object.
   - During canvas redraws (`redrawCanvas` and `buildExportCanvas`), annotations are drawn using `ctx.fillText()`.

2. **The "Generic & Hard to Read" Text Bug**:
   - **Diagnosis**: Plain text annotations rendered directly on the image with `ctx.fillText(line, px, py)` have no backing fill or stroke. If the underlying image region has colors similar to the text, the text becomes invisible or extremely hard to read.
   - **The Golden Solution**: Implement a `textStyle` selection mode:
     - `"normal"` (no background, but with a text outline/shadow to maintain visibility on all backgrounds).
     - `"highlight"` (yellow highlighter background, e.g., `#FFE066` or `#FFD83B`, with high-contrast `#111111` dark text).
     - `"solid"` (solid fill background using the active annotation color, with high-contrast white or dark text).

3. **Background Box Canvas Rendering Math**:
   - To render the background box behind the text lines in canvas:
     - Calculate horizontal padding `hPadding = fontSize * 0.4` and vertical padding `vPadding = fontSize * 0.25`.
     - Query the canvas context to measure the maximum width of all lines:
       ```typescript
       let maxW = 0;
       lines.forEach(line => {
         const w = ctx.measureText(line).width;
         if (w > maxW) maxW = w;
       });
       ```
     - Compute the height of the bounding box: `totalTextHeight = (lines.length - 1) * fontSize * 1.35 + fontSize`.
     - Draw a rounded rectangle from `x = sx - hPadding`, `y = sy - vPadding`, `width = maxW + hPadding * 2`, `height = totalTextHeight + vPadding * 2`.
     - Radii of rounded corners: `fontSize * 0.25`.
     - Use `ctx.roundRect` where supported, with a canvas path quadratic bezier curve fallback.

4. **Self-Audit of the Analysis**:
   - Integrating a text background style toggle into the text tool option bar preserves the Carbon-Zinc aesthetic. Supporting both a universal yellow highlight and a customizable solid color background gives the user maximum speed and versatility without bloat.
