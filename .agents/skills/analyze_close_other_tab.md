# Skill: Analyze Close Tab Behaviors

Identify target functions, state variables, and callbacks responsible for closing tabs, confirmation dialogues, and restoration inside the codebase.

## Target Components & Files

1. **Web Notepad Component**:
   - File: `artifacts/website/src/pages/tools/notepad.tsx`
   - Key Functions: `deleteDoc`, `closeOtherDocs`, `closeDocsToTheRight`, `undoLastDelete`.
   - Triggers: Tab inline `X` button, switcher item close button, File Menu "Close Tab", tab right-click Context Menu.

2. **Desktop App Component**:
   - File: `notepad-win/src/renderer/src/App.tsx`
   - Key Functions: `deleteDoc`, `executeDeleteDoc`, `closeOtherDocs`, `closeDocsToTheRight`, `restoreLastClosedDoc`.

## Current Behavior & Gaps

- **Web Close Confirmations**:
  - The tab's inline close button `X` and switcher item close button currently set `deleteConfirm` state for all tabs, prompting confirmation for normal (unpinned) tabs.
  - Expected: Normal tabs should close instantly via `deleteDoc` without prompting. Pinned tabs should set `deleteConfirm` to trigger the confirmation popover.

- **Mass Closures (Close Other / Close Right)**:
  - Both web and desktop versions delete pinned tabs when executing "Close Other Tabs" and "Close Tabs to the Right".
  - Expected: Pinned tabs must be excluded from mass deletions. Pinned tabs should remain open along with the targeted tab.

- **Restoration Behavior**:
  - Web version stores snapshots of all docs in a ref stack (`undoStackRef`), naturally restoring all mass-closed tabs at once.
  - Desktop version logs closed docs to a flat list `closedDocsHistory` and restores them one-by-one.
  - Expected: Desktop version should restore batch-closed tabs all at once using a batch identifier metadata field.
