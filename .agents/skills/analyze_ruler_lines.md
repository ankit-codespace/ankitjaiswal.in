# Skill: Analyze Ruler Lines Visibility and Settings Integration

This skill conducts a deep architectural audit of the background grid/ruler line styles and settings structures in both the web client and desktop versions of "I Love Notepad".

## Analysis & Findings

### 1. Repeating Linear Gradient Grid Styling
- **Current Rules:** In `notepad-win/src/renderer/src/index.css` and the website stylesheet, the ruled lines are drawn using a CSS repeating linear gradient background:
  - **Dark Mode:** `rgba(255, 255, 255, 0.07)` (7% opacity)
  - **Light Mode (`.surface-light`):** `rgba(0, 0, 0, 0.08)` (8% opacity)
- **Top 1% SaaS Solution:**
  Instead of hardcoded values, we will use CSS custom properties inside the repeating gradients:
  - Dark: `rgba(255, 255, 255, var(--np-ruler-opacity, 0.07))`
  - Light: `rgba(0, 0, 0, var(--np-ruler-opacity-light, 0.08))`

### 2. State & Storage Schema Integration
- **Settings Interface:** Add `rulerOpacity?: "less" | "normal" | "more"` to the `NotepadSettings` interface.
- **Default State:** Add `rulerOpacity: "normal"` to the `DEFAULT_SETTINGS` object.
- **LocalStorage Storage:** The settings manager reads and saves configuration changes automatically using `localStorage.setItem(LS_SETTINGS, JSON.stringify(next))`. No change is required here.
- **Opacity Matrix:**
  - **Faint (`"less"`):** Dark = `0.03`, Light = `0.04` (very subtle, minimal distraction).
  - **Normal (`"normal"`):** Dark = `0.07`, Light = `0.08` (balanced layout structure).
  - **Distinct (`"more"`):** Dark = `0.15`, Light = `0.18` (high contrast for bright viewports).

### 3. Inline Style Injection
- In the `editorInnerStyle` computation in `App.tsx` and `notepad.tsx`, map the selected `settings.rulerOpacity` to the CSS variables:
  ```typescript
  const rulerOpacityVal = settings.rulerOpacity === "less" ? 0.03 : (settings.rulerOpacity === "more" ? 0.15 : 0.07);
  const rulerOpacityLightVal = settings.rulerOpacity === "less" ? 0.04 : (settings.rulerOpacity === "more" ? 0.18 : 0.08);
  
  const base: React.CSSProperties = {
    ...
    ["--np-ruler-opacity" as string]: String(rulerOpacityVal),
    ["--np-ruler-opacity-light" as string]: String(rulerOpacityLightVal),
  };
  ```

### 4. Settings Dialog UX Integration
- Add a new "Line Opacity" row at the bottom of the Settings modal in both platforms, rendered conditionally:
  `settings.ruledLines && ( ... )`
- Render three options using standard pill toggles: `Faint` (`"less"`), `Normal` (`"normal"`), and `Distinct` (`"more"`).

## Analysis Self-Audit
- **Performance impact:** Since CSS custom variables map directly to linear gradients, changes apply instantly at the browser style calculation layer, resulting in 0px reflow or layout shifts.
- **Theme compatibility:** Opacities scale contextually whether a user selects Slate, Paper, Midnight, Sepia, or Mist.
