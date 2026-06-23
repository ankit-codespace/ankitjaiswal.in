# Skill: Execute Keyboard Shortcuts Consistency Update

Step-by-step code modifications for hotkeys.

## Execution Steps

### Phase 1: Modify Key Listeners
- Open `App.tsx`:
  - Change line 2426 logic to:
    `if (isCtrl && (e.shiftKey || e.altKey) && e.key.toLowerCase() === "t")`
- Open `notepad.tsx`:
  - Change line 2160 logic to:
    `const isRestoreNote = ctrl && (e.shiftKey || e.altKey) && e.key.toLowerCase() === "t";`

### Phase 2: Update UI Labels
- Modify the warning banner text in both files to read:
  `You can restore closed notes anytime using Ctrl + Shift + T or Ctrl + Alt + T.`
- Update the shortcut help overlay configurations to lists containing both shortcut variants.

### Phase 3: Compile Verification
- Run `pnpm run build` from root directory.
