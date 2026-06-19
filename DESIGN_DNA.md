# Design DNA & Color Guidelines

> **CRITICAL:** DO NOT DELETE OR MUTATE THIS FILE. It acts as the visual specification reference for all developers and AI agents creating new pages, features, or tools.

This document defines the core color systems, surfaces, and visual rules that keep the portfolio website and its interactive browser tools coherent and premium.

---

## 1. Core Background Surfaces

To maintain a high-contrast, premium dark mode, we separate the portfolio landing sections from the core browser tools. **Do not mix these colors.**

### A. Web App & Interactive Tools Surface (Paste to Image, Notepad, etc.)
Our tools use a custom-curated, warm-neutral slate scheme with **zero blue cast**. This mimics high-end hardware/paper and reduces eye strain during long-term editing sessions.

| Token | CSS Variable | Hex Code | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **`bg-page`** | `--bg0` | **`#0F0F0E`** | Outer page background (deepest layer) |
| **`bg-chrome`** | `--bg1` | **`#161615`** | Chrome elements: top toolbars, headers, panel surfaces |
| **`bg-card`** | `--bg2` | **`#1C1C1B`** | Active card/input fields, hover states |
| **`bg-border`** | `--b0` | **`#252523`** | Default subtle hairline separator |
| **`bg-text`** | `--t1` | **`#F0EDE8`** | Primary heading color (warm off-white) |

### B. Marketing & Portfolio Landing Pages (Home Page, Sections, Modals)
Our marketing sections use a desaturated carbon-zinc system. This creates a striking background contrast that lets colorful tool assets pop.

| Page / Element | Color Code | Purpose / Usage |
| :--- | :--- | :--- |
| **Open Source Section Background** | **`#09090b`** | Primary background of marketing pages (zinc-neutral dark) |
| **Modal Backdrop Overlay** | **`#020203`** (85% opacity) | Blurs the background page into obsidian dark |
| **Modal Content Wrapper** | **`linear-gradient(135deg, rgba(18, 18, 22, 0.95) 0%, rgba(9, 9, 11, 0.99) 100%)`** | Premium floating card surface |
| **Simulation Pane Background** | **`rgba(5, 5, 7, 0.45)`** | Inner visual simulator columns |
| **Inner Console / Code Panels** | **`#050507`** & **`#0a0a0d`** | Embedded editors, code cards, and terminal blocks |

---

## 2. Design Principles (The Top 1% Rulebook)

1. **Zero Blue Contamination**: Never use saturated blue-grays (like `#0D1117` or `#050810`) for landing page sections or modals. They wash out other brand colors and look dated. Use desaturated carbons (`#09090b`) or warm off-blacks (`#0F0F0E`).
2. **Extreme Contrast Borders**: All dark mode borders must use high transparency (`rgba(255, 255, 255, 0.08)` or `var(--b0)`) rather than solid gray. This lets background gradients shine through.
3. **Radial Accent Spotlights**: Use high-blur radial gradients (e.g. `radial-gradient(circle, rgba(255, 59, 48, 0.08) 0%, transparent 70%)`) behind main highlights to create a premium sense of physical depth.
4. **Typography Hierarchy**: Use Times New Roman (`font-serif` / `italic`) exclusively for kickers, eyebrows, or decorative emphasis. Use Sora (`font-display`) for main geometric headers, and Inter (`font-sans`) for highly readable interface elements.
