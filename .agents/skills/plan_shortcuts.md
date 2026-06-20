# Skill: Plan Keyboard Shortcuts Hardening & Restore Capabilities

This skill creates a structured, phased plan to separate keyboard shortcuts for Web and Electron, resolve browser collisions, implement `Ctrl+Shift+T` on the web, and preserve closed tabs in history on bulk close actions.

## Plan Creation Steps

1. **Initialize Plan**: Generate a markdown build plan and write it to `production_artifacts/build_plan.md`.
2. **Define Phases**:
   - **Phase 1: Environment Detection**
     - Objective: Establish a runtime check to differentiate Web from Electron.
     - Sub-steps:
       - 1.1: Define `isElectron` constant inside `notepad.tsx`.
         - `const isElectron = typeof window !== "undefined" && ("electron" in window || navigator.userAgent.includes("Electron"));`.
   - **Phase 2: Remap Web Key Listeners & Web Ctrl+Shift+T**
     - Objective: Update the `keydown` event listener in `notepad.tsx` to handle browser-safe shortcuts and support `Ctrl+Shift+T` restore.
     - Sub-steps:
       - 2.1: Intercept `Ctrl + Alt + N` for New Note.
       - 2.2: Intercept `Ctrl + Alt + W` for Close Note.
       - 2.3: Intercept `Ctrl + Alt + PageDown` or `Alt + ArrowRight` for Next Tab, and `Ctrl + Alt + PageUp` or `Alt + ArrowLeft` for Previous Tab.
       - 2.4: Intercept `Ctrl + Alt + 1-8` and `Ctrl + Alt + 9` for Tab switching.
       - 2.5: Remap `Ctrl + Shift + B` -> `Ctrl + Shift + Q` (Blockquote) on the Web.
       - 2.6: Remap `Ctrl + H` -> `Ctrl + Shift + H` (Highlight) on the Web.
       - 2.7: Remap `Ctrl + E` -> `Ctrl + Alt + E` (Inline Code) on the Web.
       - 2.8: Guard `Ctrl + + / - / 0` so they are completely ignored by the Web app's key handler (allowing browser-native zoom).
       - 2.9: Add handler for `Ctrl + Shift + T` on the web to trigger `undoLastDelete()`. If `undoStackRef` is empty, show a toast: "No closed tabs to restore".
   - **Phase 3: Bulk-Close Data Preservation**
     - Objective: Ensure closing multiple tabs (other tabs, tabs to the right) saves the closed documents to history.
     - Sub-steps:
       - 3.1: In desktop `App.tsx`:
         - Modify `closeOtherDocs(idToKeep)`: Find all documents where `id !== idToKeep` and append them to `closedDocsHistory`.
         - Modify `closeDocsToTheRight(id)`: Find all documents not in `idsToKeep` and append them to `closedDocsHistory`.
       - 3.2: In web `notepad.tsx`:
         - Modify `closeOtherDocs(idToKeep)`: Push current `{ docs, activeId }` state to `undoStackRef` before changing state.
         - Modify `closeDocsToTheRight(id)`: Push current `{ docs, activeId }` state to `undoStackRef` before changing state.
   - **Phase 4: Dynamic Cheatsheet & Verification**
     - Objective: Update cheatsheet modal and compile.
     - Sub-steps:
       - 4.1: Modify the array list in the Shortcuts Modal (around line 5231 of `notepad.tsx`) to dynamically map `keys` based on `isElectron`.
       - 4.2: Compile the website bundle (`npm run build`) and the desktop app renderer (`npm run build:renderer`) to verify there are no compilation errors.
