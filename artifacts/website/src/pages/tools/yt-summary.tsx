import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Youtube, Download, Zap, BrainCircuit, ShieldCheck, ArrowRight, Chrome, Menu, Search, Mic, Plus, Bell, ThumbsUp, ThumbsDown, Share, ListPlus, MoreHorizontal, Play } from "lucide-react";
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
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: tokens.font.display }}>
              Live Demonstration
            </h2>
            <p className="text-white/50 text-lg">
              A fully interactive preview of how RecapYT natively injects into your browser.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-[16px] border border-white/20 bg-[#0F0F0F] overflow-hidden shadow-[0_0_80px_rgba(255,255,255,0.05)] relative"
          >
            {/* macOS Browser Window Header */}
            <div className="h-10 border-b border-white/10 bg-[#1A1A1A] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm" />
              <div className="flex-1 flex justify-center">
                 <div className="h-6 w-64 bg-[#0F0F0F] rounded-md border border-white/5 flex items-center justify-center text-[10px] text-white/30 font-mono">
                    youtube.com/watch?v=recapyt
                 </div>
              </div>
            </div>

            {/* Fake Browser Window / YouTube Header */}
            <div className="h-14 border-b border-white/5 bg-[#0F0F0F] flex items-center px-4 gap-4 sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <Menu size={24} className="text-white hidden sm:block" />
                <div className="w-[90px] h-[20px] flex items-center">
                  <YouTubeLogo />
                </div>
              </div>
              
              <div className="flex-1 max-w-2xl mx-auto hidden md:flex items-center gap-4">
                <div className="flex-1 flex items-center h-10 bg-[#121212] border border-[#303030] rounded-full overflow-hidden ml-10">
                  <div className="flex-1 px-4 text-white/40 text-base">Search</div>
                  <button className="w-16 h-full bg-[#222222] border-l border-[#303030] flex items-center justify-center hover:bg-[#303030] transition-colors">
                    <Search size={20} className="text-white/80" />
                  </button>
                </div>
                <button className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center hover:bg-[#282828] transition-colors">
                  <Mic size={20} className="text-white" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                <button className="h-9 px-4 rounded-full bg-[#272727] hover:bg-[#3F3F3F] transition-colors flex items-center gap-2 text-white text-sm font-medium hidden sm:flex">
                  <Plus size={18} /> Create
                </button>
                <div className="relative w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer hidden sm:flex">
                  <Bell size={24} className="text-white" />
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-[#0F0F0F]"></div>
                </div>
                <img src="/images/hero-portrait.webp" alt="Profile" className="w-8 h-8 rounded-full object-cover ml-2" />
              </div>
            </div>
            
            {/* YouTube Main Layout */}
            <div className="flex flex-col lg:flex-row p-4 lg:p-6 gap-6 h-[800px] overflow-hidden">
              
              {/* Left Column (Video - Sticky) */}
              <div className="flex-1 flex flex-col gap-4 relative">
                <div className="sticky top-4">
                  <div className="aspect-video bg-black rounded-xl border border-white/5 overflow-hidden relative group">
                    <img src="/alex.webp" alt="Video Thumbnail" className="w-full h-full object-cover opacity-80" />
                    
                    {/* YouTube Player Controls Mockup */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    The Ultimate Sales Training [Full Course]
                  </h2>
                  
                  <div className="flex flex-wrap items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <img src="/alex.webp" alt="Alex Hormozi" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="text-white font-medium text-[15px] flex items-center gap-1">Alex Hormozi <div className="w-3.5 h-3.5 bg-gray-400 rounded-full flex items-center justify-center text-[#0F0F0F] text-[9px]">✓</div></div>
                        <div className="text-white/60 text-xs">4.15M subscribers</div>
                      </div>
                      <button className="ml-4 px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hidden sm:block hover:bg-gray-200 transition-colors">
                        Subscribe
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 lg:mt-0">
                      <div className="flex bg-[#272727] rounded-full items-center text-white text-sm font-medium">
                        <button className="px-4 py-2 border-r border-white/10 hover:bg-[#3F3F3F] transition-colors rounded-l-full flex items-center gap-2">
                          <ThumbsUp size={18} /> 28K
                        </button>
                        <button className="px-4 py-2 hover:bg-[#3F3F3F] transition-colors rounded-r-full">
                          <ThumbsDown size={18} />
                        </button>
                      </div>
                      <button className="px-4 py-2 bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-full text-white text-sm font-medium flex items-center gap-2">
                        <Share size={18} /> Share
                      </button>
                      <button className="px-4 py-2 bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-full text-white text-sm font-medium flex items-center gap-2 hidden xl:flex">
                        <ListPlus size={18} /> Save
                      </button>
                      <button className="w-9 h-9 bg-[#272727] hover:bg-[#3F3F3F] transition-colors rounded-full text-white flex items-center justify-center">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column (RecapYT Extension UI - Scrollable) */}
              <div style={{ width:'100%', maxWidth:'400px', flexShrink:0, display:'flex', flexDirection:'column', background:'#1f1f1f', borderRadius:'12px', overflow:'hidden', height:'100%', position:'relative' }}>
                {/* .aix-hdr */}
                <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 20px 14px' }}>
                  <RecapYTBrandLogo />
                  <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                    {([['EN',true],['हिन्दी',false],['Hinglish',false]] as [string,boolean][]).map(([l,a])=>(
                      <button key={l} style={{ padding:'2px 0 4px', border:'none', background:'transparent', color:a?'#fafafa':'rgba(250,250,250,0.48)', fontSize:'11px', fontWeight:500, fontFamily:'inherit', cursor:'pointer', borderBottom:`1.5px solid ${a?'#fafafa':'transparent'}`, lineHeight:1 }}>{l}</button>
                    ))}
                  </div>
                </header>

                {/* .aix-body CTA row — split pill matching real extension */}
                <div style={{ padding:'0 20px 16px' }}>
                  <div style={{ display:'flex', alignItems:'stretch', background:'#fafafa', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'999px', overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,0.18)' }}>
                    <button style={{ flex:'1 1 auto', minHeight:'44px', padding:'11px 16px', background:'transparent', border:'none', color:'#0a0a0a', fontSize:'15px', fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', letterSpacing:'-0.012em' }}>
                      <AixSparkIcon />
                      <span>Summarize this video</span>
                    </button>
                    <button title="Copy transcript" style={{ width:'44px', minHeight:'44px', flex:'0 0 44px', border:'none', borderLeft:'1px solid rgba(0,0,0,0.12)', background:'transparent', color:'#0a0a0a', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>

                {/* .aix-result — scrollable summary */}
                <div className="custom-scrollbar" style={{ flex:1, minHeight:0, overflowY:'auto', padding:'0 20px 8px', overscrollBehavior:'contain' }}>
                  <AixSectionLabel>TL;DR</AixSectionLabel>
                  {['Sell 7 days/week — weekends add 104 days/year (29% revenue boost). Respond in <1 min for a 391% higher close rate.',
                    'Feed the killers: best leads → best closers. A timeshare rep went $250k → $3M/yr with this one change.',
                    'Details are death traps — never answer a blind question. Ask one back to find what the prospect really wants.',
                    'The pain is the pitch. Expand deprivation. Use CLOSER: Clarify, Label, Overview pain, Sell vacation, Explain, Reinforce.',
                    'No isn\'t no forever. Follow up every 3–6 months. Volume negates luck.',
                    'Never change price. Counter-anchor or change terms. The person who cares most wins the sale.',
                  ].map((t,i)=><AixBullet key={i}>{t}</AixBullet>)}
                  <AixHr/>
                  <AixSectionLabel>Full Summary</AixSectionLabel>
                  <AixH3>⚡ Sales Multipliers</AixH3>
                  {['Sat + Sun = 104 extra selling days/year = 29% more revenue.',
                    'Respond in <1 min: Harvard — 391% higher close rate. 50% of prospects go with whoever responds first.',
                    'Response >5 min: close likelihood drops 80%.',
                    '15-min slots (not 1-hour) — more convenient, higher show-up rates.',
                    'Feed the killers: A timeshare rep went $250k → $3M/yr. Company 5x\'d when rolled out nationwide.',
                    'Reminder sequence: 24hr before, morning of, 1hr before. Show prep = 30% more show-ups.',
                  ].map((t,i)=><AixBullet key={i}>{t}</AixBullet>)}
                  <AixHr/>
                  <AixH3>🛎️ Before the Sale</AixH3>
                  {['The sale starts at the click, not the call. Every ad, application, call frames the prospect.',
                    'Edify the closer: "Shawn helped 400 people just like you — I think he has an opening this afternoon."',
                    'Qualify with BANT: Budget, Authority, Need, Timing — before asking for money.',
                    '5-min prep before each call. Never let a prospect repeat themselves. Makes you look like a genius.',
                  ].map((t,i)=><AixBullet key={i}>{t}</AixBullet>)}
                  <AixHr/>
                  <AixH3>🗣️ The CLOSER Framework</AixH3>
                  {[['C — Clarify','Why are you here? People call to solve a problem, not get info.'],
                    ['L — Label','"You are [here], want to get [there], and [this] is the obstacle."'],
                    ['O — Overview pain','Expand it: "What have you tried? How much did it cost? Cost of inaction per day?"'],
                    ['S — Sell the vacation','Talk Maui (result), not the plane (process). Max 2-min pitch.'],
                    ['E — Explain concerns','Handle objections. AAA: Acknowledge → Associate → Ask.'],
                    ['R — Reinforce','Handshake, not handoff. BAMFAM — Book A Meeting From A Meeting.'],
                  ].map(([title,desc],i)=><AixBullet key={i}><strong style={{color:'#fafafa'}}>{title}:</strong> {desc}</AixBullet>)}
                  <AixHr/>
                  <AixH3>🔒 Closing & Objections</AixH3>
                  {['When they say yes, shut up and close. Details turn a yes into a no.',
                    'AAA Method: Acknowledge → Associate (positive story) → Ask (next question).',
                    'Details are death traps: mechanic close — "I can\'t diagnose your car before looking under the hood."',
                    'Stack closes: fire 3 different angles if one doesn\'t work.',
                    'Best-case/worst-case: "Do nothing = guaranteed same result. Take a shot = a chance to win."',
                    'Never change price. Counter-anchor: "We could do it for more." Change terms or downsell features.',
                  ].map((t,i)=><AixBullet key={i}>{t}</AixBullet>)}
                  <AixHr/>
                  <AixH3>🧠 Mindset</AixH3>
                  {['Caring wins: the person who cares most about the prospect wins the sale.',
                    'Volume negates luck. Force volume early to get through the beginner phase faster.',
                    'No for now ≠ No forever. Follow up every 3–6 months.',
                    'Be a trash man (new closers): take worst leads as free training. Yellow = Gold.',
                  ].map((t,i)=><AixBullet key={i}>{t}</AixBullet>)}
                  <AixHr/>
                  <div style={{marginBottom:'24px'}}><strong style={{color:'#fafafa'}}>Bottom line:</strong> Sales is a transfer of conviction through education over a bridge of trust. Master the multipliers, training, framing, closing, and mindset — every pipeline step improves systematically.</div>
                </div>
                {/* .aix-actions — Copy / Image / PDF / Regen */}
                <div style={{ display:'flex', gap:'8px', alignItems:'center', padding:'14px 20px 16px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                  {[
                    {label:'Copy', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>},
                    {label:'Image', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 15l3-3 2 2 3-4 2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="9" r="1" fill="currentColor"/></svg>},
                    {label:'PDF', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M8 14h8M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>},
                  ].map(({label,icon})=>(
                    <button key={label} style={{ flex:1, minHeight:'40px', padding:'6px 7px', background:'#131313', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', color:'rgba(250,250,250,0.70)', fontSize:'13px', fontWeight:550, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                      {icon}<span>{label}</span>
                    </button>
                  ))}
                  <button title="Regenerate" style={{ flex:'0 0 40px', width:'40px', minHeight:'40px', padding:'6px', background:'#131313', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', color:'rgba(250,250,250,0.70)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 11a8 8 0 0 0-14.4-4.8L4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 13a8 8 0 0 0 14.4 4.8L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 20v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
              .custom-scrollbar::-webkit-scrollbar { width: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
              @keyframes aixSparkTurn {
                0%        { transform: translateY(1px) rotate(0deg); }
                30%, 100% { transform: translateY(1px) rotate(360deg); }
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

// Exact spark icon matching the real extension's CSS mask diamond with 9s rotation
function AixSparkIcon() {
  const maskSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M8 0 Q8 8 16 8 Q8 8 8 16 Q8 8 0 8 Q8 8 8 0 Z'/></svg>")`;
  return (
    <span style={{
      fontSize: 0, width: '22px', height: '22px', display: 'block', flexShrink: 0,
      backgroundColor: '#0a0a0a',
      WebkitMaskImage: maskSvg, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
      maskImage: maskSvg, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
      animation: 'aixSparkTurn 9s cubic-bezier(0.83,0,0.17,1) infinite',
      transformOrigin: '50% 50%',
    } as React.CSSProperties} />
  );
}

// RecapYT logo icon — exact SVG from the real extension's CSS background-image
function RecapYTBrandLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.95, flexShrink: 0 }}>
      <rect width="32" height="32" rx="7" fill="#0C0C0E"/>
      <rect x="12" y="5" width="16" height="3" rx="1.5" fill="#E03230"/>
      <rect x="6" y="10" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.90)"/>
      <rect x="5" y="15" width="22" height="0.5" rx="0.25" fill="#E03230" opacity={0.48}/>
      <rect x="9" y="17" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.72)"/>
      <rect x="14" y="22" width="8" height="3" rx="1.5" fill="rgba(255,255,255,0.48)"/>
    </svg>
  );
}

// Mini layout helpers matching .ai-h2 / .ai-h3 / .ai-li / .ai-hr from extension CSS
function AixSectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(250,250,250,0.48)', margin: '0 0 8px' }}>{children}</div>;
}
function AixH3({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '15px', fontWeight: 600, color: '#fafafa', margin: '12px 0 4px' }}>{children}</div>;
}
function AixBullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '8px', margin: '4px 0', fontSize: '15px', lineHeight: '1.72', color: 'rgba(250,250,250,0.70)' }}>
      <span style={{ color: 'rgba(250,250,250,0.48)', flexShrink: 0 }}>•</span>
      <span>{children}</span>
    </div>
  );
}
function AixHr() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '20px 0' }} />;
}

function YouTubeLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 114.56" className="w-full h-full">
      <g fillRule="nonzero">
        <path fill="red" d="M159.98 17.94A20.575 20.575 0 0 0 145.5 3.46C133.2.11 84.87 0 81.86 0h-.18c-1.56 0-51.26.16-63.76 3.57A20.566 20.566 0 0 0 3.45 18.04c-3.84 22.56-5.33 56.93.1 78.58a20.558 20.558 0 0 0 14.48 14.48c12.3 3.36 60.63 3.46 63.64 3.46h.29c3.01 0 51.35-.1 63.64-3.46a20.558 20.558 0 0 0 14.48-14.48c4.05-22.59 5.3-56.93-.1-78.68z"/>
        <path fill="#fff" d="m65.45 81.83 42.38-24.55-42.38-24.55z"/>
        <path fill="#fff" d="M197.43 75.48 179.06 8.43h16.06s7.51 33.63 10.08 49.44h.43c2.91-16.78 10.28-49.44 10.28-49.44h16.07l-18.59 66.94v32.14h-15.85V75.48h-.11zm209.89-40.31v72.45h-12.6l-1.37-8.91h-.31c-3.46 6.68-8.61 10.08-15.44 10.08-12.35-.04-13.73-10.61-13.85-19.52v-54.1h16.17v53.14c0 3.18.31 5.52 1.05 6.9 1.49 2.95 5.35 2.19 7.45.74a8.422 8.422 0 0 0 2.83-3.29V35.17h16.07zm38.53 41.16c0 5.3-.21 9.44-.63 12.41-.42 2.97-1.15 5.09-2.2 6.36-1.05 1.28-2.42 1.91-4.1 1.91-3.25-.11-5.1-1.59-6.4-3.82V52.03c.52-2.01 1.47-3.6 2.83-4.87 2.31-2.63 6.26-2.66 8.09 0 .94 1.27 1.47 3.5 1.89 6.57.31 3.08.52 7.43.52 13.15v9.45zm14.81-29.6c-.95-4.56-2.52-7.85-4.73-9.97-2.2-2.02-5.14-3.08-9.03-3.08-2.95-.01-5.84.88-8.29 2.55-2.63 1.69-4.52 3.92-5.99 6.68h-.1V4.72h-15.54v102.79h13.34l1.67-6.89h.32c1.28 2.43 3.21 4.45 5.56 5.83 2.52 1.38 5.25 2.13 8.3 2.13 5.46 0 9.45-2.55 12.07-7.64 2.52-5.1 3.89-13.05 3.89-23.77V65.72c0-8.07-.53-14.43-1.47-18.99zm-92.29-25.14H352.3v86.03h-15.75V21.59h-16.06V8.43h47.77v13.16h.11zm-43.89 13.58v72.45h-12.6l-1.37-8.91h-.31c-3.47 6.68-8.61 10.08-15.44 10.08-12.35-.04-13.73-10.61-13.85-19.52v-54.1h16.17v53.14c0 3.18.31 5.52 1.05 6.9 1.49 2.95 5.35 2.19 7.45.74a8.422 8.422 0 0 0 2.83-3.29V35.17h16.07zm162.64 11.14c-.85 1.06-1.37 2.65-1.68 4.98-.32 2.33-.42 10.61-.42 10.61v5.2h11.76v-5.2c0 5.2-.11-8.17-.43-10.61-.31-2.44-.83-4.13-1.68-5.09-.83-.96-2.09-1.49-3.78-1.49-1.78.11-3.04.64-3.77 1.6zm-2.1 30.55v3.71l.42 10.5c.31 2.33.83 4.03 1.68 5.09.84 1.06 2.2 1.59 3.99 1.59 2.41 0 4.09-.95 4.93-2.86.94-1.91 1.37-5.09 1.47-9.44l13.96.85c.11.63.11 1.48.11 2.54 0 6.69-1.78 11.67-5.46 14.96-3.67 3.29-8.71 4.99-15.33 4.99-7.98 0-13.55-2.55-16.69-7.54-3.15-4.98-4.83-12.83-4.83-23.33V65.08c.35-18.03 3.49-31.24 21.94-31.29 5.57 0 9.76 1.06 12.71 3.07 2.94 2.02 5.04 5.2 6.3 9.55 1.25 4.35 1.78 10.29 1.78 17.93v12.41h-26.98v.11zM254.87 94.15c.94-2.34 1.36-6.26 1.36-11.57V59.99c0-5.2-.42-9.02-1.36-11.35-.95-2.44-2.52-3.61-4.73-3.61-2.2 0-3.67 1.17-4.62 3.61-.94 2.44-1.36 6.15-1.36 11.35v22.59c0 5.31.42 9.23 1.26 11.57.84 2.33 2.41 3.5 4.72 3.5 2.21 0 3.78-1.17 4.73-3.5zM236.7 105.5c-3.25-2.23-5.56-5.62-6.93-10.29-1.36-4.67-1.99-10.82-1.99-18.57v-10.5c0-7.74.73-14.11 2.31-18.77 1.57-4.78 3.99-8.17 7.35-10.29 3.36-2.12 7.66-3.29 13.02-3.29 5.25 0 9.55 1.06 12.7 3.29 3.15 2.22 5.57 5.62 7.04 10.29 1.47 4.66 2.2 10.92 2.2 18.67v10.5c0 7.74-.73 13.89-2.2 18.56-1.47 4.67-3.78 8.06-7.04 10.29-3.25 2.12-7.66 3.29-13.12 3.29-5.67.11-10.08-1.06-13.34-3.18z"/>
      </g>
    </svg>
  );
}
