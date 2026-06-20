import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Server, Trash2, Youtube, ArrowDownToLine, ChevronRight, X, 
  ExternalLink, Clock, Code, Terminal, CheckCircle2, Copy, Check,
  FileText, Timer, Clipboard, Camera, Image as ImageIcon, Globe,
  Play, RefreshCw
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

interface UtilityTool {
  name: string;
  desc: string;
  href: string;
  icon: any;
  color: string;
}

const utilityTools: UtilityTool[] = [
  {
    name: "Online Notepad",
    desc: "A distraction-free writing surface with auto-save, multi-document tabs, and TXT/MD/PDF export.",
    href: "/online-notepad",
    icon: FileText,
    color: "#10B981"
  },
  {
    name: "Pomodoro Timer",
    desc: "A clean Pomodoro timer with study intervals, sound alarms, and focus state tracking.",
    href: "/tools/pomodoro",
    icon: Timer,
    color: "#EF4444"
  },
  {
    name: "Clipboard History",
    desc: "Browser-based clipboard manager. Pin, search, and copy text snippets securely.",
    href: "/tools/clipboard-history",
    icon: Clipboard,
    color: "#EC4899"
  },
  {
    name: "Paste to Image",
    desc: "Turn clipboard screenshots into files. Add arrows, crop, blur sensitive info, and download.",
    href: "/tools/paste-to-image",
    icon: Camera,
    color: "#3B82F6"
  },
  {
    name: "WebP Converter",
    desc: "Convert PNG and JPG images to high-compression WebP files locally in your browser.",
    href: "/tools/webp-converter",
    icon: ImageIcon,
    color: "#8B5CF6"
  },
  {
    name: "Domain Age Checker",
    desc: "WHOIS lookup tool showing registration date, domain age, registrar, and nameservers.",
    href: "/tools/domain-age-checker",
    icon: Globe,
    color: "#06B6D4"
  },
  {
    name: "YouTube Thumbnail Downloader",
    desc: "Paste video links to view and save high-resolution (HD 1280x720) thumbnail images.",
    href: "/tools/yt-thumbnail-downloader",
    icon: Youtube,
    color: "#EF4444"
  }
];

export function OpenSourceAssets() {
  const [activeToolId, setActiveToolId] = useState<string>("recapyt");
  const [activeTab, setActiveTab] = useState<"demo" | "specs">("demo");
  const [showUtilities, setShowUtilities] = useState<boolean>(false);

  const activeTool = tools.find(t => t.id === activeToolId) || tools[0];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden border-t border-white/[0.04]" style={{ background: "#09090b" }}>
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]" 
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

        {/* Dynamic Split-Pane Interactive Showcase */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Selector */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase block mb-1">
              Select Component
            </span>
            {tools.map((tool) => {
              const isActive = activeToolId === tool.id;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    setActiveToolId(tool.id);
                  }}
                  className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isActive 
                      ? "border-white/[0.12] bg-white/[0.05]" 
                      : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]"
                  }`}
                >
                  {/* Glowing left edge on active selector */}
                  {isActive && (
                    <div 
                      className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
                      style={{ background: tool.color }}
                    />
                  )}

                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ 
                        background: isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", 
                        border: "1px solid rgba(255,255,255,0.06)" 
                      }}
                    >
                      {tool.logoUrl ? (
                        <img src={tool.logoUrl} alt={tool.title} className="w-6 h-6 object-contain" />
                      ) : (
                        <tool.icon style={{ color: tool.color, width: "20px", height: "20px" }} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white text-[15px] font-bold font-display group-hover:text-white transition-colors">
                          {tool.title}
                        </h4>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                          {tool.id === "recapyt" ? "SAAS App" : "WP Plugin"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs leading-normal mt-1.5 line-clamp-2">
                        {tool.tagline}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Immersive Control Stage */}
          <div className="lg:col-span-7">
            <div 
              className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl relative"
              style={{
                background: "linear-gradient(135deg, rgba(18, 18, 22, 0.95) 0%, rgba(9, 9, 11, 0.99) 100%)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)"
              }}
            >
              {/* Dynamic Glow Spotlight */}
              <div 
                className="absolute pointer-events-none opacity-15 filter blur-[80px] rounded-full transition-all duration-500"
                style={{
                  background: `radial-gradient(circle, ${activeTool.color} 0%, transparent 70%)`,
                  width: "350px",
                  height: "350px",
                  top: "-150px",
                  right: "-50px",
                  zIndex: 0
                }}
              />

              {/* Mock Browser Title Bar */}
              <div className="h-10 bg-white/[0.02] border-b border-white/[0.06] px-4 flex items-center justify-between relative z-10">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <div className="px-3 py-1 rounded bg-black/30 border border-white/[0.04] text-[10px] font-mono text-gray-500 min-w-[200px] text-center">
                  {activeTool.id === "recapyt" ? "https://recapyt.in/dashboard" : `wp-admin/plugins.php?plugin=${activeTool.id}`}
                </div>
                <div className="w-12" /> {/* spacer */}
              </div>

              {/* Stage Sub-header Segment Selector */}
              <div className="flex border-b border-white/[0.06] bg-black/20 p-1 relative z-10">
                <button
                  onClick={() => setActiveTab("demo")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "demo" ? "bg-white/[0.06] text-white border border-white/[0.05]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Terminal size={12} style={{ color: activeTool.color }} /> Interactive Demo
                </button>
                <button
                  onClick={() => setActiveTab("specs")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "specs" ? "bg-white/[0.06] text-white border border-white/[0.05]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Code size={12} style={{ color: activeTool.color }} /> Technical Specs & Code
                </button>
              </div>

              {/* Stage Content */}
              <div className="p-8 relative z-10 min-h-[380px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {activeTab === "demo" ? (
                    <motion.div
                      key="demo"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col md:flex-row gap-6 items-center justify-between flex-1"
                    >
                      {/* Left: Simulation Canvas */}
                      <div className="w-full md:w-auto flex-1 flex items-center justify-center">
                        {activeTool.id === "recapyt" && <RecapYtCanvas tool={activeTool} />}
                        {activeTool.id === "cloudflare-purger" && <CloudflarePurgerCanvas tool={activeTool} />}
                        {activeTool.id === "410-manager" && <GoneManagerCanvas tool={activeTool} />}
                      </div>

                      {/* Right: Quick Capabilities & Info */}
                      <div className="w-full md:w-[240px] flex flex-col gap-4 shrink-0">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                          Capabilities
                        </span>
                        <ul className="space-y-2">
                          {activeTool.features.slice(0, 3).map((feat, fi) => (
                            <li key={fi} className="flex items-start gap-2 text-xs text-gray-300">
                              <span className="text-gray-500 shrink-0 select-none">✓</span>
                              <span className="line-clamp-2">{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 p-3 rounded-lg bg-white/[0.01] border border-white/[0.04]">
                          <span className="text-[9px] text-gray-500 font-mono block uppercase">
                            Primary Metric
                          </span>
                          <span className="text-white font-bold text-sm block mt-1">
                            {activeTool.metrics[0].value}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {activeTool.metrics[0].label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="specs"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 flex-1"
                    >
                      {/* Description & Specs Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase block mb-1">
                            Technical Deep Dive
                          </span>
                          <p className="text-gray-300 text-xs leading-relaxed">
                            {activeTool.techDetails}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {activeTool.metrics.map((metric, mi) => (
                            <div key={mi} className="p-3 rounded bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-white font-bold text-xs block font-mono">
                                {metric.value}
                              </span>
                              <span className="text-[9px] text-gray-400 block font-semibold mt-0.5">
                                {metric.label}
                              </span>
                              <span className="text-[8px] text-gray-500 block leading-tight mt-0.5">
                                {metric.desc}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Code Block */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1.5">
                            <Terminal size={10} /> {activeTool.codeTitle}
                          </span>
                          <CopyButton text={activeTool.codeSnippet} />
                        </div>
                        <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#050507]">
                          <pre className="p-3.5 overflow-x-auto text-[10.5px] leading-relaxed font-mono text-gray-300 max-h-[160px]">
                            <code>{activeTool.codeSnippet}</code>
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Action CTAs */}
                <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center gap-4">
                  <a
                    href={activeTool.downloadLink}
                    target={activeTool.id === "recapyt" ? "_blank" : undefined}
                    download={activeTool.id !== "recapyt" ? true : undefined}
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 px-4 text-xs font-bold transition-all border text-center cursor-pointer"
                    style={{ 
                      background: "rgba(255, 255, 255, 0.04)", 
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      color: "#E5E7EB",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "#FFFFFF";
                      el.style.color = "#09090B";
                      el.style.borderColor = "transparent";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255, 255, 255, 0.04)";
                      el.style.color = "#E5E7EB";
                      el.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    }}
                  >
                    {activeTool.id === "recapyt" ? <ExternalLink size={14} /> : <ArrowDownToLine size={14} />}
                    {activeTool.id === "recapyt" ? "Visit Flagship Website" : "Download Production Bundle"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Utilities Grid */}
        <div className="mt-16 text-center">
          <button 
            onClick={() => setShowUtilities(!showUtilities)}
            className="inline-flex items-center gap-2 text-sm font-medium tracking-wide transition-colors duration-200 group cursor-pointer"
            style={{ color: "rgba(237,234,228,0.5)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(237,234,228,0.9)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(237,234,228,0.5)"}
          >
            <span>{showUtilities ? "Hide browser utilities" : "View all 7 browser utilities"}</span>
            <motion.div
              animate={{ rotate: showUtilities ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showUtilities && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden mt-8 text-left"
              >
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                  {utilityTools.map((ut, idx) => (
                    <motion.div
                      key={ut.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link href={ut.href}>
                        <div 
                          className="group p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between h-full hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 cursor-pointer min-h-[160px]"
                        >
                          <div>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 bg-white/[0.03] border border-white/[0.06] group-hover:border-white/[0.1] transition-all">
                              <ut.icon size={18} style={{ color: ut.color }} />
                            </div>
                            <h4 className="text-white text-[14.5px] font-bold font-display group-hover:text-white transition-colors">
                              {ut.name}
                            </h4>
                            <p className="text-gray-400 text-xs leading-normal mt-2">
                              {ut.desc}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 group-hover:text-white transition-all mt-4">
                            Open Tool <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
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

/* RecapYT Visual Simulation Canvas */
/* ────────────────────────────────────────────────────────────────────────── */

function RecapYtCanvas({ tool }: { tool: ToolInfo }) {
  const [url, setUrl] = useState("https://youtube.com/watch?v=scaling-databases");
  const [status, setStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "analyzing") {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus("done");
            return 100;
          }
          return prev + 5;
        });
      }, 60);
    }
    return () => clearInterval(interval);
  }, [status]);

  const transcripts = [
    { time: "00:12", text: "Today we will analyze how scaling database architectures improves responsiveness..." },
    { time: "01:45", text: "When we shift our bottlenecks to the edge, latency drops down exponentially..." },
    { time: "03:10", text: "The native client handles transcripts in real-time with zero player buffer..." }
  ];

  const summaries = [
    "Scaled database queries performance by 40% with edge caching.",
    "Moved API routing logic directly to Cloudflare workers for sub-10ms delivery.",
    "Bypassed third-party tabs via native injection, optimizing player UX."
  ];

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      {/* Simulation title bar */}
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">recapyt_sandbox_v2</span>
      </div>

      <div className="flex-grow p-4 flex flex-col justify-between min-h-0 gap-3">
        {status === "idle" && (
          <div className="flex-grow flex flex-col justify-center items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-300">
              <Youtube size={22} className="animate-pulse" />
            </div>
            <div className="w-full max-w-[280px]">
              <div className="text-[11px] text-gray-400 font-mono mb-1.5 text-left">Target Video URL</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="flex-1 px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.08] text-[10.5px] font-mono text-gray-300 focus:outline-none"
                />
                <button
                  onClick={() => setStatus("analyzing")}
                  className="px-3 py-1.5 rounded border text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white"
                >
                  <Play size={10} fill="currentColor" /> Run
                </button>
              </div>
            </div>
            <p className="text-[9.5px] text-gray-500">
              Simulates real-time transcription parsing & summarization.
            </p>
          </div>
        )}

        {status === "analyzing" && (
          <div className="flex-grow flex flex-col justify-center items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" />
              {/* Inner spin circle */}
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="#F87171"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray="150"
                  strokeDashoffset={150 - (150 * progress) / 100}
                  className="transition-all duration-100"
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-red-400/90">{progress}%</span>
            </div>
            <div className="text-center space-y-1">
              <span className="text-[11px] text-gray-300 font-mono font-bold block">Analyzing Audio Stream</span>
              <span className="text-[9.5px] text-gray-500 font-mono block">
                {progress < 40 && "Extracting raw transcripts..."}
                {progress >= 40 && progress < 85 && "Connecting to LLM cluster zones..."}
                {progress >= 85 && "Generating compound insights..."}
              </span>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="flex-grow flex flex-col justify-between min-h-0 gap-3">
            {/* Simulation Header */}
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
              <span className="text-[9.5px] font-bold text-red-400/90 flex items-center gap-1">
                <CheckCircle2 size={11} /> AI Synthesis Successful
              </span>
              <button
                onClick={() => setStatus("idle")}
                className="text-[9.5px] text-gray-500 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
              >
                <RefreshCw size={9} /> Reset
              </button>
            </div>

            {/* Timestamps & Bullet Points */}
            <div className="flex-grow overflow-y-auto space-y-3 pr-1">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Transcript Stream</span>
                {transcripts.map((t, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className="flex gap-2 text-[10px]"
                  >
                    <span className="font-mono text-red-400/80 font-bold shrink-0">{t.time}</span>
                    <p className="text-gray-400 italic line-clamp-1">"{t.text}"</p>
                  </motion.div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.04] space-y-2">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Compounded Summary</span>
                {summaries.map((s, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + idx * 0.15 }}
                    className="flex items-start gap-1.5 text-[10.5px] text-gray-300 leading-tight"
                  >
                    <span className="text-red-400/80 shrink-0 select-none">✦</span>
                    <span>{s}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Cloudflare Edge Purger Visual Simulation Canvas */
/* ────────────────────────────────────────────────────────────────────────── */

function CloudflarePurgerCanvas({ tool }: { tool: ToolInfo }) {
  const [purgeStatus, setPurgeStatus] = useState<"idle" | "purging" | "success">("idle");
  const [activeNodes, setActiveNodes] = useState<boolean[]>([true, true, true, true]); // true = cached (orange), false = purged (white)
  const [logs, setLogs] = useState<string[]>([]);

  const nodes = [
    { name: "Ashburn (IAD)", x: "20%", y: "25%" },
    { name: "Frankfurt (FRA)", x: "75%", y: "20%" },
    { name: "Tokyo (NRT)", x: "85%", y: "60%" },
    { name: "Singapore (SIN)", x: "30%", y: "70%" }
  ];

  const handlePurge = () => {
    setPurgeStatus("purging");
    setActiveNodes([true, true, true, true]);
    setLogs(["[HOOK] wp_post_updated received (ID: 1042)"]);

    setTimeout(() => {
      setLogs((prev) => [...prev, "[API-CALL] POST zone/purge_cache"]);
    }, 400);

    // Staggered node purges
    nodes.forEach((_, idx) => {
      setTimeout(() => {
        setActiveNodes((prev) => {
          const next = [...prev];
          next[idx] = false;
          return next;
        });
        setLogs((prev) => [...prev, `[EDGE] Cache invalidated on node ${idx + 1}`]);
      }, 800 + idx * 250);
    });

    setTimeout(() => {
      setPurgeStatus("success");
      setLogs((prev) => [...prev, "[SUCCESS] HTTP 200 | Cache purged globally (124ms)"]);
    }, 2000);
  };

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      {/* Title bar */}
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">cloudflare_edge_purger_v2</span>
      </div>

      <div className="flex-grow p-4 flex flex-col justify-between min-h-0 gap-3">
        {/* Upper network map */}
        <div className="h-[105px] rounded-lg bg-[#0a0a0d]/60 border border-white/[0.04] relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(245,158,11,0.03)_0%,transparent_70%)] pointer-events-none" />
          
          {/* Simple world grid background */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
               style={{
                 backgroundImage: "radial-gradient(#F59E0B 1px, transparent 1px)",
                 backgroundSize: "20px 20px"
               }} 
          />

          {/* Central WP Server Origin */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center bg-black/60 shadow transition-colors ${
              purgeStatus === "purging" ? "border-amber-500/30 bg-amber-500/5 text-amber-500" : "border-white/10 text-gray-400"
            }`}>
              <Server size={13} />
            </div>
            <span className="text-[7.5px] font-mono text-gray-500 mt-1 uppercase tracking-wider">WP Origin</span>
          </div>

          {/* Edge Node Points */}
          {nodes.map((node, idx) => {
            const isCached = activeNodes[idx];
            return (
              <div
                key={idx}
                className="absolute transition-all duration-300"
                style={{ left: node.x, top: node.y }}
              >
                {/* Visual pulse line */}
                {purgeStatus === "purging" && isCached && (
                  <motion.div
                    className="absolute w-1.5 h-1.5 rounded-full bg-amber-500 origin-center"
                    initial={{ scale: 0.1, opacity: 1, left: "50%", top: "50%" }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-mono transition-all duration-500 ${
                  isCached
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-400/90 shadow-[0_0_8px_rgba(245,158,11,0.05)]"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400/90 shadow-[0_0_8px_rgba(16,185,129,0.05)]"
                }`}>
                  {idx + 1}
                </div>
                <div className="absolute top-7 left-1/2 -translate-x-1/2 text-[7px] text-gray-500 font-mono whitespace-nowrap bg-black/40 px-1 py-0.5 rounded">
                  {node.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Panel and Logs */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Action box */}
          <div className="w-[110px] shrink-0 border border-white/[0.05] rounded-lg p-2.5 flex flex-col justify-between bg-white/[0.01]">
            <div className="space-y-1">
              <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-wider block">Configuration</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8.5px] text-gray-300 font-medium">Automatic</span>
              </div>
            </div>

            {purgeStatus === "purging" ? (
              <div className="py-2.5 flex justify-center">
                <span className="w-4 h-4 rounded-full border border-amber-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <button
                onClick={handlePurge}
                className="w-full py-1.5 rounded border text-[9.5px] font-bold transition-all cursor-pointer text-center bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white"
              >
                Purge Cache
              </button>
            )}
          </div>

          {/* Logs */}
          <div className="flex-1 bg-black/90 border border-white/[0.06] rounded-lg p-2 flex flex-col justify-end min-h-0 font-mono text-[8.5px] leading-relaxed text-gray-400 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic text-[7.5px]">Click 'Purge Cache' to trigger edge invalidation.</div>
              ) : (
                logs.map((log, lidx) => {
                  let colorClass = "text-gray-500";
                  if (log.startsWith("[HOOK]")) colorClass = "text-amber-400/80";
                  if (log.startsWith("[API-CALL]")) colorClass = "text-sky-400/80";
                  if (log.startsWith("[SUCCESS]")) colorClass = "text-emerald-400/90";
                  return (
                    <motion.div
                      key={lidx}
                      initial={{ opacity: 0, x: -3 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={colorClass}
                    >
                      &gt; {log}
                    </motion.div>
                  );
                })
              )}
            </div>
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
  const [setupMode, setSetupMode] = useState<"404" | "410">("404");
  const [simulationStatus, setSimulationStatus] = useState<"idle" | "running" | "done">("idle");
  const [crawlBudget, setCrawlBudget] = useState(100);
  const [logs, setLogs] = useState<string[]>([]);

  const startSimulation = () => {
    setSimulationStatus("running");
    setCrawlBudget(100);
    setLogs(["[START] Googlebot crawl started"]);

    if (setupMode === "404") {
      // 404 Mode: multiple requests
      setTimeout(() => {
        setLogs((prev) => [...prev, "Googlebot GET /deleted-post/ -> 404 Not Found"]);
        setCrawlBudget(80);
      }, 400);

      setTimeout(() => {
        setLogs((prev) => [...prev, "Googlebot GET /deleted-post/ -> 404 (Retry 1)"]);
        setCrawlBudget(60);
      }, 1000);

      setTimeout(() => {
        setLogs((prev) => [...prev, "Googlebot GET /deleted-post/ -> 404 (Retry 2)"]);
        setCrawlBudget(40);
      }, 1600);

      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          "Googlebot -> Budget wasted. Retries scheduled.",
        ]);
        setSimulationStatus("done");
      }, 2200);
    } else {
      // 410 Mode: single request
      setTimeout(() => {
        setLogs((prev) => [...prev, "Googlebot GET /deleted-post/ -> 410 Gone"]);
        setCrawlBudget(98);
      }, 400);

      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          "Googlebot -> De-indexed. Request dropped.",
        ]);
        setSimulationStatus("done");
      }, 1100);
    }
  };

  return (
    <div className="w-full max-w-[340px] aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden bg-[#030303]/60 relative flex flex-col font-sans">
      {/* Title bar */}
      <div className="h-7 bg-white/[0.02] border-b border-white/[0.06] px-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
        </div>
        <span className="text-[9px] font-mono text-gray-500">crawler_simulation_sandbox</span>
      </div>

      <div className="flex-grow p-4 flex flex-col justify-between min-h-0 gap-3">
        {/* Selector tab */}
        <div className="flex bg-white/[0.02] border border-white/[0.06] rounded p-0.5 select-none">
          <button
            onClick={() => {
              if (simulationStatus !== "running") setSetupMode("404");
            }}
            className={`flex-1 py-1.5 text-[9px] font-bold rounded text-center transition-all cursor-pointer ${
              setupMode === "404"
                ? "bg-white/[0.06] text-white border border-white/[0.06]"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
            disabled={simulationStatus === "running"}
          >
            Standard 404
          </button>
          <button
            onClick={() => {
              if (simulationStatus !== "running") setSetupMode("410");
            }}
            className={`flex-1 py-1.5 text-[9px] font-bold rounded text-center transition-all cursor-pointer ${
              setupMode === "410"
                ? "bg-white/[0.06] text-white border border-white/[0.06]"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
            disabled={simulationStatus === "running"}
          >
            Optimized 410
          </button>
        </div>

        {/* Crawl budget display panel */}
        <div className="h-14 border border-white/[0.04] rounded bg-white/[0.005] p-2 flex items-center justify-between px-3">
          <div className="space-y-0.5">
            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest block">Resource Budget</span>
            <span className="text-[11px] font-bold text-gray-200">
              {setupMode === "404" ? "Uncontrolled Crawling" : "Crawl-Safe Pipeline"}
            </span>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Index Status</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                crawlBudget > 80 ? "bg-green-500" : crawlBudget > 60 ? "bg-yellow-500" : "bg-red-500"
              }`} />
              <span className="text-[13px] font-mono font-bold text-white">
                {crawlBudget}%
              </span>
            </div>
          </div>
        </div>

        {/* Run Simulator */}
        <div className="flex-1 flex gap-3 min-h-0">
          <div className="w-[100px] shrink-0 flex flex-col justify-center">
            {simulationStatus === "running" ? (
              <div className="w-full py-2.5 rounded bg-white/[0.04] text-[9.5px] text-gray-500 font-bold border border-white/[0.06] text-center font-sans">
                Simulating...
              </div>
            ) : (
              <button
                onClick={startSimulation}
                className="w-full py-2.5 rounded border text-[9.5px] font-bold transition-all cursor-pointer text-center bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white"
              >
                Crawl Page
              </button>
            )}
          </div>

          {/* Console logs */}
          <div className="flex-grow bg-black/90 border border-white/[0.06] rounded-lg p-2 flex flex-col justify-end font-mono text-[8px] leading-relaxed text-gray-400 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic text-[7.5px]">Select a mode and click 'Crawl Page' to simulate Googlebot.</div>
              ) : (
                logs.map((log, lidx) => {
                  let colorClass = "text-gray-500";
                  if (log.startsWith("Googlebot GET")) {
                    colorClass = setupMode === "404" ? "text-red-400/90" : "text-emerald-400/90";
                  }
                  if (log.startsWith("[START]")) colorClass = "text-blue-400/80";
                  if (log.startsWith("Googlebot ->")) colorClass = "text-gray-300";
                  return (
                    <motion.div
                      key={lidx}
                      initial={{ opacity: 0, x: -3 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={colorClass}
                    >
                      &gt; {log}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
