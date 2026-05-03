import type { ReactNode } from "react";
import { Seo } from "@/components/Seo";
import { ToolHeader } from "./ToolHeader";
import { ToolFooter, type ToolFooterLink } from "./ToolFooter";
import { ToolStyles } from "./ToolStyles";
import { tokens } from "./tokens";

/**
 * Top-level page wrapper for any tool.
 *
 * Bundles together:
 *   - <Seo>          — meta tags, Open Graph, Twitter, JSON-LD
 *   - <ToolStyles>   — shared CSS for tool-* classes
 *   - <ToolHeader>   — sticky top bar with back link, title, feedback
 *   - your tool UI   — passed as children
 *   - <ToolFooter>   — dark social/nav band (set hideFooter to omit)
 *
 * Page background defaults to the dark page surface so tool UIs sit on a
 * consistent canvas. Pass `bg="custom"` and a `bgColor` to override.
 *
 * The intent: a new tool page should be ~10 lines of scaffolding — the
 * tool's actual interactive UI is the only thing that demands real code.
 */

export function ToolPage({
  // ── SEO ──
  seoTitle,
  seoDescription,
  seoPath,
  seoCanonicalPath,
  seoKeywords,
  seoJsonLd,
  seoImage,
  // ── Header ──
  title,
  tagline,
  backHref,
  backLabel,
  headerActions,
  hideFeedback,
  // ── Footer ──
  hideFooter = false,
  footerNav,
  // ── Layout ──
  bgColor,
  children,
}: {
  // SEO ----------------------------------------
  seoTitle: string;
  seoDescription: string;
  seoPath: string;
  seoCanonicalPath?: string;
  seoKeywords?: string;
  seoJsonLd?: object | object[];
  seoImage?: string;
  // Header -------------------------------------
  /** Visible name in the sticky top bar — usually the same as seoTitle's leading phrase. */
  title: string;
  tagline?: string;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
  hideFeedback?: boolean;
  // Footer -------------------------------------
  hideFooter?: boolean;
  footerNav?: ToolFooterLink[];
  // Layout -------------------------------------
  /** Override the page background. Defaults to the dark page surface. */
  bgColor?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ background: bgColor ?? tokens.bg.page, minHeight: "100vh", color: tokens.text.body }}>
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={seoPath}
        canonicalPath={seoCanonicalPath}
        keywords={seoKeywords}
        jsonLd={seoJsonLd}
        image={seoImage}
      />
      <ToolStyles />
      <ToolHeader
        title={title}
        tagline={tagline}
        backHref={backHref}
        backLabel={backLabel}
        actions={headerActions}
        hideFeedback={hideFeedback}
      />
      {children}
      {!hideFooter && <ToolFooter nav={footerNav} />}
    </div>
  );
}
