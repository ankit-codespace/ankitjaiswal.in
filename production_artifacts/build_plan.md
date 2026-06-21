# Link UX & Selection Hardening — Build Plan

## Phased Implementation Plan

### Phase 1: CSS Selection & Click Bypass
- Verify `.ProseMirror a { pointer-events: none; }` is active in `artifacts/website/src/index.css`.
- Verify `.ProseMirror a { pointer-events: none; }` is active in `notepad-win/src/renderer/src/index.css`.

### Phase 2: Web Note-Switching State Isolation
- Add a `useEffect` hook listening to `activeId` in `notepad.tsx` that resets link popover states by invoking `closeLinkPopover()`.

### Phase 3: Desktop Note-Switching State Isolation
- Add a `useEffect` hook listening to `activeId` in `App.tsx` that resets link popover states by invoking `closeLinkPopover()`.

### Phase 4: Decoupled Focus BubbleMenu (Web)
- In `notepad.tsx`, update `<BubbleMenu>`'s `shouldShow` callback to assess focus on either the editor or the active element inside Tippy.
- In `notepad.tsx`, update `insertLink()` to chain focus onto the editor.

### Phase 5: Decoupled Focus BubbleMenu (Desktop)
- In `App.tsx`, apply the same `shouldShow` decoupled callback to the link `<BubbleMenu>`.
- In `App.tsx`, update `insertLink()` to chain focus onto the editor.

### Phase 6: Verification & Compilation
- Build the web bundle (`npm run build`).
- Build the desktop renderer (`npm run build:renderer` inside `notepad-win`).
