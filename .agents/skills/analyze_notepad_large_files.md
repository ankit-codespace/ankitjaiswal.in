# Skill: Analyze Large File Guard & Error Boundaries

This skill guides the read-only analysis of file importing, loading paths, editor performance boundaries, and crash detection mechanisms.

## Analysis Instructions

1. **Locate Target Files**:
   - Web version: `artifacts/website/src/pages/tools/notepad.tsx`
   - Desktop version: `notepad-win/src/renderer/src/App.tsx` and `notepad-win/src/main/main.js`

2. **Conduct Complete File Reading**:
   - Read the file-opening functions (`handleOpenFileAccess` on Web, `handleOpenNativeFile` on Desktop) to understand how files are loaded, size checks are performed, and document state objects are created.
   - Read the React rendering cycle of the editor container. Identify how the layout switches based on selected tab and active editor content.

3. **Audit Large File Handling & Performance Modals**:
   - Inspect the current file size limit on Web. Verify that there is currently no check, meaning opening a 5MB+ file on Web will freeze the page.
   - Inspect the `isFileSafe` function in Desktop's `main.js`. Note the hard limit of 1.5MB and how it presents a blocker dialog.
   - Design the state variables required in the frontend (`pendingFileToLoad`, `showLargeFileModal`, `rawTextModeDocs`) to temporarily hold file metadata while prompting the user.

4. **Analyze React Error Boundary Implementation**:
   - Audit if there are existing error boundaries wrapping the main editor viewport.
   - Formulate a custom React Error Boundary component (`NotepadErrorBoundary`) that catches errors in `TipTap`'s schema rendering, state initialization, or spellcheck passes.
   - Design how the boundary will trigger a local state reset to allow the user to view/recover the note as plain text without losing their unsaved work.

5. **Analyze Raw Plain-Text Editor Engine**:
   - Look at the layout styling of the editing area (font face, line height, background, zoom, scrollbars).
   - Formulate a simple `<textarea>` UI that mirrors the active theme's styling, caret color, margin, and typography so it feels visually indistinguishable from TipTap while typing raw text.

## Required Documentation

Produce an analysis summary in `build_log.md` detailing:
1. **Current Constraints**: File loading sizes that trigger lag or crash on Web vs Desktop.
2. **State Additions**: Proposed extensions to `NotepadDoc` interface (like `mode: 'rich' | 'raw'`) and React states.
3. **Modal Design Specs**: Premium, high-end theme-aware layout for the Performance Guard dialog.
4. **Error Boundary Integration**: Where to position the boundary in the component tree to prevent child crash propagation.

## Self-Audit of the Analysis
Before concluding the analysis phase:
- Ensure no code edits were executed.
- Verify that every target file was inspected.
