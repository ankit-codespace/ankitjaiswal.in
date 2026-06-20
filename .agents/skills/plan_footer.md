# Skill: Plan Footer Redesign and Alignment

This skill outlines the step-by-step phased approach to redesign the marketing footer in `layout.tsx`, optimize text contrast, strip background ticking clock intervals, and deploy changes.

## Phased Implementation Plan

- **Phase 1: Structure & Typography Overhaul in `layout.tsx`**
  - **Objective**: Re-structure the footer container to remove glowing radial gradients, heavy CTA panels, and optimize readability.
  - **Sub-steps**:
    - 1.1: Edit the footer block (lines 387-440) in `layout.tsx`. Set background to a solid `#0B0C10` (or clean dark charcoal) with a razor-thin top border: `1px solid rgba(255, 255, 255, 0.05)`.
    - 1.2: Remove any giant banner cards, status badges, or large colored backgrounds.
    - 1.3: Structure a clean 4-column layout grid:
      - Column 1: Logo, bio/mission text, and static timezone label: `Punjab, IN (GMT+5:30)`.
      - Column 2: Platform Links (Home, About, Work).
      - Column 3: Core Tools (Online Notepad, Paste to Image, WebP Converter, Pomodoro).
      - Column 4: Connect Links (Email, LinkedIn, GitHub).
- **Phase 2: Remove Ticking Clock & Dynamic CPU Wakes**
  - **Objective**: Clean out active timer hooks/intervals that trigger frequent paint updates in the background.
  - **Sub-steps**:
    - 2.1: Ensure no `setInterval` or real-time state clocks are registered in the footer.
    - 2.2: Declare the timezone information as static, lightweight React elements.
- **Phase 3: Color Contrast & Link States**
  - **Objective**: Apply high-contrast text styles to ensure absolute readability and smooth accessibility.
  - **Sub-steps**:
    - 3.1: Set base link text color to `#8F9092` with transition settings (`transition: color 150ms ease`).
    - 3.2: Set hover color state to `#F9FAFB` (crisp white) so that hovering provides a direct, highly responsive visual highlight.
- **Phase 4: Build Verification & Deploy**
  - **Objective**: Verify correct assembly via compilation and push changes to the live site.
    - 4.1: Run `npm run build` under website root folder.
    - 4.2: Commit and push changes to the GitHub repository.
