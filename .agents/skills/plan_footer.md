# Skill: Plan Footer Redesign and Alignment

This skill outlines the step-by-step phased approach to redesign the marketing footer in `layout.tsx`, implement a live clock widget, style the layouts, and deploy the changes to the live site.

## Phased Implementation Plan

- **Phase 1: Brand Footer Structure & Styles in `layout.tsx`**
  - **Objective**: Replace the basic 3-column footer in `layout.tsx` with a premium 4-column layout featuring a header CTA and radial gradients.
  - **Sub-steps**:
    - 1.1: Replace lines 387-440 of `layout.tsx` with a container featuring a dark noise background and a radial bottom blue glow (`radial-gradient(ellipse at bottom, rgba(44,44,243,0.12) 0%, rgba(13,17,23,0) 70%)`).
    - 1.2: Add a hero call-to-action block: "Let's build something impossible to ignore." with a link to scroll to the Contact section.
    - 1.3: Create a 4-column grid layout:
      - Column 1: Brand identity, bio, and a dynamic Live Time Clock (showing Ankit's timezone time).
      - Column 2: Navigation Links (About, Work, Results).
      - Column 3: Utility Tools directory (Notepad, WebP, Paste to Image, Pomodoro).
      - Column 4: Contact links (Email, LinkedIn, WhatsApp).
- **Phase 2: Live Clock Component Implementation**
  - **Objective**: Implement a real-time updating live clock hook representing Ankit's Indian Standard Time (IST) timezone.
  - **Sub-steps**:
    - 2.1: Add a simple stateful `useEffect` clock timer hook inside the Footer component or `Layout` in `layout.tsx`.
    - 2.2: Format the time as `hh:mm A` in the `"Asia/Kolkata"` timezone.
    - 2.3: Render it sleekly: `"Punjab, IN · 07:45 PM"`.
- **Phase 3: Visual Polish & Micro-Animations**
  - **Objective**: Add hover transitions, subtle borders, and font weight optimizations to link elements.
  - **Sub-steps**:
    - 3.1: Apply dynamic underline or color transitions to the footer links.
    - 3.2: Style the social icons and mail icons with glassmorphic cards and hover-lift transitions.
- **Phase 4: Build Verification & Deploy**
  - **Objective**: Run production compilation and push to GitHub.
    - 4.1: Run `npm run build` under website root folder.
    - 4.2: Push code changes to GitHub repository.
