# Skill: Plan UX Hardening & Performance Optimization

This skill guides the creation of a phased build plan to eliminate scroll jumping, fix zoom-based layout shifts, and debounce localStorage writes to eliminate typing stutters.

---

## Plan Structure

The plan must be saved to `production_artifacts/build_plan.md` and structured into 3 distinct phases.

### Phase 1: Zoom Implementation & Scroll Stabilization
- **Goal:** Replace CSS `zoom` with base font-size scaling and lock the scroll viewport during zoom events.
- **Sub-steps:**
  - **1.1:** Modify `App.tsx` -> `editorInnerStyle` to remove `zoom: settings.zoom` and instead compute `effectiveFontSize = settings.fontSize * settings.zoom`. Set `--np-fs` to `effectiveFontSize` in px.
  - **1.2:** Update `editorInnerStyle` width scaling to multiply `maxWidth` (760 and 580) and horizontal padding by `settings.zoom` to preserve focused/narrow writing widths proportionally.
  - **1.3:** Modify `index.css` checklist styles to use `em` units for checkboxes and checkmarks (so they scale naturally with the font size) rather than static pixel values.
  - **1.4:** Implement a centralized `useEffect` in `App.tsx` that monitors `settings.zoom` and stabilizes the scroll position when the zoom factor shifts. Toggle `isRestoringScrollRef.current = true` during this transition.

### Phase 2: Debounced Autosave & Decoupled State Updates
- **Goal:** Remove synchronous state updates and disk serialization from the editor hot-path (typing/backspace).
- **Sub-steps:**
  - **2.1:** Create a `pendingUpdatesRef` buffer and an `autosaveTimerRef` in `App.tsx`.
  - **2.2:** Define a `flushPendingContent` helper function that flushes pending content from the buffer, maps to the `docs` array, and writes to localStorage.
  - **2.3:** Modify `useEditor`'s `onUpdate` to buffer the latest HTML content to `pendingUpdatesRef`. If the auto-title changes, update the tab title immediately in React state for visual feedback, but debounce the actual document array writes by 800ms.
  - **2.4:** Set up an effect on `activeId` (document switch) to immediately run `flushPendingContent` for the previous document before switching context.
  - **2.5:** Update file interaction functions (like `saveFileNative`, `deleteDoc`, and window `beforeunload` events) to call `flushPendingContent` first, ensuring no data loss.
  - **2.6:** Update the Table of Contents `headings` hook to trigger on `editorVersion` updates (which are lightweight counters) rather than `activeDoc?.content` updates.

### Phase 3: Verification & Performance Profile
- **Goal:** Verify coordinate stability, scrolling behavior, and profile keystroke responsiveness.
- **Sub-steps:**
  - **3.1:** Run local builds / tests and verify there are no compilation/TypeScript errors.
  - **3.2:** Test backspace and typing at various zoom factors (0.8x, 1.0x, 1.2x, 1.5x) to confirm that no viewport scrolling jumps occur.
  - **3.3:** Test zoom changes (via `Ctrl + Wheel` and keyboard shortcuts) to confirm that the text size changes smoothly and the viewport remains perfectly centered on the cursor.
  - **3.4:** Confirm that the document state correctly autosaves to localStorage after the user stops typing and flushes instantly when switching tabs.
  - **3.5:** Verify that the app bundles cleanly and check the build outputs.

---

## Planning Self-Audit Mindset

When formulating the plan:
1. Make sure every phase has numbered sub-steps (e.g. 1.1, 1.2).
2. Explicitly outline how to verify that each phase has succeeded.
3. Keep the steps granular: never lump major code edits and verification commands together in the same sub-step.
