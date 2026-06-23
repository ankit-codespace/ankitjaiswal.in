# Skill: Plan Notepad Alignment

This skill guides the creation of the phased implementation plan and records it inside `production_artifacts/build_plan.md`.

## Planning Instructions

Create `production_artifacts/build_plan.md` with the following structure:

### Phase 1: Scroll Recovery and Layout Sizing
- **Objective**: Restore the window scrollability by bridging the scroll-gate toggle with the Lenis smooth-scroll instance.
- **Sub-steps**:
  - `1.1`: Implement a `useEffect` hook in `notepad.tsx` observing `isSeoUnlocked`.
  - `1.2`: In the hook, call `(window as any).__lenis?.resize()` after a brief layout paint timeout (e.g. 100ms) to update Lenis scroll bounds.
  - `1.3`: Verify viewport height values (`min-height` and outline sidebar heights) to ensure consistent layout boundaries.
- **Verification**: Manually check scroll behavior with the guide toggle.

### Phase 2: Notebook Ruler Line Alignment
- **Objective**: Fix the lined ruler math in `notepad.tsx` to align blocks using the precise margin snap formula of the desktop app.
- **Sub-steps**:
  - `2.1`: Update `alignBlocksToGrid` selector in `notepad.tsx` to target `.notepad-code-block-wrapper, table, blockquote, hr, img, .image-node`.
  - `2.2`: Replace `paddingBottom` snaps with `marginBottom` snaps.
  - `2.3`: Port the math calculation: `targetHeight = Math.ceil((naturalHeight + G / 2) / G) * G` and `needed = targetHeight - naturalHeight`. Ensure we clean up custom styles if `ruledLines` is turned off.
- **Verification**: Test that code blocks and images align and space out perfectly without stretching their internal backgrounds.

### Phase 3: Active Tab Visual Standardizing
- **Objective**: Synchronize active tab margin offsets and visual parameters with the desktop app.
- **Sub-steps**:
  - `3.1`: Audit active/inactive tab margins and correct the offset logic to reference `sortedDocs`.
  - `3.2`: Verify curves and colors look clean across both themes.
- **Verification**: Perform a workspace build using `pnpm run build`.
