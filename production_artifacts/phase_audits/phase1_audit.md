# Phase 1 Audit — Web Layout & Load Speed

## Layout Alignment Fix
- **Changes**:
  - Implemented URL/path normalization using `.split('?')[0].split('#')[0].replace(/\/$/, '')` to strip query strings, hash parameters, and trailing slashes.
  - Added `/pomodoro` to `TOP_LEVEL_TOOL_ALIASES`.
- **Verification**:
  - The check `cleanLocation.startsWith("/tools/") || TOP_LEVEL_TOOL_ALIASES.has(cleanLocation)` now resolves correctly to hide the global navbar on:
    - `/online-notepad` and `/online-notepad/`
    - `/pomodoro` and `/pomodoro/`
    - `/tools/notepad` and `/tools/notepad/`

## Load Speed Audit
- **Observations**:
  - Heavy editor packages are lazy-loaded via React `lazy` in `App.tsx` (e.g. TipTap, lowlight, jspdf), keeping initial bundle sizes small.
  - Main app bundle is code-split per route.
