# Ruler Lines Opacity Customization Audit Report

## 1. Findings
- **CSS repeating linear gradient rules**: Ruled lines are drawn in dark/light modes using hardcoded transparent rgba values:
  - Dark: `rgba(255, 255, 255, 0.07)`
  - Light: `rgba(0, 0, 0, 0.08)`
- **Solution**: Replace with CSS custom variables:
  - Dark: `rgba(255, 255, 255, var(--np-ruler-opacity, 0.07))`
  - Light: `rgba(0, 0, 0, var(--np-ruler-opacity-light, 0.08))`
- **Settings schema**: Integrate `rulerOpacity?: "less" | "normal" | "more";` with default `"normal"`.
- **UI options**: Add settings modal toggle pill buttons for "Faint", "Normal", and "Distinct".
