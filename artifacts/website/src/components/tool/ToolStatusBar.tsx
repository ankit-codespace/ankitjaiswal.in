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

  return (
    <div
      className="tool-status-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: tokens.bg.chrome,
        borderTop: `1px solid ${tokens.border.subtle}`,
        height: 38,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        transform: hidden ? "translateY(100%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "transform .28s cubic-bezier(0.22,1,0.36,1), opacity .22s ease",
      }}
      aria-hidden={hidden}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: tokens.text.kicker,
          fontFamily: tokens.font.body,
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {stats.map((s, i) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, color: accentColor(s.accent) }}>
            {i > 0 && <span style={{ opacity: 0.4, marginRight: 6, color: tokens.text.kicker }}>·</span>}
            {s.icon}
            <span>{s.label}</span>
          </span>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {extras && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: shortcuts?.length ? 8 : 0 }}>
          {extras}
        </div>
      )}

      {shortcuts && shortcuts.length > 0 && (
        <>
          {showShortcuts && (
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Keyboard shortcuts"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                bottom: 46,
                right: 10,
                zIndex: 400,
                background: "#13161F",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12,
                padding: "16px 20px",
                boxShadow: "0 -4px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
                width: shortcuts.length > 2 ? 420 : 320,
                maxWidth: "calc(100vw - 20px)",
                backdropFilter: "blur(18px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)", fontFamily: tokens.font.display, letterSpacing: "-0.01em" }}>
                  Keyboard Shortcuts
                </span>
                <button
                  onClick={() => setShowShortcuts(false)}
                  aria-label="Close shortcuts"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2, display: "flex" }}
                >
                  <X size={12} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: shortcuts.length > 1 ? "1fr 1fr" : "1fr",
                  gap: "0 24px",
                }}
              >
                {shortcuts.map((section) => (
                  <div key={section.group} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: tokens.font.body, marginBottom: 7 }}>
                      {section.group}
                    </div>
                    {section.items.map(({ key, label }) => (
                      <div key={key + label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, gap: 12 }}>
                        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", fontFamily: tokens.font.body }}>{label}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          {key.split("+").map((k) => (
                            <kbd
                              key={k}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.11)",
                                borderBottom: "2px solid rgba(255,255,255,0.07)",
                                borderRadius: 4,
                                padding: "2px 5px",
                                fontSize: 10,
                                color: "rgba(255,255,255,0.5)",
                                fontFamily: tokens.font.body,
                                minWidth: 20,
                                lineHeight: 1.4,
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowShortcuts((v) => !v); }}
            title="Keyboard shortcuts"
            aria-label="Open keyboard shortcuts"
            aria-expanded={showShortcuts}
            style={{
              background: showShortcuts ? "rgba(16,185,129,0.12)" : "transparent",
              border: "1px solid",
              borderColor: showShortcuts ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s",
            }}
          >
            <svg
              width="15"
              height="11"
              viewBox="0 0 15 11"
              fill="none"
              style={{ color: showShortcuts ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.32)", transition: "color 0.15s" }}
            >
              <rect x="0.75" y="0.75" width="13.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2.5" y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="5"   y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="7.5" y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="10"  y="2.5" width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="2.5" y="5"   width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="5.5" y="5"   width="4"   height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="10"  y="5"   width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
              <rect x="3.8" y="7.2" width="7.4" height="1.2" rx="0.5" fill="currentColor" opacity="0.5" />
            </svg>
            <span
              style={{
                fontSize: 11,
                color: showShortcuts ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.35)",
                fontFamily: tokens.font.body,
                transition: "color 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              Shortcuts
            </span>
          </button>
        </>
      )}
    </div>
  );
}

/** Reserve room at the bottom of a tool's interactive surface so the
 *  fixed status bar doesn't sit on top of content. */
export const TOOL_STATUS_BAR_PADDING = 56;
