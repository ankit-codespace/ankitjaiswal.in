import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { tokens } from "./tokens";

/**
 * Sticky bottom status bar shared across every tool.
 *
 * This is the second half of the "notepad bar" — the top is `<ToolHeader>`,
 * the bottom is this. Together they frame the tool's interactive surface in
 * dense, useful chrome the way Bear / iA Writer / Linear do.
 *
 * Anatomy:
 *   [ stat · stat · stat · stat ]                        [⌨ Shortcuts]
 *
 * Behavior:
 *   - Fixed to the bottom of the viewport, 38px tall, matches notepad's bar.
 *   - Optional scroll-based auto-hide: pass `hideBelowRef` pointing at the
 *     tool's main interactive surface and the bar slides out once the user
 *     scrolls past it (so it doesn't sit on top of long SEO content below).
 *   - Optional keyboard shortcuts modal: pass `shortcuts` and a Shortcuts
 *     button appears at the right; clicking it opens a popover above the bar.
 *
 * Pass `extras` for tool-specific right-side controls that should sit *next*
 * to the Shortcuts button (e.g. a "Clear all" mini-button for clipboard).
 */

export type ToolStatusStat = {
  /** Stable key for React reconciliation. */
  key: string;
  /** What the user sees. */
  label: ReactNode;
  /** Optional small icon rendered before the label. */
  icon?: ReactNode;
  /** Optional accent color tweak for status states. */
  accent?: "default" | "warn" | "success" | "muted";
};

export type ToolShortcut = { key: string; label: string };
export type ToolShortcutGroup = { group: string; items: ToolShortcut[] };

export function ToolStatusBar({
  stats,
  shortcuts,
  extras,
  hideBelowRef,
}: {
  stats: ToolStatusStat[];
  shortcuts?: ToolShortcutGroup[];
  extras?: ReactNode;
  hideBelowRef?: RefObject<HTMLElement | null>;
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hidden, setHidden] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Scroll-based auto-hide. Activated only when caller opts in via hideBelowRef.
  useEffect(() => {
    if (!hideBelowRef?.current) return;
    const target = hideBelowRef.current;
    const onScroll = () => {
      const rect = target.getBoundingClientRect();
      // Hide only once the user has scrolled the tool's main surface
      // substantially out of view (i.e. they're now reading the SEO content
      // below). 80px keeps the bar visible while any part of main is on
      // screen, which matters for tools whose main is shorter than viewport.
      setHidden(rect.bottom < 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hideBelowRef]);

  // Esc closes shortcuts modal; outside click closes too.
  useEffect(() => {
    if (!showShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowShortcuts(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowShortcuts(false);
      }
    };
    document.addEventListener("keydown", onKey);
    // Defer so the click that opened it doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, [showShortcuts]);

  const accentColor = (a: ToolStatusStat["accent"]) => {
    switch (a) {
      case "warn":    return "rgba(251,191,36,0.78)";
      case "success": return "rgba(52,211,153,0.85)";
      case "muted":   return "rgba(255,255,255,0.22)";
      default:        return "rgba(255,255,255,0.55)";
    }
  };

  return null;
}

/** Reserve room at the bottom of a tool's interactive surface so the
 *  fixed status bar doesn't sit on top of content. */
export const TOOL_STATUS_BAR_PADDING = 56;
