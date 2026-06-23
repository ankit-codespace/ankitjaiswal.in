# Skill: Analyze Export & Screen Modes

Understand existing component trees, split-button CSS layouts, and toolbar item lists in `App.tsx` and `notepad.tsx`.

## Analysis Points

1. **Split-Button Markup in Web Version**:
   - Location: `notepad.tsx` toolbar zone.
   - Current: A single `<button>` with both the download icon, label, and chevron arrow that toggles `showExportMenu`.
   - Target: Change to a layout with two adjacent buttons wrapped in a container, identical to the split button design in `App.tsx`.

2. **Smart Export Logic in Web Version**:
   - Web version lacks an `exportSmart` helper. We need to implement `exportSmart()` which calls `getSmartSaveExtension(html)` and triggers the appropriate format automatically.

3. **Desktop Focus Mode Button Removal**:
   - Location: Toolbar in `App.tsx` around line 4001.
   - Target: Safely remove the `<button>` rendering for Focus Mode. Ensure the hotkey or backing state doesn't crash or break formatting layout styles.
