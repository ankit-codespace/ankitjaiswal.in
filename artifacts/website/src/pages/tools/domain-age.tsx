import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Search, Globe, Clock, Calendar, AlertCircle, Check, X,
  Building2, Server, Hash, Copy, History, Trash2,
  Lock, Zap, TrendingUp, Eye, ShieldCheck, Database,
  Briefcase, LineChart, FileSearch, Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ToolPage, ToolSEOArticle, ToolSection, SectionHeading, ToolStatusBar,
  ToolFAQ, ToolHowToSteps, ToolFeatureGrid, ToolRelatedTools,
  ToolAuthorCard, ToolPrivacyBand, FeedbackInlineCard, buildToolJsonLd,
  tokens, type ToolFAQItem, type RelatedTool, type ToolHowToStep, type ToolFeature,
  type ToolStatusStat,
} from "@/components/tool";

/* ────────────────────────────────────────────────────────────────────────── */
/* SEO map — one canonical page, several keyword-targeted aliases             */
/* ────────────────────────────────────────────────────────────────────────── */

type DomainAgeSeo = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
};

const CANONICAL = "/tools/domain-age-checker";

const DA_SEO: Record<string, DomainAgeSeo> = {
  "/tools/domain-age-checker": {
    title: "Domain Age Checker — Free WHOIS Lookup · Ankit Jaiswal",
    description:
      "Check the exact age, registration date, registrar, and expiry of any domain name. Free, instant WHOIS lookup with no signup.",
    h1: "Find out exactly how old any domain is",
    intro:
      "Enter a domain and get the registration date, age, registrar, expiry, and nameservers in under a second. No signup, no quotas, no scraping — this tool talks to the same WHOIS registries Google uses.",
    eyebrow: "WHOIS · Domain age · Registrar lookup",
  },
  "/tools/domain-age": {
    title: "Domain Age Lookup — Instant & Free · Ankit Jaiswal",
    description:
      "Look up the age of any domain. Get creation date, registrar, expiry, and nameservers via live WHOIS — instantly.",
    h1: "Look up the age of any domain in one click",
    intro:
      "Domain age is one of the strongest trust signals on the open web. This tool queries live WHOIS data and returns the exact creation date, age in years and days, registrar, and nameserver footprint of any domain.",
    eyebrow: "Domain age · WHOIS",
  },
  "/tools/whois-lookup": {
    title: "WHOIS Lookup — Free & Instant · Ankit Jaiswal",
    description:
      "Free WHOIS lookup tool. See registrar, creation date, expiry date, status, and nameservers for any domain — no signup, no rate limits.",
    h1: "Free WHOIS lookup — see who owns and when a domain was registered",
    intro:
      "WHOIS is the public registry that records who owns every domain on the internet and when they registered it. This tool fetches that record in real time, parses it cleanly, and shows you the parts that actually matter — registrar, dates, status, and nameservers.",
    eyebrow: "WHOIS lookup",
  },
  "/tools/how-old-is-this-domain": {
    title: "How Old Is This Domain? — Instant Domain Age Check · Ankit Jaiswal",
    description:
      "Find out exactly how old a domain is. Live WHOIS lookup returns creation date, age in years and days, and full registration details — free.",
    h1: "How old is this domain? Find out in one second.",
    intro:
      "Curious whether a website you found is brand new or a decade-old veteran? Drop the domain in below. We pull the live WHOIS record and show the exact day it was first registered, how old it is today, and when it next expires.",
    eyebrow: "Domain age check",
  },
  "/domain-age-checker": {
    title: "Domain Age Checker — Free WHOIS Lookup · Ankit Jaiswal",
    description:
      "Check the exact age, registration date, registrar, and expiry of any domain name. Free, instant WHOIS lookup with no signup.",
    h1: "Find out exactly how old any domain is",
    intro:
      "Enter a domain and get the registration date, age, registrar, expiry, and nameservers in under a second. No signup, no quotas, no scraping — this tool talks to the same WHOIS registries Google uses.",
    eyebrow: "WHOIS · Domain age · Registrar lookup",
  },
};

const DEFAULT_SEO = DA_SEO[CANONICAL];

/* ────────────────────────────────────────────────────────────────────────── */
/* Types & helpers                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

interface WhoisResult {
  domain: string;
  registrar?: string;
  createdDate?: string;
  updatedDate?: string;
  expiresDate?: string;
  ageYears?: number;
  ageDays?: number;
  daysUntilExpiry?: number;
  status?: string[];
  nameServers?: string[];
  source?: string;
  available?: boolean;
}

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

interface RecentLookup {
  domain: string;
  ageYears?: number;
  available?: boolean;
  ts: number;
}

const RECENTS_KEY = "ankit:domain-age:recents:v1";
const MAX_RECENTS = 8;

function loadRecents(): RecentLookup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function saveRecents(items: RecentLookup[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    /* quota exceeded — silently drop */
  }
}

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0]!.split("?")[0]!.split("#")[0]!.split(":")[0]!;
  return d;
}

function isValidDomain(d: string): boolean {
  if (d.length < 3 || d.length > 253) return false;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d)) return false;
  for (const label of d.split(".")) {
    if (label.length === 0 || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }
  return true;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ageBadgeColor(years?: number): { fg: string; bg: string; label: string } {
  if (years == null) return { fg: tokens.text.quiet, bg: "rgba(255,255,255,0.04)", label: "Unknown" };
  if (years >= 10) return { fg: "#86EFAC", bg: "rgba(34,197,94,0.10)", label: "Aged · trusted" };
  if (years >= 3) return { fg: "#7DD3FC", bg: "rgba(56,189,248,0.10)", label: "Established" };
  if (years >= 1) return { fg: "#FCD34D", bg: "rgba(250,204,21,0.10)", label: "Maturing" };
  return { fg: "#FCA5A5", bg: "rgba(248,113,113,0.10)", label: "Fresh" };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Component                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export default function DomainAge() {
  const [location] = useLocation();
  const seo = DA_SEO[location] ?? DEFAULT_SEO;

  const mainRef = useRef<HTMLElement | null>(null);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentLookup[]>([]);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast((p) => ({ ...p, visible: false }));
    }, 2800);
  }, []);

  const lookup = useCallback(
    async (rawInput: string) => {
      const normalized = normalizeDomain(rawInput);
      if (!normalized) {
        setError("Enter a domain like example.com.");
        return;
      }
      if (!isValidDomain(normalized)) {
        setError("That doesn't look like a valid domain. Try something like example.com.");
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
        const res = await fetch(
          `${base}/api/whois?domain=${encodeURIComponent(normalized)}`,
          { signal: ac.signal },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message ?? "Lookup failed. Please try again.");
          setLoading(false);
          return;
        }
        const r = data as WhoisResult;
        setResult(r);
        setLoading(false);

        // Save to recents (most-recent-first, dedup by domain)
        setRecents((prev) => {
          const filtered = prev.filter((p) => p.domain !== r.domain);
          const next = [
            { domain: r.domain, ageYears: r.ageYears, available: r.available, ts: Date.now() },
            ...filtered,
          ].slice(0, MAX_RECENTS);
          saveRecents(next);
          return next;
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError("Network hiccup. Please try again.");
        setLoading(false);
      }
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      showToast("Enter a domain to check", "error");
      inputRef.current?.focus();
      return;
    }
    void lookup(domain);
  };

  const copyValue = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        showToast(`${label} copied`, "success");
      } catch {
        showToast("Couldn't copy — clipboard blocked", "error");
      }
    },
    [showToast],
  );

  const clearRecents = () => {
    setRecents([]);
    try { localStorage.removeItem(RECENTS_KEY); } catch { /* noop */ }
    showToast("Recent lookups cleared", "success");
  };

  /* ──────────────── SEO content (memoized, route-stable) ─────────────────── */
  const faqs: ToolFAQItem[] = useMemo(() => [
    {
      q: "How does this domain age checker work?",
      a: "It performs a live WHOIS lookup against the registry that owns each TLD (Verisign for .com/.net, PIR for .org, country registries for ccTLDs, etc.) and parses the response. The creation date returned is the date the domain was first registered with that registry, not the date the current owner bought it.",
    },
    {
      q: "Is the data real-time or cached?",
      a: "Real-time, with a six-hour cache per domain to be polite to upstream WHOIS servers. Most TLDs rate-limit aggressively, so caching means you (and other users looking up the same domain) get a fast answer without exhausting the registry's quota.",
    },
    {
      q: "Why does Google care about domain age?",
      a: "Google has stated publicly that domain age by itself isn't a ranking factor — but the link history, content history, and trust signals that accumulate over a domain's lifetime absolutely are. A 12-year-old domain has had 12 years to earn backlinks, weather algorithm updates, and be referenced in third-party citations. Age is the wrapper; what's inside is what ranks.",
    },
    {
      q: "Is the registration date the same as the 'first ever' date?",
      a: "Usually yes, but not always. If a domain expires and is re-registered, most registries reset the creation date to the new registration. A handful of registries preserve the original. Treat the date as 'continuously held since', not 'first ever registered'.",
    },
    {
      q: "Why does it say 'Available' for some domains?",
      a: "If the WHOIS registry returns a 'no match' or 'available' response, the domain isn't currently registered. You can usually buy it from any registrar — Namecheap, Porkbun, Cloudflare Registrar, etc.",
    },
    {
      q: "Why does the lookup sometimes fail?",
      a: "WHOIS over port 43 is fragile. Common causes: the TLD's registry is rate-limiting our IP, the registry is down for maintenance, or it's a TLD with restrictive WHOIS policy (some ccTLDs return only a registrar name and nothing else). Try again in a minute, or look up the domain on the registry's own site.",
    },
    {
      q: "Do you store the domains I look up?",
      a: "Only in your browser's localStorage, so 'Recent lookups' survives a refresh. Nothing is sent to my server beyond the WHOIS query itself, and nothing is logged with your IP attached. Clear the list anytime from the recents bar.",
    },
    {
      q: "Can I check expired or expiring domains?",
      a: "Yes. The result card shows the expiry date and 'days until expiry' for any registered domain. If you're domain hunting, look for established domains nearing expiry — they can sometimes be picked up via drop catchers or backorder services if the owner doesn't renew.",
    },
    {
      q: "Does this work for IDN / Unicode domains (бизнес.com, café.fr)?",
      a: "Yes — convert them to Punycode first (xn--... format). Most browsers do this automatically when you paste them in. If your input has accented characters, normalize them to Punycode using any free converter and paste the xn-- version here.",
    },
    {
      q: "What about subdomains like blog.example.com?",
      a: "WHOIS records exist at the registered-domain level (the 'apex' domain), not for subdomains. Looking up blog.example.com will return the WHOIS for example.com. Subdomains are owned and controlled by the apex domain holder.",
    },
  ], []);

  const features: ToolFeature[] = useMemo(() => [
    {
      icon: Zap,
      title: "Live WHOIS, not scraped",
      desc: "Direct queries to the registry that owns each TLD. No third-party data brokers, no stale snapshots, no API quotas to share with strangers.",
    },
    {
      icon: Lock,
      title: "No tracking, no logs",
      desc: "Your queries aren't tied to your IP or stored anywhere persistent. Recent lookups live in your own browser's localStorage.",
    },
    {
      icon: Database,
      title: "Smart caching",
      desc: "Frequently-checked domains return instantly from a 6-hour memory cache, so the registries don't rate-limit us into oblivion.",
    },
    {
      icon: Eye,
      title: "Clean parsed output",
      desc: "WHOIS records are notoriously messy. We extract creation date, expiry, registrar, status, and nameservers into a clean card you can scan in two seconds.",
    },
    {
      icon: Globe,
      title: "Works with every TLD",
      desc: ".com, .org, .io, .ai, .dev, country codes, new gTLDs — if a registry has a public WHOIS endpoint, this tool can read it.",
    },
    {
      icon: ShieldCheck,
      title: "Honest 'available' detection",
      desc: "If the domain is unregistered, you'll see it clearly — no fake age, no misleading data. Go register it before someone else does.",
    },
  ], []);

  const howTo: ToolHowToStep[] = useMemo(() => [
    {
      title: "Type the domain",
      body: "Paste or type any domain — example.com, openai.com, your-niche.io. The leading https://, www., and trailing path are stripped automatically.",
    },
    {
      title: "Hit Check",
      body: "We send a live WHOIS query to the registry that owns the TLD. Most lookups complete in under a second; aggressively-rate-limited TLDs may take 2–3 seconds.",
    },
    {
      title: "Read the card",
      body: "You'll see the registration date, exact age in years and days, registrar, expiry date, status, and nameservers. Click any value to copy it.",
    },
    {
      title: "Compare or save",
      body: "Lookups are saved to a 'Recent' bar at the top of the form so you can quickly re-check or compare a few domains side-by-side. Clear it anytime.",
    },
  ], []);

  const related: RelatedTool[] = useMemo(() => [
    {
      href: "/online-notepad",
      name: "Online Notepad",
      desc: "Distraction-free writing with autosave, exports, and full Markdown.",
    },
    {
      href: "/tools/webp-converter",
      name: "WebP Converter",
      desc: "Convert PNG, JPG, and GIF to WebP — entirely in your browser.",
    },
    {
      href: "/tools/pomodoro",
      name: "Pomodoro Timer",
      desc: "Drift-proof focus timer for the long, methodical hours SEO research actually takes.",
    },
    {
      href: "/tools/youtube-summary",
      name: "YouTube Summary",
      desc: "Turn any video transcript into tuned prompts for ChatGPT, Claude, Perplexity, or Gemini.",
    },
  ], []);

  const jsonLd = useMemo(
    () => buildToolJsonLd({
      name: "Domain Age Checker",
      description: seo.description,
      path: location,
      breadcrumbName: "Domain Age Checker",
      faqs,
    }),
    [seo, location, faqs],
  );

  /* ────────────────────────── Render ───────────────────────── */

  const ageBadge = result?.ageYears != null ? ageBadgeColor(result.ageYears) : null;

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={CANONICAL}
      seoJsonLd={jsonLd}
      title="Domain Age Checker"
      tagline="Live WHOIS lookup — instant, private, free"
      backHref="/tools"
      backLabel="Tools"
    >
      <main className="da-stage" ref={mainRef}>
        <div className="da-card">
          <form onSubmit={handleSubmit} className="da-form">
            <div className="da-input-wrap">
              <Globe size={16} className="da-input-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="da-input"
                aria-label="Domain to look up"
              />
              {domain && (
                <button
                  type="button"
                  className="da-clear"
                  onClick={() => { setDomain(""); inputRef.current?.focus(); }}
                  aria-label="Clear input"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="da-submit"
              disabled={loading}
              aria-label="Check domain age"
            >
              {loading ? (
                <span className="da-spin" aria-hidden="true" />
              ) : (
                <Search size={16} />
              )}
              <span>{loading ? "Checking…" : "Check"}</span>
            </button>
          </form>

          {recents.length > 0 && (
            <div className="da-recents">
              <div className="da-recents-head">
                <span><History size={12} /> Recent</span>
                <button onClick={clearRecents} className="da-recents-clear" aria-label="Clear recent lookups">
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="da-recents-list">
                {recents.map((r) => (
                  <button
                    key={r.domain}
                    className="da-recent-pill"
                    onClick={() => { setDomain(r.domain); void lookup(r.domain); }}
                  >
                    <span className="da-recent-domain">{r.domain}</span>
                    {r.available ? (
                      <span className="da-recent-meta da-recent-avail">available</span>
                    ) : r.ageYears != null ? (
                      <span className="da-recent-meta">{r.ageYears.toFixed(1)}y</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="da-error"
                role="alert"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {loading && !result && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="da-skeleton"
              >
                <div className="da-skel-row" />
                <div className="da-skel-grid">
                  <div className="da-skel-cell" /><div className="da-skel-cell" />
                  <div className="da-skel-cell" /><div className="da-skel-cell" />
                </div>
              </motion.div>
            )}

            {result && !loading && result.available && (
              <motion.div
                key="available"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="da-result da-result-available"
              >
                <div className="da-avail-head">
                  <div className="da-avail-icon"><Check size={20} /></div>
                  <div>
                    <div className="da-avail-title">{result.domain} is available</div>
                    <div className="da-avail-sub">No active WHOIS registration found. You can register this domain right now.</div>
                  </div>
                </div>
                <div className="da-avail-actions">
                  <a
                    href={`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(result.domain)}`}
                    target="_blank" rel="noopener noreferrer nofollow"
                    className="da-avail-cta"
                  >Check on Namecheap →</a>
                  <a
                    href={`https://porkbun.com/checkout/search?q=${encodeURIComponent(result.domain)}`}
                    target="_blank" rel="noopener noreferrer nofollow"
                    className="da-avail-cta"
                  >Porkbun →</a>
                  <a
                    href={`https://dash.cloudflare.com/?to=/:account/registrar/register/${encodeURIComponent(result.domain)}`}
                    target="_blank" rel="noopener noreferrer nofollow"
                    className="da-avail-cta"
                  >Cloudflare →</a>
                </div>
              </motion.div>
            )}

            {result && !loading && !result.available && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="da-result"
              >
                <div className="da-result-head">
                  <div className="da-result-domain">
                    <Globe size={14} />
                    <span>{result.domain}</span>
                    <button
                      className="da-copy-inline"
                      onClick={() => copyValue(result.domain, "Domain")}
                      aria-label="Copy domain"
                    ><Copy size={12} /></button>
                  </div>
                  {ageBadge && (
                    <span
                      className="da-age-badge"
                      style={{ color: ageBadge.fg, background: ageBadge.bg }}
                    >
                      <Clock size={12} /> {ageBadge.label}
                    </span>
                  )}
                </div>

                <div className="da-stat-hero">
                  <div className="da-stat-hero-num">
                    {result.ageYears != null ? result.ageYears.toFixed(2) : "—"}
                  </div>
                  <div className="da-stat-hero-unit">years old</div>
                  {result.ageDays != null && (
                    <div className="da-stat-hero-sub">
                      {result.ageDays.toLocaleString()} days · since {formatDate(result.createdDate)}
                    </div>
                  )}
                </div>

                <div className="da-grid">
                  <ResultRow icon={<Calendar size={14} />} label="Registered"
                    value={formatDate(result.createdDate)}
                    onCopy={result.createdDate ? () => copyValue(formatDate(result.createdDate), "Registration date") : undefined}
                  />
                  <ResultRow icon={<Calendar size={14} />} label="Last updated"
                    value={formatDate(result.updatedDate)}
                  />
                  <ResultRow icon={<Calendar size={14} />} label="Expires"
                    value={formatDate(result.expiresDate)}
                    extra={
                      result.daysUntilExpiry != null ? (
                        <span className={result.daysUntilExpiry < 30 ? "da-expiry-warn" : "da-expiry-ok"}>
                          {result.daysUntilExpiry > 0
                            ? `in ${result.daysUntilExpiry.toLocaleString()} days`
                            : `expired ${Math.abs(result.daysUntilExpiry).toLocaleString()} days ago`}
                        </span>
                      ) : null
                    }
                  />
                  <ResultRow icon={<Building2 size={14} />} label="Registrar"
                    value={result.registrar ?? "—"}
                    onCopy={result.registrar ? () => copyValue(result.registrar!, "Registrar") : undefined}
                  />
                  {result.status && result.status.length > 0 && (
                    <ResultRow icon={<Hash size={14} />} label="Status"
                      value={
                        <div className="da-status-list">
                          {result.status.slice(0, 4).map((s, i) => (
                            <span key={i} className="da-status-chip">{s.split(" ")[0]}</span>
                          ))}
                          {result.status.length > 4 && (
                            <span className="da-status-more">+{result.status.length - 4}</span>
                          )}
                        </div>
                      }
                    />
                  )}
                  {result.nameServers && result.nameServers.length > 0 && (
                    <ResultRow icon={<Server size={14} />} label="Nameservers"
                      value={
                        <div className="da-ns-list">
                          {result.nameServers.slice(0, 4).map((ns, i) => (
                            <code key={i} className="da-ns-chip">{ns}</code>
                          ))}
                          {result.nameServers.length > 4 && (
                            <span className="da-status-more">+{result.nameServers.length - 4}</span>
                          )}
                        </div>
                      }
                    />
                  )}
                </div>

                {result.source && (
                  <div className="da-result-foot">
                    Source: <code>{result.source}</code>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine={<span>Updated April 2026 · By Ankit Jaiswal</span>}
      >
        <ToolSection>
          <SectionHeading
            kicker="The basics"
            title="What WHOIS actually is, and why it exists"
          />
          <p className="tool-prose">
            Every domain on the internet is registered with a registry — Verisign for <code>.com</code> and <code>.net</code>, the Public Interest Registry for <code>.org</code>, Afilias for many new gTLDs, and country-specific registries for <code>.uk</code>, <code>.in</code>, <code>.de</code>, and the rest. When you buy a domain through a registrar (Namecheap, GoDaddy, Cloudflare), they record your registration with the appropriate registry. That record — owner, registration date, expiry, nameservers — is published in a system called WHOIS, originally from 1982 and still running on TCP port 43.
          </p>
          <p className="tool-prose">
            Domain age is just one field in that record: the date the domain was first registered (or, more precisely, the date it was most recently registered after any expiry gap). It's a small piece of data, but it's one of the few publicly verifiable trust signals on the open web — and it's free.
          </p>
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Features" title="Why use this domain age checker" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="How to"
            title="Check any domain's age in four steps"
          />
          <ToolHowToSteps steps={howTo} />
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="The SEO question"
            title="Does domain age actually affect Google rankings?"
          />
          <p className="tool-prose">
            The honest answer: <strong>not directly</strong>. Google's John Mueller has stated more than once that domain age alone isn't a ranking factor. A 20-year-old domain with no content and no links will not outrank a 6-month-old domain with great content and good links.
          </p>
          <p className="tool-prose">
            But that doesn't make age irrelevant — it makes it a <em>proxy</em>. Older domains have had more time to:
          </p>
          <ul className="tool-prose tool-list">
            <li>Earn organic backlinks from real publications.</li>
            <li>Build topical authority through years of consistent publishing.</li>
            <li>Survive multiple algorithm updates without being penalized.</li>
            <li>Be referenced as a citation in Wikipedia, Reddit, and academic papers.</li>
            <li>Develop natural anchor-text diversity that brand-new domains can't fake.</li>
          </ul>
          <p className="tool-prose">
            So when someone says "domain age is a ranking factor", they're using shorthand for "everything that tends to come <em>with</em> domain age is a ranking factor". For SEO due diligence — buying a domain, evaluating a competitor, vetting a guest-post site — age is one of the first three numbers worth checking, alongside referring-domains count and topical history (use the Wayback Machine for that).
          </p>
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Use cases" title="Who actually uses a WHOIS lookup?" />
          <div className="da-use-grid">
            <UseCard icon={<Briefcase size={18} />} title="Domain investors"
              body="Vetting expiring domains before bidding. Age, history, and registrar pattern reveal whether a domain is a real asset or a recently-dropped throwaway."
            />
            <UseCard icon={<TrendingUp size={18} />} title="SEO professionals"
              body="Auditing competitor sites, guest-post outreach targets, and link-building prospects. Age is the first filter — anything under a year usually goes in the 'come back later' bucket."
            />
            <UseCard icon={<FileSearch size={18} />} title="Researchers & journalists"
              body="Tracking when a website first appeared. Useful for fact-checking stories about 'recently-launched' projects, fake-news sites, or astroturfing campaigns."
            />
            <UseCard icon={<Award size={18} />} title="Founders & buyers"
              body="Evaluating a domain for acquisition. Age tells you whether the seller really 'owned it forever' or scooped it from an expired drop last quarter."
            />
          </div>
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="Comparison"
            title="Domain age vs. Domain Authority — they measure different things"
          />
          <div className="tool-prose">
            <p>
              People often conflate <strong>domain age</strong> with <strong>Domain Authority (DA)</strong> or <strong>Domain Rating (DR)</strong>. They aren't the same:
            </p>
            <ul className="tool-list">
              <li><strong>Domain age</strong> is a fact published by the registry. It's binary, public, and free. We get it from WHOIS.</li>
              <li><strong>Domain Authority (Moz)</strong> and <strong>Domain Rating (Ahrefs)</strong> are proprietary scores from third-party SEO companies, calculated from their own (incomplete) crawl of the link graph. They're not Google scores.</li>
            </ul>
            <p>
              An older domain often has higher DA/DR because age and link accumulation correlate — but they aren't the same metric. For a complete competitor audit, you want both: WHOIS for the publicly verifiable facts, plus a third-party tool for the proprietary score.
            </p>
          </div>
        </ToolSection>

        <ToolPrivacyBand
          heading="Your queries stay between you and the registry"
          body="WHOIS lookups happen over a single API call from this server to the appropriate registry. Your IP isn't logged with the query, and your 'recent lookups' list lives only in your own browser's localStorage — clear it any time, or use private browsing for a clean slate."
        />

        <ToolSection>
          <SectionHeading kicker="FAQ" title="Frequently asked questions" />
          <ToolFAQ items={faqs} />
        </ToolSection>

        <FeedbackInlineCard />

        <ToolSection>
          <SectionHeading kicker="Other useful tools" title="More from the toolbox" />
          <ToolRelatedTools items={related} />
        </ToolSection>

        <ToolAuthorCard />
      </ToolSEOArticle>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={`da-toast da-toast-${toast.type}`}
            role="status"
          >
            {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <DomainAgeStyles />

      <ToolStatusBar
        stats={[
          result
            ? { key: "domain", label: result.domain }
            : loading
              ? { key: "status", label: "Looking up…", accent: "warn" }
              : { key: "status", label: "WHOIS lookup ready", accent: "muted" },
          ...(result?.ageYears != null
            ? [{ key: "age", label: `${result.ageYears.toFixed(1)} years old` } as ToolStatusStat]
            : []),
          ...(result?.registrar
            ? [{ key: "reg", label: result.registrar } as ToolStatusStat]
            : []),
          { key: "rec", label: `${recents.length} recent${recents.length === 1 ? "" : "s"}`, accent: "muted" },
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}

/* ──────────────── Subcomponents ──────────────── */

function ResultRow({
  icon, label, value, extra, onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  extra?: React.ReactNode;
  onCopy?: () => void;
}) {
  return (
    <div className="da-row">
      <div className="da-row-label">{icon}<span>{label}</span></div>
      <div className="da-row-value">
        <div className="da-row-value-main">{value}</div>
        {extra && <div className="da-row-value-extra">{extra}</div>}
      </div>
      {onCopy && (
        <button onClick={onCopy} className="da-row-copy" aria-label={`Copy ${label}`}>
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

function UseCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="da-use-card">
      <div className="da-use-icon">{icon}</div>
      <div className="da-use-title">{title}</div>
      <p className="da-use-body">{body}</p>
    </div>
  );
}

/* ──────────────── Styles ──────────────── */

function DomainAgeStyles() {
  return (
    <style>{`
      .da-stage {
        max-width: 720px;
        margin: 0 auto;
        padding: 32px 24px 64px;
      }
      .da-card {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.default};
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 20px 60px -30px rgba(0,0,0,0.6);
      }
      .da-form { display: flex; gap: 10px; }
      .da-input-wrap {
        flex: 1; position: relative; display: flex; align-items: center;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 12px;
        transition: border-color 160ms, background 160ms;
      }
      .da-input-wrap:focus-within {
        border-color: #4F7DFF;
        background: rgba(79, 125, 255, 0.04);
      }
      .da-input-icon {
        position: absolute; left: 14px; color: ${tokens.text.quiet}; pointer-events: none;
      }
      .da-input {
        width: 100%; background: transparent; border: 0; outline: 0;
        padding: 13px 38px 13px 40px;
        font-size: 14px; color: ${tokens.text.primary};
        font-family: ${tokens.font.mono};
        letter-spacing: 0;
      }
      .da-input::placeholder { color: ${tokens.text.quiet}; }
      .da-clear {
        position: absolute; right: 8px; width: 24px; height: 24px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; border: 0; border-radius: 6px;
        color: ${tokens.text.quiet}; cursor: pointer;
        transition: background 140ms, color 140ms;
      }
      .da-clear:hover { background: rgba(255,255,255,0.06); color: ${tokens.text.primary}; }
      .da-submit {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 0 18px; height: 46px; min-width: 110px;
        background: #4F7DFF;
        color: white; border: 0; border-radius: 12px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: filter 160ms, transform 80ms;
        justify-content: center;
      }
      .da-submit:hover { filter: brightness(1.06); }
      .da-submit:active { transform: translateY(1px); }
      .da-submit:disabled { opacity: 0.6; cursor: progress; }
      .da-spin {
        width: 14px; height: 14px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.35);
        border-top-color: white; animation: da-spin 0.7s linear infinite;
      }
      @keyframes da-spin { to { transform: rotate(360deg); } }

      .da-recents {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid ${tokens.border.subtle};
      }
      .da-recents-head {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 11px; color: ${tokens.text.quiet};
        text-transform: uppercase; letter-spacing: 0.06em;
        margin-bottom: 10px;
      }
      .da-recents-head > span { display: inline-flex; align-items: center; gap: 6px; }
      .da-recents-clear {
        display: inline-flex; align-items: center; gap: 4px;
        background: transparent; border: 0; color: ${tokens.text.quiet};
        font-size: 11px; cursor: pointer; padding: 2px 6px; border-radius: 4px;
        transition: color 140ms, background 140ms;
      }
      .da-recents-clear:hover { color: ${tokens.text.muted}; background: rgba(255,255,255,0.04); }
      .da-recents-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .da-recent-pill {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 6px 10px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 999px;
        font-size: 12px; color: ${tokens.text.muted};
        cursor: pointer; font-family: ${tokens.font.mono};
        transition: border-color 140ms, background 140ms, color 140ms;
      }
      .da-recent-pill:hover {
        border-color: ${tokens.border.hover};
        color: ${tokens.text.primary};
      }
      .da-recent-domain { font-weight: 500; }
      .da-recent-meta {
        font-size: 10px; padding: 2px 6px; border-radius: 4px;
        background: rgba(255,255,255,0.04); color: ${tokens.text.quiet};
      }
      .da-recent-avail { color: #86EFAC; background: rgba(34,197,94,0.10); }

      .da-error {
        margin-top: 16px; padding: 12px 14px;
        background: rgba(248, 113, 113, 0.06);
        border: 1px solid rgba(248, 113, 113, 0.18);
        border-radius: 10px;
        display: flex; align-items: center; gap: 10px;
        font-size: 13px; color: #FCA5A5;
      }

      .da-skeleton { margin-top: 18px; }
      .da-skel-row {
        height: 80px; border-radius: 12px;
        background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        background-size: 200% 100%;
        animation: da-shimmer 1.4s linear infinite;
      }
      .da-skel-grid {
        margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      }
      .da-skel-cell {
        height: 44px; border-radius: 8px;
        background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        background-size: 200% 100%;
        animation: da-shimmer 1.4s linear infinite;
      }
      @keyframes da-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .da-result {
        margin-top: 18px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 14px;
        padding: 18px;
      }
      .da-result-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 14px; flex-wrap: wrap; gap: 8px;
      }
      .da-result-domain {
        display: inline-flex; align-items: center; gap: 8px;
        font-family: ${tokens.font.mono}; font-size: 13px;
        color: ${tokens.text.primary};
      }
      .da-copy-inline {
        display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 5px;
        background: transparent; border: 0; color: ${tokens.text.quiet};
        cursor: pointer; transition: background 140ms, color 140ms;
      }
      .da-copy-inline:hover { background: rgba(255,255,255,0.06); color: ${tokens.text.primary}; }
      .da-age-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 999px;
        font-size: 11px; font-weight: 600;
      }

      .da-stat-hero {
        text-align: center; padding: 18px 0 22px;
        border-bottom: 1px solid ${tokens.border.subtle};
        margin-bottom: 14px;
      }
      .da-stat-hero-num {
        font-family: ${tokens.font.display};
        font-size: clamp(44px, 8vw, 64px);
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.025em;
        color: ${tokens.text.primary};
        font-variant-numeric: tabular-nums;
      }
      .da-stat-hero-unit {
        margin-top: 6px;
        font-size: 14px;
        color: ${tokens.text.muted};
        font-weight: 500;
      }
      .da-stat-hero-sub {
        margin-top: 8px;
        font-size: 12px;
        color: ${tokens.text.quiet};
        font-family: ${tokens.font.mono};
      }

      .da-grid { display: flex; flex-direction: column; gap: 2px; }
      .da-row {
        display: grid; grid-template-columns: 130px 1fr auto;
        align-items: start; gap: 12px;
        padding: 10px 4px;
        border-bottom: 1px dashed ${tokens.border.subtle};
      }
      .da-row:last-child { border-bottom: 0; }
      .da-row-label {
        display: inline-flex; align-items: center; gap: 8px;
        color: ${tokens.text.quiet};
        font-size: 12px; font-weight: 500;
        text-transform: uppercase; letter-spacing: 0.04em;
        padding-top: 2px;
      }
      .da-row-value {
        font-size: 13px; color: ${tokens.text.primary};
        font-family: ${tokens.font.mono};
        word-break: break-word;
      }
      .da-row-value-extra {
        margin-top: 4px; font-size: 11px; color: ${tokens.text.quiet};
      }
      .da-expiry-warn { color: #FCA5A5; }
      .da-expiry-ok { color: ${tokens.text.quiet}; }
      .da-row-copy {
        display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 5px;
        background: transparent; border: 0; color: ${tokens.text.quiet};
        cursor: pointer; transition: background 140ms, color 140ms;
        margin-top: 2px;
      }
      .da-row-copy:hover { background: rgba(255,255,255,0.06); color: ${tokens.text.primary}; }

      .da-status-list, .da-ns-list {
        display: flex; flex-wrap: wrap; gap: 4px;
      }
      .da-status-chip {
        font-size: 10px; padding: 3px 8px; border-radius: 4px;
        background: rgba(255,255,255,0.04);
        color: ${tokens.text.muted};
        border: 1px solid ${tokens.border.subtle};
        font-family: ${tokens.font.mono};
      }
      .da-status-more {
        font-size: 10px; padding: 3px 8px; color: ${tokens.text.quiet};
      }
      .da-ns-chip {
        font-size: 11px; padding: 3px 8px; border-radius: 4px;
        background: rgba(79, 125, 255, 0.06);
        color: #93C5FD;
        border: 1px solid rgba(79, 125, 255, 0.15);
        font-family: ${tokens.font.mono};
      }

      .da-result-foot {
        margin-top: 12px;
        font-size: 11px;
        color: ${tokens.text.quiet};
      }
      .da-result-foot code {
        font-family: ${tokens.font.mono};
        background: rgba(255,255,255,0.03);
        padding: 1px 5px; border-radius: 3px;
      }

      /* AVAILABLE state */
      .da-result-available {
        background: linear-gradient(180deg, rgba(34,197,94,0.04), rgba(34,197,94,0.01));
        border-color: rgba(34,197,94,0.18);
      }
      .da-avail-head {
        display: flex; align-items: flex-start; gap: 14px;
      }
      .da-avail-icon {
        width: 40px; height: 40px; border-radius: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(34,197,94,0.10); color: #86EFAC;
        flex-shrink: 0;
      }
      .da-avail-title {
        font-family: ${tokens.font.display};
        font-size: 18px; font-weight: 700;
        color: ${tokens.text.primary};
      }
      .da-avail-sub {
        font-size: 13px; color: ${tokens.text.muted};
        margin-top: 4px;
      }
      .da-avail-actions {
        margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;
      }
      .da-avail-cta {
        padding: 8px 14px; border-radius: 8px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        font-size: 12px; color: ${tokens.text.primary};
        text-decoration: none;
        transition: border-color 140ms, background 140ms, color 140ms;
      }
      .da-avail-cta:hover {
        border-color: ${tokens.border.hover};
        background: rgba(255,255,255,0.04);
      }

      /* Use cases grid (article) */
      .da-use-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .da-use-card {
        padding: 18px;
        background: rgba(255,255,255,0.02);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 14px;
      }
      .da-use-icon {
        width: 36px; height: 36px; border-radius: 9px;
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(79, 125, 255, 0.10); color: #93C5FD;
        margin-bottom: 12px;
      }
      .da-use-title {
        font-family: ${tokens.font.display};
        font-size: 15px; font-weight: 700;
        color: ${tokens.text.primary};
        margin-bottom: 4px;
      }
      .da-use-body {
        font-size: 13px; line-height: 1.55;
        color: ${tokens.text.muted};
        margin: 0;
      }

      /* Toast */
      .da-toast {
        position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
        z-index: 60;
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px; border-radius: 999px;
        font-size: 13px; font-weight: 500;
        backdrop-filter: blur(12px);
        box-shadow: 0 12px 40px -10px rgba(0,0,0,0.6);
      }
      .da-toast-success {
        background: rgba(13, 15, 20, 0.92);
        border: 1px solid rgba(79, 125, 255, 0.35);
        color: #93C5FD;
      }
      .da-toast-error {
        background: rgba(13, 15, 20, 0.92);
        border: 1px solid rgba(248, 113, 113, 0.4);
        color: #FCA5A5;
      }

      @media (max-width: 560px) {
        .da-stage { padding: 20px 16px 48px; }
        .da-card { padding: 16px; border-radius: 14px; }
        .da-form { flex-direction: column; }
        .da-submit { width: 100%; }
        .da-row { grid-template-columns: 100px 1fr auto; gap: 8px; }
        .da-row-label { font-size: 10px; }
        .da-row-value { font-size: 12px; }
      }
    `}</style>
  );
}
