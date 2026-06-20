# Word Count Hardening Implementation Plan

## Phase 1: Desktop Application (`notepad-win/src/renderer/src/App.tsx`)
- Add `countWords(text)` utility.
- Replace `const wordCount = ...` with a `useMemo` that checks selection range `from` and `to` from the active editor instance.
- Construct the string `X of Y words selected` or `Y words` depending on selection state.
- Update header to render the calculated string.

## Phase 2: Web Application (`artifacts/website/src/pages/tools/notepad.tsx`)
- Add `countWords(text)` utility.
- Add `onSelectionUpdate` listener to standard TipTap configuration if missing, or use a component state `editorUpdateTrigger` / `editorVersion` updated inside `onUpdate` and `onSelectionUpdate` callbacks to trigger UI updates.
- Calculate and format the word status string using `useMemo`.
- Render the word status inside the right zone toolbar of the notepad, aligned with `savedAgo`.

## Phase 3: Build & Validation
- Compile Web application.
- Compile Electron renderer.
- Package Windows targets (NSIS & AppX).
- Verify correctness and push changes to GitHub repository.
