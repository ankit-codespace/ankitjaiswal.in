# Skill: Plan Export & Focus Mode Update

Develop a phased implementation plan for splitting the web export button and removing the focus mode button from the desktop client.

## Proposed Changes

### Phase 1: Web Export Refactoring (`notepad.tsx`)
- Implement `exportSmart()` function in `notepad.tsx`.
- Replace the single Export button with a split button layout matching the styles of the desktop app.
- Wire the left button to `exportSmart()` and the right chevron button to toggle `showExportMenu`.

### Phase 2: Desktop Focus Button Cleanup (`App.tsx`)
- Remove the Focus Mode button from the toolbar in `App.tsx`.
- Retain the keyboard shortcut and backing state to prevent breaking any other layout dependencies.

### Phase 3: Build Verification
- Compile the workspace using `pnpm run build`.
