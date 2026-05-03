/**
 * Single source of truth for the dark "tool SEO article" CSS.
 *
 * This used to live inline at the bottom of notepad.tsx as a giant <style>
 * block. Extracted here so every tool page that wraps content in
 * <ToolSEOArticle> gets the same `.tool-*` classes for free.
 *
 * The class prefix is `tool-` (not `nseo-`) because these styles now belong
 * to the shared design system, not specifically to the notepad. The notepad
 * itself still uses its `nseo-*` classes — when we eventually backport it,
 * the two namespaces will merge.
 *
 * Mount this once near the top of any tool page that uses the SEO components.
 * <ToolSEOArticle> mounts it automatically, so most callers never touch it.
 */

export function ToolStyles() {
  return (
    <style>{`
      /* ── Cards ── */
      .tool-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px;
        padding: 22px 22px 20px;
        transition: border-color .2s ease, background .2s ease, transform .2s ease;
      }
      .tool-card:hover {
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.035);
      }
      .tool-icon {
        width: 38px; height: 38px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        color: #fff;
        margin-bottom: 16px;
      }

      /* ── FAQ ── */
      .tool-faq {
        border-bottom: 1px solid rgba(255,255,255,0.07);
      }
      .tool-faq:first-child { border-top: 1px solid rgba(255,255,255,0.07); }
      .tool-faq summary {
        list-style: none;
        cursor: pointer;
        display: flex; align-items: center; justify-content: space-between;
        gap: 16px;
        padding: 20px 4px;
        font-family: 'Sora', sans-serif;
        font-size: 15.5px;
        font-weight: 500;
        color: rgba(255,255,255,0.92);
        outline: none;
        user-select: none;
      }
      .tool-faq summary::-webkit-details-marker { display: none; }
      .tool-faq summary:hover { color: #fff; }
      .tool-faq summary:focus-visible {
        color: #fff;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
        border-radius: 6px;
      }
      .tool-faq .tool-faq-chevron {
        flex-shrink: 0;
        transition: transform .2s ease;
        color: rgba(255,255,255,0.4);
      }
      .tool-faq[open] .tool-faq-chevron { transform: rotate(180deg); color: rgba(255,255,255,0.7); }
      .tool-faq-answer {
        padding: 0 4px 22px;
        font-size: 14.5px;
        line-height: 1.75;
        color: rgba(255,255,255,0.62);
        max-width: 680px;
      }

      /* ── Related-tools tiles ── */
      .tool-related {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
        padding: 18px 20px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.02);
        text-decoration: none;
        color: #fff;
        transition: border-color .15s ease, background .15s ease, transform .15s ease;
      }
      .tool-related:hover {
        border-color: rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.045);
        transform: translateY(-1px);
      }
      .tool-related:focus-visible {
        outline: none;
        border-color: rgba(255,255,255,0.32);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
      }
      .tool-related .tool-related-arrow {
        color: rgba(255,255,255,0.35);
        transition: color .15s ease, transform .15s ease;
      }
      .tool-related:hover .tool-related-arrow {
        color: #fff;
        transform: translate(2px, -2px);
      }

      /* ── Footer link / social ── */
      .tool-footer-link {
        color: rgba(255,255,255,0.55);
        text-decoration: none;
        transition: color .15s ease;
      }
      .tool-footer-link:hover { color: #fff; }
      .tool-footer-link:focus-visible {
        outline: none;
        color: #fff;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
        border-radius: 4px;
      }
      .tool-social-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        color: rgba(255,255,255,0.55);
        background: transparent;
        border: 1px solid rgba(255,255,255,0.10);
        transition: color .18s ease, background .18s ease, border-color .18s ease, transform .18s ease;
      }
      .tool-social-link:hover {
        color: #fff;
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.22);
        transform: translateY(-1px);
      }
      .tool-social-link:focus-visible {
        outline: 2px solid rgba(255,255,255,0.55);
        outline-offset: 2px;
        color: #fff;
      }

      /* ── Author card ── */
      .tool-author-card {
        position: relative;
        border-radius: 20px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.08) 100%);
        overflow: hidden;
        max-width: 760px;
        margin-left: auto;
        margin-right: auto;
      }
      .tool-author-card::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 20px;
        background: radial-gradient(120% 100% at 0% 0%, rgba(120, 130, 255, 0.10), transparent 60%);
        pointer-events: none;
      }
      .tool-author-card-inner {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 24px;
        padding: 28px 30px;
        border-radius: 19px;
        background: linear-gradient(180deg, #0E1117 0%, #0A0C10 100%);
      }
      @media (max-width: 540px) {
        .tool-author-card-inner { padding: 22px; gap: 18px; }
      }
      .tool-author-avatar {
        flex-shrink: 0;
        width: 64px;
        height: 64px;
        border-radius: 16px;
        overflow: hidden;
        background: linear-gradient(135deg, #2C2CF3 0%, #1A1AC4 100%);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.10), 0 12px 28px -10px rgba(0,0,0,0.55);
      }
      .tool-author-avatar img {
        display: block; width: 100%; height: 100%;
        object-fit: cover; object-position: center;
      }
      .tool-author-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .tool-author-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.14);
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        text-decoration: none;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }
      .tool-author-cta:hover {
        background: rgba(255,255,255,0.10);
        border-color: rgba(255,255,255,0.24);
        transform: translateY(-1px);
      }
      .tool-author-cta:focus-visible {
        outline: 2px solid rgba(255,255,255,0.55);
        outline-offset: 2px;
      }
      .tool-author-socials { display: flex; align-items: center; gap: 8px; }

      /* ── Long-form prose ── */
      .tool-prose p {
        font-size: 16px;
        line-height: 1.8;
        color: rgba(255,255,255,0.7);
        margin: 0 0 22px;
      }
      .tool-prose p:last-child { margin-bottom: 0; }
      .tool-prose strong { color: #fff; font-weight: 600; }
      .tool-prose a {
        color: #fff;
        text-decoration: underline;
        text-decoration-color: rgba(255,255,255,0.3);
        text-underline-offset: 3px;
        transition: text-decoration-color .15s ease;
      }
      .tool-prose a:hover { text-decoration-color: #fff; }

      /* ── Numbered "how-to" steps ── */
      .tool-step {
        display: flex;
        gap: 18px;
        padding: 20px 22px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px;
        transition: border-color .2s ease, background .2s ease;
      }
      .tool-step:hover {
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.035);
      }
      .tool-step-num {
        flex-shrink: 0;
        width: 30px; height: 30px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        font-family: 'Sora', sans-serif;
        font-size: 13px; font-weight: 600;
        color: #fff;
      }
      .tool-step-title {
        font-family: 'Sora', sans-serif;
        font-weight: 700; font-size: 15.5px;
        color: #fff; margin: 4px 0 6px;
        letter-spacing: -0.005em;
      }
      .tool-step-body {
        font-size: 14px;
        line-height: 1.65;
        color: rgba(255,255,255,0.62);
        margin: 0;
      }

      /* ── Tables (shortcuts, comparison) ── */
      .tool-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13.5px;
        color: rgba(255,255,255,0.72);
      }
      .tool-table th {
        text-align: left;
        font-family: 'Sora', sans-serif;
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.025);
      }
      .tool-table td {
        padding: 13px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        line-height: 1.55;
      }
      .tool-table tr:last-child td { border-bottom: none; }
      .tool-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
      .tool-table-wrap {
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        overflow: hidden;
        background: rgba(255,255,255,0.015);
      }
      .tool-kbd {
        display: inline-block;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12.5px;
        padding: 3px 8px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        color: #fff;
        white-space: nowrap;
      }
      .tool-compare-table-wrap { overflow-x: auto; }
      .tool-compare-table th + th,
      .tool-compare-table td + td { text-align: center; }
      .tool-compare-table td:first-child { color: #fff; font-weight: 500; }
      .tool-compare-yes { color: rgba(140, 230, 170, 0.95); font-weight: 500; }
      .tool-compare-no  { color: rgba(255,255,255,0.4); }

      /* ── Tips ── */
      .tool-tip {
        display: flex; gap: 16px;
        padding: 22px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px;
        transition: border-color .2s ease, background .2s ease;
      }
      .tool-tip:hover {
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.035);
      }

      /* ── Privacy band ── */
      .tool-privacy {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 18px;
        padding: 36px 40px;
        display: flex; gap: 24px; align-items: flex-start;
      }
      @media (max-width: 640px) {
        .tool-privacy { flex-direction: column; padding: 28px 24px; }
        .tool-step { padding: 18px; gap: 14px; }
        .tool-table th, .tool-table td { padding: 11px 12px; font-size: 12.5px; }
      }

      /* ── Top header bar — sticky chrome above tool UI ── */
      .tool-header {
        position: sticky;
        top: 0;
        z-index: 40;
        background: #0D0F14;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        backdrop-filter: saturate(140%) blur(8px);
        -webkit-backdrop-filter: saturate(140%) blur(8px);
      }
      .tool-header-inner {
        max-width: 1280px;
        margin: 0 auto;
        height: 56px;
        padding: 0 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
      }
      /* The title container — wrapped in a div with minWidth:0 — must
         flex-shrink so long titles never push action buttons off-screen. */
      .tool-header-inner > div:not(.tool-header-actions) {
        flex: 1 1 auto;
        min-width: 0;
      }
      .tool-header-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px 6px 6px;
        border-radius: 8px;
        color: rgba(255,255,255,0.55);
        font-size: 12.5px;
        font-family: 'Inter', sans-serif;
        text-decoration: none;
        transition: color .15s ease, background .15s ease;
      }
      .tool-header-back:hover {
        color: #fff;
        background: rgba(255,255,255,0.04);
      }
      .tool-header-back:focus-visible {
        outline: 2px solid rgba(255,255,255,0.55);
        outline-offset: 2px;
      }
      .tool-header-divider {
        width: 1px;
        height: 22px;
        background: rgba(255,255,255,0.10);
      }
      .tool-header-title {
        font-family: 'Sora', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        letter-spacing: -0.005em;
        line-height: 1.1;
      }
      .tool-header-tagline {
        font-size: 12px;
        color: rgba(255,255,255,0.45);
        line-height: 1.2;
        margin-top: 2px;
      }
      .tool-header-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      /* Dark-themed pill button used in the header (matches Feedback button) */
      .tool-header-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.14);
        color: rgba(255,255,255,0.72);
        font-size: 12.5px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        letter-spacing: -0.005em;
        cursor: pointer;
        transition: background .15s ease, color .15s ease, border-color .15s ease;
      }
      .tool-header-btn:hover {
        background: rgba(255,255,255,0.06);
        color: #fff;
        border-color: rgba(255,255,255,0.26);
      }
      .tool-header-btn:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
      }
      .tool-header-btn-icon {
        width: 32px;
        padding: 0;
        justify-content: center;
      }

      /* Allow long titles to wrap to two tight lines without pushing
         the action buttons off-screen. */
      .tool-header-title {
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      /* Hide tagline + back text on small screens — keep just the title */
      @media (max-width: 600px) {
        .tool-header-tagline { display: none; }
        .tool-header-back span { display: none; }
        .tool-header-back { padding: 6px; }
        /* Action buttons collapse to icon-only so two of them fit at 320px
           even when the title also wraps to two lines. */
        .tool-header-btn span { display: none; }
        .tool-header-btn {
          width: 32px;
          padding: 0;
          justify-content: center;
          flex-shrink: 0;
        }
        .tool-header-actions { gap: 6px; }
        .tool-header-inner { gap: 12px; padding: 0 14px; }
        /* Slightly smaller title on phones so two-word names like
           "WebP Converter" stay on a single line. */
        .tool-header-title { font-size: 13.5px; }
      }
      @media (max-width: 360px) {
        .tool-header-inner { gap: 10px; padding: 0 12px; }
        .tool-header-title { font-size: 13px; line-height: 1.15; }
      }
    `}</style>
  );
}
