import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronDown, Shield, ArrowUpRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { GitHubIcon, LinkedInIcon, XIcon, ThreadsIcon } from "./social-icons";
import { ToolStyles } from "./ToolStyles";
import { tokens } from "./tokens";

/**
 * The dark, long-form SEO + AI-citation article that lives below every tool's
 * interactive UI. This is the single most important asset for ranking and for
 * getting cited by Perplexity / ChatGPT / Bing Copilot.
 *
 * The component is a SHELL — it provides the dark wrapper, mounts <ToolStyles>,
 * and gives you a `hero` prop + `children` slot. You compose the body from the
 * smaller building blocks exported from this file (SectionHeading, ToolFAQ,
 * ToolRelatedTools, ToolAuthorCard, ToolPrivacyBand, ToolHowToSteps, etc.).
 *
 * Notepad's own SEO content was assembled by hand — these components let
 * future tools assemble the same quality in a fraction of the code.
 */

export function ToolSEOArticle({
  eyebrow = "About this tool",
  h1,
  intro,
  metaLine,
  children,
}: {
  /** Small uppercase kicker above the H1. */
  eyebrow?: string;
  /** Main article H1 — usually different from the page meta title. */
  h1: string;
  /** Lede paragraph under the H1. */
  intro: string;
  /** Optional dateline, e.g. "Updated April 2026 · By Ankit Jaiswal" */
  metaLine?: ReactNode;
  /** The composed article body — stack <SectionHeading> + content blocks. */
  children: ReactNode;
}) {
  return (
    <>
      <ToolStyles />
      <article
        style={{
          background: tokens.bg.page,
          color: tokens.text.body,
          padding: "120px 24px 0",
          borderTop: `1px solid rgba(255,255,255,0.04)`,
          fontFamily: tokens.font.body,
        }}
      >
        {/* Hero strip */}
        <header style={{ maxWidth: tokens.width.prose, margin: "0 auto 96px", textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: tokens.text.kicker, marginBottom: 22, fontWeight: 500 }}>
            {eyebrow}
          </p>
          <h1 style={{ fontFamily: tokens.font.display, fontWeight: 800, fontSize: "clamp(28px, 4.5vw, 44px)", lineHeight: 1.1, color: tokens.text.primary, margin: "0 0 22px", letterSpacing: "-0.02em" }}>
            {h1}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.66)", margin: "0 auto", maxWidth: 580 }}>
            {intro}
          </p>
          {metaLine && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", marginTop: 18, fontFamily: tokens.font.display, letterSpacing: "0.04em" }}>
              {metaLine}
            </p>
          )}
        </header>
        {children}
      </article>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Section primitives                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

/** Centered section heading with kicker, used between SEO sections. */
export function SectionHeading({
  kicker,
  title,
  align = "center",
}: {
  kicker: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div style={{ textAlign: align, marginBottom: 32 }}>
      <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: tokens.text.kicker, marginBottom: 12, fontWeight: 500, fontFamily: tokens.font.body }}>
        {kicker}
      </p>
      <h2 style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.2, color: tokens.text.primary, margin: 0, letterSpacing: "-0.015em" }}>
        {title}
      </h2>
    </div>
  );
}

/** Width-constrained section wrapper — mirrors notepad's three width tiers. */
export function ToolSection({
  width = "prose",
  marginBottom = 120,
  children,
}: {
  width?: "prose" | "grid" | "privacy" | number;
  marginBottom?: number;
  children: ReactNode;
}) {
  const max =
    typeof width === "number" ? width : width === "grid" ? tokens.width.grid : width === "privacy" ? tokens.width.privacy : tokens.width.prose;
  return <section style={{ maxWidth: max, margin: `0 auto ${marginBottom}px` }}>{children}</section>;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* FAQ — also emits FAQPage JSON-LD via a sibling helper                       */
/* ──────────────────────────────────────────────────────────────────────────── */

export type ToolFAQItem = { q: string; a: string };

export function ToolFAQ({ items }: { items: ToolFAQItem[] }) {
  return (
    <div>
      {items.map((f) => (
        <details key={f.q} className="tool-faq">
          <summary>
            <span>{f.q}</span>
            <ChevronDown size={16} strokeWidth={1.8} className="tool-faq-chevron" />
          </summary>
          <p className="tool-faq-answer">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Build the FAQPage JSON-LD object for inclusion in <Seo jsonLd={...}>. */
export function buildFAQJsonLd(items: ToolFAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Related tools                                                                */
/* ──────────────────────────────────────────────────────────────────────────── */

export type RelatedTool = { name: string; desc: string; href: string };

export function ToolRelatedTools({ items }: { items: RelatedTool[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} className="tool-related">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: tokens.font.display, fontSize: 14.5, fontWeight: 600, marginBottom: 4, color: tokens.text.primary }}>
              {t.name}
            </div>
            <div style={{ fontSize: 13, color: tokens.text.soft, lineHeight: 1.5 }}>{t.desc}</div>
          </div>
          <ArrowUpRight size={16} strokeWidth={1.8} className="tool-related-arrow" />
        </Link>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Author card — visible E-E-A-T proof                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ToolAuthorCard({
  bio = "I build fast, useful web tools and help businesses become impossible to ignore in the age of AI search.",
}: {
  bio?: string;
}) {
  return (
    <div className="tool-author-card">
      <div className="tool-author-card-inner">
        <div className="tool-author-avatar">
          <img src={SITE.avatar} alt="Ankit Jaiswal" width={64} height={64} loading="lazy" decoding="async" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 18, color: tokens.text.primary, letterSpacing: "-0.01em", marginBottom: 4 }}>
            Ankit Jaiswal
          </div>
          <div style={{ fontSize: 13, color: tokens.text.soft, marginBottom: 14, fontWeight: 400 }}>
            Independent web engineer · SEO specialist · India
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "rgba(255,255,255,0.72)", margin: "0 0 18px", maxWidth: "52ch" }}>
            {bio}
          </p>
          <div className="tool-author-actions">
            <Link href="/about" className="tool-author-cta">
              More about Ankit
              <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
            <div className="tool-author-socials" role="list">
              <a href={SITE.social.github} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on GitHub" title="GitHub">
                <GitHubIcon size={16} />
              </a>
              <a href={SITE.social.linkedin} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on LinkedIn" title="LinkedIn">
                <LinkedInIcon size={16} />
              </a>
              <a href={`https://x.com/${SITE.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on X (Twitter)" title="X (Twitter)">
                <XIcon size={15} />
              </a>
              <a href={SITE.social.threads} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on Threads" title="Threads">
                <ThreadsIcon size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Privacy band                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

export function ToolPrivacyBand({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="tool-privacy">
      <span className="tool-icon" style={{ marginBottom: 0, width: 44, height: 44 }}>
        <Shield size={20} strokeWidth={1.6} />
      </span>
      <div>
        <h2 style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 20, color: tokens.text.primary, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
          {heading}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.66)", margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* How-to numbered steps                                                        */
/* ──────────────────────────────────────────────────────────────────────────── */

export type ToolHowToStep = { title: string; body: string };

export function ToolHowToSteps({ steps }: { steps: ToolHowToStep[] }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
      {steps.map((step, i) => (
        <li key={i} id={`step-${i + 1}`} className="tool-step">
          <span className="tool-step-num">{i + 1}</span>
          <div>
            <h3 className="tool-step-title">{step.title}</h3>
            <p className="tool-step-body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Feature / tip card grid                                                      */
/* ──────────────────────────────────────────────────────────────────────────── */

export type ToolFeature = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  desc: string;
};

export function ToolFeatureGrid({ items, minWidth = 260 }: { items: ToolFeature[]; minWidth?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: 14 }}>
      {items.map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.title} className="tool-card">
            <span className="tool-icon">
              <Icon size={18} strokeWidth={1.6} />
            </span>
            <h3 style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 16, color: tokens.text.primary, margin: "0 0 8px", letterSpacing: "-0.005em" }}>
              {f.title}
            </h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0 }}>{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
