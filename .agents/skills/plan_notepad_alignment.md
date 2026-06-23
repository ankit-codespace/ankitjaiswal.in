# Skill: Plan Notepad Alignment

This skill guides the creation of the phased implementation plan and records it inside `production_artifacts/build_plan.md`.

## Planning Instructions

Write the implementation plan to `production_artifacts/build_plan.md` with the following structure:

```markdown
# Build Plan: Standardizing Web Notepad Layouts

## Task Summary
[Provide a clear summary of the high-level goal and how it resolves current discrepancies between the web page and desktop app.]

## Success Criteria
- [List specific, measurable goals for scrolling behavior, ruler alignment, and tab spacing.]

## Non-Goals
- [Define boundaries of what will NOT be touched or refactored in this task.]

## Affected Files and Systems
- [List files to edit, compile, or verify.]

## Implementation Phases

### Phase 1: Scroll Recovery and Layout Sizing
#### Objective
Restore window scrollability by bridging the scroll-gate toggle with the Lenis smooth-scroll instance.

#### Execution Steps
- **Step 1.1**: Implement a `useEffect` hook in `notepad.tsx` observing `isSeoUnlocked`.
- **Step 1.2**: In the hook, call `(window as any).__lenis?.resize()` after a brief layout paint timeout (e.g. 100ms) to update Lenis scroll bounds.
- **Step 1.3**: Register `onUpdate` and `onAnimationComplete` handlers on the Framer Motion collapsible container (`motion.div` wrapper around the SEO guide content) to trigger `__lenis.resize()` during transition paints.
- **Step 1.4**: Verify viewport height values (`min-height` and outline sidebar heights) to ensure consistent layout boundaries.

#### Verification Checkpoint
- Verify that expanding the SEO guide allows scrolling all the way to the bottom without freeze.
- Verify that collapsing the SEO guide recalculates the window bounds and returns scrolling to top cleanly.

#### Self-Audit Step
- Check that no global styles were broken.
- Ensure that `window.__lenis` presence checks are in place to prevent crash in environments where Lenis is not defined.

---

### Phase 2: Notebook Ruler Line Alignment
#### Objective
Fix the lined ruler math in `notepad.tsx` to align blocks using the precise margin snap formula of the desktop app.

#### Execution Steps
- **Step 2.1**: Update `alignBlocksToGrid` selector in `notepad.tsx` to target `.notepad-code-block-wrapper, table, blockquote, hr, img, .image-node`.
- **Step 2.2**: Replace `paddingBottom` snaps with `marginBottom` snaps.
- **Step 2.3**: Port the math calculation: `targetHeight = Math.ceil((naturalHeight + G / 2) / G) * G` and `needed = targetHeight - naturalHeight`. Ensure we clean up custom styles if `ruledLines` is turned off.
- **Step 2.4**: Attach an `onload` handler to image elements within the editor to trigger re-alignment once images finish fetching.

#### Verification Checkpoint
- Open a note containing tables, blockquotes, and code blocks. Check that the horizontal ruler lines align perfectly with the editor baselines.
- Ensure no stretching of block backgrounds occurs when applying snaps.

#### Self-Audit Step
- Verify that resizing the window or updating editor content recalculates grid alignments correctly.
- Ensure type checks pass.

---

### Phase 3: Active Tab Visual Standardizing
#### Objective
Synchronize active tab margin offsets and visual parameters with the desktop app.

#### Execution Steps
- **Step 3.1**: Audit active/inactive tab margins and correct the offset logic to reference `sortedDocs`.
- **Step 3.2**: Check active tab margins `marginLeft` equations and verify that they resolve to `7px` visual gap (or `4px` when adjacent to pinned tabs) on both sides.
- **Step 3.3**: Verify curves and colors look clean across both themes.

#### Verification Checkpoint
- Check active tab left and right clearance using developer tools. Ensure clearance is exactly symmetrical.
- Verify tab list scrollability when multiple tabs are opened.

#### Self-Audit Step
- Confirm that no tab switching logic or note creations were broken.
```
