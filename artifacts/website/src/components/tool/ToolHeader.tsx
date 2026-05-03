import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { FeedbackHeaderButton } from "@/components/FeedbackWidget";

/**
 * Sticky top bar shared by every tool page.
 *
 * Anatomy:
 *   [← Tools] | [Tool Name]            [actions...] [Feedback]
 *              [tagline                ]
 *
 * `actions` is a slot for tool-specific controls (e.g. settings, view toggle).
 * The Feedback button is always rendered last on the right so users always
 * know where to find it across every tool — consistency trumps creativity
 * for utilitarian chrome.
 *
 * Pair this with <ToolStyles /> mounted somewhere on the page (or use
 * <ToolPage> which mounts it for you).
 */
export function ToolHeader({
  title,
  tagline,
  backHref = "/tools",
  backLabel = "Tools",
  actions,
  hideFeedback = false,
}: {
  /** Short tool name, e.g. "WebP Converter" */
  title: string;
  /** Optional one-liner under the title — shown on >600px viewports only. */
  tagline?: string;
  /** Where the back link points. Defaults to /tools. */
  backHref?: string;
  /** Label for the back link (the icon is always shown). */
  backLabel?: string;
  /** Tool-specific controls injected before the Feedback button. */
  actions?: ReactNode;
  /** Escape hatch in case a tool wants to host its own feedback affordance. */
  hideFeedback?: boolean;
}) {
  return (
    <header className="tool-header">
      <div className="tool-header-inner">
        <Link href={backHref} className="tool-header-back" aria-label={`Back to ${backLabel}`}>
          <ArrowLeft size={14} strokeWidth={2} />
          <span>{backLabel}</span>
        </Link>
        <span className="tool-header-divider" aria-hidden="true" />
        <div style={{ minWidth: 0 }}>
          <div className="tool-header-title">{title}</div>
          {tagline && <div className="tool-header-tagline">{tagline}</div>}
        </div>
        <div className="tool-header-actions">
          {actions}
          {!hideFeedback && <FeedbackHeaderButton className="tool-header-btn" />}
        </div>
      </div>
    </header>
  );
}
