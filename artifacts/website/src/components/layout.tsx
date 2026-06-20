import { Link, useLocation } from "wouter";
import { navigate as wouterNavigate } from "wouter/use-browser-location";
import { Menu, X, Briefcase, BarChart2, Globe, TrendingUp, Mail, Phone, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";

function smoothScrollTo(hash: string) {
  const el = document.querySelector(hash);
  if (!el) return;
  const lenis = (window as any).__lenis;
  if (lenis) {
    lenis.scrollTo(el, { offset: 0 });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Navigate to a home-page anchor from anywhere in the app. If we're already on
 * "/", just scroll. If not, route to "/" and defer the scroll until after the
 * home page mounts so the target element exists. Without this, clicking
 * "#tools" or "#contact" from /about (or any non-home route) was a silent
 * no-op — the dead link a code review caught.
 */
function navigateToHomeAnchor(currentPath: string, hash: string) {
  if (currentPath === "/") {
    smoothScrollTo(hash);
    return;
  }
  wouterNavigate("/" + hash);
  // Two RAFs: one for route change to commit, one for the new page to layout
  // its sections so smoothScrollTo can find them.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Small extra delay covers Suspense lazy-load of /work or /tools chunks.
      setTimeout(() => smoothScrollTo(hash), 80);
    });
  });
}

type NavItem = {
  name: string;
  href: string;
  icon: typeof BarChart2;
  external?: boolean;
  /** Internal app route (use wouter Link, no smooth-scroll). */
  route?: boolean;
};

const navItems: NavItem[] = [
  { name: "About", href: "/about", icon: User, route: true },
  { name: "Insights", href: "https://www.linkedin.com/in/itsankitjaiswal/", icon: BarChart2, external: true },
  { name: "GEO Tools", href: "#tools", icon: Globe },
  { name: "Results", href: "#results", icon: TrendingUp },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isInHero, setIsInHero] = useState(true);
  const [isInProofSection, setIsInProofSection] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  const upwardAccum = useRef(0);

  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      setCurrentTime(new Date().toLocaleTimeString("en-US", options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastScrollY.current;
    const heroThreshold = typeof window !== "undefined" ? window.innerHeight * 0.75 : 600;
    setIsInHero(latest < heroThreshold);
    setIsScrolled(latest > 40);

    if (latest <= 80) {
      // Always show when near the top
      setIsVisible(true);
      upwardAccum.current = 0;
    } else if (delta > 0) {
      // Scrolling down — hide immediately, reset upward counter
      setIsVisible(false);
      upwardAccum.current = 0;
    } else if (delta < 0) {
      // Scrolling up — accumulate distance; only reveal after 100px of intentional upward scroll
      // Eliminates accidental micro-drift triggers while reading content
      upwardAccum.current += Math.abs(delta);
      if (upwardAccum.current >= 100) {
        setIsVisible(true);
      }
    }

    lastScrollY.current = latest;
  });

  useEffect(() => {
    const el = document.getElementById("proof-gallery");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInProofSection(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // ── Liquid button: set --lx / --ly so ::after origin tracks cursor entry ──────
  useEffect(() => {
    function track(btn: Element) {
      const el = btn as HTMLElement;
      if (el.dataset.liquidAttached) return;
      el.dataset.liquidAttached = "1";
      el.addEventListener("mouseenter", (e: Event) => {
        const me = e as MouseEvent;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--lx", `${me.clientX - r.left}px`);
        el.style.setProperty("--ly", `${me.clientY - r.top}px`);
      });
    }

    document.querySelectorAll(".btn-liquid").forEach(track);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as Element;
          if (el.classList?.contains("btn-liquid")) track(el);
          el.querySelectorAll?.(".btn-liquid").forEach(track);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Normalize location: strip trailing slash (except for "/"), search params, and hash anchors
  const cleanLocation = location.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";

  // On the /tools directory page the nav should always be opaque — the page is dark from the top
  // and the transparent-in-hero treatment causes the eyebrow label to bleed through the nav.
  const isToolsIndex = cleanLocation === "/tools";
  const useHeroHeader = !isToolsIndex && isInHero;
  const headerLogoSrc = useHeroHeader ? "/images/ankitjaiswal-logo-dark.png" : "/images/ankitjaiswal-logo-light.png";

  // Individual tool pages (e.g. /tools/notepad) are self-contained — skip site nav & footer.
  // The /tools index page keeps full nav since it's a directory listing, not a working tool.
  // Top-level vanity SEO aliases (e.g. /online-notepad, /paste-to-image) also count as tool
  // pages — they render the same ToolPage shell and must hide the global site chrome to
  // avoid double-headers.
  const TOP_LEVEL_TOOL_ALIASES = new Set<string>([
    "/online-notepad",
    "/notepad",
    "/text-to-pdf",
    "/online-text-editor",
    "/png-to-webp",
    "/domain-age-checker",
    "/youtube-thumbnail-downloader",
    "/paste-to-image",
    "/clipboard-history",
    "/pomodoro",
  ]);
  if (cleanLocation.startsWith("/tools/") || TOP_LEVEL_TOOL_ALIASES.has(cleanLocation)) {
    return (
      <div style={{ background: "var(--layout-bg, #0A0C10)", minHeight: "100vh" }}>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ background: "#EDEAE4", color: "#4B5563" }}>
      <motion.header
        initial={{ y: 0, opacity: 1 }}
        animate={isToolsIndex ? {
          // Tools directory: always visible, always frosted — dark page from pixel 0
          y: 0,
          opacity: 1,
          backgroundColor: "rgba(10,12,16,0.88)",
          backdropFilter: "blur(16px)",
          borderBottomColor: "rgba(255,255,255,0.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
        } : {
          // Home page: transparent in hero, gains background on scroll.
          y: (isInHero || isVisible) && !isInProofSection ? 0 : -100,
          opacity: 1,
          backgroundColor: isInHero ? "rgba(0,0,0,0)" : "rgba(13,17,23,0.94)",
          backdropFilter: isInHero ? "none" : "blur(16px)",
          borderBottomColor: isInHero ? "rgba(0,0,0,0)" : "rgba(255,255,255,0.06)",
          boxShadow: isInHero ? "none" : "0 1px 0 rgba(255,255,255,0.04)",
        }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{ borderBottom: "1px solid transparent" }}
      >
        <div className="container mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-70 transition-opacity">
            <img
              src={headerLogoSrc}
              alt="Ankit Jaiswal"
              className="w-auto object-contain transition-opacity duration-300"
              style={{
                height: useHeroHeader ? 36 : 40,
                opacity: useHeroHeader ? 0.72 : 1,
              }}
              decoding="async"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <motion.div
                  key={item.href}
                  className="relative py-1 group"
                  whileHover="hover"
                  initial="rest"
                  animate={isActive ? "hover" : "rest"}
                >
                  {item.route ? (
                    <Link
                      href={item.href}
                      className="transition-colors duration-200 block"
                      data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        color: isActive ? "#2C2CF3" : (useHeroHeader ? "#6B7280" : "#A1AAB4"),
                        textDecoration: "none",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#2C2CF3"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = useHeroHeader ? "#6B7280" : "#A1AAB4"; }}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={!item.external ? (e) => { e.preventDefault(); navigateToHomeAnchor(location, item.href); } : undefined}
                      className="transition-colors duration-200 block"
                      data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        color: isActive ? "#2C2CF3" : (useHeroHeader ? "#6B7280" : "#A1AAB4"),
                        textDecoration: "none",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#2C2CF3"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = useHeroHeader ? "#6B7280" : "#A1AAB4"; }}
                    >
                      {item.name}
                    </a>
                  )}
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-1"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderBottom: "5px solid #2C2CF3",
                    }}
                    variants={{
                      rest: { opacity: 0, y: 4, scale: 0.5 },
                      hover: { opacity: 1, y: 0, scale: 1 },
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  />
                </motion.div>
              );
            })}

            <a href="#contact" onClick={(e) => { e.preventDefault(); navigateToHomeAnchor(location, "#contact"); }}>
              <button
                data-testid="nav-button-contact"
                className="btn-liquid"
                style={{ fontSize: "12px", padding: "7px 18px" }}
              >
                Work With Me
              </button>
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center justify-center gap-[5px] w-11 h-11 md:hidden relative z-[60]"
            aria-label="Toggle menu"
          >
            {(() => {
              const barColor = useHeroHeader ? "#0D1117" : "#F9FAFB";
              return (
                <>
                  <motion.span
                    animate={{ rotate: isMobileMenuOpen ? 45 : 0, y: isMobileMenuOpen ? 4 : 0, backgroundColor: barColor }}
                    transition={{ duration: 0.3 }}
                    className="block h-[2px] rounded-full"
                    style={{ width: 22 }}
                  />
                  <motion.span
                    animate={{ rotate: isMobileMenuOpen ? -45 : 0, y: isMobileMenuOpen ? -4 : 0, backgroundColor: barColor }}
                    transition={{ duration: 0.3 }}
                    className="block h-[2px] rounded-full"
                    style={{ width: 22 }}
                  />
                </>
              );
            })()}
          </button>
        </div>
      </motion.header>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-16 right-4 z-50 md:hidden"
            >
              <div
                className="rounded-xl overflow-hidden min-w-[180px]"
                style={{ background: "#F5F2EE", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)" }}
              >
                <nav className="flex flex-col py-2 px-2 gap-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const className = "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg text-[#4B5563] hover:text-[#0D1117] hover:bg-black/[0.03]";
                    const style = { fontFamily: "'Inter', sans-serif", textDecoration: "none" };
                    if (item.route) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={className}
                          style={style}
                        >
                          <Icon className="w-4 h-4 opacity-50" />
                          {item.name}
                        </Link>
                      );
                    }
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        onClick={!item.external ? (e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateToHomeAnchor(location, item.href); } : () => setIsMobileMenuOpen(false)}
                        className={className}
                        style={style}
                      >
                        <Icon className="w-4 h-4 opacity-50" />
                        {item.name}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1">
        {children}
      </main>

      <footer style={{ background: "radial-gradient(circle at 50% 120%, rgba(44, 44, 243, 0.16) 0%, #0D1117 80%)", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
        {/* Brand Conversion CTA Banner */}
        <div className="container mx-auto px-6 lg:px-10 pt-16 pb-12">
          <div 
            className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 border"
            style={{ 
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", 
              borderColor: "rgba(255, 255, 255, 0.06)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
            }}
          >
            <div className="max-w-2xl text-center md:text-left">
              <h3 
                className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-3"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Let's build something impossible to ignore.
              </h3>
              <p 
                className="text-sm md:text-base opacity-70"
                style={{ color: "#A1AAB4", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}
              >
                Have an ambition, challenge, or project in mind? Let's turn it into a high-performance digital reality.
              </p>
            </div>
            <a 
              href="#contact" 
              onClick={(e) => { e.preventDefault(); navigateToHomeAnchor(location, "#contact"); }}
              className="shrink-0"
            >
              <button
                className="btn-liquid font-medium text-sm px-7 py-3.5 tracking-wide"
                style={{ borderRadius: "8px" }}
              >
                Work With Me
              </button>
            </a>
          </div>
        </div>

        <div className="w-full h-px" style={{ background: "rgba(255, 255, 255, 0.04)" }} />

        {/* Footer Navigation Directory */}
        <div className="container mx-auto px-6 lg:px-10 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
            {/* About Column */}
            <div className="col-span-2 md:col-span-1">
              <img
                src="/images/ankitjaiswal-logo-light.png"
                alt="Ankit Jaiswal"
                className="h-9 w-auto object-contain mb-4 opacity-90"
                loading="lazy"
                decoding="async"
              />
              <p 
                className="text-[13px] mb-5" 
                style={{ color: "#8B949E", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}
              >
                Helping businesses become impossible to ignore in the age of AI search.
              </p>
              
              {/* Dynamic Live Timezone Clock */}
              <div 
                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-[12px] font-medium"
                style={{ 
                  background: "rgba(255, 255, 255, 0.02)", 
                  borderColor: "rgba(255, 255, 255, 0.06)",
                  color: "#C9D1D9"
                }}
                title="Punjab, IN Local Time (IST)"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono tabular-nums">{currentTime || "Loading..."}</span>
              </div>
            </div>

            {/* Explore Column */}
            <div>
              <h4
                style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  fontSize: "11px", 
                  letterSpacing: "0.14em", 
                  color: "#484F58", 
                  fontWeight: 600, 
                  textTransform: "uppercase", 
                  marginBottom: "16px" 
                }}
              >
                Explore
              </h4>
              <ul className="space-y-3">
                {[
                  { name: "About", href: "/about", route: true },
                  { name: "GEO Tools", href: "#tools" },
                  { name: "Results", href: "#results" }
                ].map((link) => (
                  <li key={link.name}>
                    {link.route ? (
                      <Link
                        href={link.href}
                        className="text-[13px] transition-all duration-[140ms]"
                        style={{ color: "#8B949E", textDecoration: "none" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(e) => { e.preventDefault(); navigateToHomeAnchor(location, link.href); }}
                        className="text-[13px] transition-all duration-[140ms]"
                        style={{ color: "#8B949E", textDecoration: "none" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional Tools Column */}
            <div>
              <h4
                style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  fontSize: "11px", 
                  letterSpacing: "0.14em", 
                  color: "#484F58", 
                  fontWeight: 600, 
                  textTransform: "uppercase", 
                  marginBottom: "16px" 
                }}
              >
                Tools Directory
              </h4>
              <ul className="space-y-3">
                {[
                  { name: "Online Notepad", href: "/online-notepad" },
                  { name: "WebP Converter", href: "/tools/webp-converter" },
                  { name: "Paste to Image", href: "/tools/paste-to-image" },
                  { name: "Clipboard History", href: "/tools/clipboard-history" },
                  { name: "Thumbnail Downloader", href: "/tools/yt-thumbnail-downloader" }
                ].map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[13px] transition-all duration-[140ms]"
                      style={{ color: "#8B949E", textDecoration: "none" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect Column */}
            <div>
              <h4
                style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  fontSize: "11px", 
                  letterSpacing: "0.14em", 
                  color: "#484F58", 
                  fontWeight: 600, 
                  textTransform: "uppercase", 
                  marginBottom: "16px" 
                }}
              >
                Connect
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:contact@ankitjaiswal.in"
                    className="text-[13px] transition-all duration-[140ms]"
                    style={{ color: "#8B949E", textDecoration: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                  >
                    Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/917808809043"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] transition-all duration-[140ms]"
                    style={{ color: "#8B949E", textDecoration: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/itsankitjaiswal/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] transition-all duration-[140ms]"
                    style={{ color: "#8B949E", textDecoration: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8B949E"; }}
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="w-full h-px" style={{ background: "rgba(255, 255, 255, 0.04)" }} />

        {/* Legal Bottom Bar */}
        <div className="container mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]" style={{ color: "#8B949E", fontFamily: "'Inter', sans-serif" }}>
          <span>© {new Date().getFullYear()} Ankit Jaiswal. All rights reserved.</span>
          <span className="opacity-70">Designed for ultimate client conversion.</span>
        </div>
      </footer>
    </div>
  );
}
