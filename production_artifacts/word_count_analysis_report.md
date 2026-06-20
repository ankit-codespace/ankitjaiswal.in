# Word Count Analysis Report

## Current Limitations & Issues
1. **Desktop Initial Load Mismatch**:
   - The desktop app uses `@tiptap/extension-character-count` via `editor?.storage.characterCount?.words()`.
   - On startup, the document loads, but the extension storage isn't initialized or synchronized in the first render cycles, displaying `0 words` until a key is typed.
2. **Missing Selection Statistics**:
   - There is no selection-aware logic. Users highlighting text do not see selection counts like `X of Y words selected`.
3. **Web Feature Parity Gap**:
   - `artifacts/website/src/pages/tools/notepad.tsx` has no word count tracker in the toolbar header. It only displays `savedAgo` status, which is a major UX discrepancy.
4. **Alternative Logic Solution**:
   - Replacing direct calls to the `CharacterCount` extension storage with a custom regex-based word count utility that queries `editor.state.doc.textContent` ensures synchronous, 100% accurate, and immediate word stats on load and during active text selection.

## Proposed Strategy
- Implement a global `countWords` helper function.
- Compute both `total` and `selected` stats reactively using state/memo hooks.
- Format counts as `${selected} of ${total} words selected` when selection is active, falling back to `${total} words`.
- Bring complete feature parity to the Web editor.
