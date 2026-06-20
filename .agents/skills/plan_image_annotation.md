# Skill: Plan Paste-to-Image Annotation Upgrades

This skill outlines the step-by-step phased approach to implement the text background highlights, canvas math, style selections, and verify compile targets.

## Phased Implementation Plan

- **Phase 1: State Scaffolding & Helper Logic**
  - **Objective**: Establish types, local toggle state, and color luminance check functions.
  - **Sub-steps**:
    - 1.1: Add `textStyle?: "normal" | "highlight" | "solid"` to the `Annotation` interface in `paste-to-image.tsx`.
    - 1.2: Add a new React state variable: `const [textStyle, setTextStyle] = useState<"normal" | "highlight" | "solid">("normal");`.
    - 1.3: Define helper functions `isLightHex(hex)` and `drawRoundedRect(ctx, x, y, w, h, r)` inside `paste-to-image.tsx`.
- **Phase 2: Toolbar & Live Editing Overlay**
  - **Objective**: Add style controls to the toolbar options bar and style the live editing input box.
  - **Sub-steps**:
    - 2.1: In the options bar (rendered when `currentTool === "text"` next to the Font Size controls), add three toggle buttons representing Normal (Plain), Highlight (Yellow), and Solid Box.
    - 2.2: Style the contentEditable text overlay DOM element (`textOverlayRef`) dynamically based on `textStyle` and `currentColor` (matching backgrounds, paddings, borders, and text colors).
    - 2.3: Modify `commitTextAnnotation()` to save the active `textStyle` state into the new annotation object.
- **Phase 3: Canvas Redraw & Export Rendering**
  - **Objective**: Implement bounding-box canvas drawing logic for both the screen editor view and the high-res file download canvas.
  - **Sub-steps**:
    - 3.1: Modify `redrawCanvas()`: inside the text annotation loop, measure width/height, draw the rounded rectangle background if style is `highlight` or `solid`, and render contrasting text. Add a text shadow/outline to `normal` style text for visibility.
    - 3.2: Replicate the canvas measurement and drawing calculations inside `buildExportCanvas()` to ensure the downloaded images match the editor view exactly.
- **Phase 4: Compile & Production Deploy**
  - **Objective**: Build web assets, run verification checks, and deploy to live servers.
    - 4.1: Run `npm run build` under website root folder.
    - 4.2: Push code changes to GitHub repository.
