import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Youtube, Download, Zap, BrainCircuit, ShieldCheck, ArrowRight, Chrome } from "lucide-react";
import { tokens } from "@/components/tool/tokens";

function useBrowser() {
  const [browser, setBrowser] = useState<"chrome" | "edge" | "brave" | "opera" | "unknown">("chrome");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.indexOf("edg") > -1) {
      setBrowser("edge");
    } else if (userAgent.indexOf("opr") > -1 || userAgent.indexOf("opera") > -1) {
      setBrowser("opera");
    } else if ((navigator as any).brave !== undefined || userAgent.indexOf("brave") > -1) {
      setBrowser("brave");
    } else if (userAgent.indexOf("chrome") > -1) {
      setBrowser("chrome");
    }
  }, []);

  return browser;
}

export default function RecapYTLanding() {
  const browser = useBrowser();
  
  let iconSrc = "/icons/chrome-96.png";
  let btnText = "Add to Chrome — It's Free";
  
  if (browser === "edge") {
    iconSrc = "/icons/edge.png";
    btnText = "Add to Edge — It's Free";
  } else if (browser === "brave") {
    iconSrc = "/icons/brave.png";
    btnText = "Add to Brave — It's Free";
  } else if (browser === "opera") {
    iconSrc = "/icons/opera.png";
    btnText = "Add to Opera — It's Free";
  }

  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "#EDEDED", fontFamily: tokens.font.body }}>
      <Seo
        title="RecapYT — Native YouTube Summarizer Extension"
        description="Instant YouTube summaries natively injected via custom high-speed AI architecture. Massive 1M token context window, zero tab switching."
        path="/tools/youtube-summary"
        keywords="youtube summary extension, native AI summary, recapyt, youtube ai"
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between" style={{ background: "rgba(5,5,5,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <Link href="/tools" className="text-sm font-medium transition-colors hover:text-white flex items-center gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ArrowRight className="rotate-180" size={16} />
            Back to Tools
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Youtube className="text-red-500" size={24} />
          <span className="font-bold text-white tracking-tight text-lg" style={{ fontFamily: tokens.font.display }}>RecapYT</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-8">
              <SparkleIcon /> Advanced Custom AI Architecture
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6" style={{ fontFamily: tokens.font.display, lineHeight: 1.1 }}>
              Summarize YouTube <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">Without Leaving YouTube.</span>
            </h1>
            
            <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              Competitors force you to switch tabs and pay for expensive APIs. RecapYT is engineered with a frictionless native UI that processes transcripts instantly using hyper-fast AI endpoints.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="#"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                onClick={(e) => { e.preventDefault(); alert("Chrome Web Store link coming soon!"); }}
              >
                <img src={iconSrc} alt={`${browser} icon`} className="w-6 h-6 animate-[spin_4s_linear_infinite] hover:animate-none transition-all" />
                {btnText}
              </a>
              <a 
                href="https://recapyt.in"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
              >
                Official Site
              </a>
            </div>
            
            <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              No credit card required. Installs in seconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Mockup / Demo Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl relative"
          >
            {/* Window controls */}
            <div className="h-12 border-b border-white/10 bg-[#111] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-4 px-3 py-1 text-xs text-white/40 bg-black/40 rounded flex-1 max-w-sm text-center font-mono">
                youtube.com/watch?v=recapyt
              </div>
            </div>
            
            <div className="aspect-[16/9] relative bg-black flex items-center justify-center">
               <img 
                 src="/recapyt-icon.png" 
                 alt="RecapYT Demo Placeholder" 
                 className="w-24 h-24 opacity-20 object-contain"
               />
               <div className="absolute right-4 top-4 w-80 bg-[#1F1F1F] rounded-xl border border-white/10 shadow-2xl overflow-hidden p-4">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                    <Youtube className="text-red-500" size={18} />
                    <span className="font-bold text-white text-sm">RecapYT</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded w-full"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                    <div className="h-4 bg-white/5 rounded w-full"></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                    <div className="h-8 bg-red-500/20 text-red-400 rounded w-full flex items-center justify-center text-xs font-bold">Copy Summary</div>
                    <div className="h-8 bg-white/5 rounded w-full"></div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Zap size={24} className="text-yellow-400" />}
              title="Hyper-Fast Architecture"
              desc="Uses heavily optimized AI endpoints to stream summaries directly into your active YouTube tab in milliseconds."
            />
            <FeatureCard 
              icon={<BrainCircuit size={24} className="text-blue-400" />}
              title="1M Token Context"
              desc="Easily process 3-hour long podcasts and lectures. RecapYT handles massive transcripts without truncating."
            />
            <FeatureCard 
              icon={<ShieldCheck size={24} className="text-green-400" />}
              title="Privacy-First"
              desc="We don't log your watch history. Transcripts are sent directly to the API and nowhere else."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: tokens.font.display }}>
            Ready to upgrade your YouTube?
          </h2>
          <p className="text-lg text-white/60 mb-10">
            Join thousands of professionals saving hours of watch time every week.
          </p>
          <a 
            href="#"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-[0_0_30px_rgba(220,38,38,0.4)]"
            onClick={(e) => { e.preventDefault(); alert("Chrome Web Store link coming soon!"); }}
          >
            <img src={iconSrc} alt={`${browser} icon`} className="w-5 h-5 brightness-0 invert animate-[spin_4s_linear_infinite] hover:animate-none transition-all" />
            Install RecapYT Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-white/5">
        <p className="text-white/40 text-sm">
          Built by <Link href="/" className="hover:text-white transition-colors">Ankit Jaiswal</Link>. © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: tokens.font.display }}>{title}</h3>
      <p className="text-white/60 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 1L12.16 7.48C12.38 8.14 12.86 8.62 13.52 8.84L20 11L13.52 13.16C12.86 13.38 12.38 13.86 12.16 14.52L10 21L7.84 14.52C7.62 13.86 7.14 13.38 6.48 13.16L0 11L6.48 8.84C7.14 8.62 7.62 8.14 7.84 7.48L10 1Z" fill="#F87171"/>
    </svg>
  );
}
