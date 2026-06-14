# Web Version Analysis

## Overview
The Web version of "I Love Notepad" is a React/Tiptap web application running client-side, autosaving to `localStorage`.

## Features Implemented
1. **Multi-tab management:** Basic tab creation, renaming (double-click tab title), deletion, and clearing.
2. **Export functionality:** Clientside triggers to download plain text, HTML, Markdown, and print/export PDF.
3. **Find & Replace:** Local regex-based decoration search over the current document.
4. **Offline Support:** PWA/Service worker capability for loading offline.
5. **Google Drive Sync:** Authentication and sync to Google Drive.

## Missing Features / Differences (To Port/Adapt from Desktop)
1. **Tab Right-Click Context Menu:** Missing completely.
2. **Advanced Tab Options:** Pinning tabs, tab color categorization, duplicate tab, close other tabs, close tabs to the right.
3. **File Menu:** Missing completely (desktop version has a file menu on the left side of the tab strip).
4. **File System Access:** Web version uses downloads for export; it could adapt `showOpenFilePicker`/`showSaveFilePicker` for direct disk read/write like a native editor.
5. **Zoom controls:** Web version has no zoom hotkeys or layout scaling.
6. **Outline / TOC Sidebar:** Web version has no outline sidebar or headings scroll tracker.
7. **Rule Lines Snapping:** Web version has rule lines but lacks baseline grid layout snapped formatting.

## Current Keyboard Shortcuts in Web
- **Ctrl + D:** Smart Export
- **Ctrl + F:** Toggle search pane (Focuses find input)
- **Ctrl + H:** Toggle replace pane (Conflict: should be Highlight!)
- **Ctrl + \\:** Toggle fullscreen focus mode
- **Escape:** Close search, settings, dropdowns.
