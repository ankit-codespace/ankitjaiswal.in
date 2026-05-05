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
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden shadow-2xl relative"
          >
            {/* Fake Browser Window / YouTube Header */}
            <div className="h-14 border-b border-white/5 bg-[#0F0F0F] flex items-center px-4 gap-4 sticky top-0 z-20">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-1 text-white font-semibold text-lg tracking-tighter">
                <Youtube size={28} className="text-red-500" />
                <span>YouTube</span>
              </div>
              <div className="flex-1 max-w-2xl mx-auto hidden md:block">
                <div className="h-10 bg-white/5 border border-white/10 rounded-full flex items-center px-4 text-white/40 text-sm">
                  Search
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 ml-auto flex-shrink-0" />
            </div>
            
            {/* YouTube Main Layout */}
            <div className="flex flex-col lg:flex-row p-4 lg:p-6 gap-6 h-[800px] overflow-hidden">
              
              {/* Left Column (Video - Sticky) */}
              <div className="flex-1 flex flex-col gap-4 relative">
                <div className="sticky top-4">
                  <div className="aspect-video bg-black rounded-xl border border-white/5 overflow-hidden relative group">
                    <img src="https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Video Thumbnail" className="w-full h-full object-cover opacity-80" />
                    
                    {/* YouTube Player Controls Mockup */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <div className="w-full">
                        <div className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer relative">
                           <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-600 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex gap-4">
                            <div className="w-4 h-4 bg-white/80 rounded-sm"></div>
                            <div className="w-4 h-4 bg-white/80 rounded-sm"></div>
                            <span>12:04 / 58:22</span>
                          </div>
                          <div className="flex gap-4">
                             <div className="w-4 h-4 bg-white/80 rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-white leading-tight mt-4">
                    The Ultimate Sales Training for 2026 [Full Course]
                  </h2>
                  
                  <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div>
                        <div className="text-white font-medium text-sm">Alex Hormozi <span className="text-gray-400 text-xs ml-1">✓</span></div>
                        <div className="text-white/50 text-xs">4.15M subscribers</div>
                      </div>
                      <button className="ml-4 px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-full hidden sm:block">
                        Subscribe
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <div className="flex bg-white/10 rounded-full items-center text-white text-sm font-medium">
                        <div className="px-4 py-1.5 border-r border-white/10 hover:bg-white/5 cursor-pointer rounded-l-full">👍 28K</div>
                        <div className="px-4 py-1.5 hover:bg-white/5 cursor-pointer rounded-r-full">👎</div>
                      </div>
                      <div className="px-4 py-1.5 bg-white/10 hover:bg-white/20 cursor-pointer rounded-full text-white text-sm font-medium hidden sm:block">Share</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column (RecapYT Extension UI - Scrollable) */}
              <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col bg-[#181818] rounded-xl border border-white/10 overflow-hidden h-full shadow-lg relative">
                
                {/* RecapYT Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#212121] sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <Youtube size={20} className="text-red-500" />
                    <span className="font-bold text-white text-sm tracking-wide">Recap<span className="text-red-500">YT</span></span>
                  </div>
                  <div className="flex gap-3 text-xs font-semibold">
                    <span className="text-white border-b-2 border-white pb-1">EN</span>
                    <span className="text-white/40">हिन्दी</span>
                    <span className="text-white/40">Hinglish</span>
                  </div>
                </div>

                <div className="p-4 border-b border-white/5 bg-[#181818] sticky top-[60px] z-10">
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-full text-sm font-bold shadow-md hover:bg-gray-100 transition-colors">
                    <SparkleIcon /> Summarize this video
                  </button>
                </div>

                {/* RecapYT Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed custom-scrollbar pb-24">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-base">
                    <span className="text-yellow-500">⚡</span> TL;DR
                  </h3>
                  
                  <ul className="space-y-4 text-white/80 list-disc pl-4 mb-8">
                    <li><strong className="text-white">Sell 7 days a week</strong> (weekends add <strong className="text-white">104 days/year</strong>, a <strong className="text-white">29% revenue boost</strong>) and <strong className="text-white">respond to leads in under 1 minute</strong> (a <strong className="text-white">391% increase</strong> in close likelihood).</li>
                    <li><strong className="text-white">Feed the killers:</strong> send the <strong className="text-white">best leads to the best closers</strong> and the <strong className="text-white">worst leads to the worst closers</strong> to minimize waste and maximize revenue.</li>
                    <li><strong className="text-white">Details are death traps;</strong> never answer a detail question blindly. Instead, <strong className="text-white">ask a question back</strong> to find out what the prospect really wants.</li>
                    <li><strong className="text-white">The pain is the pitch</strong> – expand the prospect's deprivation to create urgency. Use the CLOSER framework: Clarify, Label, Overview past pain, Sell vacation, Explain concerns, Reinforce.</li>
                    <li><strong className="text-white">No isn't no forever;</strong> always follow up. Volume negates luck – the best salespeople do the most volume and master the fundamentals.</li>
                    <li><strong className="text-white">Never change price</strong> to close a sale; instead, change terms or do a feature downsell. The person who cares the most about the prospect wins the sale.</li>
                  </ul>

                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-base mt-8 border-t border-white/10 pt-6">
                    <span className="text-blue-400">📖</span> Full Summary
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-2">⚡ Sales Multipliers</h4>
                      <ul className="space-y-3 text-white/70 list-disc pl-4">
                        <li>Sell 7 days a week: Adding Saturday and Sunday gives 104 extra selling days/year, a 29% revenue increase.</li>
                        <li>Respond to leads in under 1 minute: A Harvard Business Review study shows a 391% increase in close likelihood if you contact a lead within 60 seconds.</li>
                        <li>50% of prospects go with the business that responds first, not the best one.</li>
                        <li>If response time is greater than 5 minutes, likelihood drops by 80%.</li>
                        <li>15-minute time slots instead of 1-hour slots increase show-up rates because they're more convenient.</li>
                        <li>Feed the killers: Best leads go to best closers; worst leads go to worst closers.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">📖 Sales Training</h4>
                      <ul className="space-y-3 text-white/70 list-disc pl-4">
                        <li>Daily huddles with role-playing: Give one piece of feedback at a time, give it fast, and have them repeat it.</li>
                        <li>Your best closer is usually not your best sales manager: Sales management is a different skill.</li>
                        <li>Competition should be us vs. them (a rival), not internal.</li>
                        <li>Game tape review: Record every call. Have sales and CS review calls together weekly.</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold mb-2">🗣️ The Actual Sale</h4>
                      <ul className="space-y-3 text-white/70 list-disc pl-4">
                        <li>Open with Proof, Promise, Plan: "We've done this for lots of people just like you..."</li>
                        <li>Follow the script: If everyone says the exact words, you can identify if the script is the problem.</li>
                        <li>CLOSER Framework: Clarify, Label, Overview past pain, Sell the vacation, Explain away concerns, Reinforce the decision.</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold mb-2">🧠 Mindset</h4>
                      <ul className="space-y-3 text-white/70 list-disc pl-4">
                        <li>Caring wins: The person who cares the most about the prospect wins the sale.</li>
                        <li>Volume negates luck: Sales is a numbers game. The more you do, the better you get.</li>
                        <li>Never negotiate with terrorists: Never change price to close a sale. We could do it for more (counter-anchor) almost always works.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {/* Fading gradient at bottom for scroll indication */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none z-10"></div>
              </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
              }
            `}} />
            
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
