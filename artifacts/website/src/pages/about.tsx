import { Seo } from "@/components/Seo";
import { SITE, PERSON_SAME_AS, absUrl } from "@/lib/site";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail, Github, Linkedin, Twitter, Phone, Sparkles, AtSign } from "lucide-react";

const ROLE = "Independent web engineer & SEO specialist";
const TAGLINE = "I build fast, useful tools and help businesses become impossible to ignore — in Google search and inside the answers AI engines give.";

const KNOWS_ABOUT = [
  "Search Engine Optimization (SEO)",
  "Technical SEO & site architecture",
  "Web performance & Core Web Vitals",
  "Schema.org structured data",
  "Generative Engine Optimization (GEO)",
  "AI search visibility (Perplexity, ChatGPT, Bing Copilot)",
  "React, TypeScript & modern web tooling",
  "Conversion-focused product design",
];

const TOOLS_BUILT = [
  { name: "Online Notepad", href: "/online-notepad", desc: "Distraction-free writing with PDF export & autosave." },
  { name: "Pomodoro Timer", href: "/tools/pomodoro", desc: "Drift-proof focus timer with daily and lifetime stats." },
  { name: "Clipboard History", href: "/tools/clipboard-history", desc: "Capture and reuse what you've copied." },
  { name: "Paste-to-Image", href: "/tools/paste-to-image", desc: "Turn anything on your clipboard into a downloadable PNG." },
  { name: "WebP Converter", href: "/tools/webp-converter", desc: "Convert images to WebP — fully in your browser." },
  { name: "YouTube Thumbnail Downloader", href: "/tools/yt-thumbnail-downloader", desc: "Grab high-res thumbnails from any video." },
  { name: "YouTube Summary", href: "/tools/youtube-summary", desc: "Turn any transcript into tuned prompts for ChatGPT, Claude, or Perplexity." },
  { name: "Domain Age Checker", href: "/tools/domain-age-checker", desc: "Find out how long any domain has been registered." },
];

const SOCIALS = [
  { name: "GitHub", handle: "@ankit-codespace", href: SITE.social.github, Icon: Github },
  { name: "LinkedIn", handle: "in/itsankitjaiswal", href: SITE.social.linkedin, Icon: Linkedin },
  { name: "X (Twitter)", handle: SITE.twitter, href: `https://x.com/${SITE.twitter.replace(/^@/, "")}`, Icon: Twitter },
  { name: "Threads", handle: "@ankitjaiswal.ig", href: SITE.social.threads, Icon: AtSign },
  { name: "Email", handle: "contact@ankitjaiswal.in", href: "mailto:contact@ankitjaiswal.in", Icon: Mail },
  { name: "WhatsApp", handle: "+91 78088 09043", href: "https://wa.me/917808809043", Icon: Phone },
];

export default function About() {
  const url = absUrl("/about");

  // ── Structured data: ProfilePage + Person — the strongest E-E-A-T signal we
  // can give to Google, Bing, and AI search engines. The Person.sameAs list
  // ties this site to the same human across the open web (GitHub, LinkedIn,
  // X), forming a verifiable entity graph. knowsAbout declares topical
  // authority. ─────────────────────────────────────────────────────────────
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": SITE.url + "/#person",
    name: SITE.name,
    alternateName: "AJ",
    jobTitle: ROLE,
    description: TAGLINE,
    url: SITE.url,
    image: SITE.avatar,
    sameAs: PERSON_SAME_AS,
    knowsAbout: KNOWS_ABOUT,
    worksFor: {
      "@type": "Organization",
      name: SITE.brand,
      url: SITE.url,
    },
    makesOffer: TOOLS_BUILT.map(t => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "SoftwareApplication",
        name: t.name,
        url: absUrl(t.href),
        applicationCategory: "WebApplication",
        operatingSystem: "Any",
      },
      price: "0",
      priceCurrency: "USD",
    })),
  };

  const profilePageLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url + "#profilepage",
    url,
    name: `About ${SITE.name}`,
    description: TAGLINE,
    mainEntity: { "@id": SITE.url + "/#person" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url + "/" },
      { "@type": "ListItem", position: 2, name: "About", item: url },
    ],
  };

  return (
    <div style={{ background: "#EDEAE4", color: "#0D1117", minHeight: "100vh" }}>
      <Seo
        title={`About ${SITE.name} — Web Engineer & SEO Specialist`}
        description="Ankit Jaiswal is an independent SEO specialist and web engineer from India. He helps businesses rank in Google and get cited by AI search engines like Perplexity, ChatGPT, and Bing Copilot."
        path="/about"
        type="profile"
        keywords="Ankit Jaiswal, about Ankit Jaiswal, SEO specialist India, SEO consultant, web engineer India, technical SEO, GEO specialist, generative engine optimization"
        jsonLd={[personLd, profilePageLd, breadcrumbLd]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pt-32 md:pt-40 pb-16 md:pb-24 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ background: "rgba(13,17,23,0.06)", border: "1px solid rgba(13,17,23,0.08)" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#2C2CF3" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4B5563", fontWeight: 600 }}>
              About
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(40px, 6.5vw, 76px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#0D1117",
              maxWidth: "18ch",
              marginBottom: 24,
            }}
          >
            Hi, I'm Ankit. I make the web faster and easier to find.
          </h1>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(17px, 1.6vw, 21px)",
              lineHeight: 1.6,
              color: "#4B5563",
              maxWidth: "62ch",
            }}
          >
            {TAGLINE}
          </p>
        </motion.div>
      </section>

      {/* ── Bio narrative ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pb-16 md:pb-24 max-w-3xl">
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 18,
            lineHeight: 1.75,
            color: "#1F2937",
          }}
          className="space-y-6"
        >
          <p>
            I'm an independent web engineer based in India, working with founders and small teams worldwide. My focus is the unglamorous part of the web — the part that decides whether your page actually loads, whether anyone finds it, and whether they trust it enough to stay.
          </p>
          <p>
            For the last few years that's meant two things: shipping production-grade React applications that score 95+ on Core Web Vitals, and doing the <strong style={{ color: "#0D1117" }}>SEO</strong> that decides whether those applications show up when someone goes looking. Most of my consulting time is spent on technical SEO, content architecture, and the structured-data work that earns rankings in Google. The newer extension of that practice — making sure the same pages also get cited inside Perplexity, ChatGPT, and AI Overviews — is what people are starting to call <strong style={{ color: "#0D1117" }}>Generative Engine Optimization (GEO)</strong>, and it's where I'm spending the rest of it.
          </p>
          <p>
            The tools you'll find on this site are how I think out loud. Each one started as a thing I needed for myself or a client, then turned into something I could open-source the patterns from. The notepad you may have come here through is the one I use every day.
          </p>
          <p>
            If you're trying to make your product show up — not just on a search result page, but inside the answer an AI gives — that's the conversation I'm best at. Get in touch below.
          </p>
        </div>
      </section>

      {/* ── Expertise grid ───────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pb-16 md:pb-24 max-w-5xl">
        <h2
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 40px)",
            letterSpacing: "-0.02em",
            color: "#0D1117",
            marginBottom: 32,
          }}
        >
          What I work on
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {KNOWS_ABOUT.map((topic) => (
            <span
              key={topic}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                padding: "9px 16px",
                borderRadius: 999,
                background: "rgba(13,17,23,0.04)",
                border: "1px solid rgba(13,17,23,0.08)",
                color: "#1F2937",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </section>

      {/* ── Tools shipped ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pb-16 md:pb-24 max-w-5xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.5vw, 40px)",
              letterSpacing: "-0.02em",
              color: "#0D1117",
            }}
          >
            Tools I've shipped
          </h2>
          <Link
            href="/tools"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "#2C2CF3",
              textDecoration: "none",
            }}
            className="hover:underline inline-flex items-center gap-1"
          >
            All tools <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {TOOLS_BUILT.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group block"
              style={{
                padding: "24px 26px",
                borderRadius: 16,
                background: "#FFFFFF",
                border: "1px solid rgba(13,17,23,0.06)",
                textDecoration: "none",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(44,44,243,0.3)";
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 12px 32px rgba(13,17,23,0.06)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(13,17,23,0.06)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 18, color: "#0D1117", letterSpacing: "-0.01em" }}>
                  {tool.name}
                </h3>
                <ArrowUpRight className="w-4 h-4 mt-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "#6B7280" }} />
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: "#4B5563", lineHeight: 1.55 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Find me elsewhere ────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pb-24 md:pb-32 max-w-5xl">
        <h2
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 40px)",
            letterSpacing: "-0.02em",
            color: "#0D1117",
            marginBottom: 12,
          }}
        >
          Find me elsewhere
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#4B5563", marginBottom: 28, maxWidth: "55ch" }}>
          Same person across every link below. Verified author of every tool on this site.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOCIALS.map(({ name, handle, href, Icon }) => {
            const isExternal = /^https?:\/\//.test(href);
            return (
              <a
                key={name}
                href={href}
                {...(isExternal ? { target: "_blank", rel: "me author noopener noreferrer" } : {})}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  border: "1px solid rgba(13,17,23,0.06)",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(13,17,23,0.16)";
                  el.style.background = "#FAFAF7";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(13,17,23,0.06)";
                  el.style.background = "#FFFFFF";
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(13,17,23,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: "#0D1117", width: 18, height: 18 }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 14, color: "#0D1117" }}>
                    {name}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {handle}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 lg:px-10 pb-24 md:pb-32 max-w-5xl">
        <div
          style={{
            background: "#0D1117",
            borderRadius: 24,
            padding: "48px 36px",
            textAlign: "center",
            color: "#F9FAFB",
          }}
        >
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 3.2vw, 36px)",
              letterSpacing: "-0.02em",
              marginBottom: 12,
              color: "#F9FAFB",
            }}
          >
            Have a project in mind?
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#A1AAB4", marginBottom: 28, maxWidth: "48ch", marginLeft: "auto", marginRight: "auto" }}>
            I take on a small number of consulting engagements at a time. The best way to start is a short note about what you're trying to do.
          </p>
          <Link
            href="/contact"
            className="btn-liquid inline-flex"
            style={{ fontSize: 14, padding: "12px 28px", textDecoration: "none" }}
          >
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  );
}
