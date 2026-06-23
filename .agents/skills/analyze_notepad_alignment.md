# Skill: Analyze Notepad Alignment

This skill guides the read-only analysis of the web notepad layout anomalies.

## Analysis Instructions

1. **Locate Target Files**:
   - Web version: `artifacts/website/src/pages/tools/notepad.tsx`
   - Desktop version: `notepad-win/src/renderer/src/App.tsx`
   - Global stylesheet: `artifacts/website/src/index.css`
2. **Analyze Tab Margins & Spacing**:
   - Compare `margin` offsets and alignment calculations for active/inactive tabs inside both files.
   - Inspect active tab flare curves SVG elements and layout dimensions (`minWidth`, `maxWidth`, flex-basis).
3. **Analyze Ruler Line Calculations**:
   - Locate `alignBlocksToGrid` in both `App.tsx` and `notepad.tsx`.
   - Inspect how the formula computes the grid spacing `G` and snap gaps.
   - Verify that `notepad.tsx` currently applies `paddingBottom` instead of `marginBottom` and identify how this stretches backgrounds (e.g. for code blocks).
   - Trace the remainder division math and identify why small sub-pixel remainders bypass the grid snap.
4. **Analyze Scroll Lock & Lenis Integration**:
   - Locate the scroll-gate state `isSeoUnlocked` and its scroll listener.
   - Verify how the page heights changes are handled.
   - Verify that Lenis is cached on `window.__lenis` and needs `resize()` when `isSeoUnlocked` toggles.

## Expected Output

Produce an analysis summary in `build_log.md` detailing:
- Key differences in tab layout and ruler snapping logic between the web and desktop code.
- How the scroll freeze occurs and the exact lines where Lenis integration will be added.
