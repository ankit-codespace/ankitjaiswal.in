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
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  const upwardAccum = useRef(0);

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

  // On the /tools directory page the nav should always be opaque — the page is dark from the top
  // and the transparent-in-hero treatment causes the eyebrow label to bleed through the nav.
  const isToolsIndex = location === "/tools";

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
    "/youtube-summary",
  ]);
  if (location.startsWith("/tools/") || TOP_LEVEL_TOOL_ALIASES.has(location)) {
    return (
      <div style={{ background: "#0A0C10", minHeight: "100vh" }}>
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
          // Keep the brand/navigation legible over the pale hero and interior pages.
          y: (isInHero || isVisible) && !isInProofSection ? 0 : -100,
          opacity: 1,
          backgroundColor: "rgba(13,17,23,0.94)",
          backdropFilter: "blur(16px)",
          borderBottomColor: "rgba(255,255,255,0.06)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
        }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{ borderBottom: "1px solid transparent" }}
      >
        <div className="container mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-70 transition-opacity">
            <img
              src="/images/ankitjaiswal-logo.png"
              alt="Ankit Jaiswal"
              className="h-10 w-auto object-contain"
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
                        color: "#F9FAFB",
                        textDecoration: "none",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#F9FAFB"; }}
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
                        color: "#F9FAFB",
                        textDecoration: "none",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#F9FAFB"; }}
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
              const barColor = "#F9FAFB";
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

      <footer style={{ background: "#0D1117", borderTop: "none" }}>
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img
                src="/images/ankitjaiswal-logo.png"
                alt="Ankit Jaiswal"
                className="h-10 w-auto object-contain mb-4 opacity-80"
                loading="lazy"
                decoding="async"
              />
              <p className="text-sm max-w-xs" style={{ color: "#6B7280", lineHeight: 1.65, fontFamily: "'Inter', sans-serif" }}>
                Helping businesses become impossible to ignore in the age of AI search.
              </p>
            </div>
            <div>
              <h4
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", letterSpacing: "0.16em", color: "#4B5563", fontWeight: 600, textTransform: "uppercase", marginBottom: "16px" }}
              >Connect</h4>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:contact@ankitjaiswal.in"
                  className="flex items-center gap-2 text-sm transition-all duration-200 break-all"
                  style={{ color: "#6B7280", fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F9FAFB"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
                >
                  <Mail className="h-4 w-4 shrink-0" /> contact@ankitjaiswal.in
                </a>
                <a
                  href="https://wa.me/917808809043"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-all duration-200"
                  style={{ color: "#6B7280", fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F9FAFB"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
                >
                  <Phone className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
            <div>
              <h4
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", letterSpacing: "0.16em", color: "#4B5563", fontWeight: 600, textTransform: "uppercase", marginBottom: "16px" }}
              >Legal</h4>
              <div className="text-sm space-y-2" style={{ color: "#6B7280", lineHeight: 1.65, fontFamily: "'Inter', sans-serif" }}>
                <p>© {new Date().getFullYear()} Ankit Jaiswal.</p>
                <p>All tools run locally in your browser.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
