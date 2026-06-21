# Skill: Analyze Link Selection and Toolbar UX

This skill conducts a deep architectural audit of the ProseMirror/Tiptap editor, mouse event/selection conflicts, state lifecycle during note switching, and Tippy.js popover focus conflicts.

## Analysis & Findings

### 1. The Toolbar "Insert Link" Button Focus-Loss Issue
- **Root Cause:** When the user clicks the "Insert Link" button in the toolbar, browser focus moves from the editor to the toolbar button. This sets `editor.isFocused` to `false`.
- **Popover Disappearance / Failure to Open:** The `shouldShow` callback of Tiptap's `<BubbleMenu>` is configured to check:
  `return !!(editor.isFocused && (editor.isActive("link") || isLinkPopoverOpen));`
  Since `editor.isFocused` is now `false`, `shouldShow` immediately evaluates to `false`, causing Tippy to either completely fail to mount or immediately unmount when clicked.
- **Tippy.js Input Focus Conflict:** Even if the editor is focused first, the moment Tippy mounts and focuses the `<input>` element inside it (via `autoFocus`), focus leaves the editor. This triggers `editor.isFocused` to become `false`, unmounting the BubbleMenu and causing it to vanish.
- **The Top 1% SaaS Solution:**
  Decouple the focus check inside `shouldShow` to verify if the editor *or* the Tippy popover itself has focus. We check `document.activeElement?.closest('[data-tippy-root]')` to see if focus is inside the BubbleMenu.
  ```tsx
  shouldShow={({ editor }) => {
    const isEditorFocused = editor.isFocused;
    const isInputFocused = document.activeElement?.closest('[data-tippy-root]');
    const hasFocus = isEditorFocused || isInputFocused;
    return !!(hasFocus && (editor.isActive("link") || isLinkPopoverOpen));
  }}
  ```
  Additionally, in the `insertLink` function, we must refocus the editor:
  `editor.chain().focus().run();`
  so that Tiptap registers the active selection/focus before Tippy steals it.

### 2. State Leakage during Note Switching
- **Root Cause:** The `isLinkPopoverOpen` and `isEditingLink` states are local component states. When the user switches notes, the page component does not unmount. The state persists as `true`.
- **Automatic Popover Appearance:** When a new note is loaded or created, the editor is automatically focused. Because `isLinkPopoverOpen` is still `true`, `shouldShow` immediately returns `true`, causing the popover to show up automatically on the new note, which feels broken and buggy.
- **The Top 1% SaaS Solution:**
  Add a `useEffect` hook that listens to changes in the active document ID (`activeId`) and resets the link popover states:
  ```tsx
  useEffect(() => {
    closeLinkPopover();
  }, [activeId]);
  ```

### 3. Selection & Clicks Inside Links (CSS Selection Bypass)
- **Root Cause:** Browsers treat `<a>` elements inside a `contenteditable` container as navigable links, interfering with click cursor placement, drag selections, double-clicks, and Shift+Click ranges.
- **The Golden Solution:**
  Apply `pointer-events: none` on `.ProseMirror a` elements. This bypasses pointer actions inside the editor to let clicks fall through natively to the text engine.
  To let the user open the link, the floating BubbleMenu (which has `pointer-events: auto`) displays the target link, which the user can click to open in a new tab.

### 4. Link BubbleMenu Design & Theme Hardening
- **Light Theme Colors:** `#F2EEDF` input background with black text.
- **Dark Theme Colors:** `#1C1C1B` input background with light text.
- **Accent Highlighting:** Consistent application of `var(--np-accent)` on buttons and borders.

## Analysis Audit
The analysis resolves:
- Auto-appearing popover (resetting state on note switch)
- Broken toolbar button clicks (refocusing editor + Tippy focus inclusion)
- Broken editor selection over links (CSS pointer-events bypass)
- Low-quality native dialogs (custom high-fidelity CSS input popover)
