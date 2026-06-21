# Skill: Plan Link Selection and Popover UX Hardening

This skill establishes a phased implementation plan for resolving the link selection, note state leakage, and popover focus conflicts in both Desktop (`App.tsx`) and Web (`notepad.tsx`) environments.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_link_ux_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: CSS Selection & Click Bypass
- **Step 2.1:** Inject `.ProseMirror a { pointer-events: none; }` to the web styling in `artifacts/website/src/index.css`.
- **Step 2.2:** Inject `.ProseMirror a { pointer-events: none; }` to the desktop styling in `notepad-win/src/renderer/src/index.css`.
- **Step 2.3:** Verify that hover styles remain functional when hovering over parent text blocks.

### Phase 3: Web Note-Switching State Isolation
- **Step 3.1:** In `artifacts/website/src/pages/tools/notepad.tsx`, add a `useEffect` that listens to `activeId` and calls `closeLinkPopover()`.
- **Step 3.2:** Test that switching notes resets `isLinkPopoverOpen`, `isEditingLink`, and `linkInputUrl` states.

### Phase 4: Desktop Note-Switching State Isolation
- **Step 4.1:** In `notepad-win/src/renderer/src/App.tsx`, identify the state that tracks the active document (e.g. `activeId`).
- **Step 4.2:** Add a `useEffect` hook that listens to this active ID state and calls `closeLinkPopover()`.

### Phase 5: Decoupled Focus BubbleMenu (Web)
- **Step 5.1:** In `artifacts/website/src/pages/tools/notepad.tsx`, update the `<BubbleMenu>`'s `shouldShow` callback to:
  ```tsx
  shouldShow={({ editor }) => {
    const isEditorFocused = editor.isFocused;
    const isInputFocused = document.activeElement?.closest('[data-tippy-root]');
    const hasFocus = isEditorFocused || isInputFocused;
    return !!(hasFocus && (editor.isActive("link") || isLinkPopoverOpen));
  }}
  ```
- **Step 5.2:** Update `insertLink()` to refocus the editor using `editor.chain().focus().run()` before opening the popover.

### Phase 6: Decoupled Focus BubbleMenu (Desktop)
- **Step 6.1:** In `notepad-win/src/renderer/src/App.tsx`, apply the same `shouldShow` logic to the `<BubbleMenu>` component.
- **Step 6.2:** Update `insertLink()` to refocus the editor using `editor.chain().focus().run()`.

### Phase 7: Verification, Compilation, and Deployment
- **Step 7.1:** Compile the desktop renderer (`npm run build:renderer` inside `notepad-win`).
- **Step 7.2:** Compile the web client (`npm run build` inside workspace root).
- **Step 7.3:** Verify that all TypeScript typechecks pass cleanly.
- **Step 7.4:** Commit all changes to the repository.
- **Step 7.5:** Deploy the changes to the live site via `deploy/cyberpanel-deploy.sh`.
