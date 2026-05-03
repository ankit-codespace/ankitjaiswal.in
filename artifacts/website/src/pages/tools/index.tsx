import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink, Image as ImageIcon, Clipboard, Globe, Youtube, Camera,
  ArrowRight, Lock, FileText, Sparkles, Timer, ArrowUpRight,
} from "lucide-react";
import { tokens } from "@/components/tool/tokens";
import { SITE, PERSON_SAME_AS, absUrl } from "@/lib/site";

/* ───────────────── Tool catalog ───────────────── */

type Tool = {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  name: string;
  desc: string;
  category: string;
  tags: readonly string[];
  href: string;
  external?: boolean;
};

/* Order is deliberate: it walks the user through a natural workday arc —
 * write → focus → reuse snippets → capture screen → optimize images →
 * grab YouTube assets → research with AI → finish on SEO research.
 * Adjacent cards always share context, which keeps the page scannable
 * and reduces decision fatigue. */
const TOOLS: readonly Tool[] = [
  {
    Icon: FileText,
    name: "Online Notepad",
    desc: "A distraction-free writing surface with auto-save, multi-document tabs, and TXT/MD/PDF export. Bear-quality UX in your browser.",
    category: "Writing",
    tags: ["text-to-pdf", "markdown", "auto-save", "offline"],
    href: "/online-notepad",
  },
  {
    Icon: Timer,
    name: "Pomodoro Timer",
    desc: "A clean, distraction-free Pomodoro timer with daily focus stats, lifetime tracking, sound + browser alerts, and a one-tap focus mode. Runs entirely in your browser.",
    category: "Productivity",
    tags: ["pomodoro", "focus", "study-timer"],
    href: "/tools/pomodoro",
  },
  {
    Icon: Clipboard,
    name: "Clipboard History",
    desc: "Save, search, pin and reuse text snippets. Auto-detects URLs, emails, JSON and code. Stored only in your browser — never uploaded.",
    category: "Productivity",
    tags: ["snippets", "url", "json", "local-only"],
    href: "/tools/clipboard-history",
  },
  {
    Icon: Camera,
    name: "Paste to Image",
    desc: "Paste a screenshot, annotate with arrows and highlights, blur sensitive areas, then download as PNG. Full canvas editor, no upload.",
    category: "Utility",
    tags: ["screenshot-editor", "annotate", "blur", "share"],
    href: "/tools/paste-to-image",
  },
  {
    Icon: ImageIcon,
    name: "WebP Converter",
    desc: "Drop any PNG, JPG or HEIC and get a quality-tunable WebP back. Up to 90% smaller. Runs entirely in your browser — no server, no upload.",
    category: "Performance",
    tags: ["png-to-webp", "jpg-to-webp", "image-optimization"],
    href: "/tools/webp-converter",
  },
  {
    Icon: Youtube,
    name: "YouTube Thumbnail Downloader",
    desc: "Paste any YouTube URL — get every available thumbnail size (HD, SD, HQ, medium) in JPG or WebP. No signup, no watermark.",
    category: "Media",
    tags: ["youtube-thumbnail", "hd", "1280x720", "shorts"],
    href: "/tools/yt-thumbnail-downloader",
  },
  {
    Icon: Sparkles,
    name: "YouTube Summary",
    desc: "Paste a YouTube transcript, get hand-tuned prompts for ChatGPT, Claude, Perplexity, or Gemini. Local key-sentence and keyword extraction. Your transcript never leaves your browser.",
    category: "AI",
    tags: ["transcript", "summarizer", "chatgpt", "claude"],
    href: "/tools/youtube-summary",
  },
  {
    Icon: Globe,
    name: "Domain Age Checker",
    desc: "Live WHOIS lookup that shows registration date, age in years, expiry, registrar and nameservers. Useful for SEO research and link prospecting.",
    category: "SEO",
    tags: ["whois", "domain-age", "registrar", "seo-research"],
    href: "/tools/domain-age-checker",
  },
];

/* ───────────────── Component ───────────────── */

export default function ToolsIndex() {
  const reduceMotion = useReducedMotion();
  const fadeIn = (delay: number) =>
    reduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.25, 0, 0.35, 1] as const },
        };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free Online Tools by Ankit Jaiswal",
    itemListOrder: "ItemListOrderAscending",
    numberOfItems: TOOLS.length,
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      description: t.desc,
      url: t.external ? t.href : absUrl(t.href),
    })),
  };

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Online Tools — Notepad, YouTube Summary, WebP, Clipboard & More",
    description:
      "A growing collection of free, privacy-first browser tools by Ankit Jaiswal. Online notepad, YouTube transcript summarizer, WebP converter, clipboard history, paste-to-image editor, YouTube thumbnail downloader, domain-age WHOIS lookup, and more.",
    url: absUrl("/tools"),
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
    },
    author: {
      "@type": "Person",
      "@id": `${SITE.url}/#person`,
      name: SITE.name,
      url: SITE.url,
      image: SITE.avatar,
      sameAs: PERSON_SAME_AS,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Tools", item: absUrl("/tools") },
    ],
  };

  return (
    <div style={{ background: tokens.bg.page, minHeight: "100vh", color: tokens.text.body }}>
      <Seo
        title="Free Online Tools — Notepad, YouTube Summary, WebP, Clipboard & More | Ankit Jaiswal"
        description="A growing collection of free, privacy-first browser tools: online notepad with PDF export, YouTube transcript summarizer with tuned AI prompts, WebP image converter, clipboard history, paste-to-image editor, YouTube thumbnail downloader, and domain-age WHOIS lookup. Nothing uploaded, no signup."
        path="/tools"
        keywords="free online tools, online notepad, youtube summary, webp converter, clipboard history, paste to image, youtube thumbnail downloader, domain age checker, privacy tools, ankit jaiswal tools"
        jsonLd={[itemListJsonLd, collectionPageJsonLd, breadcrumbJsonLd]}
      />

      <ToolsIndexStyles />

      {/* ── Hero ── */}
      <header className="ti-hero">
        <motion.div {...fadeIn(0)}>
          <p className="ti-eyebrow">The toolkit</p>
          <h1 className="ti-h1">
            Free, privacy-first tools
            <br />
            <span className="ti-h1-soft">for the rest of the internet.</span>
          </h1>
          <p className="ti-lead">
            Eight focused utilities for writing, image work, YouTube research, and SEO &mdash;
            built by an independent engineer, designed to feel like one product. Every
            in-browser tool runs locally: no upload, no account, no quota, no tracking.
          </p>
          <p className="ti-meta">
            Updated April 2026 &middot; By {" "}
            <Link href="/about" className="ti-meta-link">Ankit Jaiswal</Link>
            {" "}&middot; <Link href="/" className="ti-meta-link">Portfolio home</Link>
          </p>
        </motion.div>
      </header>

      <div className="ti-rule" aria-hidden="true" />

      {/* ── Tools grid ── */}
      <section className="ti-grid-wrap" aria-label="All tools">
        <div className="ti-grid">
          {TOOLS.map((tool, idx) => {
            const Icon = tool.Icon;
            const inner = (
              <motion.article {...fadeIn(0.06 + idx * 0.035)} className="ti-card">
                <div className="ti-card-top">
                  <span className="ti-card-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                  <span className="ti-card-cat">
                    {tool.category}
                    {tool.external && (
                      <ExternalLink size={10} strokeWidth={2.2} aria-hidden="true" />
                    )}
                  </span>
                </div>

                <h2 className="ti-card-name">{tool.name}</h2>
                <p className="ti-card-desc">{tool.desc}</p>

                {tool.tags.length > 0 && (
                  <p className="ti-card-tags" aria-label="Tags">
                    {tool.tags.slice(0, 3).join(" · ")}
                  </p>
                )}

                <span className="ti-card-arrow" aria-hidden="true">
                  {tool.external ? (
                    <ArrowUpRight size={15} strokeWidth={1.8} />
                  ) : (
                    <ArrowRight size={15} strokeWidth={1.8} />
                  )}
                </span>
              </motion.article>
            );

            return tool.external ? (
              <a
                key={tool.href}
                href={tool.href}
                target="_blank"
                rel="dofollow noopener noreferrer"
                className="ti-card-link"
              >
                {inner}
              </a>
            ) : (
              <Link key={tool.href} href={tool.href} className="ti-card-link">
                {inner}
              </Link>
            );
          })}

          {/* Suggest-a-tool placeholder — fills the trailing grid cell and
              turns dead space into an invitation, the way Linear/Stripe do. */}
          <Link href="/contact" className="ti-card-link ti-card-link--ghost">
            <motion.article {...fadeIn(0.06 + TOOLS.length * 0.035)} className="ti-card ti-card--ghost">
              <div className="ti-card-top">
                <span className="ti-card-icon ti-card-icon--ghost" aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={1.6} />
                </span>
                <span className="ti-card-cat">Coming next</span>
              </div>
              <h2 className="ti-card-name ti-card-name--ghost">What should I build?</h2>
              <p className="ti-card-desc">
                The toolkit grows from real requests. If something's missing, tell me what
                would actually help your workflow and it gets considered for the next sprint.
              </p>
              <p className="ti-card-tags">request &middot; feedback &middot; ideas</p>
            </motion.article>
          </Link>
        </div>
      </section>

      {/* ── About-this-toolkit prose ── */}
      <section className="ti-about" aria-label="About these tools">
        <h2 className="ti-about-h2">Why this toolkit exists</h2>
        <div className="ti-about-prose">
          <p>
            Most "free online tool" sites are a thin wrapper around someone else's API,
            stuffed with display ads, a privacy policy nobody reads, and a paywall waiting
            two clicks deep. The tools on this page are the opposite of that. Every one
            of them was built end-to-end by a single engineer who actually uses the tool,
            and every one of them runs in your browser whenever it can &mdash; which means
            no upload, no quota, no account, and no third-party server in your privacy chain.
          </p>
          <p>
            They share one design language because they're meant to feel like one product,
            not eight different SaaS templates glued to a homepage. The notepad sets the
            quality bar; the rest hold themselves to it. If you find a bug or want a new
            tool, the feedback button is in the corner of every page.
          </p>
        </div>
      </section>

      {/* ── Privacy band ── */}
      <section className="ti-privacy">
        <Lock size={14} strokeWidth={1.8} />
        <p>
          All in-browser tools run entirely on your device. No data leaves it. No accounts.
          The only network calls are the ones explicitly required (like fetching a YouTube
          thumbnail by its public URL, or running a WHOIS lookup through this site's tiny
          backend) and they're documented on each tool's own page.
        </p>
      </section>
    </div>
  );
}

/* ───────────────── Styles ───────────────── */

function ToolsIndexStyles() {
  return (
    <style>{`
      .ti-hero {
        max-width: 1080px;
        margin: 0 auto;
        padding: 96px 24px 56px;
      }
      @media (max-width: 640px) {
        .ti-hero { padding: 64px 16px 40px; }
      }
      .ti-eyebrow {
        font-family: ${tokens.font.body};
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: ${tokens.text.kicker};
        margin: 0 0 18px;
      }
      .ti-h1 {
        font-family: ${tokens.font.display};
        font-weight: 800;
        font-size: clamp(2rem, 4.4vw, 3.2rem);
        line-height: 1.08;
        letter-spacing: -0.03em;
        color: ${tokens.text.primary};
        margin: 0 0 22px;
      }
      .ti-h1-soft { color: rgba(255,255,255,0.42); font-weight: 600; }
      .ti-lead {
        font-family: ${tokens.font.body};
        font-size: 17px;
        line-height: 1.65;
        color: ${tokens.text.muted};
        max-width: 580px;
        margin: 0 0 16px;
      }
      .ti-meta {
        font-family: ${tokens.font.body};
        font-size: 12.5px;
        color: ${tokens.text.quiet};
        margin: 0;
      }
      .ti-meta-link {
        color: ${tokens.text.muted};
        text-decoration: none;
        border-bottom: 1px dotted rgba(255,255,255,0.2);
        transition: color .15s ease, border-color .15s ease;
      }
      .ti-meta-link:hover { color: ${tokens.text.primary}; border-bottom-color: ${tokens.text.primary}; }

      .ti-rule {
        height: 1px;
        background: rgba(255,255,255,0.05);
      }

      /* ── Grid ── */
      .ti-grid-wrap {
        max-width: 1080px;
        margin: 0 auto;
        padding: 48px 24px 32px;
      }
      @media (max-width: 640px) {
        .ti-grid-wrap { padding: 32px 16px 24px; }
      }
      .ti-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        gap: 1px;
        background: ${tokens.border.subtle};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 18px;
        overflow: hidden;
      }
      @media (prefers-reduced-motion: reduce) {
        .ti-card-arrow { transition: none; }
      }

      .ti-card-link {
        text-decoration: none;
        color: inherit;
        display: block;
        height: 100%;
      }
      .ti-card {
        position: relative;
        height: 100%;
        background: ${tokens.bg.page};
        padding: 26px 26px 24px;
        display: flex;
        flex-direction: column;
        transition: background .2s ease;
      }
      .ti-card-link:hover .ti-card {
        background: rgba(255,255,255,0.022);
      }
      .ti-card-link:focus-visible {
        outline: none;
      }
      .ti-card-link:focus-visible .ti-card {
        background: rgba(255,255,255,0.04);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
      }

      .ti-card-top {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 22px;
      }
      .ti-card-icon {
        width: 36px; height: 36px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 9px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.72);
        flex-shrink: 0;
        transition: color .2s ease, border-color .2s ease, background .2s ease;
      }
      .ti-card-link:hover .ti-card-icon {
        color: ${tokens.text.primary};
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.12);
      }
      .ti-card-cat {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: ${tokens.font.body};
        font-size: 10px; font-weight: 600;
        letter-spacing: 0.16em; text-transform: uppercase;
        color: ${tokens.text.kicker};
      }

      .ti-card-name {
        font-family: ${tokens.font.display};
        font-size: 18px; font-weight: 700;
        color: ${tokens.text.primary};
        letter-spacing: -0.012em;
        line-height: 1.25;
        margin: 0 0 10px;
      }
      .ti-card-desc {
        font-family: ${tokens.font.body};
        font-size: 13.5px; line-height: 1.6;
        color: rgba(255,255,255,0.56);
        margin: 0 0 18px;
        flex: 1;
      }

      .ti-card-tags {
        font-family: ${tokens.font.mono};
        font-size: 11px;
        line-height: 1.5;
        color: ${tokens.text.kicker};
        margin: 0;
        letter-spacing: 0.01em;
      }

      .ti-card-arrow {
        position: absolute;
        right: 22px;
        bottom: 22px;
        color: ${tokens.text.quiet};
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity .2s ease, transform .2s ease, color .2s ease;
      }
      .ti-card-link:hover .ti-card-arrow {
        opacity: 1;
        transform: translateX(0);
        color: ${tokens.text.primary};
      }
      .ti-card-link:focus-visible .ti-card-arrow {
        opacity: 1;
        transform: translateX(0);
      }

      /* ── Ghost cell (suggest-a-tool) ── */
      .ti-card--ghost {
        background: transparent;
      }
      .ti-card-icon--ghost {
        background: transparent;
        border-style: dashed;
        border-color: rgba(255,255,255,0.10);
        color: ${tokens.text.quiet};
      }
      .ti-card-link--ghost:hover .ti-card-icon--ghost {
        border-style: solid;
        border-color: rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.04);
        color: ${tokens.text.primary};
      }
      .ti-card-name--ghost {
        color: ${tokens.text.muted};
      }
      .ti-card-link--ghost:hover .ti-card-name--ghost {
        color: ${tokens.text.primary};
      }

      /* ── About prose ── */
      .ti-about {
        max-width: ${tokens.width.prose}px;
        margin: 64px auto 64px;
        padding: 0 24px;
      }
      .ti-about-h2 {
        font-family: ${tokens.font.display};
        font-size: clamp(20px, 2.6vw, 24px);
        font-weight: 700;
        color: ${tokens.text.primary};
        letter-spacing: -0.015em;
        margin: 0 0 18px;
      }
      .ti-about-prose p {
        font-family: ${tokens.font.body};
        font-size: 15.5px;
        line-height: 1.75;
        color: rgba(255,255,255,0.72);
        margin: 0 0 16px;
      }
      .ti-about-prose p:last-child { margin-bottom: 0; }

      /* ── Privacy band ── */
      .ti-privacy {
        max-width: ${tokens.width.privacy}px;
        margin: 0 auto;
        padding: 24px;
        display: flex; align-items: flex-start; gap: 12px;
      }
      .ti-privacy svg {
        color: ${tokens.text.quiet};
        flex-shrink: 0;
        margin-top: 4px;
      }
      .ti-privacy p {
        margin: 0;
        font-family: ${tokens.font.body};
        font-size: 12.5px;
        line-height: 1.65;
        color: ${tokens.text.quiet};
      }
    `}</style>
  );
}
