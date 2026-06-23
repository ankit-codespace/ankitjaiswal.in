# Skill: Execute Export & Screen Modes Update

Step-by-step code execution for the export and focus layout changes.

## Steps

### Phase 1: Implement Web Split Button
- Open `notepad.tsx`.
- Define `exportSmart()` to determine save extensions dynamically using `getSmartSaveExtension` and call the corresponding download routine.
- Modify the toolbar export button block, converting it to a flex-based split button group.

### Phase 2: Remove Desktop Focus Button
- Open `App.tsx`.
- Locate and remove the Focus Mode button component from the toolbar layout list.
- Keep the `focusMode` states and hotkeys so layout containers rendering remains stable.

### Phase 3: Verification
- Run `pnpm run build` to verify clean compilation.
