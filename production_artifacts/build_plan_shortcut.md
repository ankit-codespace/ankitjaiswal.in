# Build Plan: Keyboard Shortcuts Consistency

Support both standard and browser-safe restore shortcuts in both clients, and update keyboard help documentation.

## Proposed Changes

### 1. Unified Restoration Hotkeys (`App.tsx`, `notepad.tsx`)
Update keyboard input filters to recognize both combinations:
- `Ctrl + Shift + T`
- `Ctrl + Alt + T`

### 2. Help Panels & Dialog Overlays
- Update confirmation dialog text to display:
  `Ctrl + Shift + T or Ctrl + Alt + T`
- Add both keys to the keyboard shortcut help overlay arrays in `App.tsx` and `notepad.tsx`.
