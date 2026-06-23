# Skill: Plan Keyboard Shortcuts Consistency Update

Plan phased updates to unify shortcut keys and UI labels in both clients.

## Proposed Changes

### Phase 1: Support Dual Shortcuts in Key Listeners
- Modify event listeners in `App.tsx` and `notepad.tsx` so both `Ctrl + Shift + T` and `Ctrl + Alt + T` trigger document restoration.

### Phase 2: Update Help Texts and Modal Dialogs
- Update text on the delete confirmation dialogs warning message.
- Update help modal lists to explicitly document both keys.

### Phase 3: Compile Verification
- Execute `pnpm run build` from the workspace root.
