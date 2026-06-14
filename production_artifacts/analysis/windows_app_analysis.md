# Windows App Version Analysis

## Overview
The Windows version of "I Love Notepad" is a feature-rich desktop text editor built with Electron, React, and Tiptap.

## Features Implemented
1. **Multi-tab management:** Pin/unpin, tab color coding, duplication, and bulk-closure ("close others", "close to the right").
2. **Centralized Keyboard Shortcuts:** Large global event listener hook handling system commands (save, open, new tab) and editor formatting commands.
3. **Table of Contents (Outline):** Debounced generation of headings outline with scroll-tracking highlighting.
4. **Baseline Grid Snapping:** Adjusts rich text block margins/paddings dynamically using a `MutationObserver` to ensure text lines align perfectly with notebook ruled lines.
5. **Native File API Integrations:** IPC calls for native system open/save file dialogs and autosaving.
6. **Zooming:** Ctrl + +/-/0 key and wheel events to scale content dynamically.

## Desktop-Only Features (To Be Adapted or Skipped)
- `window.electronAPI.showSaveDialog` / `saveFile` / `openFile`: Native OS file interactions.
- `window.electronAPI.closeApp()`: Close application window.
- Double-clicking file association handlers in `preload.js` / main process.
- Electron window drag region CSS rules (`-webkit-app-region: drag`).

## Browser-Safe Features (Safe to Port)
- **Tab Context Menu:** React-based custom right-click context menu (Pin, Duplicate, Close Others, Color coding).
- **Outline Sidebar:** Sidebar component dynamically reading document headers `h1, h2, h3` and syncing selection to scroll position.
- **Rule Lines Grid Snapper:** MutationObserver and resize listener aligning blocks (images, tables, lists) to the line-height baseline.
- **Settings zoom logic:** Math limits and zoom scale state applied to editor canvas.

## Keyboard Shortcuts Bindings
- **Ctrl + = / +**: Zoom In
- **Ctrl + -**: Zoom Out
- **Ctrl + 0**: Reset Zoom
- **Ctrl + ,**: Settings
- **Ctrl + /**: Keyboard Shortcuts dialog
- **Ctrl + S**: Save Note
- **Ctrl + Shift + S**: Save As Note
- **Ctrl + O**: Open Note
- **Ctrl + P**: Print / PDF Export
- **Ctrl + N / T**: New Note
- **Ctrl + W**: Close Active Note
- **Ctrl + Shift + T**: Restore Last Closed Note
- **Ctrl + Tab / Ctrl + Shift + Tab**: Next / Prev Note Tab
- **Ctrl + [1-9]**: Switch to Tab index (1-8, 9 for last)
- **Ctrl + \**: Toggle Outline Sidebar
- **Ctrl + Shift + \**: Toggle Focus Mode
- **Ctrl + H**: Highlight (editor focused)
- **Ctrl + Shift + 1/2/3**: Heading 1/2/3 (editor focused)
- **Ctrl + Shift + U**: Bullet List (editor focused)
- **Ctrl + Shift + L**: Numbered List (editor focused)
- **Ctrl + Shift + K**: Checklist (editor focused)
- **Ctrl + Shift + C**: Code Block (editor focused)
- **Ctrl + Shift + B**: Blockquote (editor focused)
