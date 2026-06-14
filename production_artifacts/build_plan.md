# Notepad Upgrade Build Plan

## Phase 0 — Backup and Safety Setup (COMPLETE)
- **0.1** Read `deployment.md` and understand backup. (Done)
- **0.2** Commit pre-upgrade snapshot and push to GitHub. (Done)
- **0.3** Record commit details in `backup_confirmation.md`. (Done)
- **0.4** Initialize `build_log.md`. (Done)

---

## Phase 1 — Visual and CSS Upgrades (Low Risk)
- **1.1 Notebook lines grid layout:**
  - Read Windows `App.css` and `App.tsx` layout structure.
  - Read web `notepad.tsx` and `index.css`.
  - Update `notepad.tsx` / `index.css` to snap rich blocks to baseline grid for ruled lines to prevent alignment drift, using CSS variables and accurate line-height calculations.
- **1.2 Checkbox/Task list styling upgrades:**
  - Read checkbox/task list styles in Windows `App.css`.
  - Style task lists in the web version to look like the desktop version's notebook checkbox.
- **1.3 Tab styling alignment:**
  - Import custom tab layouts and SVG Chrome-like tab shape borders from Windows version to web version tab renderer.

---

## Phase 2 — Context Menu Upgrades (Medium Risk)
- **2.1 React-based Custom Tab Context Menu:**
  - Read right-click tab handler from Windows `App.tsx`.
  - Create a custom browser-safe tab right-click context menu in web `notepad.tsx` containing options: Pin/Unpin, Rename, Duplicate, Delete, Close Other Tabs, Close Tabs to the Right, and Tab Color selection.
- **2.2 Tab Color categories:**
  - Port tab color classification logic, mapping colors to tabs and saving to localStorage.
- **2.3 Image Right-Click Context Menu:**
  - Port image context menu options: Copy to clipboard, Delete, Download image, and Image Size styling triggers.

---

## Phase 3 — File Menu Upgrades (Medium Risk)
- **3.1 File Menu Trigger button:**
  - Place a document/file icon button on the left of the tab strip to match the Windows version's File Menu trigger.
- **3.2 File Menu Dropdown options:**
  - Port options: New Note, Open, Save, Save As, Print/PDF, and Settings triggers.
- **3.3 Web File System Access API adaptation:**
  - Adapt open/save logic to use browser `showOpenFilePicker` and `showSaveFilePicker` if available.
  - Implement full fallback to standard web downloads for browser safety.

---

## Phase 4 — Behavioral Feature Upgrades (Higher Risk)
- **4.1 Outline (Table of Contents) Sidebar:**
  - Port the Outline sidebar component to the web version.
  - Add debounced headers tracker to compile list of `h1, h2, h3` from Tiptap document.
  - Implement scroll spy to highlight active heading on scroll.
- **4.2 Baseline Grid Snapper hook:**
  - Port `alignBlocksToGrid` hook utilizing a `MutationObserver` on the editor view DOM to snap pre/table/blockquote/image elements vertically.
- **4.3 Zoom controls logic:**
  - Port zoom-level state and listeners for Ctrl+Scroll / Ctrl+Plus/Minus/Zero, updating CSS style scaling.
- **4.4 Duplicate/Close others/Close right actions:**
  - Port state handlers for tabs duplication and bulk closure.

---

## Phase 5 — Keyboard Shortcut Updates (Most Delicate)
- **5.1 Dual-binding for Highlight (Ctrl+H & Ctrl+Shift+H):**
  - Bind both `Ctrl+H` and `Ctrl+Shift+H` to toggle highlight on the active Tiptap selection.
- **5.2 Intercept Ctrl+F for App Find:**
  - Bind `Ctrl+F` to open the custom in-page Find dialog, but only intercept default browser behavior when the editor is focused.
- **5.3 Map Ctrl+Shift+F to Replace Pane:**
  - Replace the current `Ctrl+H` replacing binding with `Ctrl+Shift+F`.
- **5.4 Browser shortcut safety audit:**
  - Ensure standard browser hotkeys (`Ctrl+T`, `Ctrl+W`, `Ctrl+N`) are NOT intercepted.

---

## Phase 6 — Final Audit and Cleanup
- **6.1 Code verification:**
  - Perform typechecks and verify compilation success.
- **6.2 Manual Walkthrough:**
  - Test all new visual styling, outline sidebar scroll spy, context menus, file menu options, and keyboard shortcuts.
- **6.3 Final Summary:**
  - Save summary report to `production_artifacts/final_summary.md`.
