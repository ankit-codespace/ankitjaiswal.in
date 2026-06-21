# Link UX & Selection Hardening — Analysis Report

## Identified UX Shortcomings
1. **Toolbar Insert Link Focus-Loss**: When clicking "Insert Link" in the toolbar, focus leaves the editor. Tiptap's standard `<BubbleMenu>` shouldShow condition `editor.isFocused` returns false, closing or preventing the popover from mounting.
2. **Tippy Input Focus Conflict**: The `<input>` element inside the popover is autoFocused. Once focused, the editor loses focus, causing `editor.isFocused` to become false, which immediately closes the popover.
3. **State Leakage on Note Switch**: Switching active documents (`activeId`) does not unmount the page. The local `isLinkPopoverOpen` state remains true, automatically showing the link popover on the newly activated note.
4. **Link Selection Interruption**: By default, browsers treat `<a>` elements inside a `contenteditable` container as links, blocking selection, dragging, and normal cursor clicks.

## Proposed Strategy
1. **Focus Decoupling in shouldShow**: Update `shouldShow` callback on `<BubbleMenu>` to evaluate `true` if the editor *or* any element within the Tippy popover (like the input field) has focus.
2. **Editor Refocus in insertLink**: Force the editor to chain focus prior to opening the popover.
3. **Active Note Switching isolation**: Reset link popover states (`isLinkPopoverOpen`, `isEditingLink`) inside a `useEffect` hook listening to `activeId`.
4. **Pointer Events Bypass**: Retain `.ProseMirror a { pointer-events: none; }` inside the CSS sheets so the cursor treats links like editable text, relying on the popover to show clickable anchors.
