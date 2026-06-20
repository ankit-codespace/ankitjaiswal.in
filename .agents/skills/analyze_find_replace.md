# Skill: Analyze Find & Replace Tool UX & Keyboard Trigger

This skill conducts a deep visual and functional audit of the Find & Replace panel in both the Electron desktop app (`App.tsx`) and the web portfolio (`notepad.tsx`) to identify styling, color contrast, theme awareness, and keyboard shortcut bugs.

## Analysis Findings

1. **Keyboard Shortcuts Bug (Ctrl+F / Ctrl+Shift+F / Ctrl+H)**:
   - **Desktop App (`App.tsx`)**: The global keydown listener (`handleKeyDown`) is completely missing handlers for `Ctrl + F` and `Ctrl + Shift + F`. Pressing these keys does nothing, even though the toolbar button displays the tooltip "Find / Replace (Ctrl+F)".
   - **Web App (`notepad.tsx`)**: Already has `Ctrl+F` and `Ctrl+Shift+F` handlers, but we must make sure they are aligned. Also, standard Windows text editors map `Ctrl + H` to Replace, which we should safely support in desktop mode while avoiding browser history conflicts in web mode.
2. **Button Contrast & Color Theming Bugs**:
   - In `App.tsx` (lines 3507-3508), the "Replace" and "All" buttons are rendered using:
     `style={{ fontSize: 11, border: "none", borderRadius: 4, height: 24, padding: "0 8px", cursor: "pointer" }}`
     Without background and color definitions, they render as low-contrast gray text on a white card (in light mode), making them nearly invisible.
   - In both files, the disabled state for buttons and chevron navigation buttons uses generic styling (`rgba(128,128,128,0.3)` or `"transparent"`) which is not optimized for dark/light themes.
   - The close icon (`X`) does not have explicit color mapping, leading to poor contrast.
3. **Cramped Visual Layout**:
   - The inputs use a simple background block (`rgba(0,0,0,0.04)`) with no active focus state borders.
   - The height of the input containers (`26px`) is slightly too small and feels squeezed.
   - The overall layout lacks a premium, modern SaaS card feel.
4. **Remediation & Refactoring Strategy**:
   - **Shortcut Integration**: Add `Ctrl + F` (open find, hide replace) and `Ctrl + Shift + F` / `Ctrl + H` (open find, show replace) to the `handleKeyDown` listener in `App.tsx`.
   - **Premium SaaS Theme Styling**:
     - Style buttons with explicit backgrounds: `effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"` for enabled, and full transparent/low contrast for disabled.
     - Text colors: `effectiveDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)"` for active, and theme-compliant transparent for disabled.
     - Hover styles: Add visual feedback (background changes, cursor styles) for hover states on buttons and icons.
     - Inputs: Increase height to `28px`, add crisp border style: `1px solid ${effectiveDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`, and add a subtle focus state transition.
     - Sizing: Increase card padding and width slightly for better breathing room.
