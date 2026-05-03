import { useEffect, useRef, useState } from "react";
import { Seo } from "@/components/Seo";
import { SITE } from "@/lib/site";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/MagneticButton";
import { StatsStrip } from "@/components/StatsStrip";
import { ProofGallery } from "@/components/ProofGallery";
import { ArrowRight, Code, Shield, ExternalLink, Gauge, TrendingUp, Sparkles, Layers, Globe, Zap, Server, Search, RefreshCw, Bot, Network, Lock } from "lucide-react";

const charVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0 },
};

const HEADLINE_LINES = ["I Build Websites", "that ", "while you sleep."];
const HEADLINE_CHAR_COUNT = HEADLINE_LINES.reduce((sum, line) => sum + line.length, 0) + 1;
const STAGGER = 0.03;
const CHAR_DURATION = 0.5;
const HEADLINE_TOTAL = HEADLINE_CHAR_COUNT * STAGGER + CHAR_DURATION;

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedChars({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={{ ...style, display: "inline" }}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          variants={charVariants}
          style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
          transition={{ duration: CHAR_DURATION, ease: [0.22, 1, 0.36, 1] }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

const expertiseAreas = [
  {
    icon: Server,
    title: "Technical Infrastructure",
    tagline: "How I build systems that rank and scale.",
    capabilities: [
      { text: "Search-focused web architecture", icon: Layers },
      { text: "WordPress & headless CMS", icon: Globe },
      { text: "Core Web Vitals optimization", icon: Zap },
      { text: "Scalable content architecture", icon: Server },
    ],
  },
  {
    icon: TrendingUp,
    title: "Search Visibility Engine",
    tagline: "The architecture behind organic growth.",
    capabilities: [
      { text: "Technical SEO architecture", icon: Search },
      { text: "Schema & entity markup systems", icon: Code },
      { text: "Crawl budget & indexation control", icon: RefreshCw },
      { text: "200M+ organic impressions generated", icon: TrendingUp },
    ],
  },
  {
    icon: Sparkles,
    title: "AI Discovery Layer",
    tagline: "Ensuring brands appear inside AI answers.",
    capabilities: [
      { text: "Generative Engine Optimization", icon: Sparkles },
      { text: "AI citation strategy", icon: Bot },
      { text: "Entity authority building", icon: Network },
      { text: "Topical authority systems", icon: Layers },
    ],
    platforms: ["ChatGPT", "Perplexity", "AI Overviews"],
  },
  {
    icon: Shield,
    title: "Security & Scale",
    tagline: "Handling millions of requests without failure.",
    capabilities: [
      { text: "DDoS mitigation at 146M+ req/day", icon: Shield },
      { text: "Cloudflare & CDN architecture", icon: Server },
      { text: "94%+ cache hit rate optimization", icon: Gauge },
      { text: "Server hardening & threat response", icon: Lock },
    ],
  },
];

const tools = [
  { name: "Online Notepad", category: "Writing", href: "/online-notepad" },
  { name: "YouTube Summary", category: "AI", href: "/tools/youtube-summary" },
  { name: "Clipboard Saver", category: "Productivity", href: "/tools/clipboard-history" },
  { name: "Paste-to-Image", category: "Utility", href: "/tools/paste-to-image" },
  { name: "WebP Converter", category: "Image", href: "/tools/webp-converter" },
  { name: "YT Thumbnail", category: "Media", href: "/tools/yt-thumbnail-downloader" },
  { name: "Domain Age", category: "SEO", href: "/tools/domain-age-checker" },
  { name: "Pomodoro Track", category: "Productivity", href: "https://pomodorotrack.com/", external: true },
];

const HERO_IMAGE_URL = "/images/hero-portrait-nobg.webp";

export default function Home() {
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLElement | null>(null);
  const heroPortraitRef = useRef<HTMLElement | null>(null);
  const heroAnimReady = true;
  const [expertiseActiveIdx, setExpertiseActiveIdx] = useState(0);
  const expertiseCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (heroContentRef.current) {
      heroTextRef.current = heroContentRef.current.querySelector('[data-hero-text]') as HTMLElement | null;
    }
    heroPortraitRef.current = document.querySelector('[data-hero-portrait]') as HTMLElement | null;

    let ticking = false;

    const updateHeroStyles = () => {
      if (window.innerWidth < 768) return;
      const progress = Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);

      const textEl = heroTextRef.current;
      if (textEl) {
        textEl.style.opacity = String(Math.max(0, 1 - progress * 1.5));
        textEl.style.transform = `translateY(${progress * 100}px)`;
      }

      const portraitEl = heroPortraitRef.current;
      if (portraitEl) {
        portraitEl.style.opacity = String(Math.max(0, 1 - progress * 1.5));
        portraitEl.style.transform = `translateY(${progress * 70}px)`;
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateHeroStyles();
          ticking = false;
        });
        ticking = true;
      }
    };

    updateHeroStyles();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const refs = expertiseCardRefs.current;
    const observers = refs.map((el, idx) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setExpertiseActiveIdx(idx); },
        { threshold: 0.35, rootMargin: "-5% 0px -5% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(obs => obs?.disconnect());
  }, []);

  return (
    <div className="flex flex-col">
      <Seo
        title="Ankit Jaiswal — SEO Engineer & Web Developer"
        description="Ankit Jaiswal builds fast, search-ready websites and free privacy-first browser tools — including an online notepad, text-to-PDF converter, and more."
        path="/"
        keywords="ankit jaiswal, seo engineer, web developer, online notepad, text to pdf, privacy tools"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Ankit Jaiswal",
          url: SITE.url,
          jobTitle: "SEO Engineer & Web Developer",
          knowsAbout: ["SEO", "Web Performance", "Privacy", "React", "Online Tools"],
        }}
      />

      {/* ── HERO SECTION ── */}
      <section
        className="relative md:sticky md:top-0 w-full overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(135deg, #E7EDF2 0%, #D2D9DF 30%, #E7DFF3 62%, #C6CFD6 100%)",
          minHeight: "100svh",
          height: "100svh",
          zIndex: 0,
        }}
      >
        {/* Grain / noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            opacity: 0.038,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
          aria-hidden="true"
        />

        {/* Pink glow — removed, was spreading lavender wash across entire left side */}
        {/* Blue-cool halo top right — removed, was washing the entire hero with blue */}

        {/* Purple glow — behind headline text area */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "-8%",
            top: "5%",
            width: "62%",
            height: "85%",
            background: "radial-gradient(ellipse at 36% 48%, rgba(210,170,255,0.06) 0%, rgba(210,170,255,0.03) 42%, transparent 68%)",
            filter: "blur(160px)",
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        <div className="flex-1 flex items-center mx-auto max-w-7xl w-full px-6 lg:px-10 pt-28 pb-16 md:pt-24 md:pb-28 relative">
          <div
            ref={heroContentRef}
            className="w-full relative z-10"
          >
            {/* LEFT: Text */}
            <div
              data-hero-text
              className="w-full md:w-auto relative z-20 mt-20 md:mt-0 pr-[20%] md:pr-0 will-change-transform"
              style={{ maxWidth: "660px" }}
            >
              <span style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#9CA3AF",
                marginBottom: "16px",
                display: "block",
              }}>
                SEARCH VISIBILITY IN THE AGE OF AI
              </span>

              <motion.h1
                initial="hidden"
                animate={heroAnimReady ? "visible" : "hidden"}
                variants={fadeUpVariants}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: heroAnimReady ? 0.05 : 0 }}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(36px, 3.8vw, 52px)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: "#0D1117",
                  margin: 0,
                }}
              >
                Become{" "}
                <em
                  style={{
                    fontFamily: "'Times New Roman', 'Georgia', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "#2563EB",
                  }}
                >
                  impossible to ignore
                </em>
                <br />
                in the age of AI search.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={heroAnimReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: heroAnimReady ? 0.2 : 0 }}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "clamp(15px, 1.5vw, 18px)",
                  fontWeight: 400,
                  lineHeight: 1.7,
                  color: "rgba(13,17,23,0.52)",
                  margin: "20px 0 0",
                  maxWidth: "500px",
                }}
              >
                I build search visibility systems that rank on Google, appear in AI answers, and compound organic growth.
              </motion.p>

              <motion.div
                className="cred-strip"
                initial="hidden"
                animate={heroAnimReady ? "visible" : "hidden"}
                variants={fadeUpVariants}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: heroAnimReady ? 0.35 : 0 }}
              >
                <span>✓ 70+ Websites Built</span>
                <span>✓ 5M+ Organic Clicks</span>
                <span>✓ 11.5% Peak CTR</span>
              </motion.div>

              {/* Social proof row — stars + divider + stat */}
              <motion.div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: "24px",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={heroAnimReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: heroAnimReady ? 0.5 : 0 }}
              >
                {/* Five gold stars with stagger */}
                <span style={{ display: "inline-flex", letterSpacing: "2px" }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      style={{ color: "#f59e0b", fontSize: "14px", display: "inline-block" }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={heroAnimReady ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                        delay: heroAnimReady ? 0.52 + i * 0.04 : 0,
                      }}
                    >
                      ★
                    </motion.span>
                  ))}
                </span>

                {/* Vertical divider */}
                <motion.span
                  style={{
                    width: "1px",
                    height: "16px",
                    background: "#d1d5db",
                    margin: "0 12px",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={heroAnimReady ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: heroAnimReady ? 0.65 : 0 }}
                />

                {/* Stat text */}
                <motion.span
                  style={{ fontSize: "13px", fontWeight: 500, color: "#6B7280", whiteSpace: "nowrap" }}
                  initial={{ opacity: 0 }}
                  animate={heroAnimReady ? { opacity: 1 } : { opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                    delay: heroAnimReady ? 0.7 : 0,
                  }}
                >
                  200M+ organic impressions generated across our websites.
                </motion.span>
              </motion.div>

            </div>

          </div>
        </div>

        {/* "200M+" layer 1 — solid fill, sits BEHIND portrait */}
        <div
          className="hidden md:flex absolute pointer-events-none select-none overflow-hidden"
          style={{
            right: 0,
            bottom: 0,
            top: 0,
            width: "58%",
            zIndex: 1,
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingBottom: "2%",
            paddingLeft: "3%",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "15vw",
              fontWeight: 900,
              color: "#ffffff",
              opacity: 0.55,
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              display: "block",
              userSelect: "none",
            }}
          >
            200M+
          </span>
        </div>

        {/* Glow 1 — blue→purple radial behind portrait */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: 0,
            top: 0,
            bottom: 0,
            width: "65%",
            background: "radial-gradient(ellipse at 68% 50%, rgba(96,165,250,0.20) 0%, rgba(139,92,246,0.13) 48%, transparent 74%)",
            filter: "blur(52px)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Glow 2 — concentrated pink-to-purple halo at bottom-left, under social proof */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            bottom: 0,
            width: "320px",
            height: "250px",
            background: "radial-gradient(ellipse at bottom left, rgba(219,39,119,0.54) 0%, rgba(147,51,234,0.36) 44%, transparent 68%)",
            filter: "blur(38px)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* RIGHT: Photo — positioned relative to section so bottom-0 = viewport bottom */}
        {/* RIGHT: Photo — layer 2, sandwiched between fill and outline 5M+ */}
        <div data-hero-portrait className="absolute -right-14 top-0 h-[480px] w-[70%] md:right-8 md:top-0 md:bottom-0 md:h-full md:w-[60%] pointer-events-none md:pointer-events-auto will-change-transform" style={{ zIndex: 2 }}>
          <div className="absolute inset-0 z-10 w-full h-full opacity-50 md:opacity-100">
            <img
              src={HERO_IMAGE_URL}
              alt="Ankit Jaiswal"
              className="absolute bottom-0 right-0 w-[160%] md:w-auto md:h-[93vh] max-w-none object-contain object-bottom transition-transform duration-700 ease-out hover:scale-[1.02]"
              style={{
                filter: "drop-shadow(0px 20px 40px rgba(0,0,0,0.15))",
              }}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            {/* Mobile gradient overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-gradient-to-r from-[#D2D9DF] via-[#D2D9DF]/60 to-transparent md:hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#D2D9DF] via-transparent to-transparent md:hidden" />
          </div>
        </div>

        {/* Label below 5M+ — "Impressions last year" */}
        <div
          className="hidden md:block absolute pointer-events-none select-none"
          style={{
            right: 0,
            bottom: "3%",
            width: "58%",
            zIndex: 4,
            paddingLeft: "5%",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.28em",
              textTransform: "lowercase",
              color: "rgba(255,255,255,0.55)",
              display: "block",
              userSelect: "none",
            }}
          >
            organic impressions
          </span>
        </div>

        {/* "200M+" layer 3 — outline stroke, sits ABOVE portrait for sandwich depth effect */}
        <div
          className="hidden md:flex absolute pointer-events-none select-none overflow-hidden"
          style={{
            right: 0,
            bottom: 0,
            top: 0,
            width: "58%",
            zIndex: 3,
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingBottom: "2%",
            paddingLeft: "3%",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "15vw",
              fontWeight: 900,
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(255,255,255,1)",
              opacity: 0.22,
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              display: "block",
              userSelect: "none",
            }}
          >
            200M+
          </span>
        </div>

      </section>

      {/* ── STATS — own sticky layer, slides over hero, ProofGallery slides over this ── */}
      <div style={{ position: "relative", minHeight: "100svh", zIndex: 5, background: "#0D1117" }}>
        <StatsStrip />
      </div>

      {/* ── CONTENT SECTIONS — slides over both hero and StatsStrip ── */}
      <div id="results" className="relative" style={{ overflow: "clip", zIndex: 10, borderRadius: 0, boxShadow: "0 -20px 60px rgba(0,0,0,0.25)", background: "#0D1117" }}>
        <ProofGallery />

        {/* ── Expertise — dark ── */}
        <section id="contact" className="relative py-28 md:py-36" style={{ background: "#0D1117", overflow: "clip" }}>

          {/* ── Top hairline border — Stripe-style section separator ── */}
          <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(237,234,228,0.1) 25%, rgba(237,234,228,0.1) 75%, transparent 100%)",
          }} />

          {/* ── Cream overhead halo — blooms in on viewport entry ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              background: "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(237,234,228,0.065) 0%, transparent 68%)",
            }}
          />

          {/* ── Left accent — subconscious spotlight on the sticky counter ── */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 45% 65% at -4% 38%, rgba(237,234,228,0.038) 0%, transparent 70%)",
          }} />

          {/* ── Noise texture — same surface material as ProofGallery ── */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.018] mix-blend-overlay" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }} />

          <div className="container mx-auto px-6 lg:px-10 relative z-10">
            <div className="mb-20">
              {/* Eyebrow — fades in first */}
              <motion.p
                className="eyebrow-label mb-4"
                style={{ color: "rgba(255,255,255,0.4)" }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >How I Work</motion.p>

              {/* Heading — curtain reveal: slides up from overflow-hidden parent */}
              <div style={{ overflow: "hidden" }}>
                <motion.h2
                  style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", color: "#EDEAE4", lineHeight: 1.15 }}
                  initial={{ y: "110%" }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.78, ease: [0.76, 0, 0.24, 1], delay: 0.08 }}
                >
                  What I Actually Do
                </motion.h2>
              </div>

              {/* Description — fades up after heading lands */}
              <motion.p
                className="mt-4 text-lg max-w-xl"
                style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.32 }}
              >
                SEO, GEO, and content systems that{" "}
                <em style={{ fontFamily: "'Times New Roman', Georgia, serif", fontStyle: "italic", color: "rgba(237,234,228,0.7)" }}>compound over time</em>
                . I build the infrastructure for businesses to get found — by Google first, and by AI engines next.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-start">

              {/* ── Left: sticky counter panel ── */}
              <div className="hidden md:flex flex-col" style={{ position: "sticky", top: "120px" }}>

                {/* Slot-machine counter — each slot is exactly 9rem tall */}
                <div style={{ display: "flex", alignItems: "flex-start", lineHeight: 1 }}>
                  <span
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: "9rem",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "rgba(237,234,228,0.15)",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >0</span>
                  <div style={{ height: "9rem", overflow: "hidden", flex: "none" }}>
                    <div
                      style={{
                        transform: `translateY(-${expertiseActiveIdx * 9}rem)`,
                        transition: "transform 650ms cubic-bezier(0.76, 0, 0.24, 1)",
                      }}
                    >
                      {expertiseAreas.map((_, i) => (
                        <div
                          key={i}
                          style={{
                            height: "9rem",
                            display: "flex",
                            alignItems: "flex-start",
                            fontFamily: "'Sora', sans-serif",
                            fontSize: "9rem",
                            fontWeight: 900,
                            letterSpacing: "-0.04em",
                            color: "#EDEAE4",
                            lineHeight: 1,
                            userSelect: "none",
                          }}
                        >{i + 1}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active card info */}
                <motion.div
                  key={expertiseActiveIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  style={{ marginTop: "28px" }}
                >
                  {(() => {
                    const area = expertiseAreas[expertiseActiveIdx];
                    const Icon = area.icon;
                    return (
                      <>
                        <Icon
                          className="h-5 w-5"
                          style={{ color: "rgba(237,234,228,0.4)", marginBottom: "16px", display: "block" }}
                        />
                        <h3
                          style={{
                            fontFamily: "'Sora', sans-serif",
                            fontWeight: 800,
                            fontSize: "1.75rem",
                            color: "#EDEAE4",
                            lineHeight: 1.2,
                            marginBottom: "8px",
                            letterSpacing: "-0.02em",
                          }}
                        >{area.title}</h3>
                        <p
                          style={{
                            color: "rgba(237,234,228,0.42)",
                            fontSize: "15px",
                            fontWeight: 400,
                            fontFamily: "'Times New Roman', Georgia, serif",
                            fontStyle: "italic",
                            letterSpacing: "0.005em",
                            lineHeight: 1.5,
                          }}
                        >{area.tagline}</p>
                      </>
                    );
                  })()}
                </motion.div>

                {/* Step indicators — white, no blue */}
                <div style={{ display: "flex", gap: "6px", marginTop: "32px" }}>
                  {expertiseAreas.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: "2px",
                        borderRadius: "1px",
                        width: i === expertiseActiveIdx ? "32px" : "8px",
                        background: i === expertiseActiveIdx
                          ? "rgba(237,234,228,0.85)"
                          : "rgba(237,234,228,0.15)",
                        transition: "all 500ms cubic-bezier(0.76, 0, 0.24, 1)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Right: scrollable content panels ── */}
              <div>
                {expertiseAreas.map((area, idx) => {
                  const IconComponent = area.icon;
                  return (
                    <div
                      key={idx}
                      ref={(el) => { expertiseCardRefs.current[idx] = el; }}
                      style={{
                        minHeight: "62vh",
                        display: "flex",
                        alignItems: "center",
                        paddingTop: idx === 0 ? "8px" : "80px",
                        paddingBottom: idx === expertiseAreas.length - 1 ? "8px" : "80px",
                        borderBottom: idx < expertiseAreas.length - 1
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "none",
                        position: "relative",
                        paddingLeft: "20px",
                      }}
                    >
                      {/* Active reading-head accent — 2px cream bar tracks the active card */}
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: idx === 0 ? "8px" : "80px",
                        bottom: idx === expertiseAreas.length - 1 ? "8px" : "80px",
                        width: "2px",
                        borderRadius: "1px",
                        background: idx === expertiseActiveIdx
                          ? "rgba(237,234,228,0.55)"
                          : "rgba(237,234,228,0.06)",
                        transition: "background 450ms cubic-bezier(0.76, 0, 0.24, 1)",
                      }} />
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        style={{ width: "100%" }}
                      >
                        {/* Mobile header — no blue */}
                        <div className="flex md:hidden items-center gap-3 mb-8">
                          <IconComponent className="h-5 w-5" style={{ color: "rgba(237,234,228,0.45)", flexShrink: 0 }} />
                          <div>
                            <h3
                              style={{
                                fontFamily: "'Sora', sans-serif",
                                fontWeight: 700,
                                fontSize: "1.25rem",
                                color: "#EDEAE4",
                                lineHeight: 1.25,
                                letterSpacing: "-0.01em",
                              }}
                            >{area.title}</h3>
                            <p style={{ color: "rgba(237,234,228,0.42)", fontSize: "14px", fontFamily: "'Times New Roman', Georgia, serif", fontStyle: "italic", marginTop: "3px", lineHeight: 1.45 }}>
                              {area.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Capability rows — icon anchor + text */}
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {area.capabilities.map((cap, capIdx) => {
                            const CapIcon = cap.icon;
                            return (
                              <motion.li
                                key={capIdx}
                                initial={{ opacity: 0, x: -14 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: capIdx * 0.08, ease: [0.25, 0, 0.35, 1] }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "14px",
                                  padding: "22px 0",
                                  borderBottom: capIdx < area.capabilities.length - 1
                                    ? "1px solid rgba(255,255,255,0.07)"
                                    : "none",
                                }}
                              >
                                <CapIcon
                                  style={{
                                    width: "15px",
                                    height: "15px",
                                    color: "rgba(237,234,228,0.32)",
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    color: "rgba(237,234,228,0.75)",
                                    fontSize: "17px",
                                    fontWeight: 400,
                                    lineHeight: 1.5,
                                    fontFamily: "'Inter', sans-serif",
                                    letterSpacing: "0.005em",
                                  }}
                                >{cap.text}</span>
                              </motion.li>
                            );
                          })}
                        </ul>

                        {/* AI Discovery Layer — platform chips */}
                        {"platforms" in area && area.platforms && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.32 }}
                            style={{ marginTop: "28px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}
                          >
                            <span style={{
                              color: "rgba(237,234,228,0.3)",
                              fontSize: "11px",
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 500,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                            }}>Ranked inside</span>
                            {area.platforms.map((platform, pi) => (
                              <motion.span
                                key={pi}
                                initial={{ opacity: 0, scale: 0.92 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: 0.38 + pi * 0.07 }}
                                style={{
                                  padding: "5px 13px",
                                  borderRadius: "100px",
                                  border: "1px solid rgba(237,234,228,0.18)",
                                  background: "rgba(237,234,228,0.05)",
                                  color: "rgba(237,234,228,0.82)",
                                  fontSize: "12px",
                                  fontFamily: "'Inter', sans-serif",
                                  fontWeight: 500,
                                  letterSpacing: "0.01em",
                                }}
                              >{platform}</motion.span>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-20 pt-16 border-t text-center"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <p className="text-base mb-4" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Times New Roman', Georgia, serif", fontStyle: "italic" }}>Interested in working together?</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-medium transition-all duration-200 group"
                style={{ color: "#60A5FA", fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.color = "#93C5FD"; }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.color = "#60A5FA"; }}
              >
                Let's talk
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </section>

        {/* ── Featured Tools — #F5F2EE ── */}
        <section id="tools" className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#F5F2EE" }}>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:justify-between md:items-end mb-16"
            >
              <div>
                <p className="eyebrow-label mb-3">Free Utilities</p>
                <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "#0D1117", lineHeight: 1.15 }} className="mb-4">
                  Featured Tools
                </h2>
                <p className="max-w-lg" style={{ color: "#4B5563", lineHeight: 1.65, fontFamily: "'Times New Roman', Georgia, serif", fontStyle: "italic" }}>
                  Privacy-focused utilities running in your browser
                </p>
              </div>
              <Link href="/tools">
                <button
                  className="hidden md:flex items-center gap-2 mt-4 md:mt-0 text-sm transition-all duration-200"
                  style={{ color: "#4B5563", fontFamily: "'Inter', sans-serif", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#0D1117"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4B5563"; }}
                >
                  View All Tools <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </Link>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="group"
                >
                  {tool.external ? (
                    <a href={tool.href} target="_blank" rel="dofollow noopener noreferrer" className="block h-full">
                      <div
                        className="h-full relative overflow-hidden transition-all duration-200 hover:-translate-y-1"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid rgba(0,0,0,0.08)",
                          borderRadius: "16px",
                          padding: "28px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span
                            className="text-xs font-medium px-3 py-1 rounded-full font-label"
                            style={{ color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", fontFamily: "'Inter', sans-serif" }}
                          >
                            {tool.category}
                          </span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200" />
                        </div>
                        <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 900, fontSize: "1.05rem", color: "#0D1117" }} className="mb-2">
                          {tool.name}
                        </h3>
                        <p className="text-sm" style={{ color: "#4B5563", fontFamily: "'Inter', sans-serif" }}>Launch external tool</p>
                      </div>
                    </a>
                  ) : (
                    <Link href={tool.href} className="block h-full">
                      <div
                        className="h-full relative overflow-hidden transition-all duration-200 hover:-translate-y-1"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid rgba(0,0,0,0.08)",
                          borderRadius: "16px",
                          padding: "28px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
                      >
                        <span
                          className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 font-label"
                          style={{ color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", fontFamily: "'Inter', sans-serif" }}
                        >
                          {tool.category}
                        </span>
                        <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 900, fontSize: "1.05rem", color: "#0D1117" }} className="mb-2">
                          {tool.name}
                        </h3>
                        <p className="text-sm" style={{ color: "#4B5563", fontFamily: "'Inter', sans-serif" }}>Run locally</p>
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12 md:hidden">
              <Link href="/tools">
                <button
                  className="text-sm transition-all duration-200 flex items-center gap-2 mx-auto"
                  style={{ color: "#4B5563", fontFamily: "'Inter', sans-serif", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
                >
                  View All Tools <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
        </section>

      </div>
    </div>
  );
}
