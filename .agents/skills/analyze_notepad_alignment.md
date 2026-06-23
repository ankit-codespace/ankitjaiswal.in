# Skill: Analyze Notepad Alignment

This skill guides the read-only analysis of the web notepad layout anomalies.

## Analysis Instructions

1. **Locate Target Files**:
   - Web version: `artifacts/website/src/pages/tools/notepad.tsx`
   - Desktop version: `notepad-win/src/renderer/src/App.tsx`
   - Global stylesheet: `artifacts/website/src/index.css`

2. **Conduct Complete File Reading**:
   - Read the target files in their entirety before forming findings.
   - Pay close attention to styling, layouts, scroll hooks, event handlers, and document iteration code.

3. **Analyze Tab Margins & Spacing**:
   - Compare `margin` offsets and alignment calculations for active/inactive tabs inside both files.
   - Inspect active tab curves SVG elements and layout dimensions (`minWidth`, `maxWidth`, flex-basis).

4. **Analyze Ruler Line Calculations**:
   - Locate `alignBlocksToGrid` in both `App.tsx` and `notepad.tsx`.
   - Inspect how the formula computes the grid spacing `G` and snap gaps.
   - Verify that `notepad.tsx` currently applies `paddingBottom` instead of `marginBottom` and identify how this stretches backgrounds (e.g. for code blocks).
   - Trace the remainder division math and identify why small sub-pixel remainders bypass the grid snap.

5. **Analyze Scroll Lock & Lenis Integration**:
   - Locate the scroll-gate state `isSeoUnlocked` and its scroll listener.
   - Verify how the page height changes are handled.
   - Verify that Lenis is cached on `window.__lenis` and needs `resize()` when `isSeoUnlocked` toggles.

## Required Documentation

Produce an analysis summary in `build_log.md` detailing:
1. **What Exists**: Currently implemented tabs, scroll, and ruler line snapping logic.
2. **What Is Missing**: Discrepancies between the web page and desktop app implementations.
3. **Risks**: Potential side-effects on editor performance, layout reflow, or type check errors.
4. **Dependencies**: React hooks, Framer Motion transitions, Lenis instances, and TipTap lifecycle events.
5. **Unknowns**: Any variables, window properties, or theme configurations that are not clear.
6. **Web Research Requirement**: Specify whether web research is required (e.g. for Lenis API or Framer Motion properties) and define target search queries if needed.

## Self-Audit of the Analysis
Before concluding the analysis phase:
- Double check that no edit actions were performed.
- Ensure that the documented findings are based on actual code inspection, not assumptions.
- Verify that every target file was inspected.
