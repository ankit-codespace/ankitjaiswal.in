# Build Plan: Standardizing Web Notepad Layouts

## Task Summary
Synchronize the web portfolio notepad implementation's layout behavior (scrollability, tab strip spacing, and notebook ruler lines alignment) with the desktop Electron app.

## Success Criteria
1. The web page scrolling never locks or freezes when toggling the SEO guide contents.
2. Notebook ruler lines align perfectly with all element types (text paragraphs, code blocks, images, tables, quotes) without stretching their backgrounds.
3. Tab margin offsets align exactly with the 7px design specs referencing `sortedDocs`.
4. Workspace compiles cleanly with no typescript errors.

---

## Phase 1: Scroll Recovery and Layout Sizing
- **Objective**: Fix page scrolling by syncing Lenis' boundary calculations with the page height toggle.
- **Sub-step 1.1**: Inject a `useEffect` hook in `notepad.tsx` observing the state changes of `isSeoUnlocked`.
- **Sub-step 1.2**: Inside this hook, trigger `(window as any).__lenis?.resize()` after a 100ms delay to allow the DOM transition animation to finish.
- **Sub-step 1.3**: Recalculate editor wrapper height dynamically to ensure layout bounds align.

## Phase 2: Notebook Ruler Line Alignment
- **Objective**: Port the high-fidelity margin-based alignment calculations from `App.tsx` to `notepad.tsx`.
- **Sub-step 2.1**: Update the element selector in `alignBlocksToGrid` to target `.notepad-code-block-wrapper, table, blockquote, hr, img, .image-node`.
- **Sub-step 2.2**: Change snaps to assign `marginBottom` instead of `paddingBottom` to prevent background color stretching.
- **Sub-step 2.3**: Update snap math: `targetHeight = Math.ceil((naturalHeight + G / 2) / G) * G` and `needed = targetHeight - naturalHeight`. Ensure we clean up custom styling values when `ruledLines` is disabled.

## Phase 3: Active Tab Spacing & Verification
- **Objective**: Re-align tab margins and verify the entire build structure.
- **Sub-step 3.1**: Verify active tab margins in `notepad.tsx` and check that margins use `sortedDocs` for spacing calculations.
- **Sub-step 3.2**: Run `pnpm run build` in the workspace root to confirm zero typescript or asset compile errors.
