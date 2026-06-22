# Skill: Plan Pinned Tab Refinement and Color Optimization

This skill maps out the step-by-step phases to refactor the tab category colors, clean up the pinned tab layout, and verify compilation.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_pinned_tabs_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: Theme-Aware Category Color Mapping
- **Step 2.1:** Open `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- **Step 2.2:** Update `TAB_COLORS` constant declaration to include `darkValue` and `lightValue` hex properties for red, orange, yellow, green, blue, and purple.

### Phase 3: Active Tab Stroke Adjustments
- **Step 3.1:** Locate the declaration of `activeTabStroke` inside the tab mapping loops of both files.
- **Step 3.2:** Modify the lookup logic to fetch the category color dynamically based on theme context:
  `const activeTabStroke = tabColorObj ? (effectiveDark ? tabColorObj.darkValue : tabColorObj.lightValue) : ...`

### Phase 4: Pinned Tab Layout Clean-up & Pin Coloring
- **Step 4.1:** Locate the `doc.isPinned ? (...)` rendering branch in the tab container of both files.
- **Step 4.2:** Delete the absolute positioned dot `div` (`position: "absolute", top: 4, right: 4`).
- **Step 4.3:** Bind the category color to the `Pin` icon style color property:
  `color: doc.color ? TAB_COLORS.find(c => c.id === doc.color)?.value : "currentColor"` (or using theme values: `effectiveDark ? tabColorObj.darkValue : tabColorObj.lightValue`).

### Phase 5: Normal Tab Dot Indicators and Color Picker Circles
- **Step 5.1:** Update the category indicator dot on unpinned tabs to use theme-aware colors:
  `background: effectiveDark ? tabColorObj.darkValue : tabColorObj.lightValue`
- **Step 5.2:** Locate the color picker circles map inside the tab context menu.
- **Step 5.3:** Set their background property to use theme-aware colors for better color feedback during selection.

### Phase 6: Verification & Compiler Checks
- **Step 6.1:** Run compiler checks for desktop renderer: `npm run build:renderer`.
- **Step 6.2:** Run compiler checks for website client: `npm run build`.
- **Step 6.3:** Launch the desktop app development environment, toggle categories and pin states, and confirm visual excellence.
- **Step 6.4:** Commit and push changes.
