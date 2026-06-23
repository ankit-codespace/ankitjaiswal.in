# Skill: Analyze Keyboard Shortcuts Consistency

Investigate key bindings for tab restoration and shortcut help tables in `App.tsx` and `notepad.tsx`.

## Analysis Points

1. **Hotkey Listener Blocks**:
   - Location: `App.tsx` (around line 2426) and `notepad.tsx` (around line 2160).
   - Current: Conditionally splits between `Ctrl + Shift + T` (Electron) and `Ctrl + Alt + T` (Web).
   - Solution: Refactor listeners to check for either condition: `(e.shiftKey || e.altKey)` when `Ctrl` and `t` are pressed.

2. **UI Documentation**:
   - Confirmation dialog: Line 5375 of `App.tsx` uses a warning string. Update it to include `Ctrl + Alt + T`.
   - Shortcuts Help Panel: Line 5688 of `App.tsx` and line 6955 of `notepad.tsx`. Update key lists to show both shortcuts.
