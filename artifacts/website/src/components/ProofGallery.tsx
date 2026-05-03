import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const INTERVAL_MS = 3500;
const PAUSE_MS = 5000;

function DotGridPattern({ light = false }: { light?: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.04]"
      style={{
        backgroundImage: `radial-gradient(circle at center, ${light ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)"} 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function AmbientOrbs({ light = false }: { light?: boolean }) {
  const orbs = useMemo(
    () => light
      ? [
          { x: "20%", y: "10%", size: 520, color: "rgba(99,102,241,0.11)", duration: 28 },
          { x: "80%", y: "30%", size: 420, color: "rgba(79,125,255,0.09)", duration: 32 },
          { x: "50%", y: "75%", size: 380, color: "rgba(139,92,246,0.07)", duration: 24 },
        ]
      : [
          { x: "15%", y: "25%", size: 400, color: "rgba(79,125,255,0.06)", duration: 25 },
          { x: "75%", y: "60%", size: 350, color: "rgba(79,125,255,0.04)", duration: 30 },
          { x: "50%", y: "80%", size: 300, color: "rgba(99,102,241,0.04)", duration: 22 },
        ],
    [light]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
            willChange: "transform",
            animationName: `orb-float-${i % 3}`,
            animationDuration: `${orb.duration}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </div>
  );
}

function NoiseOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

interface ProofImage {
  src: string;
  alt: string;
  caption: string;
  highlight: string;
  interpretation: string;
}

const proofImages: ProofImage[] = [
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-1.webp",
    alt: "Google Search Console - 12 Month Performance Overview",
    caption: "Google Search Console · 12 Month Overview",
    highlight: "4.1M Clicks • 35.8M Impressions",
    interpretation: "Sustained 12-month growth across topical clusters — not a traffic spike, a compounding system.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-10.webp",
    alt: "Google Search Console - 3 Month Performance",
    caption: "Google Search Console · 3 Month Performance",
    highlight: "1.38M Clicks • 9.9% CTR • Avg Position 5.2",
    interpretation: "9.9% CTR is 3× the industry average — achieved through structured title and meta optimisation at scale.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-9.webp",
    alt: "Google Analytics - Real-time Active Users",
    caption: "Google Analytics · Real-time",
    highlight: "3,737 Active Users • 5.1M Views",
    interpretation: "High concurrent session count driven purely by organic search — zero paid amplification.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-3.webp",
    alt: "Google Search Console - Period Comparison 8x Growth",
    caption: "Google Search Console · Period Comparison",
    highlight: "1.37M Clicks vs 163K Prior Period — 8× Growth",
    interpretation: "8× growth in 12 months from a cold-start through entity building and topical cluster strategy.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-4.webp",
    alt: "Google Search Console - 6 Month Trajectory",
    caption: "Google Search Console · 6 Month Trajectory",
    highlight: "1.54M Clicks • 40.5M Impressions",
    interpretation: "Impression velocity compounding faster than click volume — search presence expanding beyond current rankings.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-6.webp",
    alt: "Bing Webmaster Tools - Search Performance",
    caption: "Bing Webmaster Tools · Search Performance",
    highlight: "18.18% CTR • 42.1K Clicks",
    interpretation: "Cross-engine visibility at 18% CTR — structured on-page signals carrying across platforms without separate effort.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/ddos-mitigation.webp",
    alt: "Cloudflare DDoS Attack Traffic Volume Chart",
    caption: "Cloudflare · DDoS Attack Traffic",
    highlight: "95.82M Requests in 24H • 14.72M/hr Peak — Attack Absorbed",
    interpretation: "70.25M uncached attack requests (DDoS + brute force) hit the server in a single event — Cloudflare absorbed the spike, site never went down.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/ddos-mitigation-2.webp",
    alt: "Cloudflare DDoS Mitigation Dashboard - 254K Visitors Served",
    caption: "Cloudflare · DDoS Mitigation",
    highlight: "254K Visitors Served • 146M Requests • Zero Downtime",
    interpretation: "During a 146M-request DDoS and brute force attack, 94.83% of traffic was cached — 254K real visitors kept getting the site without interruption.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-7.webp",
    alt: "Google Search Console - 28 Day Performance",
    caption: "Google Search Console · 28 Day Window",
    highlight: "399K Clicks • 13.2M Impressions",
    interpretation: "Consistent 28-day output across a broad keyword portfolio — no single-keyword dependency, no fragility.",
  },
  {
    src: "https://ankitjaiswal.in/assets/images/traffic-proof-8.webp",
    alt: "Google Search Console - Weekly Snapshot",
    caption: "Google Search Console · Weekly Snapshot",
    highlight: "93.7K Clicks • 3.3M Impressions",
    interpretation: "Steady weekly cadence — compounding organic output rather than isolated traffic events.",
  },
];

const CARD_SPRING = { type: "spring" as const, stiffness: 300, damping: 35 };

const ScrollStackingDeck = ({
  images,
  activeIndex,
  onOpenLightbox,
}: {
  images: ProofImage[];
  activeIndex: number;
  onOpenLightbox: (index: number) => void;
}) => {
  const totalCards = images.length;

  return (
    <div className="relative h-[420px] flex items-center justify-center">
      {images.map((image, index) => {
        const isActive = index === activeIndex;
        const offset = index - activeIndex;
        const zIndex = totalCards - Math.abs(offset);
        const opacity = offset === 0 ? 1 : Math.max(0.75 - Math.abs(offset) * 0.1, 0.45);

        return (
          <motion.button
            key={index}
            className="absolute w-full max-w-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-2xl"
            style={{
              zIndex,
              willChange: "transform, opacity",
            }}
            initial={false}
            animate={{
              x: offset * 30,
              y: offset < 0 ? Math.abs(offset) * 15 : Math.abs(offset) * 10,
              rotate: offset * 5,
              scale: 1 - Math.abs(offset) * 0.05,
              opacity,
            }}
            transition={CARD_SPRING}
            onClick={() => onOpenLightbox(index)}
            aria-label={`View ${image.caption} in fullscreen`}
          >
            <div
              className="relative overflow-hidden rounded-2xl bg-white"
              style={{
                boxShadow: isActive
                  ? `0 20px 60px -10px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.1), 0 0 0 1.5px rgba(79,125,255,0.45)`
                  : `0 8px 24px -4px rgba(0,0,0,0.1), 0 2px 8px -2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.07)`,
                border: isActive
                  ? "1.5px solid rgba(79,125,255,0.45)"
                  : "1px solid rgba(0,0,0,0.07)",
                transition: "box-shadow 350ms ease, border-color 350ms ease",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover object-top"
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

const MobileCard = ({
  image,
  index,
  onOpenLightbox,
}: {
  image: ProofImage;
  index: number;
  onOpenLightbox: () => void;
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onClick={onOpenLightbox}
      className="relative w-full aspect-[16/10] rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.98] transition-transform"
      aria-label={`View ${image.caption} in fullscreen`}
      style={{
        boxShadow: `
          0 ${20 + index * 8}px ${40 + index * 15}px -15px rgba(0,0,0,0.6),
          0 ${12 + index * 4}px ${24 + index * 8}px -8px rgba(0,0,0,0.4)
        `,
      }}
    >
      <img
        src={image.src}
        alt={image.alt}
        className="w-full h-full object-cover object-top"
        loading="lazy"
        decoding="async"
      />

      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-2">
          {image.caption}
        </span>
        <p className="text-base font-semibold text-white">{image.highlight}</p>
      </div>

      <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
    </motion.button>
  );
};

export function ProofGallery() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Panel reveal: scroll-driven clip — Lenis already smooths the scroll, no spring needed
  const { scrollYProgress: revealProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.88", "start 0.18"],
  });
  // Clip-path: wide scroll window + softer keypoints so vertical expansion stays visible
  // throughout the scroll — panel is NOT fully open until the section is well centred in view
  const panelClip = useTransform(
    revealProgress,
    [0, 0.55, 1],
    ["inset(22% 8% round 48px)", "inset(1% 1% round 18px)", "inset(0% 0% round 16px)"]
  );
  // Opacity: blooms in fast over first 30% of scroll — no ghostly half-visible state
  // NOTE: scale was removed — scroll-driven scale + clipPath on a 100vh element forces double
  // re-composite on every Lenis frame (60fps), causing visible stutter. Opacity is GPU-free.
  const panelOpacity = useTransform(revealProgress, [0, 0.3, 1], [0, 1, 1]);

  // Exit fade: tracks when section bottom leaves the top of viewport
  // Only kicks in for the last 35% of exit so the panel is well gone before it fades
  const { scrollYProgress: exitProgress } = useScroll({
    target: sectionRef,
    offset: ["end 0.75", "end 0.0"],
  });
  const panelExitOpacity = useTransform(exitProgress, [0.65, 1], [1, 0]);

  // Combined: entry bloom × exit fade — each axis is independent
  const combinedOpacity = useTransform(
    [panelOpacity, panelExitOpacity],
    ([entry, exit]: number[]) => (entry as number) * (exit as number)
  );

  // Pause timer when section scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const resumeAfterDelay = useCallback(() => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setIsPaused(false), PAUSE_MS);
  }, []);

  const goPrev = useCallback(() => {
    setActiveCardIndex((prev) => (prev - 1 + proofImages.length) % proofImages.length);
    resumeAfterDelay();
  }, [resumeAfterDelay]);

  const goNext = useCallback(() => {
    setActiveCardIndex((prev) => (prev + 1) % proofImages.length);
    resumeAfterDelay();
  }, [resumeAfterDelay]);

  const goToIndex = useCallback(
    (idx: number) => {
      setActiveCardIndex(idx);
      resumeAfterDelay();
    },
    [resumeAfterDelay]
  );

  // Auto-advance: only runs when section is in view and not manually paused
  useEffect(() => {
    if (isPaused || !isVisible) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % proofImages.length);
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPaused, isVisible]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const openLightbox = (index: number) => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
    previouslyFocusedElement.current?.focus();
    const lenis = (window as any).__lenis;
    if (lenis) lenis.start();
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      const lenis = (window as any).__lenis;
      if (lenis) lenis.start();
    };
  }, []);

  useEffect(() => {
    if (lightboxOpen && lightboxRef.current) {
      lightboxRef.current.focus();
    }
  }, [lightboxOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft")
        setLightboxIndex((prev) => (prev - 1 + proofImages.length) % proofImages.length);
      if (e.key === "ArrowRight")
        setLightboxIndex((prev) => (prev + 1) % proofImages.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox]);

  return (
    <>
      {/* ── Desktop ── */}
      {/* Outer frame: dark (matches page bg) — provides corner fill for permanent radius */}
      <div
        id="proof-gallery"
        ref={sectionRef}
        className="relative hidden md:block"
        style={{ background: "#0D1117", padding: "12px 0" }}
      >
        {/* Inner panel: cool blue-white — clip-path window expands to full bleed on scroll */}
        <motion.div
          className="relative overflow-hidden"
          style={{
            clipPath: panelClip,
            opacity: combinedOpacity,
            background: "#F0F4FF",
            minHeight: "100vh",
          }}
        >
          <DotGridPattern light />
          <AmbientOrbs light />
          <NoiseOverlay />

          {/* Side progress indicator */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20">
            <span className="text-black/30 text-xs font-medium tracking-wider">
              {String(activeCardIndex + 1).padStart(2, "0")}
            </span>
            <div className="relative w-0.5 h-32 bg-black/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 right-0 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"
                animate={{ height: `${((activeCardIndex + 1) / proofImages.length) * 100}%` }}
                transition={CARD_SPRING}
              />
            </div>
            <span className="text-black/30 text-xs font-medium tracking-wider">
              {String(proofImages.length).padStart(2, "0")}
            </span>
          </div>

          <div
            className="flex flex-col justify-center"
            style={{ minHeight: "100vh", padding: "120px 0" }}
          >
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center pb-5"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-black/40 mb-4 font-medium">
                  Track Record
                </p>
                <h2 className="text-3xl md:text-5xl font-display font-semibold text-[#0D1117] mb-4">
                  Proof in the Data
                </h2>
                <p className="text-black/50 text-sm max-w-md mx-auto">
                  Real screenshots from Google Search Console & Analytics
                </p>
              </motion.div>

              {/* Animated per-slide context label */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCardIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{ textAlign: "center", marginBottom: "18px" }}
                >
                  <p style={{
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(13,17,23,0.38)",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    marginBottom: "4px",
                  }}>
                    {proofImages[activeCardIndex].caption}
                  </p>
                  <p style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "rgba(13,17,23,0.72)",
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "-0.01em",
                  }}>
                    {proofImages[activeCardIndex].highlight}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Deck + prev/next arrows */}
              <div className="relative">
                {/* Spotlight glow — sits behind the card stack, creates stage-lighting depth */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "15%",
                    left: "10%",
                    width: "80%",
                    height: "70%",
                    background: "radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 65%)",
                    zIndex: 0,
                  }}
                />

                <button
                  onClick={goPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full flex items-center justify-center text-black/30 hover:text-black transition-colors duration-200 cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <ScrollStackingDeck
                  images={proofImages}
                  activeIndex={activeCardIndex}
                  onOpenLightbox={openLightbox}
                />

                <button
                  onClick={goNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full flex items-center justify-center text-black/30 hover:text-black transition-colors duration-200 cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-5">
                {proofImages.map((_, idx) => (
                  <button
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeCardIndex
                        ? "bg-blue-500 w-6"
                        : "bg-black/15 hover:bg-black/30 w-2"
                    }`}
                    onClick={() => goToIndex(idx)}
                    aria-label={`View card ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Progress bar */}
              <div className="flex justify-center mt-3">
                <div
                  className="relative overflow-hidden rounded-full"
                  style={{ width: "80px", height: "2px", background: "rgba(0,0,0,0.08)" }}
                >
                  <motion.div
                    key={`${activeCardIndex}-${isPaused ? "p" : "r"}`}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, rgba(79,125,255,0.6), rgba(99,155,255,0.9))",
                      willChange: "transform",
                      transformOrigin: "left center",
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isPaused ? 0 : 1 }}
                    transition={{
                      duration: isPaused ? 0.15 : INTERVAL_MS / 1000,
                      ease: "linear",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
        </motion.div>
      </div>

      {/* ── Mobile ── */}
      <section className="relative bg-[#0A0C10] overflow-visible md:hidden">
        <DotGridPattern />
        <AmbientOrbs />
        <NoiseOverlay />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(79,125,255,0.04) 0%, transparent 50%)",
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center pt-24 pb-12"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4 font-medium">
              Track Record
            </p>
            <h2 className="text-3xl font-display font-semibold text-white mb-4">
              Proof in the Data
            </h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Real screenshots from Google Search Console & Analytics
            </p>
          </motion.div>

          <div className="space-y-4 pb-16">
            {proofImages.map((image, idx) => (
              <MobileCard
                key={idx}
                image={image}
                index={idx}
                onOpenLightbox={() => openLightbox(idx)}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            ref={lightboxRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
            tabIndex={-1}
          >
            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
              onClick={closeLightbox}
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (prev) => (prev - 1 + proofImages.length) % proofImages.length
                );
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev + 1) % proofImages.length);
              }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-[90vw] relative flex flex-col items-center"
              style={{ maxHeight: "calc(100vh - 100px)", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={proofImages[lightboxIndex].src}
                alt={proofImages[lightboxIndex].alt}
                className="max-w-full object-contain rounded-lg flex-shrink-0"
                style={{ maxHeight: "calc(100vh - 230px)" }}
              />
              <div className="text-center mt-4 pb-2 flex-shrink-0">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-2">
                  {proofImages[lightboxIndex].caption}
                </span>
                <p className="text-white font-semibold text-base">
                  {proofImages[lightboxIndex].highlight}
                </p>
              </div>
              {/* Dots live inside the content flow — never covered */}
              <div className="flex gap-3 mt-4 pb-4 flex-shrink-0">
                {proofImages.map((_, idx) => (
                  <button
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === lightboxIndex
                        ? "bg-blue-400 w-8"
                        : "bg-white/30 hover:bg-white/50 w-2"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(idx);
                    }}
                    aria-label={`View image ${idx + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
