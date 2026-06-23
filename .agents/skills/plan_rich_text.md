# Skill: Plan Format Switching & Editor States Update

Plan phased updates to enable non-destructive toggling and premium formatting toggle buttons in both clients.

## Proposed Changes

### Phase 1: Support `lastRichContent` in `NotepadDoc`
- Add optional `lastRichContent?: string;` property to `NotepadDoc` interface.

### Phase 2: Refactor `toggleEditorMode` in both clients (`App.tsx`, `notepad.tsx`)
- On toggle to raw:
  - Save `content` into `lastRichContent`.
  - Convert HTML to Markdown (or plain text) and store it in `content`.
- On toggle to rich:
  - Check if the plain text content is equivalent to the plain text version of `lastRichContent`. If yes, restore the exact `lastRichContent`.
  - If edits were made, run a lightweight Markdown-to-HTML parser to recreate corresponding tags.

### Phase 3: Redesign Toggle Button
- Replace `⚡ Plain` and `📝 Rich` with Lucide icons (e.g. `FileText` and `Type`) and clear text labels.
- Position the button cleanly in the toolbar.

### Phase 4: Compile Checks
- Run `pnpm run build` from the workspace root.
