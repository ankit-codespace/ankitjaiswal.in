import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Trash2, Youtube, ArrowDownToLine, ChevronRight, X, ExternalLink } from "lucide-react";
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
    techDetails: "Competitors rely on expensive third-party APIs and force users to switch tabs. RecapYT is engineered with a frictionless native UI that uses an ultra-fast, highly-optimized AI architecture to process transcripts instantly without leaving the video player."
  },
  {
    id: "cloudflare-purger",
    title: "Cloudflare Edge Purger",
    tagline: "Instant cache invalidation directly from WordPress admin.",
    icon: Server,
    downloadLink: "/cloudflare-cache.zip",
    color: "#F59E0B", // Amber
    features: [
      "Hooks into WordPress save_post for automated purging",
      "Provides a secure, password-protected remote purge URL",
      "Maintains a complete audit log of all purge requests",
      "Zero-configuration setup for content teams"
    ],
    techDetails: "Edge caching creates a massive pain point for content creators who need instant updates. This plugin hits the Cloudflare API directly to drop the edge cache the millisecond a post is updated, giving you the speed of the edge with the agility of dynamic hosting."
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
    techDetails: "Most sites leak SEO authority by returning 404 Not Found for deleted pages. A 410 Gone header acts as a definitive signal to Google to drop the URL from the index immediately. This tool automates the process by watching for wp_trash_post events."
  }
];

export function OpenSourceAssets() {
  const [activeTool, setActiveTool] = useState<ToolInfo | null>(null);

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#050810" }}>
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
                      style={{ background: "#EDEAE4", color: "#050810" }}
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
                      style={{ background: "#EDEAE4", color: "#050810" }}
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

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {activeTool && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTool(null)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(5, 8, 16, 0.4)", backdropFilter: "blur(8px)" }}
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 shadow-2xl overflow-y-auto"
              style={{ 
                background: "rgba(10, 14, 23, 0.7)", 
                backdropFilter: "blur(20px)", 
                borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.5)"
              }}
            >
              {/* Glow backdrop effect */}
              <div 
                className="absolute pointer-events-none opacity-20 filter blur-[80px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${activeTool.color} 0%, transparent 70%)`,
                  width: "350px",
                  height: "350px",
                  top: "-100px",
                  right: "-100px",
                  zIndex: 0
                }}
              />

              <div className="p-8 relative z-10 flex flex-col min-h-full">
                <button 
                  onClick={() => setActiveTool(null)}
                  className="absolute top-6 right-6 p-2 rounded-full transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#EDEAE4" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
                    (e.currentTarget as HTMLElement).style.transform = "rotate(90deg)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.transform = "rotate(0deg)";
                  }}
                >
                  <X size={20} />
                </button>

                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 mt-4 transition-transform duration-300"
                  style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.08)` }}
                >
                  {activeTool.logoUrl ? (
                    <img src={activeTool.logoUrl} alt={activeTool.title} className="w-9 h-9 object-contain" />
                  ) : (
                    <activeTool.icon style={{ color: activeTool.color, width: "32px", height: "32px" }} />
                  )}
                </div>

                <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "2rem", color: "#EDEAE4", lineHeight: 1.1, letterSpacing: "-0.02em" }} className="mb-4">
                  {activeTool.title}
                </h2>
                
                <p style={{ color: "rgba(237,234,228,0.6)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6, fontSize: "16px" }} className="mb-8">
                  {activeTool.tagline}
                </p>

                <div className="mb-10">
                  <h4 className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    The Engineering
                  </h4>
                  <p style={{ color: "rgba(237,234,228,0.85)", fontFamily: "'Inter', sans-serif", lineHeight: 1.7, fontSize: "15px" }}>
                    {activeTool.techDetails}
                  </p>
                </div>

                <div className="mb-12 flex-grow">
                  <h4 className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Capabilities
                  </h4>
                  <ul className="space-y-4">
                    {activeTool.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="shrink-0 mt-1" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="8" cy="8" r="8" fill={`${activeTool.color}20`} />
                          <path d="M5 8L7 10L11 6" stroke={activeTool.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ color: "rgba(237,234,228,0.75)", fontSize: "15px", lineHeight: 1.5 }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.a 
                  href={activeTool.downloadLink}
                  download={activeTool.id !== "recapyt"}
                  target={activeTool.id === "recapyt" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-4 text-base font-bold transition-all cursor-pointer shadow-lg mt-auto"
                  style={{ 
                    background: "#EDEAE4", 
                    color: "#050810",
                    boxShadow: `0 4px 20px ${activeTool.color}15`
                  }}
                >
                  {activeTool.id === "recapyt" ? <ExternalLink size={20} /> : <ArrowDownToLine size={20} />}
                  <span>{activeTool.id === "recapyt" ? "Visit Website" : "Download Free"}</span>
                </motion.a>
              </div>
            </motion.div>
          </>
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
