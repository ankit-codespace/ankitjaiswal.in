# Resume Changelog - June 20, 2026

## Features Added & Bugs Fixed
- **Tab Switching Scroll Stutter & Layout Fix**
  - Implemented early scroll capture in tab switch handler to preserve layout metrics before states toggle.
  - Replaced single-editor unmounting with parallel multi-editor DOM trees toggled via CSS display styles.
  - Implemented synchronous layout sync using `useLayoutEffect` to focus the editor and restore scroll positions, avoiding flash of unstyled/unscrolled content.
  - Added Chrome-like uniform flex tab width sizing (`flex: 0 1 150px`) and boundary-checked scrolling to prevent layout shifting jumps and page-wide scrolling triggers.
- **Real-Time Word Count Tracker**
  - Uses Tiptap's character count storage to track the active document's words.
  - Updates the top-right header UI component dynamically.
  - Hides status information on screens narrower than 600px width.
- **Code Block Copy Button Fix**
  - Replaced incorrect `<BoldIcon>` with `<Copy>` icon in the copy-to-clipboard button.
- **Tab Switching hotkey Fix**
  - Added explicit check to prevent `Ctrl + Alt + [1-9]` combinations from executing tab swaps, reserving the action strictly for `Ctrl + [1-9]`.
- **Code Block Line Break Preservation**
  - Preserved `hardBreak` (Shift+Enter) line breaks during block toggling by supplying a custom leafText parser to `textBetween`.
  - Built updated setup installer for offline Windows usage.
