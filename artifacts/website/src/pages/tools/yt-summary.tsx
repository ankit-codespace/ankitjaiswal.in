import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, Sparkles, Copy, Check, X, Trash2, Wand2, FileText, ListChecks,
  ListOrdered, BookOpen, Twitter, FileEdit, MessageSquare, BrainCircuit,
  ShieldCheck, Lock, Zap, ExternalLink, History, ClipboardPaste, ArrowUpRight,
  Hash, Quote, Clock, BarChart3, Lightbulb, AlertCircle, Eye,
} from "lucide-react";
import {
  ToolPage, ToolSEOArticle, ToolSection, SectionHeading, ToolFAQ, ToolStatusBar,
  ToolFeatureGrid, ToolHowToSteps, ToolPrivacyBand, ToolRelatedTools,
  ToolAuthorCard, buildToolJsonLd, type ToolFAQItem, type ToolFeature,
  type ToolHowToStep, type RelatedTool, type ToolStatusStat,
} from "@/components/tool";
import { tokens } from "@/components/tool/tokens";
import { FeedbackInlineCard } from "@/components/FeedbackWidget";

/* ───────────────── Aliases & SEO copy ───────────────── */

const CANONICAL = "/tools/youtube-summary";

const ROUTE_ALIASES = [
  "/tools/youtube-summary",
  "/tools/yt-summary",
  "/tools/yt-video-summary",
  "/tools/youtube-transcript-summarizer",
  "/tools/video-to-summary",
  "/youtube-summary",
] as const;

type SeoCopy = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
};

const YS_SEO: Record<string, SeoCopy> = {
  "/tools/youtube-summary": {
    title: "YouTube Summary — Transcript-to-Summary Workbench, Free | Ankit Jaiswal",
    description: "Paste a YouTube transcript and get hand-tuned AI prompts for ChatGPT, Claude, Perplexity & Gemini. Local key-sentence and keyword extraction. No upload, no signup.",
    eyebrow: "Local-first · Free · No signup",
    h1: "Summarize any YouTube video — without giving up your privacy",
    intro: "Paste a YouTube transcript, get instant local analysis (key sentences, keywords, reading time), and one-click prompts for the AI of your choice. The transcript never leaves your browser.",
  },
  "/tools/yt-summary": {
    title: "YT Summary — Free YouTube Transcript Summarizer | Ankit Jaiswal",
    description: "Free YouTube summary tool. Paste a transcript, see local insights, and copy hand-tuned prompts for ChatGPT, Claude, Perplexity, or Gemini. Privacy-first.",
    eyebrow: "Free · Privacy-first",
    h1: "Free YouTube summarizer — your transcript, your AI, your rules",
    intro: "Paste a YouTube transcript, run local key-sentence extraction, and copy a hand-tuned prompt straight into the AI of your choice. Nothing is uploaded anywhere.",
  },
  "/tools/yt-video-summary": {
    title: "YouTube Video Summary Tool — Free, Private, AI-Optimized | Ankit Jaiswal",
    description: "Summarize any YouTube video by pasting its transcript. Local analysis plus six tuned AI prompts (TL;DR, takeaways, action items, study notes, tweet thread, blog draft).",
    eyebrow: "Six prompt presets",
    h1: "YouTube video summary tool, designed for real readers",
    intro: "Paste any YouTube transcript and pick the angle you want — TL;DR, key takeaways, action items, study notes, tweet thread, or blog post — then copy the prompt straight into ChatGPT, Claude, Perplexity, or Gemini.",
  },
  "/tools/youtube-transcript-summarizer": {
    title: "YouTube Transcript Summarizer — Free, Browser-Only | Ankit Jaiswal",
    description: "Free YouTube transcript summarizer that runs entirely in your browser. Get keyword extraction, key-sentence picks, and copy-paste-ready AI prompts for any model.",
    eyebrow: "Browser-only",
    h1: "YouTube transcript summarizer — runs entirely in your browser",
    intro: "Drop any YouTube transcript in. The tool extracts keywords and key sentences locally, then hands you a tuned prompt for ChatGPT, Claude, Perplexity, or Gemini. Your transcript never gets uploaded.",
  },
  "/tools/video-to-summary": {
    title: "Video to Summary — Turn YouTube Transcripts Into Notes | Ankit Jaiswal",
    description: "Turn any YouTube video into TL;DRs, study notes, action items, or a tweet thread. Paste the transcript, pick a format, copy the prompt. Free, private, no signup.",
    eyebrow: "Six summary formats",
    h1: "Turn YouTube videos into the summary format you actually need",
    intro: "Pick the format you want — TL;DR, key takeaways, study notes, action items, tweet thread, blog draft — paste the transcript, copy the tuned prompt, paste into ChatGPT or Claude. Done in under a minute.",
  },
  "/youtube-summary": {
    title: "YouTube Summary — Free Transcript Summarizer | Ankit Jaiswal",
    description: "Free, privacy-first YouTube summary tool. Paste a transcript, get local analysis and tuned prompts for ChatGPT, Claude, Perplexity, or Gemini. No signup.",
    eyebrow: "Free · Private",
    h1: "Get a YouTube summary in under a minute",
    intro: "Paste a YouTube transcript and get instant local analysis plus tuned prompts you can run in ChatGPT, Claude, Perplexity, or Gemini. Everything stays in your browser.",
  },
};

/* ───────────────── Recent videos persistence ───────────────── */

type Recent = { id: string; addedAt: number; transcriptChars: number };
const RECENTS_KEY = "ys-recents-v1";
const TRANSCRIPT_KEY = "ys-transcript-draft-v1";
const PRESET_KEY = "ys-preset-v1";
const MAX_RECENTS = 6;

/* ───────────────── URL parsing ───────────────── */

function parseVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch { return null; }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const segments = url.pathname.split("/").filter(Boolean);
    const known = new Set(["embed", "shorts", "live", "v"]);
    if (segments.length >= 2 && known.has(segments[0])) {
      const id = segments[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  }
  return null;
}

const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/* ───────────────── Transcript parsing & local NLP ───────────────── */

const TIMESTAMP_RE = /^(\d{1,2}:)?\d{1,2}:\d{2}/;

type ParsedTranscript = {
  raw: string;
  cleaned: string;        // text without timestamp lines
  hasTimestamps: boolean;
  segments: number;       // number of timestamp lines, if any
  estDurationSec: number | null; // last timestamp parsed, if any
  words: number;
  chars: number;
  sentences: string[];
};

function parseTimestampToSec(s: string): number | null {
  const m = s.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  return h * 3600 + min * 60 + sec;
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseTranscript(raw: string): ParsedTranscript {
  const lines = raw.split(/\r?\n/);
  let estDurationSec: number | null = null;
  let segments = 0;
  let hasTimestamps = false;
  const cleanedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Detect lines that are *only* a timestamp (YouTube transcript format)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      hasTimestamps = true;
      segments += 1;
      const sec = parseTimestampToSec(trimmed);
      if (sec !== null && (estDurationSec === null || sec > estDurationSec)) {
        estDurationSec = sec;
      }
      continue;
    }
    // Detect lines that *start* with a timestamp followed by text (some exporters)
    const m = trimmed.match(/^(\d{1,2}:\d{2}(:\d{2})?)\s+(.+)$/);
    if (m) {
      hasTimestamps = true;
      segments += 1;
      const sec = parseTimestampToSec(m[1]);
      if (sec !== null && (estDurationSec === null || sec > estDurationSec)) {
        estDurationSec = sec;
      }
      cleanedLines.push(m[3]);
      continue;
    }
    cleanedLines.push(trimmed);
  }
  const cleaned = cleanedLines.join(" ").replace(/\s+/g, " ").trim();
  const words = cleaned ? cleaned.split(/\s+/).length : 0;
  const chars = cleaned.length;
  // Sentence split — approximate, intentionally conservative
  const sentences = cleaned
    ? cleaned
        .replace(/([.!?])\s+(?=[A-Z0-9"'])/g, "$1\u0001")
        .split("\u0001")
        .map((s) => s.trim())
        .filter((s) => s.length > 8)
    : [];
  return {
    raw,
    cleaned,
    hasTimestamps,
    segments,
    estDurationSec,
    words,
    chars,
    sentences,
  };
}

const STOPWORDS = new Set<string>([
  "the","a","an","and","or","but","if","then","else","so","because","as","of","at","by",
  "for","with","about","against","between","into","through","during","before","after",
  "above","below","to","from","up","down","in","out","on","off","over","under","again",
  "further","once","here","there","when","where","why","how","all","any","both","each",
  "few","more","most","other","some","such","no","nor","not","only","own","same","than",
  "too","very","s","t","can","will","just","don","should","now","i","me","my","myself",
  "we","our","ours","ourselves","you","your","yours","yourself","yourselves","he","him",
  "his","himself","she","her","hers","herself","it","its","itself","they","them","their",
  "theirs","themselves","what","which","who","whom","this","that","these","those","am",
  "is","are","was","were","be","been","being","have","has","had","having","do","does",
  "did","doing","would","could","should","ought","i'm","you're","he's","she's","it's",
  "we're","they're","i've","you've","we've","they've","i'd","you'd","he'd","she'd",
  "we'd","they'd","i'll","you'll","he'll","she'll","we'll","they'll","isn't","aren't",
  "wasn't","weren't","hasn't","haven't","hadn't","doesn't","don't","didn't","won't",
  "wouldn't","shan't","shouldn't","can't","cannot","couldn't","mustn't","let's","that's",
  "who's","what's","here's","there's","when's","where's","why's","how's","really","actually",
  "basically","literally","like","yeah","okay","ok","gonna","wanna","kind","sort","stuff",
  "thing","things","get","got","getting","go","going","goes","going","make","makes","made",
  "say","said","says","know","knew","known","think","thought","want","wants","need","needs",
  "see","saw","seen","look","looks","looked","take","took","taken","come","came","let",
  "lets","much","many","also","even","still","always","never","ever","new","old","first",
  "last","long","short","good","bad","big","small","right","wrong","high","low","one",
  "two","three","four","five","six","seven","eight","nine","ten","one's",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

type Keyword = { word: string; count: number };

function extractKeywords(cleanedText: string, top = 12): Keyword[] {
  const tokens = tokenize(cleanedText);
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([word, count]) => ({ word, count }));
}

function extractKeySentences(sentences: string[], keywords: Keyword[], top = 5): string[] {
  if (sentences.length <= top) return sentences;
  const weight = new Map(keywords.map((k, i) => [k.word, keywords.length - i]));
  const scored = sentences.map((s, idx) => {
    const tokens = tokenize(s);
    let score = 0;
    for (const t of tokens) score += weight.get(t) ?? 0;
    // Normalize by sentence length to avoid favouring run-on sentences
    const norm = score / Math.max(8, Math.sqrt(tokens.length));
    // Slight position bias — first 25% of sentences get a small boost
    const positionBoost = idx < sentences.length * 0.25 ? 1.05 : 1;
    return { idx, sentence: s, score: norm * positionBoost };
  });
  // Pick top N by score, then re-sort by original order so the output reads naturally
  const picked = scored.sort((a, b) => b.score - a.score).slice(0, top);
  return picked.sort((a, b) => a.idx - b.idx).map((p) => p.sentence);
}

/* ───────────────── Prompt presets ───────────────── */

type Preset = {
  id: "tldr" | "takeaways" | "actions" | "notes" | "thread" | "blog" | "custom";
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  hint: string;
  build: (transcript: string) => string;
};

const PRESETS: Preset[] = [
  {
    id: "tldr",
    label: "TL;DR (5 sentences)",
    Icon: Zap,
    hint: "Five tight sentences. No filler. Each sentence adds new info.",
    build: (t) =>
      `You are a precise summarizer. Distill the YouTube transcript below into a 5-sentence TL;DR.\n\nRules:\n- Exactly 5 sentences.\n- Each sentence must add new information; no filler, no repetition.\n- Quote any specific facts or numbers verbatim from the source.\n- Output only the 5 sentences, no preamble, no headings.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "takeaways",
    label: "Key takeaways (7 bullets)",
    Icon: ListChecks,
    hint: "Seven discrete ideas, each a complete thought, with verbatim numbers.",
    build: (t) =>
      `Read the YouTube transcript below and extract the 7 most important takeaways.\n\nRules:\n- Exactly 7 bullet points.\n- Each bullet should be a complete idea (a full sentence), not a phrase.\n- Quote any specific facts, numbers, names, or statistics verbatim from the source.\n- Order bullets by importance, not by appearance order.\n- No preamble. Just the 7 bullets.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "actions",
    label: "Action items",
    Icon: ListOrdered,
    hint: "Imperative-mood steps the speaker actually recommends.",
    build: (t) =>
      `You are a productivity coach. From the YouTube transcript below, extract every actionable step the speaker recommends.\n\nRules:\n- Format as a numbered list of imperative-mood action items (e.g. "Block 90 minutes for deep work").\n- Skip motivational language; only include things the viewer can do.\n- If two items can be merged, merge them.\n- If the video has no clear actions, say so in one sentence.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "notes",
    label: "Study notes",
    Icon: BookOpen,
    hint: "Structured notes — concepts, facts, examples, open questions.",
    build: (t) =>
      `Convert the YouTube transcript into clean study notes.\n\nUse exactly this structure (omit a section only if truly empty):\n## Topic\n## Key concepts (with definitions)\n## Important facts (with numbers)\n## Examples mentioned\n## Open questions / things to research\n\nRules:\n- Preserve all numbers, names, and citations verbatim.\n- Bullet points under each H2.\n- No preamble.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "thread",
    label: "Tweet thread (7 tweets)",
    Icon: Twitter,
    hint: "Hook → 5 insight tweets → takeaway. Each ≤ 270 chars.",
    build: (t) =>
      `Turn the YouTube transcript into a 7-tweet Twitter/X thread.\n\nRules:\n- Exactly 7 tweets.\n- Number them as "1/7" through "7/7".\n- Each tweet ≤ 270 characters (leaves room for the number prefix).\n- Tweet 1 must hook with the strongest insight from the video.\n- Tweets 2–6 each carry one distinct idea.\n- Tweet 7 must end with a clear, memorable takeaway.\n- Plain text only. No emojis. No hashtags.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "blog",
    label: "Blog post draft",
    Icon: FileEdit,
    hint: "~800 words. Hook, 3–5 H2s, conclusion. Quotes preserved.",
    build: (t) =>
      `Convert the YouTube transcript into a structured blog post draft of roughly 800 words.\n\nUse this structure:\n# [Punchy headline — under 70 characters]\n\n[2-sentence hook paragraph]\n\n## [H2 section 1]\n[paragraph]\n\n## [H2 section 2]\n[paragraph]\n\n[3 to 5 H2 sections total]\n\n## Conclusion\n[1 paragraph with a clear takeaway]\n\nRules:\n- Preserve all facts, numbers, and quotes verbatim.\n- Mark direct quotes from the speaker with > blockquote.\n- No preamble outside the post itself.\n\n--- Transcript ---\n${t}`,
  },
  {
    id: "custom",
    label: "Custom prompt",
    Icon: Wand2,
    hint: "Write your own. Use {transcript} where the transcript should go.",
    build: (t) => `[Custom prompt — paste yours below or edit]\n\n--- Transcript ---\n${t}`,
  },
];

/* ───────────────── AI providers ───────────────── */

type AiProvider = {
  id: "chatgpt" | "claude" | "perplexity" | "gemini";
  name: string;
  open: (prompt: string) => string; // returns URL to open
  supportsPrefill: boolean;
  brand: string; // accent colour
};

const AI_PROVIDERS: AiProvider[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    open: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
    supportsPrefill: true,
    brand: "#10A37F",
  },
  {
    id: "claude",
    name: "Claude",
    open: () => `https://claude.ai/new`,
    supportsPrefill: false,
    brand: "#D97757",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    open: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p.slice(0, 1500))}`,
    supportsPrefill: true,
    brand: "#20B8CD",
  },
  {
    id: "gemini",
    name: "Gemini",
    open: () => `https://gemini.google.com/app`,
    supportsPrefill: false,
    brand: "#4285F4",
  },
];

/* ───────────────── Component ───────────────── */

export default function YtSummary() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [location] = useLocation();
  const seo = YS_SEO[location] ?? YS_SEO[CANONICAL];

  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [presetId, setPresetId] = useState<Preset["id"]>("tldr");
  const [customPrompt, setCustomPrompt] = useState("");
  const [recents, setRecents] = useState<Recent[]>([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "", type: "success", visible: false,
  });

  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Hydrate persisted state ── */
  useEffect(() => {
    try {
      const t = localStorage.getItem(TRANSCRIPT_KEY);
      if (t) setTranscript(t);
      const p = localStorage.getItem(PRESET_KEY);
      if (p && PRESETS.some((x) => x.id === p)) setPresetId(p as Preset["id"]);
      const r = localStorage.getItem(RECENTS_KEY);
      if (r) {
        const arr = JSON.parse(r);
        if (Array.isArray(arr)) setRecents(arr.slice(0, MAX_RECENTS));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist transcript draft (debounced via the natural state cadence) ── */
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(TRANSCRIPT_KEY, transcript); } catch { /* quota */ }
  }, [transcript, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(PRESET_KEY, presetId); } catch { /* */ }
  }, [presetId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(recents)); } catch { /* */ }
  }, [recents, hydrated]);

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  /* ── Parse video URL ── */
  const handleParseUrl = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const id = parseVideoId(urlInput);
      if (!id) {
        setUrlError("Couldn't find a YouTube video ID in that input.");
        setVideoId(null);
        return;
      }
      setUrlError(null);
      setVideoId(id);
      setRecents((prev) => {
        const filtered = prev.filter((r) => r.id !== id);
        return [{ id, addedAt: Date.now(), transcriptChars: transcript.length }, ...filtered].slice(0, MAX_RECENTS);
      });
    },
    [urlInput, transcript.length],
  );

  const loadRecent = useCallback((id: string) => {
    setVideoId(id);
    setUrlInput(watchUrl(id));
    setUrlError(null);
  }, []);

  const clearVideo = useCallback(() => {
    setVideoId(null);
    setUrlInput("");
    setUrlError(null);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    transcriptRef.current?.focus();
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        showToast("Clipboard is empty", "error");
        return;
      }
      setTranscript((prev) => (prev.trim() ? prev + "\n" + text : text));
      showToast("Pasted from clipboard");
      setTimeout(() => transcriptRef.current?.focus(), 0);
    } catch {
      showToast("Clipboard access denied — paste manually", "error");
    }
  }, [showToast]);

  /* ── Parsed transcript + analysis ── */
  const parsed = useMemo(() => parseTranscript(transcript), [transcript]);
  const keywords = useMemo(() => extractKeywords(parsed.cleaned, 12), [parsed.cleaned]);
  const keySentences = useMemo(
    () => extractKeySentences(parsed.sentences, keywords, 5),
    [parsed.sentences, keywords],
  );

  const readingTimeMin = Math.max(1, Math.round(parsed.words / 220));
  const watchTimeMin = parsed.estDurationSec ? Math.round(parsed.estDurationSec / 60) : null;

  /* ── Generated prompt ── */
  const activePreset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const generatedPrompt = useMemo(() => {
    if (!parsed.cleaned) return "";
    if (presetId === "custom") {
      const tpl = customPrompt.trim() || "Summarize this YouTube transcript:\n\n{transcript}";
      // If the user forgot the {transcript} placeholder, append the transcript
      // at the end automatically — matches the UI hint and prevents a useless
      // prompt that omits the source entirely.
      if (tpl.includes("{transcript}")) {
        return tpl.replace(/\{transcript\}/g, parsed.cleaned);
      }
      return `${tpl}\n\n--- Transcript ---\n${parsed.cleaned}`;
    }
    return activePreset.build(parsed.cleaned);
  }, [activePreset, parsed.cleaned, presetId, customPrompt]);

  const promptChars = generatedPrompt.length;

  const copyPrompt = useCallback(async () => {
    if (!generatedPrompt) {
      showToast("Paste a transcript first", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
      showToast("Prompt copied — paste into your AI of choice");
    } catch {
      showToast("Copy failed — select & copy manually", "error");
    }
  }, [generatedPrompt, showToast]);

  const openInProvider = useCallback(
    async (provider: AiProvider) => {
      if (!generatedPrompt) {
        showToast("Paste a transcript first", "error");
        return;
      }
      // Belt-and-suspenders: try to copy first so the user can paste even if
      // the URL pre-fill fails or the prompt is too long for the URL bar.
      // Track whether the copy actually succeeded so the toast tells the truth.
      let clipboardOk = false;
      try {
        await navigator.clipboard.writeText(generatedPrompt);
        clipboardOk = true;
      } catch { /* permission denied or insecure context */ }

      const url = provider.open(generatedPrompt);
      window.open(url, "_blank", "noopener,noreferrer");

      // ChatGPT and Perplexity URLs can exceed practical browser URL limits
      // for long transcripts — at that point the pre-fill silently drops.
      // Warn the user proactively so they paste from clipboard if needed.
      const URL_PREFILL_LIMIT = 6000;
      const tooLongForPrefill = provider.supportsPrefill && url.length > URL_PREFILL_LIMIT;

      if (provider.supportsPrefill && !tooLongForPrefill) {
        showToast(`Opening ${provider.name} with your prompt`);
      } else if (clipboardOk) {
        showToast(
          tooLongForPrefill
            ? `${provider.name} opened — prompt copied (too long for URL pre-fill)`
            : `${provider.name} can't pre-fill — prompt copied to clipboard`,
        );
      } else {
        showToast(
          `${provider.name} opened — copy the prompt manually (clipboard access denied)`,
          "error",
        );
      }
    },
    [generatedPrompt, showToast],
  );

  /* ── Keyboard: Cmd/Ctrl+Enter to copy prompt ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const t = e.target as HTMLElement | null;
        const inTranscript = t && (t === transcriptRef.current || t === promptRef.current);
        if (inTranscript) {
          e.preventDefault();
          copyPrompt();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copyPrompt]);

  /* ───────────────── Render ───────────────── */

  const faqs: ToolFAQItem[] = [
    {
      q: "Does this tool actually summarize the video for me?",
      a: "It does the parts that can run safely in your browser — keyword extraction, key-sentence picks, reading-time estimates — and then hands you a hand-tuned prompt for the AI of your choice (ChatGPT, Claude, Perplexity, Gemini). The AI does the natural-language summary; this tool makes sure you ask for it the right way.",
    },
    {
      q: "Why not just have an AI summarize directly?",
      a: "Three reasons. First, AIs change, get rate-limited, and often charge for long contexts — by handing you a prompt instead, the tool keeps working forever. Second, you keep full control: you choose the model, you see the prompt, you can edit it. Third, your transcript never gets uploaded to a server you don't control — it sits in your browser and is sent only when you launch the AI yourself.",
    },
    {
      q: "How do I get a YouTube transcript?",
      a: "Open the video on YouTube, click the three-dot menu under the video (or expand the description), and click \"Show transcript.\" A panel opens on the right with timestamped lines. Click any line, press Ctrl+A to select all, then Ctrl+C to copy. Paste into the box on this page. The tool auto-detects timestamps and strips them for the AI prompt while keeping segment counts for analysis.",
    },
    {
      q: "Does it work for videos that don't have a transcript?",
      a: "Many YouTube videos auto-generate captions, which can be exposed as a transcript. If a video has neither auto-captions nor a creator-uploaded transcript, you'll need to transcribe it yourself (Whisper, Otter, or a similar tool) and paste the result here.",
    },
    {
      q: "What does \"local key sentences\" mean?",
      a: "The tool runs a lightweight TextRank-style algorithm in your browser to score every sentence by how many high-frequency, content-bearing words it contains. The top five are shown as a quick local preview before you spend AI tokens. It's not as good as a real summary, but it's instant and gives you a sense of whether the transcript is worth summarizing at all.",
    },
    {
      q: "Will the prompt fit in ChatGPT or Claude?",
      a: "Most transcripts under ~25,000 words fit comfortably in ChatGPT, Claude 3.5/4, Gemini 1.5+, and Perplexity Pro. The tool shows the prompt's character count under the prompt box so you can gauge before pasting. If you hit a context limit, switch to a longer-context model or summarize in two passes (first ask for chapter-by-chapter notes, then a meta-summary).",
    },
    {
      q: "Why six presets and not just one?",
      a: "Different videos need different summaries. A 90-minute lecture deserves study notes; a startup interview is better as action items; a viral essay video deserves a tweet thread. The presets aren't templates — each one is a hand-tuned prompt with explicit constraints (character limits, structure, what to preserve verbatim) that produce noticeably better output than \"summarize this.\"",
    },
    {
      q: "Is my transcript saved anywhere?",
      a: "Only in your browser's localStorage, so the draft survives a page refresh. Nothing is uploaded to any server. You can delete it any time with the trash button, and clearing your browser data wipes it permanently.",
    },
    {
      q: "Can I use this for paid courses or copyrighted content?",
      a: "The tool itself is just a text editor and prompt builder — what you paste into it is up to you, and your responsibility. Always respect the terms of service of the platform you're sourcing from and the copyright of the creator. Educational fair-use summarization for personal study is generally fine; republishing a summary commercially is usually not.",
    },
    {
      q: "Why is the open-in-AI button not always pre-filling the prompt?",
      a: "ChatGPT and Perplexity support a URL parameter that pre-fills the chat box, but Claude and Gemini currently don't. For those two, the tool copies the prompt to your clipboard and opens a fresh chat — you press Ctrl+V and you're done. The toast message tells you which mode you're in.",
    },
  ];

  const features: ToolFeature[] = [
    { icon: Lock, title: "Your transcript never leaves your browser", desc: "All parsing, analysis, keyword extraction and key-sentence picks run client-side in JavaScript. There is no server. There is no upload. There is no tracking." },
    { icon: Wand2, title: "Six hand-tuned prompt presets", desc: "TL;DR, key takeaways, action items, study notes, tweet thread, blog draft. Each preset has explicit constraints that produce dramatically better AI output than \"summarize this.\"" },
    { icon: BrainCircuit, title: "One prompt → any AI", desc: "ChatGPT, Claude, Perplexity, or Gemini. Pre-fill where supported, copy-and-paste everywhere else. The tool keeps working as new models launch." },
    { icon: BarChart3, title: "Local insights before you spend tokens", desc: "See word count, reading time, segment count, top keywords and the five highest-density sentences instantly — so you can decide whether the video is even worth summarizing." },
    { icon: ListOrdered, title: "Smart timestamp parsing", desc: "Drop in a transcript with timestamps and the tool detects them, counts segments, estimates the video duration, then strips them from the prompt so the AI gets clean text." },
    { icon: History, title: "Recent videos remembered locally", desc: "The last six video IDs you parsed are saved in your browser so you can hop back to them. Stored in localStorage only — never synced." },
  ];

  const howTo: ToolHowToStep[] = [
    { title: "Paste the YouTube URL", body: "Drop the full URL, a youtu.be short link, a Shorts URL, or just the bare 11-character video ID. Click Parse — you'll see the video thumbnail and direct watch link as confirmation." },
    { title: "Get the transcript from YouTube", body: "On the video page, expand the description and click \"Show transcript.\" Click any line in the transcript panel, press Ctrl+A to select all, Ctrl+C to copy. Paste into the transcript box here. The tool auto-detects timestamps." },
    { title: "Glance at local insights", body: "The stats bar shows word count, reading time, and segment count. Below it, the keyword chips and key-sentence list give you an instant feel for the video's substance — no AI needed." },
    { title: "Pick a prompt preset", body: "Choose TL;DR for a quick read, study notes for a lecture, action items for a how-to, tweet thread for sharing, blog draft for republishing, or write your own." },
    { title: "Copy or open in your AI", body: "Hit Copy prompt and paste anywhere, or click ChatGPT / Perplexity to open a new chat with the prompt pre-filled. Claude and Gemini get the prompt copied automatically when you launch them." },
  ];

  const related: RelatedTool[] = [
    { name: "Online Notepad", desc: "Distraction-free local writing — a great place to refine the AI summary you get back.", href: "/online-notepad" },
    { name: "Clipboard History", desc: "Save every prompt you craft so you can reuse them across videos and sessions.", href: "/tools/clipboard-history" },
    { name: "YouTube Thumbnail Downloader", desc: "Grab the thumbnail of the same video for your blog post or tweet.", href: "/tools/yt-thumbnail-downloader" },
    { name: "Paste-to-Image", desc: "Turn the prettiest paragraph of your AI summary into a shareable image card.", href: "/tools/paste-to-image" },
  ];

  const jsonLd = buildToolJsonLd({
    name: "YouTube Summary — Transcript Workbench",
    description: seo.description,
    path: CANONICAL,
    breadcrumbName: "YouTube Summary",
    category: "ProductivityApplication",
    faqs,
  });

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={location || CANONICAL}
      seoCanonicalPath={CANONICAL}
      seoKeywords="youtube summary, youtube transcript summarizer, yt summary, video to summary, summarize youtube video, ai summary, chatgpt youtube prompt, claude youtube, perplexity youtube"
      seoJsonLd={jsonLd}
      title="YouTube Summary"
      tagline="Transcript-to-summary workbench"
      backHref="/tools"
      backLabel="Tools"
    >
      <YtsStyles />

      <main className="yts-shell" ref={mainRef}>
        {/* ── Step 1: Video URL ── */}
        <section className="yts-card">
          <header className="yts-card-head">
            <div>
              <p className="yts-eyebrow">Step 1</p>
              <h2 className="yts-card-title">Pick a video</h2>
            </div>
            {videoId && (
              <button type="button" className="yts-ghost" onClick={clearVideo}>
                <X size={13} strokeWidth={2} /> Clear
              </button>
            )}
          </header>

          <form onSubmit={handleParseUrl} className="yts-url-row">
            <div className="yts-url-input-wrap">
              <Youtube size={15} strokeWidth={1.8} className="yts-url-icon" />
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=… · youtu.be/… · or bare 11-char video ID"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); if (urlError) setUrlError(null); }}
                className="yts-url-input"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="yts-primary" disabled={!urlInput.trim()}>
              Parse
            </button>
          </form>

          {urlError && (
            <div className="yts-error">
              <AlertCircle size={13} strokeWidth={2} /> {urlError}
            </div>
          )}

          {videoId && <VideoPreview id={videoId} />}

          {recents.length > 0 && !videoId && (
            <div className="yts-recents">
              <div className="yts-recents-label">
                <History size={11} strokeWidth={1.8} /> Recent
              </div>
              <div className="yts-recents-list">
                {recents.map((r) => (
                  <button key={r.id} type="button" onClick={() => loadRecent(r.id)} className="yts-recent-chip" title={`Video ID ${r.id}`}>
                    <img src={thumbUrl(r.id)} alt="" loading="lazy" />
                    <span className="yts-recent-id">{r.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Step 2: Transcript ── */}
        <section className="yts-card">
          <header className="yts-card-head">
            <div>
              <p className="yts-eyebrow">Step 2</p>
              <h2 className="yts-card-title">Paste the transcript</h2>
              <p className="yts-card-hint">
                On YouTube: expand the description → click "Show transcript" → select all → paste here.
              </p>
            </div>
            <div className="yts-card-actions">
              <button type="button" className="yts-ghost" onClick={pasteFromClipboard}>
                <ClipboardPaste size={13} strokeWidth={2} /> Paste
              </button>
              {transcript && (
                <button type="button" className="yts-ghost" onClick={clearTranscript}>
                  <Trash2 size={13} strokeWidth={2} /> Clear
                </button>
              )}
            </div>
          </header>

          <textarea
            ref={transcriptRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={"0:00\nWelcome back to the channel.\n0:14\nToday we're going to talk about…\n\n— or just a wall of plain text. Both work."}
            className="yts-transcript"
            spellCheck={false}
            aria-label="Transcript text"
          />

          {parsed.cleaned ? (
            <div className="yts-stats">
              <Stat label="Words" value={parsed.words.toLocaleString()} />
              <Stat label="Characters" value={parsed.chars.toLocaleString()} />
              <Stat label="Reading time" value={`${readingTimeMin} min`} hint={`${readingTimeMin}m at 220 wpm`} />
              {parsed.hasTimestamps && (
                <Stat label="Segments" value={parsed.segments.toLocaleString()} hint="Timestamped lines detected" />
              )}
              {watchTimeMin !== null && (
                <Stat label="Est. video length" value={`${watchTimeMin}m`} hint={parsed.estDurationSec ? `Last timestamp · ${formatDuration(parsed.estDurationSec)}` : undefined} />
              )}
              <Stat label="Sentences" value={parsed.sentences.length.toLocaleString()} hint="After local sentence split" />
            </div>
          ) : (
            <div className="yts-stats yts-stats-empty">
              Paste a transcript above and live stats appear here.
            </div>
          )}
        </section>

        {/* ── Step 3: Local insights (keywords + key sentences) ── */}
        {parsed.cleaned && (
          <section className="yts-card">
            <header className="yts-card-head">
              <div>
                <p className="yts-eyebrow">Step 3 · 100% local</p>
                <h2 className="yts-card-title">Quick look</h2>
                <p className="yts-card-hint">
                  Computed in your browser — no AI, no upload. A fast read on what the video is about.
                </p>
              </div>
            </header>

            {keywords.length > 0 && (
              <div className="yts-insight">
                <div className="yts-insight-label">
                  <Hash size={11} strokeWidth={2} /> Top keywords
                </div>
                <div className="yts-keywords">
                  {keywords.map((k) => (
                    <span key={k.word} className="yts-kw">
                      {k.word}
                      <span className="yts-kw-count">{k.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {keySentences.length > 0 && (
              <div className="yts-insight">
                <div className="yts-insight-label">
                  <Quote size={11} strokeWidth={2} /> Likely key sentences
                </div>
                <ol className="yts-keysent">
                  {keySentences.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {/* ── Step 4: Prompt builder ── */}
        <section className="yts-card">
          <header className="yts-card-head">
            <div>
              <p className="yts-eyebrow">Step 4</p>
              <h2 className="yts-card-title">Build the prompt</h2>
              <p className="yts-card-hint">
                Pick a format. Each preset is a hand-tuned prompt with explicit constraints — much better output than "summarize this."
              </p>
            </div>
          </header>

          <div className="yts-presets" role="group" aria-label="Prompt presets">
            {PRESETS.map((p) => {
              const Icon = p.Icon;
              const active = p.id === presetId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  aria-pressed={active}
                  className={`yts-preset${active ? " yts-preset-active" : ""}`}
                >
                  <span className="yts-preset-icon">
                    <Icon size={14} strokeWidth={1.8} />
                  </span>
                  <span className="yts-preset-body">
                    <span className="yts-preset-label">{p.label}</span>
                    <span className="yts-preset-hint">{p.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {presetId === "custom" && (
            <div className="yts-custom-wrap">
              <label htmlFor="yts-custom" className="yts-insight-label">
                <Wand2 size={11} strokeWidth={2} /> Custom prompt template
              </label>
              <textarea
                id="yts-custom"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. You are a research assistant. From the transcript below, extract every cited study with author and year.&#10;&#10;{transcript}"
                className="yts-custom"
                spellCheck={false}
              />
              <p className="yts-custom-hint">
                Use <code>{`{transcript}`}</code> where the transcript should be inserted. Defaults to the end if you omit it.
              </p>
            </div>
          )}

          <div className="yts-prompt-wrap">
            <div className="yts-prompt-head">
              <span className="yts-insight-label">
                <FileText size={11} strokeWidth={2} /> Generated prompt
              </span>
              <span className="yts-prompt-meta">
                {generatedPrompt
                  ? `${promptChars.toLocaleString()} chars · ~${Math.round(promptChars / 4).toLocaleString()} tokens`
                  : "Paste a transcript first"}
              </span>
            </div>
            <textarea
              ref={promptRef}
              value={generatedPrompt}
              readOnly
              placeholder="Your tuned AI prompt will appear here once you've pasted a transcript."
              className="yts-prompt"
              spellCheck={false}
              aria-label="Generated AI prompt"
            />

            <div className="yts-prompt-actions">
              <button
                type="button"
                onClick={copyPrompt}
                disabled={!generatedPrompt}
                className="yts-primary yts-primary-wide"
              >
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                {copied ? "Copied" : "Copy prompt"}
              </button>

              <div className="yts-providers" role="group" aria-label="Open prompt in AI">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openInProvider(p)}
                    disabled={!generatedPrompt}
                    className="yts-provider"
                    style={{ ["--brand" as any]: p.brand }}
                    title={p.supportsPrefill ? `Open ${p.name} with the prompt` : `${p.name} doesn't support pre-fill — prompt will be copied`}
                  >
                    <span className="yts-provider-dot" aria-hidden="true" />
                    {p.name}
                    <ExternalLink size={11} strokeWidth={2} className="yts-provider-ext" />
                  </button>
                ))}
              </div>
            </div>

            <p className="yts-shortcut-hint">
              Tip: press <kbd className="tool-kbd">Ctrl</kbd> + <kbd className="tool-kbd">Enter</kbd> in the transcript or prompt box to copy.
            </p>
          </div>
        </section>
      </main>

      {/* ──────────────────── SEO ARTICLE ──────────────────── */}

      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine="Updated April 2026 · By Ankit Jaiswal"
      >
        <ToolSection width="grid" marginBottom={120}>
          <SectionHeading kicker="What you get" title="Six features the big AI summarizers don't give you" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        <ToolSection width="prose" marginBottom={120}>
          <SectionHeading kicker="How it works" title="Five steps, one minute" />
          <ToolHowToSteps steps={howTo} />
        </ToolSection>

        <ToolSection width="prose" marginBottom={96}>
          <SectionHeading kicker="The honest version" title="Why a workbench beats a one-shot summarizer" />
          <div className="yts-essay">
            <p>
              Most "AI YouTube summarizer" sites work the same way: you paste a URL,
              they fetch the transcript on their server, run it through whatever
              model they've negotiated a discount on, and hand back a wall of bullet
              points you can't tune, can't re-run, and can't trust came from the
              source. That model gets cheaper for them every quarter, but it gets
              less useful for you every month.
            </p>
            <p>
              The honest answer is that <em>the prompt is the product</em>. The same
              transcript run through ChatGPT-4, Claude 3.5 and Gemini 1.5 with the
              <em> same prompt</em> produces three readable summaries that disagree on
              maybe one or two points. Run through three different bad prompts, you get
              three useless walls of text. That's why this tool puts the prompt front
              and center: six presets that have been written, tested, and tightened
              against real videos until they reliably produce the format you asked for —
              not a generic, defensive summary that hedges every claim.
            </p>
            <p>
              Putting you in the loop also fixes the trust problem. When you can see
              the prompt before you send it, you know exactly what's being asked. When
              you choose the model, you know who's reading your transcript. When the
              transcript stays in your browser until you launch the AI yourself, you
              don't have a third-party server in your privacy chain. None of that is
              technically magical — it just requires building the tool around your
              workflow instead of around a margin.
            </p>
            <p>
              The local insights — keyword chips, key sentences, segment count — are
              not trying to replace the AI. They're a triage step. A 90-minute lecture
              with seventeen mentions of "neural network" and three sentences about
              "loss function" is going to summarize differently than one with seventy
              mentions of "team culture." Knowing that in two seconds, before you
              spend ChatGPT credits or wait on Claude, is what makes a workbench
              valuable.
            </p>
            <p>
              And when ChatGPT-5 launches, or when a new open-source model ships next
              month, this tool keeps working. The prompt presets are model-agnostic.
              The local analysis runs on every browser. The whole point is to outlive
              any single AI provider — because they will absolutely rate-limit you,
              raise prices, or change their terms, and you should be ready to switch
              the day they do.
            </p>
          </div>
        </ToolSection>

        <ToolSection width="grid" marginBottom={120}>
          <SectionHeading kicker="The presets" title="Hand-tuned, not templated" />
          <div className="yts-preset-table">
            {PRESETS.filter((p) => p.id !== "custom").map((p) => {
              const Icon = p.Icon;
              return (
                <div key={p.id} className="yts-preset-row">
                  <div className="yts-preset-row-icon">
                    <Icon size={16} strokeWidth={1.7} />
                  </div>
                  <div>
                    <div className="yts-preset-row-label">{p.label}</div>
                    <div className="yts-preset-row-hint">{p.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ToolSection>

        <ToolSection width="privacy" marginBottom={120}>
          <ToolPrivacyBand
            heading="Your transcript stays in your browser"
            body="No server in the loop. The transcript, the analysis, the prompt — all of it lives in your browser tab. We don't have an API to receive it, log it, or train on it. The only outbound request happens when you click Open in ChatGPT (or another AI) and that request is initiated by your browser, to that AI directly."
          />
        </ToolSection>

        <ToolSection width="prose" marginBottom={120}>
          <SectionHeading kicker="Keyboard" title="Two shortcuts worth learning" align="left" />
          <table className="yts-table">
            <thead>
              <tr>
                <th>Shortcut</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd className="tool-kbd">Ctrl</kbd> / <kbd className="tool-kbd">⌘</kbd> + <kbd className="tool-kbd">Enter</kbd></td>
                <td>Copy the generated prompt to your clipboard (works from the transcript or prompt box).</td>
              </tr>
              <tr>
                <td><kbd className="tool-kbd">Ctrl</kbd> + <kbd className="tool-kbd">A</kbd> → <kbd className="tool-kbd">Ctrl</kbd> + <kbd className="tool-kbd">C</kbd></td>
                <td>On YouTube's transcript panel: select all, copy. Then paste here. The most reliable extraction path.</td>
              </tr>
            </tbody>
          </table>
        </ToolSection>

        <ToolSection width="prose" marginBottom={120}>
          <SectionHeading kicker="FAQ" title="Real questions, plainly answered" />
          <ToolFAQ items={faqs} />
        </ToolSection>

        <ToolSection width="grid" marginBottom={120}>
          <SectionHeading kicker="More tools" title="Built by the same person, same standard" />
          <ToolRelatedTools items={related} />
        </ToolSection>

        <ToolAuthorCard bio="I build fast, useful web tools and help businesses become impossible to ignore in the age of AI search. This summarizer reflects how I actually use AI day-to-day: the prompt is the product." />

        <FeedbackInlineCard />
      </ToolSEOArticle>

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`yts-toast${toast.type === "error" ? " yts-toast-error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {toast.type === "success" ? <Check size={14} strokeWidth={2.2} /> : <AlertCircle size={14} strokeWidth={2.2} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <ToolStatusBar
        stats={[
          parsed.words > 0
            ? { key: "w", label: `${parsed.words.toLocaleString()} words` }
            : { key: "status", label: "Paste a transcript to begin", accent: "muted" },
          ...(parsed.words > 0
            ? [{ key: "r", label: `~${readingTimeMin} min read` } as ToolStatusStat]
            : []),
          { key: "p", label: `Preset: ${activePreset.label}`, accent: "muted" },
          ...(recents.length > 0
            ? [{ key: "rec", label: `${recents.length} recent${recents.length === 1 ? "" : "s"}`, accent: "muted" } as ToolStatusStat]
            : []),
        ]}
        shortcuts={[
          {
            group: "Workflow",
            items: [
              { key: "Ctrl+Enter", label: "Build prompt" },
              { key: "Ctrl+C", label: "Copy prompt" },
            ],
          },
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}

/* ───────────────── Sub-components ───────────────── */

function VideoPreview({ id }: { id: string }) {
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <div className="yts-video">
      <div className="yts-video-thumb">
        {thumbOk ? (
          <img
            src={thumbUrl(id)}
            alt="YouTube thumbnail"
            loading="lazy"
            onError={() => setThumbOk(false)}
          />
        ) : (
          <div className="yts-video-thumb-fallback">
            <Youtube size={28} strokeWidth={1.5} />
          </div>
        )}
        <a
          href={watchUrl(id)}
          target="_blank"
          rel="noopener noreferrer"
          className="yts-video-play"
          aria-label="Open the video on YouTube"
        >
          <Eye size={14} strokeWidth={2} />
        </a>
      </div>
      <div className="yts-video-meta">
        <div className="yts-video-id">
          <Youtube size={11} strokeWidth={2} /> {id}
        </div>
        <div className="yts-video-actions">
          <a href={watchUrl(id)} target="_blank" rel="noopener noreferrer" className="yts-video-link">
            Watch on YouTube <ArrowUpRight size={11} strokeWidth={2.2} />
          </a>
          <a
            href={`${watchUrl(id)}#transcript`}
            target="_blank"
            rel="noopener noreferrer"
            className="yts-video-link yts-video-link-soft"
          >
            <Lightbulb size={11} strokeWidth={2} /> Then click "Show transcript" under the description
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="yts-stat" title={hint}>
      <span className="yts-stat-value">{value}</span>
      <span className="yts-stat-label">{label}</span>
    </div>
  );
}

/* ───────────────── Styles ───────────────── */

function YtsStyles() {
  return (
    <style>{`
      .yts-shell {
        max-width: 880px;
        margin: 0 auto;
        padding: 28px 24px 96px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      @media (max-width: 640px) {
        .yts-shell { padding: 20px 16px 72px; gap: 12px; }
      }

      /* ── Card shell ── */
      .yts-card {
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 16px;
        padding: 22px 22px 20px;
      }
      @media (max-width: 640px) { .yts-card { padding: 18px 16px 16px; border-radius: 14px; } }
      .yts-card-head {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 14px; margin-bottom: 14px;
      }
      .yts-eyebrow {
        font-family: ${tokens.font.body};
        font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase;
        color: ${tokens.text.kicker}; font-weight: 600;
        margin: 0 0 6px;
      }
      .yts-card-title {
        font-family: ${tokens.font.display};
        font-size: 17px; font-weight: 700; color: ${tokens.text.primary};
        margin: 0; letter-spacing: -0.01em;
      }
      .yts-card-hint {
        margin: 6px 0 0; font-size: 12.5px; color: ${tokens.text.soft};
        line-height: 1.55; max-width: 60ch;
      }
      .yts-card-actions { display: flex; gap: 6px; flex-shrink: 0; }

      /* ── Buttons ── */
      .yts-primary {
        display: inline-flex; align-items: center; gap: 7px;
        background: #fff; color: #0A0C10;
        border: 1px solid #fff;
        font-family: ${tokens.font.body};
        font-size: 13px; font-weight: 600;
        padding: 9px 16px; border-radius: 10px;
        cursor: pointer; transition: opacity .15s ease, transform .12s ease;
      }
      .yts-primary:hover:not(:disabled) { opacity: 0.92; }
      .yts-primary:active:not(:disabled) { transform: scale(0.98); }
      .yts-primary:disabled { opacity: 0.35; cursor: not-allowed; }
      .yts-primary:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .yts-primary-wide { padding: 11px 18px; font-size: 13.5px; }

      .yts-ghost {
        display: inline-flex; align-items: center; gap: 5px;
        background: transparent; color: ${tokens.text.soft};
        border: 1px solid transparent;
        font-family: ${tokens.font.body};
        font-size: 11.5px; font-weight: 500;
        padding: 5px 9px; border-radius: 7px;
        cursor: pointer;
        transition: color .15s ease, background .15s ease;
      }
      .yts-ghost:hover {
        color: ${tokens.text.primary};
        background: rgba(255,255,255,0.04);
      }
      .yts-ghost:focus-visible {
        outline: 2px solid ${tokens.border.focus};
        outline-offset: 1px;
      }

      /* ── URL row ── */
      .yts-url-row { display: flex; gap: 8px; }
      .yts-url-input-wrap {
        flex: 1; position: relative;
      }
      .yts-url-icon {
        position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
        color: ${tokens.text.quiet}; pointer-events: none;
      }
      .yts-url-input {
        width: 100%;
        background: rgba(0,0,0,0.35);
        border: 1px solid ${tokens.border.default};
        border-radius: 10px;
        padding: 10px 14px 10px 36px;
        font-family: ${tokens.font.body};
        font-size: 13.5px; color: ${tokens.text.primary};
        transition: border-color .15s ease, background .15s ease;
      }
      .yts-url-input::placeholder { color: rgba(255,255,255,0.32); }
      .yts-url-input:focus {
        outline: none;
        border-color: rgba(255,255,255,0.22);
        background: rgba(0,0,0,0.5);
      }
      .yts-error {
        margin-top: 10px;
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; color: #f7a072;
        padding: 6px 10px;
        background: rgba(247,160,114,0.08);
        border: 1px solid rgba(247,160,114,0.18);
        border-radius: 8px;
      }

      /* ── Recent chips ── */
      .yts-recents { margin-top: 14px; }
      .yts-recents-label {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
        color: ${tokens.text.kicker}; font-weight: 600;
        margin-bottom: 8px;
      }
      .yts-recents-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .yts-recent-chip {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(255,255,255,0.025);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 8px; padding: 4px 10px 4px 4px;
        cursor: pointer;
        transition: background .15s ease, border-color .15s ease;
      }
      .yts-recent-chip:hover {
        background: rgba(255,255,255,0.05);
        border-color: ${tokens.border.hover};
      }
      .yts-recent-chip img {
        width: 36px; height: 24px; object-fit: cover;
        border-radius: 4px; display: block;
      }
      .yts-recent-id {
        font-family: ${tokens.font.mono};
        font-size: 11px; color: ${tokens.text.muted};
      }

      /* ── Video preview ── */
      .yts-video {
        display: grid;
        grid-template-columns: 156px 1fr;
        gap: 14px;
        margin-top: 14px;
        padding: 12px;
        background: rgba(255,255,255,0.025);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
      }
      @media (max-width: 520px) {
        .yts-video { grid-template-columns: 1fr; }
      }
      .yts-video-thumb {
        position: relative;
        aspect-ratio: 16/9;
        border-radius: 8px; overflow: hidden;
        background: #000;
      }
      .yts-video-thumb img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .yts-video-thumb-fallback {
        display: flex; align-items: center; justify-content: center;
        width: 100%; height: 100%; color: rgba(255,255,255,0.3);
      }
      .yts-video-play {
        position: absolute; bottom: 6px; right: 6px;
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(0,0,0,0.7); color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
        transition: background .15s ease, transform .12s ease;
      }
      .yts-video-play:hover {
        background: #FF0000;
        transform: scale(1.05);
      }
      .yts-video-meta {
        display: flex; flex-direction: column; gap: 8px;
        min-width: 0;
      }
      .yts-video-id {
        display: inline-flex; align-items: center; gap: 6px;
        font-family: ${tokens.font.mono};
        font-size: 12px; color: ${tokens.text.muted};
      }
      .yts-video-actions { display: flex; flex-direction: column; gap: 4px; }
      .yts-video-link {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 12.5px; color: ${tokens.text.body};
        text-decoration: none;
        align-self: flex-start;
      }
      .yts-video-link:hover { color: ${tokens.text.primary}; }
      .yts-video-link-soft {
        font-size: 11.5px; color: ${tokens.text.soft};
      }

      /* ── Transcript textarea ── */
      .yts-transcript {
        width: 100%;
        min-height: 220px;
        max-height: 480px;
        background: rgba(0,0,0,0.35);
        border: 1px solid ${tokens.border.default};
        border-radius: 10px;
        padding: 14px;
        font-family: ${tokens.font.body};
        font-size: 13.5px; line-height: 1.6;
        color: ${tokens.text.primary};
        resize: vertical;
        transition: border-color .15s ease, background .15s ease;
      }
      .yts-transcript::placeholder { color: rgba(255,255,255,0.28); }
      .yts-transcript:focus {
        outline: none;
        border-color: rgba(255,255,255,0.22);
        background: rgba(0,0,0,0.5);
      }

      /* ── Stats ── */
      .yts-stats {
        margin-top: 12px;
        display: flex; flex-wrap: wrap; gap: 8px;
      }
      .yts-stats-empty {
        padding: 10px 12px;
        background: rgba(255,255,255,0.02);
        border: 1px dashed ${tokens.border.subtle};
        border-radius: 8px;
        font-size: 12.5px; color: ${tokens.text.quiet};
      }
      .yts-stat {
        display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
        padding: 8px 12px;
        background: rgba(255,255,255,0.025);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 8px;
      }
      .yts-stat-value {
        font-family: ${tokens.font.display};
        font-size: 14px; font-weight: 700;
        color: ${tokens.text.primary};
      }
      .yts-stat-label {
        font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;
        color: ${tokens.text.kicker}; font-weight: 500;
      }

      /* ── Insights ── */
      .yts-insight { margin-top: 14px; }
      .yts-insight:first-of-type { margin-top: 0; }
      .yts-insight-label {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
        color: ${tokens.text.kicker}; font-weight: 600;
        margin-bottom: 10px;
      }
      .yts-keywords { display: flex; flex-wrap: wrap; gap: 6px; }
      .yts-kw {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 999px;
        font-size: 12px; color: ${tokens.text.body};
      }
      .yts-kw-count {
        font-family: ${tokens.font.mono};
        font-size: 10.5px;
        color: ${tokens.text.quiet};
        padding: 0 6px;
        border-left: 1px solid ${tokens.border.subtle};
        margin-left: 2px;
      }
      .yts-keysent {
        list-style: decimal; padding-left: 22px; margin: 0;
        display: flex; flex-direction: column; gap: 8px;
      }
      .yts-keysent li {
        font-size: 13.5px; line-height: 1.6;
        color: ${tokens.text.body};
      }

      /* ── Presets grid ── */
      .yts-presets {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px;
      }
      .yts-preset {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 12px 12px;
        background: rgba(255,255,255,0.025);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 10px;
        text-align: left;
        cursor: pointer;
        transition: border-color .15s ease, background .15s ease, transform .12s ease;
      }
      .yts-preset:hover {
        border-color: ${tokens.border.hover};
        background: rgba(255,255,255,0.04);
      }
      .yts-preset-active {
        border-color: rgba(255,255,255,0.32);
        background: rgba(255,255,255,0.06);
      }
      .yts-preset-active:hover { border-color: rgba(255,255,255,0.42); }
      .yts-preset:focus-visible {
        outline: 2px solid ${tokens.border.focus};
        outline-offset: 2px;
      }
      .yts-preset-icon {
        width: 28px; height: 28px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 7px;
        background: rgba(255,255,255,0.04);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.primary};
        flex-shrink: 0;
      }
      .yts-preset-active .yts-preset-icon {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.18);
      }
      .yts-preset-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .yts-preset-label {
        font-family: ${tokens.font.display};
        font-size: 13px; font-weight: 600;
        color: ${tokens.text.primary};
      }
      .yts-preset-hint {
        font-size: 11.5px; color: ${tokens.text.soft};
        line-height: 1.45;
      }

      /* ── Custom preset ── */
      .yts-custom-wrap { margin-top: 14px; }
      .yts-custom {
        width: 100%; min-height: 100px;
        background: rgba(0,0,0,0.35);
        border: 1px solid ${tokens.border.default};
        border-radius: 8px; padding: 10px 12px;
        font-family: ${tokens.font.body};
        font-size: 13px; line-height: 1.55;
        color: ${tokens.text.primary};
        resize: vertical;
      }
      .yts-custom:focus {
        outline: none; border-color: rgba(255,255,255,0.22);
      }
      .yts-custom-hint {
        margin: 6px 0 0; font-size: 11.5px; color: ${tokens.text.quiet};
      }
      .yts-custom-hint code {
        background: rgba(255,255,255,0.05);
        padding: 1px 5px; border-radius: 4px;
        font-family: ${tokens.font.mono}; font-size: 11px;
      }

      /* ── Generated prompt ── */
      .yts-prompt-wrap { margin-top: 18px; }
      .yts-prompt-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 8px; gap: 12px;
      }
      .yts-prompt-meta {
        font-family: ${tokens.font.mono};
        font-size: 11px; color: ${tokens.text.quiet};
      }
      .yts-prompt {
        width: 100%;
        min-height: 160px; max-height: 320px;
        background: rgba(0,0,0,0.45);
        border: 1px solid ${tokens.border.default};
        border-radius: 10px;
        padding: 12px 14px;
        font-family: ${tokens.font.mono};
        font-size: 12px; line-height: 1.6;
        color: ${tokens.text.body};
        resize: vertical;
      }
      .yts-prompt:focus {
        outline: none;
        border-color: rgba(255,255,255,0.22);
      }
      .yts-prompt-actions {
        margin-top: 12px;
        display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      }
      .yts-providers { display: flex; flex-wrap: wrap; gap: 6px; }
      .yts-provider {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 12px;
        background: rgba(255,255,255,0.025);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 8px;
        font-family: ${tokens.font.body};
        font-size: 12.5px; font-weight: 500;
        color: ${tokens.text.body};
        cursor: pointer;
        transition: border-color .15s ease, background .15s ease, transform .12s ease;
      }
      .yts-provider:hover:not(:disabled) {
        border-color: ${tokens.border.hover};
        background: rgba(255,255,255,0.05);
        color: ${tokens.text.primary};
      }
      .yts-provider:disabled { opacity: 0.4; cursor: not-allowed; }
      .yts-provider:focus-visible {
        outline: 2px solid ${tokens.border.focus};
        outline-offset: 2px;
      }
      .yts-provider-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--brand, #fff);
      }
      .yts-provider-ext { color: ${tokens.text.quiet}; }
      .yts-shortcut-hint {
        margin: 12px 0 0;
        font-size: 11.5px; color: ${tokens.text.quiet};
      }

      /* ── Toast ── */
      .yts-toast {
        position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
        z-index: 60;
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px; border-radius: 999px;
        background: rgba(13, 15, 20, 0.95);
        border: 1px solid rgba(255,255,255,0.18);
        backdrop-filter: blur(12px);
        font-family: ${tokens.font.body};
        font-size: 13px; font-weight: 500;
        color: ${tokens.text.primary};
        box-shadow: 0 12px 32px rgba(0,0,0,0.4);
      }
      .yts-toast-error {
        border-color: rgba(247, 160, 114, 0.5);
        color: #f7a072;
      }

      /* ── SEO essay ── */
      .yts-essay { font-family: ${tokens.font.body}; }
      .yts-essay p {
        font-size: 15.5px; line-height: 1.75;
        color: rgba(255,255,255,0.74);
        margin: 0 0 18px;
      }
      .yts-essay p:last-child { margin-bottom: 0; }
      .yts-essay em { color: ${tokens.text.primary}; font-style: italic; }

      /* ── Preset table (SEO) ── */
      .yts-preset-table {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .yts-preset-row {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 16px;
        background: rgba(255,255,255,0.02);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
      }
      .yts-preset-row-icon {
        width: 32px; height: 32px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.primary}; flex-shrink: 0;
      }
      .yts-preset-row-label {
        font-family: ${tokens.font.display};
        font-size: 14.5px; font-weight: 700;
        color: ${tokens.text.primary};
        margin-bottom: 4px;
      }
      .yts-preset-row-hint {
        font-size: 13px; line-height: 1.55;
        color: ${tokens.text.soft};
      }

      /* ── SEO table ── */
      .yts-table {
        width: 100%; border-collapse: collapse;
        font-family: ${tokens.font.body};
      }
      .yts-table th, .yts-table td {
        text-align: left; padding: 12px 14px;
        border-bottom: 1px solid ${tokens.border.subtle};
        font-size: 13.5px; line-height: 1.55;
      }
      .yts-table th {
        font-weight: 600; color: ${tokens.text.primary};
        font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase;
        color: ${tokens.text.kicker};
      }
      .yts-table td { color: ${tokens.text.body}; }

      /* Shared kbd polish — relies on tool-kbd from ToolStyles */
      .tool-kbd {
        display: inline-block;
        padding: 1px 6px;
        font-family: ${tokens.font.mono};
        font-size: 11px;
        background: rgba(255,255,255,0.06);
        border: 1px solid ${tokens.border.default};
        border-radius: 4px;
        color: ${tokens.text.body};
      }
    `}</style>
  );
}

/* Re-export aliases for layout chrome suppression registry */
export const YT_SUMMARY_ALIASES = ROUTE_ALIASES;
