# Build Plan: Ruler Line Hardening

## Phase 1: CSS Upgrades
- Update `.notepad-ruled` and `.surface-light .notepad-ruled` gradients in `notepad-win/src/renderer/src/index.css` to use CSS custom properties.
- Ensure the web client (`artifacts/website/src/pages/tools/notepad.tsx` and custom stylesheets) uses matching gradients.

## Phase 2: Interface Expansion & Style Injection
- Extend `NotepadSettings` interfaces with `rulerOpacity?: "less" | "normal" | "more";` and `DEFAULT_SETTINGS` in both `App.tsx` and `notepad.tsx`.
- Map settings in `editorInnerStyle` to set dynamic CSS variables: `--np-ruler-opacity` and `--np-ruler-opacity-light`.

## Phase 3: Settings Panel UI Controls
- Inject "Line Opacity" toggles container in the Settings modal when `settings.ruledLines` is enabled in both `App.tsx` and `notepad.tsx`.
