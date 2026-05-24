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
    page: "var(--bg0)",
    /** Top toolbar / sticky chrome */
    chrome: "var(--bg1)",
    /** Card surface (inside dark areas) */
    card: "var(--bg1)",
    /** Card surface on hover */
    cardHover: "var(--bg2)",
    /** Subtle elevated band (privacy notes, callouts) */
    band: "var(--bg1)",
  },

  /** Borders */
  border: {
    /** Default subtle hairline on dark surfaces */
    subtle: "var(--b0)",
    /** Default control border */
    default: "var(--b1)",
    /** Border on hover (cards, links, related-tool tiles) */
    hover: "var(--b2)",
    /** Border on focus rings */
    focus: "var(--b3)",
  },

  /** Text */
  text: {
    /** Primary white — for headings */
    primary: "var(--t1)",
    /** Body text on dark surfaces */
    body: "var(--t2)",
    /** Muted body — secondary copy */
    muted: "var(--t2)",
    /** Soft helper text */
    soft: "var(--t3)",
    /** Quietest — captions, meta */
    quiet: "var(--t3)",
    /** Eyebrow / kicker uppercase labels */
    kicker: "var(--t3)",
  },

  /** Type families */
  font: {
    display: "var(--d)",
    body: "var(--s)",
    mono: "var(--m)",
  },

  /** Common transitions for hover/focus interactions */
  motion: {
    fast: ".14s cubic-bezier(.22,1,.36,1)",
    base: ".18s cubic-bezier(.22,1,.36,1)",
    slow: ".22s cubic-bezier(.22,1,.36,1)",
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
