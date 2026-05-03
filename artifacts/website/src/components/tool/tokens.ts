/**
 * Design tokens for the tool design system.
 *
 * These are the only places colors, type scales, and spacing values should
 * come from when building a new tool page. Do NOT hand-roll one-off colors —
 * if you need a new shade, add it here so every tool stays visually coherent.
 *
 * The palette intentionally mirrors the notepad's premium dark aesthetic so
 * existing pages and new pages feel like the same product, not seven
 * different SaaS templates glued to one homepage.
 */

export const tokens = {
  /** Page-level surfaces */
  bg: {
    /** Outer page background — deepest level */
    page: "#0A0C10",
    /** Top toolbar / sticky chrome */
    chrome: "#0D0F14",
    /** Card surface (inside dark areas) */
    card: "rgba(255,255,255,0.02)",
    /** Card surface on hover */
    cardHover: "rgba(255,255,255,0.035)",
    /** Subtle elevated band (privacy notes, callouts) */
    band: "rgba(255,255,255,0.02)",
  },

  /** Borders */
  border: {
    /** Default subtle hairline on dark surfaces */
    subtle: "rgba(255,255,255,0.06)",
    /** Default control border */
    default: "rgba(255,255,255,0.07)",
    /** Border on hover (cards, links, related-tool tiles) */
    hover: "rgba(255,255,255,0.14)",
    /** Border on focus rings */
    focus: "rgba(255,255,255,0.18)",
  },

  /** Text */
  text: {
    /** Primary white — for headings */
    primary: "#fff",
    /** Body text on dark surfaces */
    body: "rgba(255,255,255,0.78)",
    /** Muted body — secondary copy */
    muted: "rgba(255,255,255,0.62)",
    /** Soft helper text */
    soft: "rgba(255,255,255,0.55)",
    /** Quietest — captions, meta */
    quiet: "rgba(255,255,255,0.42)",
    /** Eyebrow / kicker uppercase labels */
    kicker: "rgba(255,255,255,0.38)",
  },

  /** Type families */
  font: {
    display: "'Sora', sans-serif",
    body: "'Inter', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  /** Common transitions for hover/focus interactions */
  motion: {
    fast: ".15s ease",
    base: ".18s ease",
    slow: ".24s cubic-bezier(0.22, 1, 0.36, 1)",
  },

  /** Container widths used across SEO sections */
  width: {
    prose: 760,
    grid: 1040,
    privacy: 920,
  },
} as const;

/** Sentinel constant: the standardized bottom-of-page footer band height.
 *  Useful when other components need to reserve space. */
export const FOOTER_BAND_PADDING = "40px 24px 56px";
