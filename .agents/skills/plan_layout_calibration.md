# Skill: Plan Ruler Layout Calibration Fixes

This skill outlines the step-by-step phased approach to solve the notebook ruler alignment delay across the web and desktop portfolio apps.

## Phased Implementation Plan

- **Phase 1: Tab Switch Calibration**
  - **Objective**: Ensure that switching tabs immediately triggers layout grid recalculations for the active editor once its container is visible.
  - **Sub-steps**:
    - 1.1: Locate the tab switch handler or layout sync effect in `App.tsx` and `notepad.tsx`.
    - 1.2: Add a deferred `window.dispatchEvent(new Event("resize"))` wrapper in a `requestAnimationFrame` block after display state switches.
- **Phase 2: Initialization & React Node View Deferral**
  - **Objective**: Ensure that asynchronous components (like code block wrappers and tables) have completed rendering before grid calculations occur.
  - **Sub-steps**:
    - 2.1: Wrap the body of `alignBlocksToGrid` inside a `requestAnimationFrame` or brief timeout to let async DOM updates complete.
    - 2.2: Ensure that document content set events in both desktop and web editors trigger a layout recalibration after a tick.
- **Phase 3: Production Verification & Deploy**
  - **Objective**: Compile output bundles, test alignment visually, and deploy to live servers.
  - **Sub-steps**:
    - 3.1: Build desktop and web targets using `npm run build`.
    - 3.2: Verify that ruler lines align automatically on startup and tab change without needing keyboard input.
    - 3.3: Push to git repository and deploy.
