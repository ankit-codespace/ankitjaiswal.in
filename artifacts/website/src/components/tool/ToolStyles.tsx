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
        color: rgba(255,255,255,0.80);
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
      .tool-footer {
        background: #0A0C10;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding: 40px 24px 56px;
        font-family: 'Inter', sans-serif;
      }
      .tool-footer-link {
        color: rgba(255,255,255,0.65);
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
        color: rgba(255,255,255,0.65);
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
      /* ── Author card (Option B - Editorial Card) ── */
      .tool-author-card {
        width: 100%;
        max-width: 760px;
        background: var(--bg1);
        border: 1px solid var(--b1);
        border-radius: var(--r);
        overflow: hidden;
        position: relative;
        transition: border-color .2s;
        margin-left: auto;
        margin-right: auto;
      }
      .tool-author-card:hover { border-color: var(--b2); }

      /* Noise grain — system rule */
      .tool-author-card::before {
        content: '';
        position: absolute; inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
        background-size: 200px 200px;
        opacity: .022;
        pointer-events: none;
        z-index: 0;
      }

      .tool-author-card-inner {
        display: grid;
        grid-template-columns: 88px 1fr;
        position: relative;
        z-index: 1;
      }

      @media (max-width: 500px) {
        .tool-author-card-inner {
          grid-template-columns: 1fr;
        }
      }

      /* Photo column — taller, fills left side */
      .tool-author-card-photo {
        border-right: 1px solid var(--b0);
        overflow: hidden;
      }
      @media (max-width: 500px) {
        .tool-author-card-photo {
          border-right: none;
          border-bottom: 1px solid var(--b0);
          height: 180px;
        }
      }
      .tool-author-card-photo img {
        width: 100%;
        height: 100%;
        min-height: 140px;
        object-fit: cover;
        object-position: center top;
        filter: grayscale(1) contrast(1.04);
        display: block;
      }

      /* Content column */
      .tool-author-card-content {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .tool-author-card-header { display: flex; flex-direction: column; gap: 3px; }
      .tool-author-card-name {
        font-family: var(--d);
        font-size: 15px;
        font-weight: 700;
        color: var(--t1);
        letter-spacing: -.025em;
        line-height: 1.1;
      }
      .tool-author-card-role {
        font-size: 11px;
        color: var(--t3);
        letter-spacing: .01em;
      }
      .tool-author-card-role span { color: var(--t2); }

      .tool-author-card-bio {
        font-size: 12px;
        font-weight: 300;
        color: var(--t2);
        line-height: 1.6;
        letter-spacing: .01em;
        max-width: 560px;
      }
      .tool-author-card-bio em {
        font-style: italic;
        font-family: var(--tnr);
        font-size: 14px;
        color: var(--hi);
        letter-spacing: -.01em;
      }

      .tool-author-card-footer {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-top: 2px;
      }

      /* Button / CTA */
      .tool-author-card-btn-about {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 6px 13px;
        border-radius: var(--rs);
        font-size: 11px;
        font-family: var(--s);
        font-weight: 500;
        color: var(--t2);
        background: var(--bg3);
        border: 1px solid var(--b1);
        cursor: pointer;
        text-decoration: none;
        letter-spacing: .005em;
        transition: background .14s, border-color .14s, color .14s;
        white-space: nowrap;
      }
      .tool-author-card-btn-about:hover { background: var(--bg4); border-color: var(--b2); color: var(--t1); }

      /* Social icon buttons */
      .tool-author-card-icon-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 30px; height: 30px;
        border-radius: var(--rs);
        border: 1px solid var(--b1);
        background: transparent;
        color: var(--t3);
        cursor: pointer;
        text-decoration: none;
        transition: color .14s, border-color .14s, background .14s;
      }
      .tool-author-card-icon-btn:hover { color: var(--t2); border-color: var(--b2); background: var(--bg3); }
      .tool-author-card-icon-btn svg { display: block; }

      /* ── Long-form prose ── */
      .tool-prose p {
        font-size: 16px;
        line-height: 1.8;
        color: rgba(255,255,255,0.82);
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
        color: rgba(255,255,255,0.80);
        margin: 0;
      }
 
      /* ── Tables (shortcuts, comparison) ── */
      .tool-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13.5px;
        color: rgba(255,255,255,0.82);
      }
      .tool-table th {
        text-align: left;
        font-family: 'Sora', sans-serif;
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.65);
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
        .tool-privacy { flex-direction: column; padding: 24px 18px; }
        .tool-step { padding: 16px; gap: 12px; }
        .tool-table th, .tool-table td { padding: 11px 12px; font-size: 12.5px; }
      }
      @media (max-width: 480px) {
        .tool-privacy { padding: 20px 14px; gap: 16px; }
        .tool-step { padding: 12px 14px; gap: 10px; }
      }

      /* ── Top header bar — transparent chrome above tool UI ── */
      .tool-header {
        position: relative;
        z-index: 40;
        background: transparent;
        border-bottom: none;
        transition: background-color 0.4s ease, border-color 0.4s ease;
      }
      .tool-header-inner {
        max-width: 1280px;
        margin: 0 auto;
        height: 56px;
        padding: 0 28px;
        display: flex;
        align-items: center;
        gap: 10px;
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
        gap: 5px;
        background: none;
        border: 1px solid transparent;
        border-radius: var(--rs);
        padding: 5px 9px;
        color: var(--t3);
        font-family: var(--m);
        font-size: 11px;
        cursor: pointer;
        transition: color .15s, border-color .15s, background .15s;
        text-decoration: none;
      }
      .tool-header-back:hover {
        color: var(--t2);
        border-color: var(--b1);
        background: var(--bg2);
      }
      .tool-header-back:focus-visible {
        outline: 2px solid rgba(240,237,232,.18);
        outline-offset: 2px;
        border-radius: var(--rs);
      }
      .tool-header-divider {
        width: 1px;
        height: 16px;
        background: var(--b0);
      }
      .tool-header-title {
        font-family: var(--d);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -.02em;
        color: var(--t1);
      }
      .tool-header-tagline {
        font-size: 11px;
        color: var(--t2);
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
        border-radius: var(--rs);
        background: var(--bg3);
        border: 1px solid var(--b1);
        color: var(--t2);
        font-size: 12px;
        font-weight: 500;
        font-family: var(--s);
        letter-spacing: -0.005em;
        cursor: pointer;
        transition: background .15s ease, color .15s ease, border-color .15s ease;
      }
      .tool-header-btn:hover {
        background: var(--bg4);
        color: var(--t1);
        border-color: var(--b2);
      }
      .tool-header-btn:focus-visible {
        outline: 2px solid rgba(240,237,232,.18);
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
        .tool-header-inner { gap: 10px; padding: 0 12px; }
        /* Slightly smaller title on phones so two-word names like
           "WebP Converter" stay on a single line. */
        .tool-header-title { font-size: 13.5px; }
      }
      @media (max-width: 360px) {
        .tool-header-inner { gap: 8px; padding: 0 10px; }
        .tool-header-title { font-size: 13px; line-height: 1.15; }
      }

      /* ── Theme transitions ── */
      body, .pm-stage, .pm-card, .pm-btn, .pm-btn-secondary, .pm-btn-ghost, .pm-icon-btn, .tool-card, .tool-step, .tool-faq, .tool-faq-answer, .tool-header, .tool-footer, .tool-header-btn {
        transition: background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                    border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                    color 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                    box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                    backdrop-filter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* ── Light Mode Overrides for SEO Articles & Utilities ── */
      body.pm-light-mode .tool-card {
        background: rgba(255, 255, 255, 0.72);
        border-color: rgba(22, 22, 21, 0.08);
      }
      body.pm-light-mode .tool-card:hover {
        border-color: rgba(22, 22, 21, 0.16);
        background: rgba(255, 255, 255, 0.90);
      }
      body.pm-light-mode .tool-icon {
        background: var(--bg2);
        border-color: var(--b1);
        color: var(--t1);
      }
      body.pm-light-mode .tool-faq {
        border-color: var(--b0);
      }
      body.pm-light-mode .tool-faq:first-child {
        border-top-color: var(--b0);
      }
      body.pm-light-mode .tool-faq summary {
        color: var(--t1);
      }
      body.pm-light-mode .tool-faq summary:hover {
        color: var(--pm-short, #0284c7);
      }
      body.pm-light-mode .tool-faq-answer {
        color: var(--t2);
      }
      body.pm-light-mode .tool-related {
        border-color: var(--b0);
        background: rgba(255, 255, 255, 0.5);
        color: var(--t1);
      }
      body.pm-light-mode .tool-related:hover {
        border-color: var(--b1);
        background: rgba(255, 255, 255, 0.85);
      }
      body.pm-light-mode .tool-related .tool-related-arrow {
        color: var(--t3);
      }
      body.pm-light-mode .tool-related:hover .tool-related-arrow {
        color: var(--t1);
      }
      body.pm-light-mode .tool-footer {
        background: transparent;
        border-top-color: var(--b0);
      }
      body.pm-light-mode .tool-footer-link {
        color: var(--t2);
      }
      body.pm-light-mode .tool-footer-link:hover {
        color: var(--t1);
      }
      body.pm-light-mode .tool-social-link {
        color: var(--t2);
        border-color: var(--b1);
      }
      body.pm-light-mode .tool-social-link:hover {
        color: var(--t1);
        background: rgba(0, 0, 0, 0.04);
        border-color: var(--b2);
      }
      body.pm-light-mode .tool-prose p {
        color: var(--t2);
      }
      body.pm-light-mode .tool-prose strong {
        color: var(--t1);
      }
      body.pm-light-mode .tool-prose a {
        color: var(--pm-short, #0284c7);
        text-decoration-color: rgba(2, 132, 199, 0.3);
      }
      body.pm-light-mode .tool-prose a:hover {
        text-decoration-color: var(--pm-short, #0284c7);
      }
      body.pm-light-mode .tool-step {
        background: rgba(255, 255, 255, 0.5);
        border-color: var(--b0);
      }
      body.pm-light-mode .tool-step:hover {
        border-color: var(--b1);
        background: rgba(255, 255, 255, 0.85);
      }
      body.pm-light-mode .tool-step-num {
        background: var(--bg2);
        border-color: var(--b1);
        color: var(--t1);
      }
      body.pm-light-mode .tool-step-title {
        color: var(--t1);
      }
      body.pm-light-mode .tool-step-body {
        color: var(--t2);
      }
      body.pm-light-mode .tool-table {
        color: var(--t2);
      }
      body.pm-light-mode .tool-table th {
        color: var(--t3);
        border-bottom-color: var(--b1);
        background: rgba(0, 0, 0, 0.02);
      }
      body.pm-light-mode .tool-table td {
        border-bottom-color: var(--b0);
      }
      body.pm-light-mode .tool-table-wrap {
        border-color: var(--b1);
        background: rgba(255, 255, 255, 0.4);
      }
      body.pm-light-mode .tool-table tbody tr:hover td {
        background: rgba(0, 0, 0, 0.015);
      }
      body.pm-light-mode .tool-kbd {
        background: var(--bg2);
        border-color: var(--b1);
        color: var(--t1);
      }
      body.pm-light-mode .tool-compare-table td:first-child {
        color: var(--t1);
      }
      body.pm-light-mode .tool-compare-yes {
        color: #16a34a;
      }
      body.pm-light-mode .tool-compare-no {
        color: var(--t3);
      }
      body.pm-light-mode .tool-tip {
        background: rgba(255, 255, 255, 0.5);
        border-color: var(--b0);
      }
      body.pm-light-mode .tool-tip:hover {
        border-color: var(--b1);
        background: rgba(255, 255, 255, 0.85);
      }
      body.pm-light-mode .tool-privacy {
        background: rgba(255, 255, 255, 0.5);
        border-color: var(--b0);
      }

    `}</style>
  );
}
