# Notepad Web Upgrade — Final Summary

## Features Ported
- **Notebook lines grid layout:** Snapped Tiptap document blocks to baseline grid using CSS variables and vertical rhythm styling in `index.css` to prevent alignment drift.
- **Checkbox/Task list styling:** Customized Tiptap checklist styling to render notebook-style checkbox layout matching the desktop version.
- **Tab styling alignment:** Imported custom SVG borders and styling for Chrome-like notebook tabs layout.
- **React-based Custom Tab Context Menu:** Recreated the desktop context menu in React with Pin/Unpin, Rename, Duplicate, Delete, Close Other Tabs, Close Tabs to the Right, and custom Color categories.
- **Tab Color categories:** Ported tab classification logic mapping custom category colors to tabs, persisting state in local storage.
- **Image Right-Click Context Menu:** Ported custom options: copy image to clipboard, delete, download image, and resize layout toggles.
- **File Menu Trigger button & dropdown:** Placed standard file menu trigger and dropdown containing: New Note, Open, Save, Save As, and Print/PDF.
- **Outline (Table of Contents) Sidebar:** Implemented collapsable sidebar compiling list of `h1, h2, h3` from Tiptap document with scrollspy active heading tracking.
- **Baseline Grid Snapper hook:** Added `alignBlocksToGrid` hook utilizing a `MutationObserver` on the editor view DOM to snap pre/table/blockquote/image elements vertically.
- **Zoom controls logic:** Ported zoom-level state and listeners for Ctrl+Scroll / Ctrl+Plus/Minus/Zero, updating CSS style scaling.
- **Duplicate/Close others/Close right actions:** Ported state handlers for tabs duplication and bulk closure.
- **Keyboard shortcuts:**
  - **Ctrl+H & Ctrl+Shift+H:** Both trigger text highlight.
  - **Ctrl+Shift+F:** Triggers Find and Replace pane (replacing `Ctrl+H`).
  - **Ctrl+F:** Custom find pane.

## Features Adapted for Web
- **File Open / Save:** Replaced Electron dialogs with Web File System Access API (`showOpenFilePicker`, `showSaveFilePicker`), falling back to standard browser downloads.
- **Ctrl+F (Find):** Intercepts browser Find using `event.preventDefault()` only when the editor or notepad is active, allowing native browser search otherwise.

## Features Skipped (Desktop-Only)
- **Ctrl+N / Ctrl+T / Ctrl+W / Ctrl+Shift+W / Ctrl+Shift+T:** Reserved by browser and Electron window lifecycle management. Skip overriding to preserve default browser operations.

## Files Changed
- [index.css](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/artifacts/website/src/index.css)
- [notepad.tsx](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/artifacts/website/src/pages/tools/notepad.tsx)
