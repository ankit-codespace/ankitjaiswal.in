# Skill: Plan Tab Alignment

Create and execute the layout alignment build plan to align the web notepad's header.

## Goal & Success Criteria
* **Goal:** Implement the top tab bar alignment, plus button relocation, separator cleaning, and menu item movements for the web version of the notepad.
* **Success Criteria:**
  1. Spacing above/below tabs is balanced (Row 1 height: 42px).
  2. Back button and File Menu button are lifted upwards to be optically centered.
  3. Plus button moves dynamically next to the active tabs inside the scrollable container.
  4. Redundant separation borders are eliminated.
  5. Note Switcher is moved to the extreme right; Keyboard Shortcuts and Feedback are removed from the bar and exist inside the File Menu.
  6. Code builds and runs with no type errors.

## Phases

### Phase 1: Header Row & Navigation Alignments
* **Sub-step 1.1:** Modify Row 1 container height from `40` to `42` in `notepad.tsx`.
* **Sub-step 1.2:** Shift Back button and File Menu button upwards by changing `marginBottom` from `-2` to `1` or `2`.
* **Sub-step 1.3:** Align separators by setting consistent bottom margins (e.g. `marginBottom: 8`).
* **Verification Checkpoint:** Build the project and verify alignment properties in code.

### Phase 2: Plus Button & Separators Cleanup
* **Sub-step 2.1:** Move the Plus button element inside `.notepad-tabs-container`, immediately following the `sortedDocs.map(...)` block.
* **Sub-step 2.2:** Adjust Plus button margins (`margin-left: 8px`, `margin-right: 8px`) and height alignment (`marginBottom: 6px` or similar to align with tabs).
* **Sub-step 2.3:** Clean up the Right Zone separators, ensuring no double borders occur.
* **Verification Checkpoint:** Verify that the Plus button is nested within the tabs flex list.

### Phase 3: Action Buttons & Menu Relocations
* **Sub-step 3.1:** Remove "Keyboard Shortcuts" and "Feedback" buttons from Row 1 Right Zone.
* **Sub-step 3.2:** Verify the "Keyboard Shortcuts" item in File Menu. Add the "Send Feedback" item inside the File Menu dropdown with the `MessageSquarePlus` icon.
* **Sub-step 3.3:** Adjust top positioning values of the dropdown panels (File Menu `top` to `80`, Note Switcher `top` to `82`, Export `top` to `84`) to account for the +2px height of Row 1.
* **Verification Checkpoint:** Run `pnpm run build` to verify there are no typescript compilation errors.

## Self-Audit
* Ensured all 5 points from the task description are mapped to specific steps.
* Ensured build commands are specified.
