# Skill: Plan Find & Replace Hardening

This skill creates a structured, phased plan to redesign the Find & Replace panel for premium aesthetics and contrast, and wire up missing keyboard shortcuts.

## Plan Creation Steps

1. **Initialize Plan**: Generate a markdown build plan and write it to `production_artifacts/build_plan.md`.
2. **Define Phases**:
   - **Phase 1: Keyboard Shortcut Wiring**
     - Objective: Implement `Ctrl+F` and `Ctrl+Shift+F` in the desktop app event handler.
     - Sub-steps:
       - 1.1: In `App.tsx`'s `handleKeyDown` function, intercept `Ctrl + F`.
         - Action: If the panel is open without replace, close it; otherwise, show it with `showReplace = false` and focus the find input.
       - 1.2: In `App.tsx`'s `handleKeyDown` function, intercept `Ctrl + Shift + F` / `Ctrl + H` (desktop only).
         - Action: Show panel with `showReplace = true` and focus the replace input.
   - **Phase 2: Premium Visual Styles & Themes (Desktop)**
     - Objective: Refactor the UI panel in `App.tsx` to align with the Carbon-Zinc design DNA.
     - Sub-steps:
       - 2.1: Modernize the floating container. Add smooth shadow, borders, blur, and increase padding slightly.
       - 2.2: Redesign the input wrappers (Search and Replace fields): increase height to `28px`, add borders (`rgba(0,0,0,0.1)` in light / `rgba(255,255,255,0.1)` in dark), and outline-focus styles.
       - 2.3: Fix the "Replace" and "All" buttons: add theme-compliant backgrounds, font weights, explicit text colors, hover transitions, and distinct disabled states.
       - 2.4: Style the chevron buttons and close icon: specify exact colors for both dark/light modes and active/disabled states.
   - **Phase 3: Premium Visual Styles & Themes (Web)**
     - Objective: Align `notepad.tsx` Find & Replace UI with the newly updated desktop styling.
     - Sub-steps:
       - 3.1: Apply the container, input size, and focus styles to the panel in `notepad.tsx`.
       - 3.2: Refactor buttons and navigation icons in `notepad.tsx` to share the same high-contrast theme styling.
   - **Phase 4: Dev Verification & Packaging**
     - Objective: Compile both targets, verify the visual design, and build production installers.
     - Sub-steps:
       - 4.1: Run `npm run build:renderer` to compile the desktop renderer and fix any type/syntax errors.
       - 4.2: Run `npm run build` to verify web portfolio builds.
       - 4.3: Package and prepare local reinstallation packages.
