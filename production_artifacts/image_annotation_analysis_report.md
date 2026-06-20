# Image Annotation Highlighting & Upgrades — Analysis Report

## Issue Overview
- **Contrast Issues**: Text overlays placed directly on images without shadows or borders have poor readability, depending heavily on the visual content of the underlying image area.
- **Missing Highlights**: Users cannot emphasize textual elements using a standard "yellow highlighter" style box.
- **Missing Solid Fills**: Users cannot draw opaque boxes behind text matching their selected accent color to block out features or create high-contrast label blocks.
- **Canvas-Export Parity**: Text renders via canvas metrics on redraw and export, but text editing happens in a `contentEditable` absolute container. These two styles must be visually matched in terms of background, text-shadow, borders, padding, and positioning.

## Proposed Strategy
1. **Extend Annotation Type**: Add `textStyle?: "plain" | "highlight" | "solid"` to the text annotation object properties.
2. **Text Options Submenu**: Add button controls in the text toolbar to select the active text style.
3. **Editable Live Overlay CSS**: Set dynamic CSS on the input overlay matching the active style (padding, negative margin offset, border-radius, background, text-shadow, color).
4. **Canvas Draw Logic**: Redraw and measure text width to dynamically paint rounded bounding background boxes using custom `drawRoundedRect` and luminance checks.
5. **Export Mirroring**: Apply matching scale-aware shadows and background coordinates to the export canvas generation code.
