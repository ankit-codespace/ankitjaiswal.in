# Skill: Analyze Link Selection and Toolbar UX

This skill conducts a deep analysis of ProseMirror/Tiptap link nodes, mouse event interception in contenteditable, and the toolbar insertion UX to outline a permanent solution for link interaction.

## Analysis Findings

1. **Selection & Click Hijacking Bug**:
   - **Diagnosis**: Chromium-based environments (Electron and Chrome/Brave/Edge) treat `<a>` tags inside contenteditable as draggable/navigable blocks. Clicking inside a link fails to place the text cursor at that click position, drag selection over a link fails, and Shift+Click selection is hijacked.
   - **The Golden Solution**: Style the editor links with `pointer-events: none` in the CSS:
     ```css
     .ProseMirror a {
       pointer-events: none;
     }
     ```
     This instructs the browser to ignore the link element on click, letting clicks pass through to ProseMirror as normal text. This instantly restores native text cursor placement, double-click word selection, drag selection, and Shift+Click selection inside links.
2. **Toolbar Link Insertion Bug**:
   - **Diagnosis**: Currently, clicking the link button in the toolbar triggers `window.prompt()`. This is an outdated design pattern that blocks the browser main thread, interrupts focus state, and doesn't match modern SaaS design principles.
   - **The Golden Solution**: Implement a React-based floating Popover or BubbleMenu that contains editing inputs for URL and Display Text, triggered by clicking the link button or pressing `Ctrl + K`.
3. **Floating Link Tooltip (BubbleMenu)**:
   - **Diagnosis**: Since `pointer-events: none` is applied to editor links, users cannot click the link to visit the site directly.
   - **The Golden Solution**: We will implement a custom `<BubbleMenu>` container positioned on the active link. When the cursor is inside a link node, a premium, theme-aware tooltip floats above the cursor. The tooltip contains:
     - The target URL represented as a clickable link (with `pointer-events: auto` so it can be clicked to open in a new tab).
     - An **Edit Link** button.
     - An **Unlink** button (`unsetLink()`) to quickly remove the link markup.
4. **Markdown Code Blocks Precaution**:
   - Ensure that URLs inside `codeBlock` nodes are not auto-linked by configuring the Tiptap Link extension with `autolink: true` but ensuring it does not apply within code-formatted environments.
5. **Self-Audit of the Analysis**:
   - Using CSS `pointer-events: none` inside the editor + a floating BubbleMenu outside the editor canvas is the exact pattern used by Figma, Notion, and Google Docs. It provides a flawless editing experience while preserving link navigation utility.
