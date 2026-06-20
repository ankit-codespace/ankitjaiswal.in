# Image Annotation Highlighting & Upgrades — Build Plan

## Implement Steps
1. **Extend Schemas**:
   - Update `Annotation` interface in `paste-to-image.tsx`.
   - Add state hook `[textStyle, setTextStyle]` in `PasteToImage` component.
2. **Implement Helper Functions**:
   - Write `isLightHex(hex)` for auto-contrasting text colors.
   - Write `drawRoundedRect(ctx, x, y, w, h, r)` for background bounding boxes.
3. **Live Overlay Style Hardening**:
   - Bind background, textShadow, padding, margin, color, and caretColor properties to textStyle values on the absolute editing overlay block.
4. **Active Toolbar Selector UI**:
   - Render a button pill group for "Plain", "Highlight", and "Solid" in the active text tool options bar.
5. **Canvas Redraw & Export Rendering**:
   - Modify `redrawCanvas()` to calculate multi-line bounding boxes and render colored/yellow backdrops before drawing text. Add drop shadow parameters to plain style annotations.
   - Mirror the rendering modifications in `buildExportCanvas()` with appropriate image scale adjustments.
6. **Compile & Deploy**:
   - Run `npm run build` on the website repository.
   - Commit changes and deploy.
