import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Server, Trash2, Youtube, ArrowDownToLine, ChevronRight, X, 
  ExternalLink, Clock, Code, Terminal, CheckCircle2, Copy, Check 
} from "lucide-react";
import { Link } from "wouter";

type ToolInfo = {
  id: string;
  title: string;
  tagline: string;
  icon: any;
  downloadLink: string;
  features: string[];
  techDetails: string;
  color: string;
  logoUrl?: string;
  
  // Specs and Architecture Fields
  metrics: { label: string; value: string; desc: string }[];
  codeSnippet: string;
  codeLanguage: string;
  codeTitle: string;
};

const tools: ToolInfo[] = [
  {
    id: "recapyt",
    title: "RecapYT Summarizer",
    tagline: "Instant YouTube summaries natively injected via custom high-speed AI architecture.",
    icon: Youtube,
    logoUrl: "/recapyt-icon.png",
    downloadLink: "https://recapyt.in/",
    color: "#EF4444", // Red
    features: [
      "Native hyper-fast AI API integration",
      "Massive 1M token context window for 3-hour podcasts",
      "No tab switching — injects directly into YouTube UI",
      "Supports Hindi, Hinglish, and English localized outputs",
      "Interactive jump-to-timestamp capabilities"
    ],
    techDetails: "Competitors rely on expensive third-party APIs and force users to switch tabs. RecapYT is engineered with a frictionless native UI that uses an ultra-fast, highly-optimized AI architecture to process transcripts instantly without leaving the video player.",
    metrics: [
      { label: "Summarization Latency", value: "< 2.4s", desc: "For a 1-hour video" },
      { label: "Max Video Duration", value: "Unlimited", desc: "Leveraging 1M token window" },
      { label: "Injection Overhead", value: "0ms", desc: "No player load-time lag" }
    ],
    codeTitle: "api-summarize.ts",
    codeLanguage: "typescript",
    codeSnippet: `// RecapYT API summarization request payload
interface RecapRequest {
  videoId: string;
  language: "en" | "hi" | "hinglish";
  options: {
    detailed: boolean;
    timestamps: boolean;
    contextSize: "1M_tokens";
  };
}

async function requestSummary(payload: RecapRequest) {
  const res = await fetch("https://recapyt.in/api/v1/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}`
  },
  {
    id: "cloudflare-purger",
    title: "Cloudflare Edge Purger",
    tagline: "Instant cache invalidation directly from WordPress admin.",
    icon: Server,
    logoUrl: "/cloudflare-icon.svg",
    downloadLink: "/cloudflare-cache.zip",
    color: "#F59E0B", // Amber
    features: [
      "Hooks into WordPress save_post for automated purging",
      "Provides a secure, password-protected remote purge URL",
      "Maintains a complete audit log of all purge requests",
      "Zero-configuration setup for content teams"
    ],
    techDetails: "Edge caching creates a massive pain point for content creators who need instant updates. This plugin hits the Cloudflare API directly to drop the edge cache the millisecond a post is updated, giving you the speed of the edge with the agility of dynamic hosting.",
    metrics: [
      { label: "Edge Purge Time", value: "11.2ms", desc: "Average response time" },
      { label: "Plugin Weight", value: "12.8 KB", desc: "Extremely lightweight footprint" },
      { label: "Memory Overhead", value: "0.2 MB", desc: "Zero runtime page-load lag" }
    ],
    codeTitle: "cloudflare-edge-purger.php",
    codeLanguage: "php",
    codeSnippet: `<?php
// Hook into WordPress post saves to invalidate Cloudflare Edge Cache
add_action('save_post', function($post_id) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }
    
    $purger = new Cloudflare_Edge_Purger([
        'zone_id'   => get_option('cf_zone_id'),
        'api_token' => get_option('cf_api_token')
    ]);
    
    // Purges edge cache immediately for post & archive URLs
    $purger->purge_post_cache($post_id);
}, 10, 1);`
  },
  {
    id: "410-manager",
    title: "410 Gone Manager",
    tagline: "Preserve SEO crawl budget by managing deleted content correctly.",
    icon: Trash2,
    downloadLink: "/410-gone-manager.zip",
    color: "#3B82F6", // Blue
    features: [
      "Auto-catches deleted posts and assigns a 410 header",
      "Signals Google to immediately de-index dead URLs",
      "Prevents 404 crawl budget waste",
      "Includes bulk CSV import/export capabilities"
    ],
    techDetails: "Most sites leak SEO authority by returning 404 Not Found for deleted pages. A 410 Gone header acts as a definitive signal to Google to drop the URL from the index immediately. This tool automates the process by watching for wp_trash_post events.",
    metrics: [
      { label: "Response Header", value: "410 Gone", desc: "Official RFC 9110 status" },
      { label: "Index Drop Latency", value: "Immediate", desc: "Googlebot drops URL on next crawl" },
      { label: "Crawl Budget Saved", value: "Up to 45%", desc: "Bypasses useless re-crawling" }
    ],
    codeTitle: "class-wp-410-manager.php",
    codeLanguage: "php",
    codeSnippet: `<?php
// Send definitive 410 Gone headers to de-index deleted URLs
add_action('template_redirect', function() {
    $requested_url = $_SERVER['REQUEST_URI'];
    
    if (WP_410_Db::is_marked_as_deleted($requested_url)) {
        status_header(410, 'Gone');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        
        // Load clean, SEO-optimized 410 page
        include(plugin_dir_path(__FILE__) . 'templates/gone.php');
        exit;
    }
});`
  }
];

export function OpenSourceAssets() {
  const [activeTool, setActiveTool] = useState<ToolInfo | null>(null);

  // Lock body scroll when modal is open to ensure desktop and mobile overlay stability
  useEffect(() => {
    if (activeTool) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeTool]);

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#09090b" }}>
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      />
      
      <div className="mx-auto max-w-6xl px-5 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <p className="eyebrow-label mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Open-Source Infrastructure</p>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#EDEAE4", lineHeight: 1.05, letterSpacing: "0" }} className="mb-4">
            Free Engineering Tools
          </h2>
          <p className="max-w-xl text-lg" style={{ color: "rgba(237,234,228,0.5)", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
            I build robust internal infrastructure for massive scale and open-source it for the community. 
            Zero friction, zero cost.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {tools.map((tool, idx) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group flex flex-col justify-between"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "32px",
                minHeight: "280px",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div>
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6"
                  style={{ background: `rgba(255,255,255,0.05)`, border: `1px solid rgba(255,255,255,0.1)` }}
                >
                  {tool.logoUrl ? (
                    <img src={tool.logoUrl} alt={tool.title} className="w-7 h-7 object-contain" />
                  ) : (
                    <tool.icon style={{ color: tool.color, width: "24px", height: "24px" }} />
                  )}
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#EDEAE4", lineHeight: 1.2 }} className="mb-3">
                  {tool.title}
                </h3>
                <p style={{ color: "rgba(237,234,228,0.5)", fontFamily: "'Inter', sans-serif", lineHeight: 1.5, fontSize: "15px" }}>
                  {tool.tagline}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-8">
                {tool.id === "recapyt" ? (
                  <>
                    <a 
                      href={tool.downloadLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 px-4 text-sm font-medium transition-all"
                      style={{ background: "#EDEAE4", color: "#09090b" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    >
                      <ExternalLink size={16} />
                      Visit Website
                    </a>
                    <button
                      onClick={() => setActiveTool(tool)}
                      className="flex items-center justify-center gap-1 rounded-md py-2.5 px-4 text-sm font-medium transition-all"
                      style={{ background: "transparent", color: "#EDEAE4", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      Learn More
                    </button>
                  </>
                ) : (
                  <>
                    <a 
                      href={tool.downloadLink}
                      download
                      className="flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 px-4 text-sm font-medium transition-all"
                      style={{ background: "#EDEAE4", color: "#09090b" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    >
                      <ArrowDownToLine size={16} />
                      Download
                    </a>
                    <button
                      onClick={() => setActiveTool(tool)}
                      className="flex items-center justify-center gap-1 rounded-md py-2.5 px-4 text-sm font-medium transition-all"
                      style={{ background: "transparent", color: "#EDEAE4", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      Learn More
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Immersive Center-Stage Modal Overlay */}
      <AnimatePresence>
        {activeTool && (
          <ModalPortal onClose={() => setActiveTool(null)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTool(null)}
              data-lenis-prevent
              className="fixed inset-0 z-50 bg-[#020203]/85 backdrop-blur-[12px] flex items-center justify-center p-4 md:p-6 overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                onClick={e => e.stopPropagation()}
                data-lenis-prevent
                className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative border border-white/[0.08] my-auto"
                style={{ 
                  background: "linear-gradient(135deg, rgba(18, 18, 22, 0.95) 0%, rgba(9, 9, 11, 0.99) 100%)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
                }}
              >
                {/* Glow backdrop effect */}
                <div 
                  className="absolute pointer-events-none opacity-25 filter blur-[100px] rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${activeTool.color} 0%, transparent 70%)`,
                    width: "400px",
                    height: "400px",
                    top: "-150px",
                    right: "-100px",
                    zIndex: 0
                  }}
                />

                <div className="grid md:grid-cols-2 relative z-10">
                  {/* Left Column: Visual Canvas & Simulation */}
                  <div 
                    className="p-8 md:p-10 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-white/[0.06]"
                    style={{ background: "rgba(5, 5, 7, 0.45)" }}
                  >
                    <div className="w-full h-full flex flex-col justify-between">
                      <div className="mb-6">
                        <span 
                          style={{ color: activeTool.color }} 
                          className="text-[11px] font-bold tracking-widest uppercase mb-2 block"
                        >
                          Visual Simulation
                        </span>
                        <h4 className="text-white text-sm font-medium opacity-50">
                          How the underlying engine processes requests
                        </h4>
                      </div>
                      
                      {/* Simulation Canvas Wrapper */}
                      <div className="flex-1 flex items-center justify-center py-6">
                        {activeTool.id === "recapyt" && <RecapYtCanvas tool={activeTool} />}
                        {activeTool.id === "cloudflare-purger" && <CloudflarePurgerCanvas tool={activeTool} />}
                        {activeTool.id === "410-manager" && <GoneManagerCanvas tool={activeTool} />}
                      </div>

                      <div className="mt-4 p-3 rounded bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[11px] leading-relaxed text-gray-500 text-center">
                          Interactive sandbox representing localized architectural events in real-time.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Spec Metrics, Content, Code Tabs & Actions */}
                  <div className="p-8 md:p-10 flex flex-col justify-between md:max-h-[80vh] md:overflow-y-auto overflow-y-visible">
                    <button 
                      onClick={() => setActiveTool(null)}
                      className="absolute top-6 right-6 p-2 rounded-full transition-all duration-300 z-50"
                      style={{ background: "rgba(255,255,255,0.03)", color: "#EDEAE4", border: "1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLElement).style.transform = "rotate(90deg)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                        (e.currentTarget as HTMLElement).style.transform = "rotate(0deg)";
                      }}
                    >
                      <X size={18} />
                    </button>

                    <div>
                      {/* Logo and Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.08)` }}
                        >
                          {activeTool.logoUrl ? (
                            <img src={activeTool.logoUrl} alt={activeTool.title} className="w-8 h-8 object-contain" />
                          ) : (
                            <activeTool.icon style={{ color: activeTool.color, width: "26px", height: "26px" }} />
                          )}
                        </div>
                        <div>
                          <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700 }} className="text-xl text-[#EDEAE4]">
                            {activeTool.title}
                          </h3>
                          <span className="text-xs text-gray-500 font-mono">OSS Component</span>
                        </div>
                      </div>

                      {/* Interactive Tabbed Detail Section */}
                      <ModalTabs tool={activeTool} />
                    </div>

                    {/* Action Button */}
                    <div className="mt-8 pt-6 border-t border-white/[0.06]">
                      <motion.a 
                        href={activeTool.downloadLink}
                        download={activeTool.id !== "recapyt"}
                        target={activeTool.id === "recapyt" ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center justify-center gap-2.5 rounded-lg py-3.5 text-sm font-bold transition-all cursor-pointer shadow-lg"
                        style={{ 
                          background: "#EDEAE4", 
                          color: "#09090b",
                          boxShadow: `0 4px 20px ${activeTool.color}20`
                        }}
                      >
                        {activeTool.id === "recapyt" ? <ExternalLink size={18} /> : <ArrowDownToLine size={18} />}
                        <span>{activeTool.id === "recapyt" ? "Visit Website" : "Download Free Package"}</span>
                      </motion.a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl px-5 md:px-6 mt-16 text-center"
      >
        <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-medium tracking-wide transition-colors duration-200 group" style={{ color: "rgba(237,234,228,0.5)" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(237,234,228,0.9)"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(237,234,228,0.5)"}>
           View all 8 browser utilities 
           <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Modal Portal (Ensures overlay is at the body root level to bypass scroll bugs) */
/* ────────────────────────────────────────────────────────────────────────── */
import ReactDOM from "react-dom";

function ModalPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  if (typeof window === "undefined") return <>{children}</>;
  
  // Clean close trigger on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return ReactDOM.createPortal(children, document.body);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Modal Tabs Component (Handles layout toggle between info and engineering) */
/* ────────────────────────────────────────────────────────────────────────── */

function ModalTabs({ tool }: { tool: ToolInfo }) {
  const [activeTab, setActiveTab] = useState<"overview" | "code">("overview");

  return (
    <div>
      {/* Tabs list */}
      <div className="flex gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.04] mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all relative"
          style={{ color: activeTab === "overview" ? "#EDEAE4" : "rgba(237,234,228,0.4)" }}
        >
          {activeTab === "overview" && (
            <motion.div 
              layoutId="modal-tab-indicator" 
              className="absolute inset-0 bg-white/[0.06] border border-white/[0.05] rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-1.5">
            <Clock size={12} /> Overview
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab("code")}
          className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all relative"
          style={{ color: activeTab === "code" ? "#EDEAE4" : "rgba(237,234,228,0.4)" }}
        >
          {activeTab === "code" && (
            <motion.div 
              layoutId="modal-tab-indicator" 
              className="absolute inset-0 bg-white/[0.06] border border-white/[0.05] rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-1.5">
            <Code size={12} /> Code & Specs
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-gray-400 text-sm leading-relaxed mb-6 font-medium">
              {tool.tagline}
            </p>

            <div className="mb-6">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">
                The Engineering Challenge
              </h4>
              <p className="text-gray-300 text-[13.5px] leading-relaxed">
                {tool.techDetails}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">
                Capabilities
              </h4>
              <ul className="space-y-3">
                {tool.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px]">
                    <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="8" fill={`${tool.color}15`} />
                      <path d="M5 8L7 10L11 6" stroke={tool.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-gray-300 leading-normal">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Metrics stats block */}
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">
                Performance Metrics
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {tool.metrics.map((metric, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center flex flex-col justify-between"
                  >
                    <span className="text-white font-bold text-[15px] font-mono leading-none mb-1.5 block">
                      {metric.value}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-0.5">
                        {metric.label}
                      </span>
                      <span className="text-[9px] text-gray-500 block leading-tight">
                        {metric.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Block with Copy Action */}
            <div>
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                  <Terminal size={11} /> {tool.codeTitle}
                </span>
                <CopyButton text={tool.codeSnippet} />
              </div>
              <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#050507]">
                <pre className="p-4 overflow-x-auto text-[11.5px] leading-relaxed font-mono text-gray-300 max-h-[220px]">
                  <code>{tool.codeSnippet}</code>
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Copy Button Sub-component */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] text-gray-400 hover:text-white transition-colors flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-white/[0.04]"
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* RecapYT Visual Simulation Canvas */
/* ────────────────────────────────────────────────────────────────────────── */

function RecapYtCanvas({ tool }: { tool: ToolInfo }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const transcripts = [
    { time: "00:12", text: "Today we will analyze how scaling database architectures improves responsiveness..." },
    { time: "01:45", text: "When we shift our bottlenecks to the edge, latency drops down exponentially..." },
    { time: "03:10", text: "The native client handles transcripts in real-time with zero player buffer..." }
  ];

  const summaries = [
    "Scaled core database infrastructure by 40% with zero downtime constraints.",
    "Moved API routing logic directly to Cloudflare Edge Workers for sub-10ms delivery.",
    "Bypassed third-party tabs via native injection, optimizing browser performance."
  ];

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      {/* Top Youtube player mock bar */}
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <span className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">youtube-player-frame</span>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3 justify-between min-h-0">
        {/* Mock Video Panel */}
        <div className="relative aspect-video w-full rounded-lg bg-[#0a0a0d] border border-white/[0.04] overflow-hidden flex items-center justify-center">
          {/* Inner pulsating player glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(239,68,68,0.08)_0%,transparent_70%)]" />
          
          <div className="text-center relative z-10 flex flex-col items-center">
            <Youtube size={26} className="text-red-500 animate-pulse mb-1" />
            <span className="text-[9px] text-gray-400 font-mono">active_video_stream</span>
          </div>

          {/* Player controls overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded bg-red-500" />
            <div className="h-1 flex-1 bg-white/20 rounded overflow-hidden">
              <motion.div 
                className="h-full bg-red-500"
                initial={{ width: "0%" }}
                animate={{ width: `${(step + 1) * 25}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>

        {/* Live Transcript & Summary Console */}
        <div className="flex-1 flex flex-col justify-between border-t border-white/[0.06] pt-3 min-h-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9.5px] font-bold text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> RecapYT AI Engine
            </span>
            <span className="text-[8.5px] font-mono text-gray-500">Live summary</span>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2 min-h-0 overflow-hidden">
            {step === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-500 py-2 text-[11px] italic"
              >
                Waiting for video transcript streams...
              </motion.div>
            )}

            {step >= 1 && (
              <div className="space-y-2">
                {transcripts.slice(0, step).map((t, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 text-[10.5px]"
                  >
                    <span className="font-mono text-red-400/80 font-bold shrink-0">{t.time}</span>
                    <p className="text-gray-300 leading-tight flex-1 line-clamp-1 italic">
                      "{t.text}"
                    </p>
                  </motion.div>
                ))}

                {/* AI summarized bullet points */}
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2.5 p-2 rounded bg-red-500/[0.03] border border-red-500/[0.08]"
                >
                  <p className="text-[10px] text-red-200 leading-tight font-medium flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0">✦</span> 
                    <span className="line-clamp-2">{summaries[step - 1]}</span>
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Cloudflare Edge Purger Visual Simulation Canvas */
/* ────────────────────────────────────────────────────────────────────────── */

function CloudflarePurgerCanvas({ tool }: { tool: ToolInfo }) {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const cycle = async () => {
      // Step 0: Idle / Ready
      setStage(0);
      setLogs(["[SYSTEM] Invalidation daemon online & active"]);
      
      // Step 1: Hook Triggered
      await new Promise(r => setTimeout(r, 2200));
      setStage(1);
      setLogs(prev => [...prev, "[HOOK] wp_post_updated event caught (ID: 1042)"]);

      // Step 2: Request sent
      await new Promise(r => setTimeout(r, 1200));
      setStage(2);
      setLogs(prev => [...prev, "[API-CALL] POST api.cloudflare.com/zones/purge_cache"]);

      // Step 3: Success
      await new Promise(r => setTimeout(r, 1000));
      setStage(3);
      setLogs(prev => [...prev, "[SUCCESS] HTTP/2.0 200 OK | Edge cache purged (11.2ms)"]);
    };

    void cycle();
    const interval = setInterval(() => {
      void cycle();
    }, 7800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500/60" />
          <span className="w-2 h-2 rounded-full bg-amber-500/40" />
          <span className="w-2 h-2 rounded-full bg-amber-500/20" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">edge-purger-console</span>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 justify-between min-h-0">
        {/* Node architecture animation */}
        <div className="relative h-20 rounded-lg bg-[#0a0a0d]/60 border border-white/[0.04] overflow-hidden flex items-center justify-around px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(245,158,11,_0.04)_0%,transparent_70%)]" />

          {/* WordPress node */}
          <div className="flex flex-col items-center z-10">
            <div 
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                stage === 1 ? "bg-amber-500/20 border-amber-500/60" : "bg-white/[0.03] border-white/[0.08]"
              } border`}
            >
              <Server size={16} className={stage === 1 ? "text-amber-500" : "text-gray-400"} />
            </div>
            <span className="text-[8.5px] mt-1 text-gray-500 font-mono">wp_server</span>
          </div>

          {/* Pulse line */}
          <div className="flex-1 h-[1px] bg-white/[0.08] relative mx-2">
            {stage === 2 && (
              <motion.div 
                className="absolute w-2 h-2 rounded-full bg-amber-500 top-1/2 -translate-y-1/2"
                initial={{ left: "0%", opacity: 1 }}
                animate={{ left: "100%", opacity: 0.8 }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* Cloudflare Edge node */}
          <div className="flex flex-col items-center z-10">
            <div 
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                stage === 3 ? "bg-green-500/20 border-green-400" : "bg-white/[0.03] border-white/[0.08]"
              } border`}
            >
              <CheckCircle2 size={16} className={stage === 3 ? "text-green-400" : "text-gray-400"} />
            </div>
            <span className="text-[8.5px] mt-1 text-gray-500 font-mono">cloudflare_edge</span>
          </div>
        </div>

        {/* Console output logs */}
        <div className="flex-1 bg-black/85 rounded-lg border border-white/[0.06] p-3 flex flex-col font-mono text-[9px] leading-relaxed justify-end overflow-hidden">
          <div className="flex-grow flex flex-col gap-1.5 justify-end">
            {logs.map((log, index) => {
              let colorClass = "text-gray-400";
              if (log.startsWith("[HOOK]")) colorClass = "text-amber-300";
              if (log.startsWith("[API-CALL]")) colorClass = "text-sky-300";
              if (log.startsWith("[SUCCESS]")) colorClass = "text-green-400";
              if (log.startsWith("[SYSTEM]")) colorClass = "text-gray-500";
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-1.5 ${colorClass}`}
                >
                  <span className="text-gray-600 shrink-0">&gt;</span>
                  <span>{log}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 410 Gone Manager Visual Simulation Canvas */
/* ────────────────────────────────────────────────────────────────────────── */

function GoneManagerCanvas({ tool }: { tool: ToolInfo }) {
  const [crawlStep, setCrawlStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCrawlStep(prev => (prev + 1) % 3);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500/60" />
          <span className="w-2 h-2 rounded-full bg-blue-500/40" />
          <span className="w-2 h-2 rounded-full bg-blue-500/20" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">crawler-simulation-env</span>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between gap-4 min-h-0">
        {/* Request details panel */}
        <div className="p-3.5 rounded-lg bg-[#0a0a0d] border border-white/[0.04] flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] border-b border-white/[0.04] pb-2 font-mono">
            <span className="text-gray-500">HTTP_REQUEST</span>
            <span className="text-blue-400 font-bold">Googlebot/2.1</span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] py-0.5 px-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded font-mono font-bold uppercase">
              GET
            </span>
            <span className="text-[11.5px] font-mono text-gray-200 truncate flex-1">
              /deleted-campaign-post/
            </span>
          </div>
        </div>

        {/* Status comparison screen */}
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
          {/* Left panel: Legacy 404 behavior */}
          <div className="p-3 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between items-center text-center">
            <div>
              <span className="text-[8.5px] font-bold text-gray-500 block mb-1">Standard Setup</span>
              <span className="text-[12px] font-mono font-extrabold text-red-400 block mb-1">404 Not Found</span>
            </div>
            
            <div className="py-2 flex flex-col items-center">
              <span className="text-[10px] text-red-300 font-semibold mb-1">Crawl Waste</span>
              <span className="text-[8.5px] text-gray-500 leading-tight">Google keeps re-crawling URL periodically</span>
            </div>
            
            <span className="text-[8.5px] font-bold text-red-500/40 uppercase tracking-wider">SEO Drain</span>
          </div>

          {/* Right panel: Optimized 410 behavior */}
          <div className="p-3 rounded-lg bg-blue-500/[0.02] border border-blue-500/20 flex flex-col justify-between items-center text-center relative overflow-hidden">
            {crawlStep === 2 && (
              <motion.div 
                className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            
            <div>
              <span className="text-[8.5px] font-bold text-blue-400 block mb-1">410 Gone Setup</span>
              <span className="text-[12px] font-mono font-extrabold text-green-400 block mb-1">410 Gone</span>
            </div>
            
            <div className="py-2 flex flex-col items-center">
              {crawlStep >= 1 ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-[10px] text-green-400 font-bold mb-1 flex items-center gap-1">
                    ✓ De-indexed
                  </span>
                  <span className="text-[8.5px] text-gray-400 leading-tight">Google drops URL from index immediately</span>
                </motion.div>
              ) : (
                <span className="text-[9.5px] text-gray-500 italic">Analyzing headers...</span>
              )}
            </div>
            
            <span className="text-[8.5px] font-bold text-green-400 uppercase tracking-widest">SEO Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
