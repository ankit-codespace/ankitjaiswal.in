# Find & Replace UX Hardening — Build Plan

## Objective
Harden Find & Replace panel usability across targets (Web, Desktop), fix keyboard bindings, and optimize theme-level visual styling.

## Action Steps
1. **Phase 1: Keyboard Shortcuts Wiring**
   - Bind `Ctrl+F` and `Ctrl+Shift+F` key combinations globally to toggle and focus the find/replace inputs.
   - Restructure highlight keyboard shortcuts.
2. **Phase 2: Premium Visual Styles (Desktop)**
   - Polish input heights to `28px` and declare local states for styling on focus active.
   - Refactor panels, icons, chevrons, close button and match count visibility.
3. **Phase 3: Premium Visual Styles (Web)**
   - Port identical visual standards, inputs styling, chevrons, close buttons, and accent borders into the web portfolio `notepad.tsx`.
4. **Phase 4: Dev Verification & Packaging**
   - Validate TypeScript, run local Vite/Pnpm compiling tests, build desktop renderer, and bundle Windows packages.
