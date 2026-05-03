import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Download, Copy, Check, X, Search, History, Trash2,
  Image as ImageIcon, AlertCircle, Zap, Lock, Eye, Layers,
  ShieldCheck, ExternalLink, Film,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import {
  ToolPage,
  ToolSEOArticle,
  ToolSection,
  SectionHeading,
  ToolFAQ,
  buildFAQJsonLd,
  ToolFeatureGrid,
  ToolHowToSteps,
  ToolPrivacyBand,
  ToolRelatedTools,
  ToolAuthorCard,
  buildToolJsonLd,
  ToolStatusBar,
  type ToolFAQItem,
  type ToolFeature,
  type ToolHowToStep,
  type RelatedTool,
  type ToolStatusStat,
} from "@/components/tool";
import { tokens } from "@/components/tool/tokens";
import { FeedbackInlineCard } from "@/components/FeedbackWidget";

/* ───────────────── Types & constants ───────────────── */

type Quality = {
  key: "maxres" | "sd" | "hq" | "mq" | "default";
  label: string;
  filename: string;
  w: number;
  h: number;
  note: string;
};

const QUALITIES: Quality[] = [
  { key: "maxres",  label: "Max Resolution", filename: "maxresdefault", w: 1280, h: 720, note: "HD — only if the uploader provided a 720p+ source" },
  { key: "sd",      label: "Standard",       filename: "sddefault",     w: 640,  h: 480, note: "4:3 SD — always available, often letterboxed" },
  { key: "hq",      label: "High Quality",   filename: "hqdefault",     w: 480,  h: 360, note: "Always available, ideal for blog headers" },
  { key: "mq",      label: "Medium Quality", filename: "mqdefault",     w: 320,  h: 180, note: "16:9 — perfect for social cards & previews" },
];

type Format = "jpg" | "webp";

type ProbeStatus = "idle" | "loading" | "ok" | "missing";

type ResultMap = Record<Quality["key"], { status: ProbeStatus; actualW?: number; actualH?: number }>;

const initialResults = (): ResultMap => ({
  maxres:  { status: "idle" },
  sd:      { status: "idle" },
  hq:      { status: "idle" },
  mq:      { status: "idle" },
  default: { status: "idle" },
});

type Recent = { id: string; title?: string; addedAt: number };
const RECENTS_KEY = "ytthumb-recents-v1";
const FORMAT_KEY = "ytthumb-format-v1";
const MAX_RECENTS = 8;

/* ───────────────── Aliases & SEO copy ───────────────── */

const CANONICAL = "/tools/yt-thumbnail-downloader";

const ROUTE_ALIASES = [
  "/tools/yt-thumbnail-downloader",
  "/tools/youtube-thumbnail-downloader",
  "/tools/youtube-thumbnail-grabber",
  "/tools/yt-thumbnail",
  "/youtube-thumbnail-downloader",
] as const;

type SeoCopy = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
};

const YT_SEO: Record<string, SeoCopy> = {
  "/tools/yt-thumbnail-downloader": {
    title: "YouTube Thumbnail Downloader — Free, HD, No Signup | Ankit Jaiswal",
    description: "Download any YouTube thumbnail in HD (1280×720), SD, HQ, or medium quality. Paste a video URL or ID, get all four sizes instantly. JPG and WebP. No signup, no watermark, no quota.",
    eyebrow: "Free · HD · No signup",
    h1: "Download any YouTube thumbnail in HD",
    intro: "Paste a YouTube URL or video ID and get every available thumbnail size — instantly, in JPG or WebP, with no signup, no watermark, and no quota.",
  },
  "/tools/youtube-thumbnail-downloader": {
    title: "YouTube Thumbnail Downloader (HD, Free, Instant) | Ankit Jaiswal",
    description: "Free YouTube thumbnail downloader. Get HD 1280×720, SD, and medium thumbnails for any video. Paste the URL — download all four sizes in one click. JPG and WebP supported.",
    eyebrow: "Instant download",
    h1: "Free YouTube thumbnail downloader",
    intro: "Get every available thumbnail size for any YouTube video. Paste the URL, hit go, download in JPG or WebP. No account, no watermark, no upload quota.",
  },
  "/tools/youtube-thumbnail-grabber": {
    title: "YouTube Thumbnail Grabber — All Sizes, JPG & WebP | Ankit Jaiswal",
    description: "Grab any YouTube thumbnail in maxres, SD, HQ, or medium quality. Works with full URLs, youtu.be links, Shorts, and bare video IDs. Free, fast, no signup.",
    eyebrow: "All sizes · JPG · WebP",
    h1: "YouTube thumbnail grabber — all sizes, one click",
    intro: "Grab the maxres, SD, HQ and medium thumbnail for any YouTube video at once. Works with regular URLs, youtu.be links, Shorts, and bare video IDs.",
  },
  "/tools/yt-thumbnail": {
    title: "YT Thumbnail Downloader — HD, Free, No Watermark | Ankit Jaiswal",
    description: "Free tool to extract YouTube thumbnails. HD up to 1280×720. Paste a URL, get downloads for every available size. Privacy-first — runs in your browser.",
    eyebrow: "HD · No watermark",
    h1: "Pull the thumbnail from any YouTube video",
    intro: "Paste any YouTube URL — full link, youtu.be, Shorts, or bare ID — and get every available thumbnail size. No upload, no API key, no watermark.",
  },
  "/youtube-thumbnail-downloader": {
    title: "YouTube Thumbnail Downloader — HD, Free, Privacy-First",
    description: "Download YouTube thumbnails in HD (up to 1280×720). All four available sizes, JPG or WebP, no signup. Runs entirely in your browser.",
    eyebrow: "HD · Free · Privacy-first",
    h1: "Download any YouTube thumbnail",
    intro: "Paste a YouTube URL and download every available thumbnail size. JPG or WebP, no signup, no watermark — runs entirely in your browser.",
  },
};

/* ───────────────── URL parsing ───────────────── */

/**
 * Extract a YouTube video ID from any of the URL forms YouTube emits:
 *   - https://www.youtube.com/watch?v={id}&...
 *   - https://youtu.be/{id}
 *   - https://www.youtube.com/embed/{id}
 *   - https://www.youtube.com/shorts/{id}
 *   - https://www.youtube.com/live/{id}
 *   - https://m.youtube.com/...
 *   - bare {id} (11 chars, [A-Za-z0-9_-])
 */
function parseVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  // Try as URL — accept missing protocol
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

    const segments = url.pathname.split("/").filter(Boolean);
    // /embed/{id}, /shorts/{id}, /live/{id}, /v/{id}
    const known = new Set(["embed", "shorts", "live", "v"]);
    if (segments.length >= 2 && known.has(segments[0])) {
      const id = segments[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  }

  return null;
}

function thumbUrl(id: string, q: Quality, format: Format): string {
  if (format === "webp") return `https://i.ytimg.com/vi_webp/${id}/${q.filename}.webp`;
  return `https://i.ytimg.com/vi/${id}/${q.filename}.jpg`;
}

function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/* ───────────────── Component ───────────────── */

export default function YtThumbnail() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [location] = useLocation();
  const seo = YT_SEO[location] ?? YT_SEO[CANONICAL];

  const [input, setInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultMap>(initialResults());
  const [format, setFormat] = useState<Format>("jpg");
  const [recents, setRecents] = useState<Recent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "", type: "success", visible: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Persisted preferences & recents ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Recent[];
        if (Array.isArray(parsed)) setRecents(parsed.slice(0, MAX_RECENTS));
      }
      const f = localStorage.getItem(FORMAT_KEY);
      if (f === "webp" || f === "jpg") setFormat(f);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(FORMAT_KEY, format); } catch { /* ignore */ }
  }, [format]);

  const persistRecents = useCallback((list: Recent[]) => {
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, []);

  const addRecent = useCallback((id: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      const next = [{ id, addedAt: Date.now() }, ...filtered].slice(0, MAX_RECENTS);
      persistRecents(next);
      return next;
    });
  }, [persistRecents]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    persistRecents([]);
  }, [persistRecents]);

  /* ── Toast ── */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Probing thumbnails ──
   * YouTube returns a 120×90 grey placeholder when a quality doesn't exist
   * (it never returns 404). So we probe by loading each image and measuring
   * naturalWidth — a real maxres returns >120px wide; the placeholder is
   * exactly 120px. This is the only reliable way to detect missing maxres.
   */
  const probeAll = useCallback((id: string) => {
    setResults(initialResults());
    QUALITIES.forEach((q) => {
      setResults((prev) => ({ ...prev, [q.key]: { status: "loading" } }));
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        // YouTube's "missing" placeholder is exactly 120×90.
        // For maxres + sd, anything that small means the source quality wasn't available.
        const isPlaceholder = (q.key === "maxres" || q.key === "sd") && w <= 120;
        setResults((prev) => ({
          ...prev,
          [q.key]: { status: isPlaceholder ? "missing" : "ok", actualW: w, actualH: h },
        }));
      };
      img.onerror = () => {
        setResults((prev) => ({ ...prev, [q.key]: { status: "missing" } }));
      };
      img.src = thumbUrl(id, q, "jpg"); // probe with JPG always; format toggle is for download
    });
  }, []);

  /* ── Submit ── */
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const id = parseVideoId(input);
    if (!id) {
      setError("That doesn't look like a YouTube URL or video ID. Try a full link like https://youtube.com/watch?v=… or https://youtu.be/…");
      setVideoId(null);
      return;
    }
    setVideoId(id);
    addRecent(id);
    probeAll(id);
  }, [input, addRecent, probeAll]);

  const useRecent = useCallback((id: string) => {
    setInput(`https://youtu.be/${id}`);
    setError(null);
    setVideoId(id);
    addRecent(id);
    probeAll(id);
  }, [addRecent, probeAll]);

  /* ── Download / copy ── */
  const downloadOne = useCallback(async (q: Quality) => {
    if (!videoId) return;
    const url = thumbUrl(videoId, q, format);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `youtube-${videoId}-${q.filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      showToast(`Downloaded ${q.label} (${format.toUpperCase()})`);
    } catch {
      // Fallback: open in new tab so user can right-click → Save As
      window.open(url, "_blank", "noopener,noreferrer");
      showToast("Download started in a new tab");
    }
  }, [videoId, format, showToast]);

  const copyUrl = useCallback(async (q: Quality) => {
    if (!videoId) return;
    const url = thumbUrl(videoId, q, format);
    try {
      await navigator.clipboard.writeText(url);
      showToast(`URL copied (${q.label})`);
    } catch {
      showToast("Copy failed — your browser blocked clipboard access", "error");
    }
  }, [videoId, format, showToast]);

  const downloadAll = useCallback(async () => {
    if (!videoId) return;
    const available = QUALITIES.filter((q) => results[q.key].status === "ok");
    for (const q of available) {
      await downloadOne(q);
      await new Promise((r) => setTimeout(r, 350)); // throttle to avoid browser popup throttling
    }
  }, [videoId, results, downloadOne]);

  /* ── SEO content ── */
  const features: ToolFeature[] = useMemo(() => [
    { icon: Zap,         title: "Instant, no API key",       desc: "Thumbnails are public assets on YouTube's CDN. We hit them directly — no quota, no auth dance, no rate limit to share." },
    { icon: Layers,      title: "Every available size",      desc: "We probe maxres, SD, HQ, and medium and only show you the ones that actually exist for this video. No broken placeholder images." },
    { icon: ImageIcon,   title: "JPG or WebP",               desc: "Toggle the format to grab WebP versions — typically 25–35% smaller for the same visual quality. Great for blog post heroes." },
    { icon: Lock,        title: "Nothing leaves your device", desc: "The probe and download happen between your browser and YouTube's CDN. We don't proxy the image, store the URL, or log the lookup." },
    { icon: Eye,         title: "Honest 'missing' detection", desc: "If maxres wasn't generated for this video, we tell you — instead of silently downloading YouTube's 120×90 grey placeholder." },
    { icon: ShieldCheck, title: "Works with everything",     desc: "Full youtube.com URLs, youtu.be short links, Shorts, embed URLs, live streams, and bare 11-character video IDs." },
  ], []);

  const howTo: ToolHowToStep[] = useMemo(() => [
    { title: "Copy the YouTube URL",       body: "From the share button, address bar, or the youtu.be short link — any format works. You can also paste a bare 11-character video ID." },
    { title: "Paste it in the field",      body: "We extract the video ID instantly and show you a live preview the moment you submit. No 'processing' delay." },
    { title: "Pick the size you need",     body: "Maxres (1280×720) for headers and slides, HQ (480×360) for blog posts, medium (320×180) for social cards. Each card shows real dimensions." },
    { title: "Download or copy the URL",   body: "Download saves the file directly to your device. Copy URL gives you a stable i.ytimg.com link you can drop into Markdown, HTML, or a CMS." },
  ], []);

  const faqs: ToolFAQItem[] = useMemo(() => [
    {
      q: "Is downloading YouTube thumbnails legal?",
      a: "Yes — for personal, educational, and reference use. The thumbnail image itself is uploaded by the video creator, who retains copyright. You can save it, share a link to it, or use it in a critique or news context (fair use). For commercial use — like putting it on your own product or in an ad — you need permission from the video's owner. This tool simply makes the public CDN URL convenient; it doesn't alter ownership.",
    },
    {
      q: "Why isn't the maxresdefault available for some videos?",
      a: "YouTube only generates the 1280×720 'maxresdefault.jpg' if the video was uploaded with a 720p (or higher) source file. Older videos, low-resolution uploads, and some Shorts won't have it. When that happens, YouTube returns a generic 120×90 grey placeholder instead of a 404. We detect this by measuring the actual image dimensions and tell you it's missing — so you don't end up with a useless tiny grey image.",
    },
    {
      q: "What's the highest resolution I can get?",
      a: "1280×720 (HD) via the 'maxresdefault' endpoint. YouTube's CDN does not expose anything higher than that publicly — even if the video was uploaded in 4K, the thumbnail asset is still 720p. If you absolutely need a 4K version, you'd have to extract a frame from the actual video, which is a different (and more legally fraught) operation.",
    },
    {
      q: "What's the difference between maxres, SD, HQ, and MQ?",
      a: "Maxres (1280×720) is true HD 16:9. SD (640×480) is 4:3, often letterboxed — useful when a 4:3 ratio is required. HQ (480×360) is the universal 4:3 format that exists for every video. MQ (320×180) is true 16:9 at smaller size — perfect for social cards, embed previews, and inline article images. Pick by the aspect ratio you need first, then by size.",
    },
    {
      q: "Should I download JPG or WebP?",
      a: "WebP is typically 25–35% smaller than JPG for visually identical quality, and is supported in every modern browser. Use WebP if the image is going on a website. Use JPG if it's going into a tool that doesn't accept WebP (some older versions of Word, certain CMS uploaders, etc.). Both come straight from YouTube's CDN — neither is re-encoded by us.",
    },
    {
      q: "Does this work with YouTube Shorts?",
      a: "Yes. Shorts use the same video ID system as regular videos, and YouTube generates thumbnails for them the same way. Paste a youtube.com/shorts/{id} URL or the bare ID and you'll get all available sizes. Note that many Shorts are vertical (9:16) but YouTube still generates landscape 16:9 thumbnails — they'll have black bars on the sides.",
    },
    {
      q: "Will the URLs work if I paste them into my CMS?",
      a: "Yes. The 'Copy URL' button gives you a stable, public i.ytimg.com URL that YouTube has been serving for over a decade with the same naming pattern. As long as the video stays on YouTube, the URL keeps working — drop it into Markdown image syntax, an <img src> tag, WordPress media block, Notion, anywhere.",
    },
    {
      q: "Can I bulk-download thumbnails for many videos?",
      a: "Right now this tool handles one video at a time, but the 'Recent' bar saves the last 8 you've looked up so you can hop between them quickly. If you genuinely need bulk (say, a hundred videos), the URL pattern is predictable: https://i.ytimg.com/vi/{id}/maxresdefault.jpg. A small script can fetch them in seconds.",
    },
    {
      q: "Is this private? Are my lookups logged?",
      a: "Your browser talks directly to YouTube's CDN to fetch the image. Our server never sees the URL or the video ID — there's no API call to us. Your 'recent lookups' list lives in your browser's localStorage and you can clear it any time. Use private browsing if you want a guaranteed-clean slate.",
    },
    {
      q: "Why use this instead of right-click → Save image?",
      a: "Right-clicking on the player gives you the currently-shown poster frame at whatever size the player is rendering, which is usually NOT the high-res version. This tool always pulls the full 1280×720 source from the CDN, in your choice of JPG or WebP, with the exact filename you want. It's the difference between a screenshot and the original asset.",
    },
  ], []);

  const related: RelatedTool[] = useMemo(() => [
    { href: "/online-notepad",            name: "Online Notepad",              desc: "Distraction-free writing surface with autosave, Markdown, and PDF export." },
    { href: "/tools/youtube-summary",     name: "YouTube Summary",             desc: "Paste a YouTube transcript, get hand-tuned prompts for ChatGPT, Claude, Perplexity, or Gemini." },
    { href: "/tools/webp-converter",      name: "WebP Converter",              desc: "Convert PNG, JPG, and GIF to WebP — entirely in your browser." },
    { href: "/tools/paste-to-image",      name: "Paste-to-Image",              desc: "Paste a screenshot or copied image and download it as a file in one click." },
  ], []);

  const jsonLd = useMemo(() => buildToolJsonLd({
    name: "YouTube Thumbnail Downloader",
    description: seo.description,
    path: CANONICAL,
    breadcrumbName: "YouTube Thumbnail Downloader",
    category: "MultimediaApplication",
    faqs,
  }), [seo.description, faqs]);

  /* ── Render ── */

  const anyAvailable = videoId && QUALITIES.some((q) => results[q.key].status === "ok");

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={CANONICAL}
      seoJsonLd={jsonLd}
      title="YouTube Thumbnail Downloader"
      tagline="HD, free, no signup — every available size in one click"
      backHref="/tools"
      backLabel="Tools"
    >
      {/* Surface alternate canonical via Seo even though ToolPage already sets one
          (the alias may differ from canonical — Seo is idempotent on the link tag). */}
      <Seo title={seo.title} description={seo.description} path={CANONICAL} jsonLd={jsonLd} />

      <main className="ytt-stage" ref={mainRef}>
        <div className="ytt-card">
          <form onSubmit={handleSubmit} className="ytt-form">
            <div className="ytt-input-wrap">
              <Youtube size={16} className="ytt-input-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="https://youtube.com/watch?v=… or youtu.be/… or video ID"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="ytt-input"
                aria-label="YouTube video URL or ID"
              />
              {input && (
                <button
                  type="button"
                  className="ytt-clear"
                  onClick={() => { setInput(""); setVideoId(null); setError(null); inputRef.current?.focus(); }}
                  aria-label="Clear input"
                ><X size={14} /></button>
              )}
            </div>
            <button type="submit" className="ytt-submit" aria-label="Get thumbnails">
              <Search size={16} /><span>Get</span>
            </button>
          </form>

          {/* Format toggle */}
          <div className="ytt-format" role="radiogroup" aria-label="Download format">
            <span className="ytt-format-label">Format</span>
            {(["jpg", "webp"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                onClick={() => setFormat(f)}
                className={`ytt-format-pill ${format === f ? "ytt-format-pill-active" : ""}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
            {format === "webp" && (
              <span className="ytt-format-hint">~30% smaller than JPG</span>
            )}
          </div>

          {recents.length > 0 && (
            <div className="ytt-recents">
              <div className="ytt-recents-head">
                <span><History size={12} /> Recent</span>
                <button onClick={clearRecents} className="ytt-recents-clear" aria-label="Clear recent lookups">
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="ytt-recents-list">
                {recents.map((r) => (
                  <button
                    key={r.id}
                    className="ytt-recent-pill"
                    onClick={() => useRecent(r.id)}
                    title={watchUrl(r.id)}
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${r.id}/default.jpg`}
                      alt=""
                      width={32}
                      height={24}
                      className="ytt-recent-thumb"
                      loading="lazy"
                    />
                    <span className="ytt-recent-id">{r.id}</span>
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
                className="ytt-error"
                role="alert"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {videoId && (
              <motion.div
                key={`video-${videoId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ytt-results"
              >
                <div className="ytt-results-head">
                  <div className="ytt-video-meta">
                    <Film size={14} />
                    <code>{videoId}</code>
                    <a
                      href={watchUrl(videoId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ytt-watch-link"
                      title="Open on YouTube"
                    >
                      Watch <ExternalLink size={11} />
                    </a>
                  </div>
                  {anyAvailable && (
                    <button onClick={downloadAll} className="ytt-download-all" type="button">
                      <Download size={13} /> Download all available
                    </button>
                  )}
                </div>

                <div className="ytt-grid">
                  {QUALITIES.map((q) => (
                    <ThumbCard
                      key={q.key}
                      videoId={videoId}
                      quality={q}
                      result={results[q.key]}
                      format={format}
                      onDownload={() => downloadOne(q)}
                      onCopy={() => copyUrl(q)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ───────── SEO article ───────── */}
      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine="Updated April 2026 · By Ankit Jaiswal"
      >
        <ToolSection>
          <SectionHeading kicker="Features" title="Why this thumbnail downloader" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="How to" title="Download a YouTube thumbnail in four steps" />
          <ToolHowToSteps steps={howTo} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="The four sizes" title="Which YouTube thumbnail size should you use?" />
          <div className="tool-prose">
            <p>
              YouTube generates four publicly accessible thumbnail sizes for every video, each with its own ideal use case. Picking the right one matters for both file weight and visual fidelity.
            </p>
            <ul className="tool-list">
              <li><strong>Maxres (1280×720, 16:9 HD)</strong> — the highest quality YouTube exposes. Use it for blog post hero images, presentation slides, video reactions, and anywhere you need the image to look crisp at near-full-screen size. Only exists if the video was uploaded at 720p or higher.</li>
              <li><strong>SD (640×480, 4:3)</strong> — letterboxed standard-def. Useful when you specifically need a 4:3 frame, but its black bars make it a poor choice for most modern web layouts.</li>
              <li><strong>HQ (480×360, 4:3)</strong> — the universal fallback that exists for every YouTube video ever uploaded. Solid choice for inline article images and reasonable file size.</li>
              <li><strong>MQ (320×180, 16:9)</strong> — true 16:9 at smaller size. Perfect for social media cards, video previews in lists, and compact embed previews. Punches above its weight for the file size.</li>
            </ul>
            <p>
              For a blog post hero or LinkedIn post, default to maxres. For an article inline image, HQ is plenty. For a tweet or compact card, MQ is purpose-built. SD is a niche choice you'll almost never need.
            </p>
          </div>
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="The legal question" title="Can you actually use these thumbnails?" />
          <div className="tool-prose">
            <p>
              The thumbnail image itself is a creative work uploaded by the video creator (or auto-generated from a frame they chose). They own the copyright. Downloading the image doesn't change that.
            </p>
            <p><strong>You can almost certainly use a downloaded thumbnail for:</strong></p>
            <ul className="tool-list">
              <li>Personal reference, research, and note-taking.</li>
              <li>Embedding it in a review, critique, news article, or commentary about that video (fair use in the US; equivalent doctrines in most other jurisdictions).</li>
              <li>Using it as part of a link or citation back to the video — for example, a "watch this" card in a blog post.</li>
            </ul>
            <p><strong>You should get explicit permission for:</strong></p>
            <ul className="tool-list">
              <li>Commercial use in your own products, ads, or marketing.</li>
              <li>Modifying it to misrepresent the original video or imply endorsement.</li>
              <li>Use that doesn't link back to or credit the original creator.</li>
            </ul>
            <p>
              When in doubt, the safest pattern is to <strong>link to the YouTube CDN URL</strong> (the "Copy URL" button) rather than re-host the image yourself. That way, if the creator deletes the video or changes the thumbnail, your reference updates automatically — and you're never the host of the image.
            </p>
          </div>
        </ToolSection>

        <ToolPrivacyBand
          heading="Your lookups stay between you and YouTube's CDN"
          body="When you submit a URL, your browser fetches the thumbnail directly from i.ytimg.com — our server never sees the video ID, the URL, or the resulting image. Your 'Recent' bar lives in your own browser's localStorage and clears whenever you tell it to."
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
            className={`ytt-toast ytt-toast-${toast.type}`}
            role="status"
          >
            {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <YtThumbStyles />

      <ToolStatusBar
        stats={[
          videoId
            ? { key: "vid", label: `Video ${videoId}` }
            : { key: "status", label: "Paste a YouTube URL or video ID", accent: "muted" },
          { key: "fmt", label: `Format: ${format.toUpperCase()}` },
          ...(recents.length > 0
            ? [{ key: "rec", label: `${recents.length} recent${recents.length === 1 ? "" : "s"}`, accent: "muted" } as ToolStatusStat]
            : []),
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}

/* ───────────────── ThumbCard subcomponent ───────────────── */

function ThumbCard({
  videoId, quality, result, format, onDownload, onCopy,
}: {
  videoId: string;
  quality: Quality;
  result: { status: ProbeStatus; actualW?: number; actualH?: number };
  format: Format;
  onDownload: () => void;
  onCopy: () => void;
}) {
  const url = thumbUrl(videoId, quality, "jpg"); // preview always uses JPG
  const isMissing = result.status === "missing";
  const isLoading = result.status === "loading" || result.status === "idle";
  const w = result.actualW ?? quality.w;
  const h = result.actualH ?? quality.h;
  const aspectRatio = `${quality.w} / ${quality.h}`;

  return (
    <div className={`ytt-thumb ${isMissing ? "ytt-thumb-missing" : ""}`}>
      <div className="ytt-thumb-preview" style={{ aspectRatio }}>
        {isLoading && <div className="ytt-thumb-skel" />}
        {!isLoading && !isMissing && (
          <img src={url} alt={`${quality.label} thumbnail`} loading="lazy" />
        )}
        {isMissing && (
          <div className="ytt-thumb-empty">
            <ImageIcon size={20} />
            <span>Not available</span>
            <span className="ytt-thumb-empty-sub">Video wasn't uploaded at this resolution</span>
          </div>
        )}
      </div>
      <div className="ytt-thumb-meta">
        <div className="ytt-thumb-label">{quality.label}</div>
        <div className="ytt-thumb-dims">
          {result.status === "ok" ? (
            <>{w}×{h} · {format.toUpperCase()}</>
          ) : (
            <>{quality.w}×{quality.h} · {format.toUpperCase()}</>
          )}
        </div>
        <div className="ytt-thumb-note">{quality.note}</div>
      </div>
      <div className="ytt-thumb-actions">
        <button
          onClick={onDownload}
          disabled={isMissing || isLoading}
          className="ytt-thumb-download"
          type="button"
          aria-label={`Download ${quality.label}`}
        >
          <Download size={13} /> Download
        </button>
        <button
          onClick={onCopy}
          disabled={isMissing || isLoading}
          className="ytt-thumb-copy"
          type="button"
          aria-label={`Copy ${quality.label} URL`}
          title="Copy URL to clipboard"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────── Styles ───────────────── */

function YtThumbStyles() {
  return (
    <style>{`
      .ytt-stage {
        max-width: 880px;
        margin: 0 auto;
        padding: 32px 24px 64px;
      }
      .ytt-card {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.default};
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 20px 60px -30px rgba(0,0,0,0.6);
      }
      .ytt-form { display: flex; gap: 10px; }
      .ytt-input-wrap {
        flex: 1; position: relative; display: flex; align-items: center;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 12px;
        transition: border-color 160ms, background 160ms;
      }
      .ytt-input-wrap:focus-within {
        border-color: #FF4F4F;
        background: rgba(255, 79, 79, 0.04);
      }
      .ytt-input-icon {
        position: absolute; left: 14px; color: ${tokens.text.quiet}; pointer-events: none;
      }
      .ytt-input {
        width: 100%; background: transparent; border: 0; outline: 0;
        padding: 13px 38px 13px 40px;
        font-size: 14px; color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
      }
      .ytt-input::placeholder { color: ${tokens.text.quiet}; }
      .ytt-clear {
        position: absolute; right: 8px; width: 24px; height: 24px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; border: 0; border-radius: 6px;
        color: ${tokens.text.quiet}; cursor: pointer;
        transition: background 140ms, color 140ms;
      }
      .ytt-clear:hover { background: rgba(255,255,255,0.06); color: ${tokens.text.primary}; }
      .ytt-submit {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 0 18px;
        height: 46px;
        background: #3D6BE8;
        color: #fff;
        border: 0;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        font-family: ${tokens.font.body};
        cursor: pointer;
        transition: background 160ms, transform 120ms;
      }
      .ytt-submit:hover { background: #2F5CD9; }
      .ytt-submit:active { transform: translateY(1px); }
      .ytt-submit:focus-visible {
        outline: 2px solid #4F7DFF;
        outline-offset: 2px;
      }

      /* Format toggle */
      .ytt-format {
        display: flex; align-items: center; gap: 8px;
        margin-top: 14px;
      }
      .ytt-format-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: ${tokens.text.quiet};
        margin-right: 4px;
      }
      .ytt-format-pill {
        padding: 5px 12px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        color: ${tokens.text.soft};
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        font-family: ${tokens.font.mono};
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: all 140ms;
      }
      .ytt-format-pill:hover { color: ${tokens.text.primary}; border-color: rgba(255,255,255,0.18); }
      .ytt-format-pill-active {
        background: rgba(79, 125, 255, 0.14);
        color: #4F7DFF;
        border-color: rgba(79, 125, 255, 0.34);
      }
      .ytt-format-hint {
        font-size: 11px;
        color: ${tokens.text.quiet};
        margin-left: 4px;
      }

      /* Recents */
      .ytt-recents { margin-top: 18px; }
      .ytt-recents-head {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: ${tokens.text.quiet};
      }
      .ytt-recents-head span { display: inline-flex; align-items: center; gap: 5px; }
      .ytt-recents-clear {
        background: transparent; border: 0; cursor: pointer;
        color: ${tokens.text.quiet};
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 6px; border-radius: 4px;
      }
      .ytt-recents-clear:hover { color: ${tokens.text.soft}; background: rgba(255,255,255,0.04); }
      .ytt-recents-list {
        display: flex; flex-wrap: wrap; gap: 6px;
      }
      .ytt-recent-pill {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 4px 10px 4px 4px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 999px;
        cursor: pointer;
        transition: all 140ms;
      }
      .ytt-recent-pill:hover {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.16);
      }
      .ytt-recent-thumb {
        width: 32px; height: 24px;
        border-radius: 4px;
        object-fit: cover;
      }
      .ytt-recent-id {
        font-family: ${tokens.font.mono};
        font-size: 11px;
        color: ${tokens.text.soft};
        letter-spacing: 0;
      }

      /* Error */
      .ytt-error {
        display: flex; align-items: center; gap: 10px;
        margin-top: 16px;
        padding: 12px 14px;
        background: rgba(255, 79, 79, 0.08);
        border: 1px solid rgba(255, 79, 79, 0.24);
        border-radius: 10px;
        color: #FF8A8A;
        font-size: 13px;
        line-height: 1.5;
      }
      .ytt-error svg { flex-shrink: 0; }

      /* Results */
      .ytt-results { margin-top: 20px; }
      .ytt-results-head {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 14px;
        flex-wrap: wrap; gap: 10px;
      }
      .ytt-video-meta {
        display: inline-flex; align-items: center; gap: 8px;
        font-family: ${tokens.font.mono};
        font-size: 12px;
        color: ${tokens.text.soft};
      }
      .ytt-video-meta code {
        font-size: 12px;
        color: ${tokens.text.primary};
      }
      .ytt-watch-link {
        display: inline-flex; align-items: center; gap: 4px;
        margin-left: 4px;
        padding: 2px 8px;
        background: rgba(79, 125, 255, 0.10);
        border: 1px solid rgba(79, 125, 255, 0.24);
        border-radius: 999px;
        color: #4F7DFF;
        font-family: ${tokens.font.body};
        font-size: 11px;
        text-decoration: none;
        transition: background 140ms;
      }
      .ytt-watch-link:hover { background: rgba(79, 125, 255, 0.18); }
      .ytt-download-all {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 12px;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.primary};
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 140ms;
      }
      .ytt-download-all:hover { border-color: rgba(79, 125, 255, 0.42); color: #4F7DFF; }

      /* Thumbnail grid */
      .ytt-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
      }
      .ytt-thumb {
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 12px;
        overflow: hidden;
        display: flex; flex-direction: column;
        transition: border-color 160ms;
      }
      .ytt-thumb:hover { border-color: rgba(255,255,255,0.14); }
      .ytt-thumb-missing { opacity: 0.62; }
      .ytt-thumb-preview {
        position: relative;
        background: #000;
        overflow: hidden;
      }
      .ytt-thumb-preview img {
        width: 100%; height: 100%;
        object-fit: cover;
        display: block;
      }
      .ytt-thumb-skel {
        position: absolute; inset: 0;
        background: linear-gradient(90deg,
          rgba(255,255,255,0.03) 0%,
          rgba(255,255,255,0.08) 50%,
          rgba(255,255,255,0.03) 100%);
        background-size: 200% 100%;
        animation: ytt-shimmer 1.4s linear infinite;
      }
      @keyframes ytt-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .ytt-thumb-empty {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px;
        color: ${tokens.text.quiet};
        font-size: 12px;
        text-align: center;
        padding: 12px;
      }
      .ytt-thumb-empty-sub {
        font-size: 10.5px;
        color: rgba(255,255,255,0.32);
        max-width: 200px;
      }
      .ytt-thumb-meta {
        padding: 12px 14px 4px;
      }
      .ytt-thumb-label {
        font-family: ${tokens.font.display};
        font-weight: 600;
        font-size: 14px;
        color: ${tokens.text.primary};
      }
      .ytt-thumb-dims {
        font-family: ${tokens.font.mono};
        font-size: 11.5px;
        color: ${tokens.text.soft};
        margin-top: 2px;
      }
      .ytt-thumb-note {
        font-size: 11.5px;
        color: ${tokens.text.quiet};
        margin-top: 6px;
        line-height: 1.4;
      }
      .ytt-thumb-actions {
        display: flex; gap: 6px;
        padding: 10px 14px 14px;
      }
      .ytt-thumb-download {
        flex: 1;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        padding: 8px 10px;
        background: rgba(79, 125, 255, 0.12);
        border: 1px solid rgba(79, 125, 255, 0.28);
        border-radius: 8px;
        color: #4F7DFF;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: background 140ms;
      }
      .ytt-thumb-download:hover:not(:disabled) {
        background: rgba(79, 125, 255, 0.20);
      }
      .ytt-thumb-download:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .ytt-thumb-copy {
        width: 36px;
        display: inline-flex; align-items: center; justify-content: center;
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.soft};
        cursor: pointer;
        transition: all 140ms;
      }
      .ytt-thumb-copy:hover:not(:disabled) {
        color: ${tokens.text.primary};
        border-color: rgba(255,255,255,0.16);
      }
      .ytt-thumb-copy:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Toast */
      .ytt-toast {
        position: fixed;
        bottom: 32px; left: 50%; transform: translateX(-50%);
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px;
        background: rgba(13, 17, 23, 0.94);
        backdrop-filter: blur(8px);
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.10);
        font-size: 13px;
        color: ${tokens.text.primary};
        z-index: 100;
        box-shadow: 0 12px 40px -12px rgba(0,0,0,0.6);
      }
      .ytt-toast-error { border-color: rgba(255, 79, 79, 0.40); color: #FF8A8A; }
      .ytt-toast-success { border-color: rgba(79, 125, 255, 0.40); color: #93B5FF; }

      @media (max-width: 540px) {
        .ytt-stage { padding: 20px 16px 40px; }
        .ytt-card { padding: 16px; }
        .ytt-form { flex-direction: column; }
        .ytt-submit { height: 44px; }
      }
    `}</style>
  );
}

