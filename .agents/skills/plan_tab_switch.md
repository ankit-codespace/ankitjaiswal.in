# Skill: Plan Tab Switch Scroll Fix

This skill creates a structured, phased plan to permanently resolve the tab switch scroll stutter and dynamic tab resizing layout shifts.

## Plan Creation Steps

1. **Initialize Plan**: Generate a markdown build plan and write it to `production_artifacts/build_plan.md`.
2. **Define Phases**:
   - **Phase 1: Early Scroll Capture Wrapper**
     - Objective: Prevent the scroll-to-0 overwrite bug by capturing scroll state early.
     - Sub-steps:
       - 1.1: Create a unified helper function `changeTab` that saves the current `window.scrollY` to `scrollPositionsRef.current[activeId]` and then sets `activeId`.
       - 1.2: Replace all direct calls of `setActiveId(id)` with `changeTab(id)` across `App.tsx` (e.g. in tab clicks, key handlers, sidebar, list).
   - **Phase 2: DOM Preservation & Uniform Tab Sizing**
     - Objective: Keep open tabs mounted in the DOM to avoid height collapse, and size tabs uniformly to avoid layout shifts.
     - Sub-steps:
       - 2.1: Modify `App.tsx` editor rendering section to map through `docs` (or `sortedDocs`), wrapping each `NotepadEditor` in a `div` styled with `display: doc.id === activeId ? "block" : "none"`.
       - 2.2: Ensure the `key` prop of the editor is `doc.id` so React manages them as independent DOM instances, and update props like `onUpdate` to use `doc.id` instead of `activeDoc.id`.
       - 2.3: Refactor tab items styling in both `App.tsx` and `notepad.tsx` to use **Chrome-like uniform tab widths**.
         - Set unpinned tabs to: `flex: "0 1 150px"`, `maxWidth: doc.isPinned ? 44 : (isActive ? 160 : 130)`, and `minWidth: doc.isPinned ? 44 : (isActive ? 80 : 50)`.
         - When space is available, both active and inactive unpinned tabs will render at the same static width (`150px`), eliminating any layout resizing shifts. When squished, inactive tabs shrink down to `50px` while the active tab keeps an `80px` min-width for readability.
         - Normalize tab padding to be identical (e.g. `0 10px`) to prevent content jumps, or adjust text margins cleanly.
   - **Phase 3: Synchronous Layout Sync & Selective Tab Scrolling**
     - Objective: Restore focus and scroll position before browser paint, and scroll tabs only when overflowing.
     - Sub-steps:
       - 3.1: Replace the asynchronous `useEffect` tab sync hook with a synchronous `useLayoutEffect` hook.
       - 3.2: Remove the 50ms timeout. Synchronously call `.focus({ preventScroll: true })` on `editorsRef.current[activeId]` and `window.scrollTo(...)` within `useLayoutEffect`.
       - 3.3: Set the scroll restore lock (`isRestoringScrollRef.current = true`) before scrolling, and clear it inside a brief timeout (50ms) to safely bypass async browser scroll events.
       - 3.4: Replace the blind `activeTabEl.scrollIntoView` call with a **boundary-checked scroll-into-view** hook.
         - Measure `activeTabEl.offsetLeft`, `activeTabEl.offsetWidth`, and the parent `.notepad-tabs-container` scroll viewport bounds.
         - Call `container.scrollTo({ left: ..., behavior: "smooth" })` ONLY if the tab is overflowing/cut-off. Do nothing if all tabs are fully visible.
   - **Phase 4: Dev Verification & Packaging**
     - Objective: Run the app locally and rebuild the installer.
     - Sub-steps:
       - 4.1: Run `npm run build:renderer` to check for compilation or TypeScript errors.
       - 4.2: Run `npm run start` to visually confirm that switching tabs is instantaneous, free of any lag or stutter, and tabs stay static without size jumps.
       - 4.3: Package the setup installer using `npm run build` and run local installation checks.
