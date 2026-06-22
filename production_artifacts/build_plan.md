# Pinned Tab & Theme Color Hardening — Build Plan

## Phase 1: Theme-Aware Category Colors
- Update the static `TAB_COLORS` array in `App.tsx` and `notepad.tsx` to:
  ```typescript
  const TAB_COLORS = [
    { id: "red", name: "Coral Red", darkValue: "#F25F5C", lightValue: "#D14949" },
    { id: "orange", name: "Amber Orange", darkValue: "#F28F3B", lightValue: "#D9721E" },
    { id: "yellow", name: "Warm Yellow", darkValue: "#FFE066", lightValue: "#C99A16" },
    { id: "green", name: "Sage Green", darkValue: "#40C057", lightValue: "#2B8A3E" },
    { id: "blue", name: "Slate Blue", darkValue: "#339AF0", lightValue: "#1C7ED6" },
    { id: "purple", name: "Lavender", darkValue: "#BE4BDB", lightValue: "#862E9C" },
  ];
  ```

## Phase 2: Pinned Tab Layout Clean-up
- Locate the pinned tab rendering blocks in `App.tsx` and `notepad.tsx`.
- Delete the absolute-positioned dot `div`.
- Dynamically determine the color for the `Pin` icon based on `effectiveDark`:
  `const categoryColor = doc.color ? (TAB_COLORS.find(c => c.id === doc.color)?.[effectiveDark ? 'darkValue' : 'lightValue']) : undefined;`
- Pass this `categoryColor` directly to the `Pin` icon's style (or color property).

## Phase 3: Indicators and Picker Alignment
- Update unpinned tab dot indicators to resolve colors using the new theme-based values.
- Update the context menu color picker buttons to display `color.darkValue` or `color.lightValue` based on `effectiveDark`.
- Align active tab border stroke selection (`activeTabStroke`) to resolve to the theme-appropriate value.

## Phase 4: Verification & Compilation
- Compile the website.
- Compile the Electron renderer and repackage the Windows installers.
- Commit all changes and push.
