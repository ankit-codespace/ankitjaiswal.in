# Skill: Analyze UX Hardening & Editor Performance

This skill outlines the precise steps to inspect the editor codebase, diagnose layout stutters, identify zoom scrolling bugs, and pinpoint performance bottlenecks in the keystroke update loops.

---

## Analysis Checklist

### Step 1: Map Project Files & Zoom Implementations
- Inspect where the settings zoom value is saved, loaded, and applied.
- Confirm the CSS styles and selectors affected by `settings.zoom` in `App.tsx` and `index.css`.
- Identify the exact elements receiving the `zoom` style.

### Step 2: Investigate Keydown & Typing Scroll Jumps
- Trace the event listeners for scrolling and selection in `App.tsx`.
- Review the `handleScrollSave` listener and the conditions under which it returns early or saves scroll coordinates.
- Understand the ProseMirror scroll-into-view behavior during selections and content updates.

### Step 3: Analyze Hot-Path Performance (Keystroke Lag)
- Audit the `onUpdate` callback in `useEditor`.
- Identify all heavy synchronous operations running on every keystroke (e.g. `getHTML()`, `getText()`, `setDocs()`, `JSON.stringify()`, `localStorage.setItem()`).
- Track how many components re-render when `docs` state is mutated on every character typed.

### Step 4: Examine Outline/Sidebar Headings Sync
- Review the `useEffect` that triggers `setHeadings` and updates the Table of Contents.
- Check if it is currently tied to `activeDoc?.content` updates, and identify if we can optimize it using `editorVersion` or direct editor events.

---

## How to Document Findings

When running this analysis, you must generate a report saved to `production_artifacts/ux_analysis_report.md` detailing:
1. **Zoom Bug Mechanics:** The exact coordinate math showing why `getBoundingClientRect()` behaves incorrectly under the `zoom` CSS property.
2. **Scroll Save Interference:** How the browser-triggered scroll events during zoom modifications interact with `scrollPositionsRef.current`.
3. **Hot-Path Flame Graph (Conceptual):** Breakdown of processing times on every keystroke (State update vs LocalStorage Write vs React render tree).
4. **Target Lines for Modifications:** List the exact file names and line ranges to modify.

---

## Analysis Self-Audit Protocol

Before completing the analysis:
1. Confirm that you have read `App.tsx` and `index.css` completely around the zoom and scroll areas.
2. Ensure you are not proposing any changes that break existing editor extensions (e.g., code blocks, image resizing, task lists).
3. Verify that the proposed zoom implementation covers all methods of zoom (Ctrl+, wheel, button clicks).
4. Verify that you have documented all findings in `production_artifacts/ux_analysis_report.md`.
