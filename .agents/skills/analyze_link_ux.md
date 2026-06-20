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

2. **The Toolbar Link Insertion & BubbleMenu Blur Bug**:
   - **Diagnosis**:
     In the current setup, the `<BubbleMenu>` is configured with:
     ```tsx
     shouldShow={({ editor }) => {
       return !!(editor.isFocused && (editor.isActive("link") || isLinkPopoverOpen));
     }}
     ```
     When the user clicks the "Insert Link" button on the toolbar or focuses the `<input>` element inside the `<BubbleMenu>` popover:
     - The editor view loses focus (focus shifts to the toolbar button or the input field).
     - Therefore, `editor.isFocused` immediately evaluates to `false`.
     - Therefore, `shouldShow` evaluates to `false`, causing the link popover to vanish instantly or fail to mount.
   - **The Golden Solution**:
     Decouple `isLinkPopoverOpen` from the editor's focus state in `shouldShow`. If the popover is explicitly open, it must stay visible regardless of editor focus:
     ```tsx
     shouldShow={({ editor }) => {
       return !!(isLinkPopoverOpen || (editor.isFocused && editor.isActive("link")));
     }}
     ```
     This permits focusing the popover input field and clicking the toolbar button without triggering an immediate close.

3. **Floating Link Tooltip (BubbleMenu)**:
   - **Diagnosis**: Since `pointer-events: none` is applied to editor links, users cannot click the link to visit the site directly.
   - **The Golden Solution**: We will implement a custom `<BubbleMenu>` container positioned on the active link. When the cursor is inside a link node, a premium, theme-aware tooltip floats above the cursor. The tooltip contains:
     - The target URL represented as a clickable link (with `pointer-events: auto` so it can be clicked to open in a new tab / browser).
     - An **Edit Link** button.
     - An **Unlink** button (`unsetLink()`) to quickly remove the link markup.

4. **Self-Audit of the Analysis**:
   - Decoupling focus from the popover state inside `shouldShow` resolves the vanishing input field issue. CSS pointer-events bypass combined with a bubble menu is the modern standard for Notion, Figma, and Medium editors.
