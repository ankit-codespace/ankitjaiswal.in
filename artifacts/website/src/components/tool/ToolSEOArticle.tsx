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
          borderTop: `1px solid var(--b0)`,
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
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--t2)", margin: "0 auto", maxWidth: 580 }}>
            {intro}
          </p>
          {metaLine && (
            <p style={{ fontSize: 12, color: "var(--t3)", marginTop: 18, fontFamily: tokens.font.display, letterSpacing: "0.04em" }}>
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
  bio,
}: {
  bio?: React.ReactNode;
}) {
  const defaultBio = (
    <>
      I build fast, useful web tools and help businesses become impossible to ignore in the age of AI search.
    </>
  );

  return (
    <div className="tool-author-card">
      <div className="tool-author-card-inner">
        <div className="tool-author-card-photo">
          <img src="/images/anjais-black-white.jpg" alt="Ankit Jaiswal" loading="lazy" decoding="async" />
        </div>
        <div className="tool-author-card-content">
          <div className="tool-author-card-header">
            <div className="tool-author-card-name">Built by Ankit Jaiswal</div>
            <div className="tool-author-card-role">
              <span>Web engineer · SEO Strategist</span> · India
            </div>
          </div>
          <p className="tool-author-card-bio">
            {bio ?? defaultBio}
          </p>
          <div className="tool-author-card-footer">
            <Link href="/about" className="tool-author-card-btn-about">
              More about Ankit
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </Link>
            <a href={SITE.social.github} target="_blank" rel="noopener noreferrer me author" className="tool-author-card-icon-btn" aria-label="GitHub">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a7 7 0 00-2.212 13.647c.35.064.48-.151.48-.337v-1.18c-1.947.424-2.357-.94-2.357-.94-.318-.81-.776-1.025-.776-1.025-.635-.433.048-.425.048-.425.701.05 1.07.72 1.07.72.623 1.068 1.634.76 2.032.581.063-.452.244-.76.443-.935-1.554-.177-3.188-.777-3.188-3.46 0-.764.274-1.388.72-1.878-.072-.177-.312-.888.07-1.85 0 0 .586-.188 1.921.716A6.685 6.685 0 018 4.978c.593.003 1.19.08 1.747.234 1.334-.904 1.919-.715 1.919-.715.383.961.143 1.672.07 1.849.448.49.72 1.114.72 1.878 0 2.69-1.637 3.282-3.196 3.455.251.217.474.643.474 1.297v1.921c0 .188.128.405.483.337A7.001 7.001 0 008 1z" fill="currentColor"/>
              </svg>
            </a>
            <a href={SITE.social.linkedin} target="_blank" rel="noopener noreferrer me author" className="tool-author-card-icon-btn" aria-label="LinkedIn">
              <svg width="13" height="13" viewBox="0 0 512 509.64" fill="none">
                <path d="M204.97 197.54h64.69v33.16h.94c9.01-16.16 31.04-33.16 63.89-33.16 68.31 0 80.94 42.51 80.94 97.81v116.92h-67.46l-.01-104.13c0-23.81-.49-54.45-35.08-54.45-35.12 0-40.51 25.91-40.51 52.72v105.86h-67.4V197.54zm-38.23-65.09c0 19.36-15.72 35.08-35.08 35.08-19.37 0-35.09-15.72-35.09-35.08 0-19.37 15.72-35.08 35.09-35.08 19.36 0 35.08 15.71 35.08 35.08zm-70.17 65.09h70.17v214.73H96.57V197.54z" fill="currentColor"/>
              </svg>
            </a>
            <a href={`https://x.com/${SITE.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer me author" className="tool-author-card-icon-btn" aria-label="X">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l5.5 7.5L1 15h1.5l4.5-5.5L11.5 15H15l-5.7-7.8L14.5 1H13l-4.2 5.1L5 1H1z" fill="currentColor"/>
              </svg>
            </a>
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
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--t2)", margin: 0 }}>{body}</p>
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
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--t2)", margin: 0 }}>{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
