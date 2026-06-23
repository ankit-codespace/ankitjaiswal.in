# Skill: Analyze Tab Alignment

Identify layout misalignments, plus icon placement, redundant borders, and dropdown item positions for the "I Love Notepad" web version.

## Findings

### 1. Spacing and Alignment of Tabs
* **What exists:** Row 1 has `height: 40px` and `alignItems: "flex-end"`. Tab items have `height: 36px` and `marginBottom: -2px` (active tab) or `0px` (inactive tab).
* **What is missing:** Spacing above tabs is only 6px (active) or 4px (inactive), while space below feels disproportionately larger due to baseline overlaps.
* **Refinement:** Increasing Row 1 height to `42px` while keeping tab items at `height: 36px` shifts the tabs down slightly, balancing the spacing above and below.
* **Navigation Buttons:** Back button and File Menu button currently have `height: 36px` and `marginBottom: -2px`. They need to be lifted slightly to optical center (e.g., `height: 36px`, `marginBottom: 1px` or `2px`).
* **Separators:** The vertical separator lines (`sep`) between navigation items have uneven margins/bottom margins. They should be standardized.

### 2. Plus Icon Placement
* **What exists:** The Plus button is currently positioned outside the scrollable tab container `.notepad-tabs-container`, sticking to the right side next to the gradient fade.
* **What is missing:** A Chrome-like tab behavior where the Plus button sits directly next to the last active tab, moving dynamically as tabs are added/removed.
* **Refinement:** Place the Plus button inside `.notepad-tabs-container` right after mapping the document tabs.

### 3. Redundant Separation Borders
* **What exists:** There are multiple `{sep}` separators on the right-hand side. Specifically, if Google Drive (`GCID`) is disabled, we get adjacent separators with nothing in between.
* **What is missing:** A clean separator rendering logic.
* **Refinement:** Remove the separator at the start of the Right Zone, and only render separators between active actions (e.g., between Cloud and Note Switcher).

### 4. Note Switcher, Shortcuts, and Feedback Relocation
* **What exists:** Note Switcher (`Files` icon), Keyboard Shortcuts (`Keyboard` icon), and Feedback (`MessageSquarePlus` icon) buttons are in Row 1 Right Zone.
* **What is missing:** Cleanup of the header zone. Keyboard Shortcuts and Feedback must be removed from Row 1.
* **Refinement:**
  * Move Note Switcher (`Files` button) to the extreme right of Row 1.
  * Add a "Send Feedback" option inside the File Menu dropdown (using `MessageSquarePlus` icon, invoking `openFeedback`).
  * Verify/keep "Keyboard Shortcuts" option inside the File Menu dropdown.

## Risks & Dependencies
* **Sizing/Scrolling:** Placing the Plus button inside the scrollable container could cause layout/scrolling shifts if not styled properly. We must ensure it has `flex-shrink: 0`.
* **Dropdown Alignment:** Relocating the Note Switcher button to the extreme right shifts its bounding rect. We must verify its dropdown menu position `r.left - 200` does not go off-screen.

## Self-Audit
* Checked that all 5 user points are accounted for in the analysis.
* Verified that the paths and file names match the actual workspace.
