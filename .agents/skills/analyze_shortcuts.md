# Skill: Analyze Keyboard Shortcuts & Tab Restore Collision

This skill conducts a deep analysis of browser-native shortcut collisions and the lack of tab preservation on bulk-close actions in the web portfolio notepad compared to the Electron desktop application.

## Analysis Steps

1. **Verify Web Environment Interception Constraints**:
   - Understand browser security sandboxing: shortcuts like `Ctrl+N` (New Window), `Ctrl+W` (Close Tab), `Ctrl+Tab` (Next Tab), `Ctrl+Shift+Tab` (Prev Tab), and `Ctrl+1-9` (Switch Browser Tabs) are captured at the browser/OS application level. Calling `e.preventDefault()` in JS is ignored.
2. **Audit Collision Points in `notepad.tsx` (Web version)**:
   - Identify formatting collisions:
     - `Ctrl+H` triggers Chrome History instead of text highlight.
     - `Ctrl+Shift+B` triggers Chrome Bookmarks bar instead of blockquote.
     - `Ctrl+E` focuses Chrome address bar instead of inline code.
   - Identify zoom collisions:
     - `Ctrl++`, `Ctrl+-`, and `Ctrl+0` trigger browser-native zoom. Having an internal custom CSS zoom running concurrently leads to double-scaling issues.
3. **Audit Electron `App.tsx` and Web `notepad.tsx` Tab Restore Stack**:
   - Identify that on the web, `Ctrl+Shift+T` (Restore Closed Note) is listed in the cheatsheet but is **completely missing** from the keydown event listener in the code.
   - Identify that in both the desktop app (`App.tsx`) and web version (`notepad.tsx`), bulk tab closing operations (`closeOtherDocs` and `closeDocsToTheRight`) **do not preserve** the closed documents in history/undo. They are immediately garbage collected, meaning `Ctrl+Shift+T` or `Undo` returns "No closed tabs to restore".
4. **Formulate Environment-Aware Remapping Strategy**:
   - Determine which shortcuts must remain as-is in the Electron app.
   - Determine alternative, conflict-free combinations for the Web app:
     - Document management -> `Ctrl + Alt + N` (New Note), `Ctrl + Alt + W` (Close Note), `Ctrl + Alt + T` (Restore Closed Note)
     - Tab navigation -> `Ctrl + Alt + PageUp` / `PageDown` or `Alt + ArrowLeft` / `ArrowRight` (Next/Prev Tab), `Ctrl + Alt + 1-9` (Switch Tab 1-9)
     - Formatting -> `Ctrl + Shift + H` (Highlight), `Ctrl + Shift + Q` (Blockquote), `Ctrl + Alt + E` (Inline Code)
     - Zoom -> Disable custom keys on Web; rely on browser native zoom.
5. **Formulate Data Preservation (Undo/Restore) Strategy**:
   - For `closeOtherDocs` and `closeDocsToTheRight` in `App.tsx`: Push all closed documents onto `closedDocsHistory` so repeated `Ctrl+Shift+T` calls can restore them one-by-one.
   - For `closeOtherDocs` and `closeDocsToTheRight` in `notepad.tsx`: Push a snapshot to `undoStackRef` before executing the tab list filter, allowing a single `Undo` or `Ctrl+Shift+T` to restore all closed tabs at once.
   - Implement the `Ctrl+Shift+T` key binding in the web version's keyboard event listener to trigger the undo action.
