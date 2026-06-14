# Notepad Upgrade Diff Report

| Feature | Windows App Behavior | Web Current Behavior | Classification | Notes |
|---------|---------------------|---------------------|----------------|-------|
| Tab Right-click Context Menu | Shows custom menu on right-click of a tab with options: Pin/Unpin, Rename, Duplicate, Delete, Close Others, Close to Right, and Tab Color selection. | None (only double-click to rename title, delete tab is via small cross / menu). | `PORT` | Recreate the custom popup menu context menu interface using browser-safe React events. |
| Tab Color Coding | Category colors stored on document metadata and shown as colored dots on tabs. | None. | `PORT` | Port tab color property to React state/localStorage and render colored dot indicator. |
| Tab Pinning | Reorders pinned tabs to the left/front of the list. Pinned tabs show as compact icons with first letter. | None. | `PORT` | Port layout logic rendering pinned tabs. |
| Duplicate / Bulk Tab Closure | Context menu triggers for duplicating a doc, closing other tabs, closing tabs to the right. | None. | `PORT` | Clean React state mutations for docs array. |
| Native File System Open/Save | Electron-based File Open (`openFile` dialog) and Save/Save As (`showSaveDialog`, `saveFile`) | Client-side export triggers that trigger browser file downloads. | `ADAPT` | Use Web File System Access API (`window.showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle` tracking) where supported, falling back to download triggers. |
| Settings Zoom Control | Ctrl+MouseWheel and Ctrl+Plus/Minus/0 scale the writing area `zoom` setting. | None. | `PORT` | Port React state zoom tracker and apply CSS scale styling. |
| Outline Sidebar | Toggles a sidebar displaying headings (H1, H2, H3), with scrollspy highlighting of the current active heading. | None. | `PORT` | Port debounced headings-spy and sidebar HTML/CSS layout. |
| Baseline Grid Snapper | MutationObserver and window resize listener that snaps block margins/paddings to the line-height vertical grid. | None. | `PORT` | Port the alignment layout hook. |
| Keyboard Shortcuts: Ctrl+H | Highlights text (Tiptap extension). | Opens Find and Replace pane. | `ADAPT` | Repurpose `Ctrl+H` for Highlight. Move Replace panel shortcut to `Ctrl+Shift+F`. |
| Keyboard Shortcuts: Ctrl+Shift+H | Highlights text. | Highlights text (StarterKit standard). | `PORT` | Ensure both `Ctrl+H` and `Ctrl+Shift+H` trigger Tiptap highlight action. |
| Keyboard Shortcuts: Ctrl+F | Focuses native application search bar/find dialog. | Opens app search panel. | `ADAPT` | Ensure `Ctrl+F` intercepts browser Find safely when the editor or notepad is active. |
| Keyboard Shortcuts: Ctrl+Shift+F | None. | None. | `NEW` | Map `Ctrl+Shift+F` to open the Replace pane (replacing `Ctrl+H`). |
| Keyboard Shortcuts: Ctrl+N / T | Opens new note tab. | standard browser new tab/window. | `SKIP` / `ADAPT` | Browser reserves `Ctrl+N` / `Ctrl+T`. Trigger new note via web UI or neutral shortcut if needed. Do not override browser core tabs. |
| Keyboard Shortcuts: Ctrl+W | Closes current note tab. | Closes browser tab/window. | `SKIP` / `ADAPT` | Browser reserves `Ctrl+W`. Skip overriding this globally to avoid breaking browser navigation. |
| Keyboard Shortcuts: Ctrl+Shift+W | Closes application. | None. | `SKIP` | Electron-only command to terminate process. |
| Keyboard Shortcuts: Ctrl+Shift+T | Restores last closed tab. | Restores closed browser tab. | `SKIP` | Browser-reserved shortcut. |
