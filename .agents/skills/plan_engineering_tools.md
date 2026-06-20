# Skill: Plan Free Engineering Tools Refactoring

This skill details the step-by-step phased approach to refactoring `OpenSourceAssets.tsx` with a clean, high-fidelity monochromatic theme.

## Phased Implementation Plan

- **Phase 1: Refactor Window Decorations & Tabs**
  - **Objective**: Clean out bright colored dots and red/green glowing selectors.
  - **Sub-steps**:
    - 1.1: Replace colored dots in all canvases with muted gray round elements.
    - 1.2: Edit tab selection buttons: use a subtle `bg-white/[0.05]` background for selected tabs, and remove background color entirely for unselected tabs.
- **Phase 2: Refactor Action Buttons & Metrics**
  - **Objective**: Desaturate action buttons and metrics text, replacing them with clean outline boxes and small color status dots.
  - **Sub-steps**:
    - 2.1: Convert "Crawl Page" button to an outline styling: `bg-white/[0.04]` and `border-white/[0.08]`.
    - 2.2: Convert `crawlBudget` and status text to crisp gray/white with tiny 6px colored warning dots.
- **Phase 3: Refactor Main Download Button**
  - **Objective**: Replace the solid cream block CTA with a sleek outline button layout.
  - **Sub-steps**:
    - 3.1: Change the download anchor's style to transparent background with thin borders and white text, setting a smooth transition to solid white on hover.
- **Phase 4: Verification & Build**
  - **Objective**: Run `npm run build` to confirm zero compilation errors.
