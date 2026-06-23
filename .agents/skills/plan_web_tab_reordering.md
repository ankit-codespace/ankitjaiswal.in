# Skill: Plan Web Tab Reordering & Layout Alignment

This skill guides the creation of the phased implementation plan and records it inside `production_artifacts/build_plan.md`.

## Planning Instructions

Write the implementation plan to `production_artifacts/build_plan.md` with the following structure:

```markdown
# Build Plan: Web Tab Reordering & Layout Alignment

## Task Summary
[Provide a clear summary of the high-level goal and how it resolves current drag-and-drop flickering, visual spacing discrepancies, and keyboard shortcut conflicts.]

## Success Criteria
- **Smooth Tab Sliding**: Drag-and-drop reordering is animated with Chrome-like sliding transitions, displacing adjacent tabs using translateX without flickering the DOM order during drag.
- **Visual Layout Parity**: Plus button size, note switcher separator dividers, and dropdown bottom actions ("New note") match desktop visual standards.
- **Web-Safe Restoration Shortcut**: Conditional keyboard shortcut checks ensure `Ctrl + Alt + T` restores closed notes on Web, while `Ctrl + Shift + T` is retained on Desktop. Tooltips and help modals are fully updated.
- **Build Verification**: Local compilation build (`pnpm run build`) runs and type-checks successfully.

## Affected Files and Systems
- **Web Editor Page**: `artifacts/website/src/pages/tools/notepad.tsx`

---

## Implementation Phases

### Phase 1: Web-Compatible Tab Drag-and-Drop & Sliding
#### Objective
Implement a smooth Chrome-like visual sliding transition when dragging tabs.

#### Execution Steps
- **Step 1.1**: Add a state for tracking drag-over target index: `const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)`. Add mutable refs to store dragged tab properties (`draggedWidthRef`, `draggedIsPinnedRef`).
- **Step 1.2**: Update the tab element styles to support `transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Step 1.3**: In `onDragStart`, capture the dragged element width using `getBoundingClientRect().width` and whether it is pinned.
- **Step 1.4**: In `onDragOver`, instead of calling `setDocs` instantly, simply set the hovered index in `dragOverIdx`. Calculate translate offsets:
  - If a tab index $i$ is between the source index $S$ and hover index $T$:
    - Shift left by dragged width if $S < T$.
    - Shift right by dragged width if $S > T$.
  - Apply this transform to the tab item's container style.
- **Step 1.5**: In `onDragEnd`, trigger the actual document splice/reorder state update using the final `dragOverIdx`, and clear the dragging/hover indexes.

#### Verification Checkpoint
- Verify that dragging a tab left or right makes other tabs slide smoothly out of the way before drop.
- Verify that dropping the tab correctly updates the document tab order.

#### Self-Audit Step
- Confirm that drag reordering only works within the same zone (pinned tabs vs unpinned tabs).
- Ensure no runtime state crash occurs when dropping.

---

### Phase 2: Tab Bar & Plus Button Layout Parity
#### Objective
Standardize the size, icons, and separators of the tab strip elements to match the Desktop application.

#### Execution Steps
- **Step 2.1**: Update the Plus button size to `30x30` or keep it balanced with web margins. Ensure its margins, padding, and vertical baseline align perfectly with active tabs.
- **Step 2.2**: Ensure separator divider left to Note Switcher trigger provides distinct visual boundary spacing.
- **Step 2.3**: Update Note Switcher dropdown panel bottom list actions: change "New document" to "New note" to align with desktop text terminology.
- **Step 2.4**: Verify the deletion confirm overlay styling and hover effects inside the switcher panel.

#### Verification Checkpoint
- Check the visual layout on both light and dark themes. Ensure borders, dividers, and buttons have the exact same color intensity and margins as Desktop.

#### Self-Audit Step
- Confirm that no layouts are broken or overflowed on narrow viewports.

---

### Phase 3: Shortcut Conflict Resolution & Modal Help Parity
#### Objective
Provide a web-compatible shortcut for closed tab recovery and sync help resources.

#### Execution Steps
- **Step 3.1**: Update the global keydown listener inside `notepad.tsx`.
- **Step 3.2**: Check if `isElectron` is true. If so, intercept `Ctrl + Shift + T`. If false (Web), intercept `Ctrl + Alt + T` to recover the last closed document.
- **Step 3.3**: Update the keyboard shortcuts help modal description for "Restore Closed Note" to display `Ctrl + Alt + T` for Web users.
- **Step 3.4**: Update the delete warning popovers and tooltip texts in the application to explicitly mention `Ctrl + Alt + T` (or `Ctrl + Shift + T` on Desktop) as the recovery shortcut.

#### Verification Checkpoint
- Press `Ctrl + Alt + T` on Web and verify that the last deleted note is restored successfully with a success toast.
- Verify the Keyboard Shortcuts modal displays the updated shortcut values.

#### Self-Audit Step
- Ensure native browser keyboard shortcuts (like `Ctrl + T` or `Ctrl + Shift + T`) are not broken or interfered with incorrectly.
```
