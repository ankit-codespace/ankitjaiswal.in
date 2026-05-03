import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Trash2, Plus, Check, X, Pin, PinOff, Search, Download, Upload,
  Edit3, ExternalLink, Link as LinkIcon, Mail, Code2, Braces, Palette,
  FileText, Clipboard, Shield, Zap, Database, History, Sparkles, Filter,
  ListOrdered, KeyRound, Lock,
} from "lucide-react";
import {
  ToolPage,
  ToolSEOArticle,
  ToolSection,
  SectionHeading,
  ToolFAQ,
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
  type ToolShortcutGroup,
} from "@/components/tool";
import { tokens } from "@/components/tool/tokens";
import { FeedbackInlineCard } from "@/components/FeedbackWidget";

/* ───────────────── Types & constants ───────────────── */

type SnippetType = "url" | "email" | "color" | "json" | "code" | "text";

type Snippet = {
  id: string;
  text: string;
  type: SnippetType;
  pinned: boolean;
  createdAt: number;
};

type SortMode = "recent" | "oldest" | "longest" | "alpha";

const STORAGE_KEY = "clipboard_history_v2";
const LEGACY_KEY = "clipboard_history";
const MAX_ITEMS = 200;
const MAX_BYTES_WARN = 1_500_000; // ~1.5MB — warn before localStorage 5MB cap

const TYPE_META: Record<SnippetType, { label: string; color: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  url:   { label: "URL",   color: "#5BA8FF", Icon: LinkIcon },
  email: { label: "Email", color: "#A78BFA", Icon: Mail },
  color: { label: "Color", color: "#F472B6", Icon: Palette },
  json:  { label: "JSON",  color: "#FBBF24", Icon: Braces },
  code:  { label: "Code",  color: "#34D399", Icon: Code2 },
  text:  { label: "Text",  color: "rgba(255,255,255,0.55)", Icon: FileText },
};

/* ───────────────── Aliases & SEO copy ───────────────── */

const CANONICAL = "/tools/clipboard-history";

type SeoCopy = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
};

const CB_SEO: Record<string, SeoCopy> = {
  "/tools/clipboard-history": {
    title: "Clipboard History — Save & Manage Snippets in Your Browser | Ankit Jaiswal",
    description: "A free, private clipboard history that lives in your browser. Auto-detect URLs, emails, colors, JSON and code. Pin, search, sort, export — no signup, never leaves your device.",
    eyebrow: "Free · Private · Browser-only",
    h1: "Clipboard history that actually respects your privacy",
    intro: "A fast, keyboard-first clipboard manager that runs entirely in your browser. Capture with Ctrl+V, auto-detect what you saved, pin the important stuff, and export everything as JSON when you need it.",
  },
  "/tools/clipboard-history-saver": {
    title: "Clipboard History Saver — Free, Private, No Signup | Ankit Jaiswal",
    description: "Save unlimited clipboard snippets in your browser. Smart type detection (URL, email, JSON, color, code), pin & search, export to JSON. Nothing is ever uploaded.",
    eyebrow: "No signup · No tracking",
    h1: "Save every clipboard snippet — privately, in your browser",
    intro: "Stop losing copied text. Press Ctrl+V to save anything to history, then search, pin, and reuse it anytime. Everything stays on your device.",
  },
  "/tools/clipboard-manager": {
    title: "Browser Clipboard Manager — Free, No Install | Ankit Jaiswal",
    description: "A browser-based clipboard manager with smart type detection, pinning, search, and JSON export. Free, no install, no signup — your snippets never leave your device.",
    eyebrow: "Web-based · Zero install",
    h1: "A clipboard manager that doesn't need an install",
    intro: "Most clipboard managers are native apps that read everything you copy, forever. This one runs in a browser tab, captures only what you ask it to, and stores it on your device.",
  },
  "/tools/snippet-manager": {
    title: "Snippet Manager — Save & Search Text Snippets in Browser | Ankit Jaiswal",
    description: "Free snippet manager for the browser. Save text, code, JSON, URLs and emails with auto-tagging. Search, pin, edit, export. No account, no cloud sync.",
    eyebrow: "Search · Pin · Export",
    h1: "Snippet manager built for the keyboard",
    intro: "Capture text and code snippets with one keystroke, then find them again instantly with full-text search and type filters. Stays on your device.",
  },
  "/clipboard-history": {
    title: "Clipboard History — Free Browser Tool, No Signup",
    description: "Free browser-based clipboard history. Auto-detect URLs, emails, JSON, colors and code. Pin favorites, search, export — runs entirely on your device.",
    eyebrow: "Free · Private",
    h1: "Free clipboard history for your browser",
    intro: "A privacy-first clipboard manager that runs in a tab. Capture with Ctrl+V, auto-detect type, pin and search — nothing is ever sent to a server.",
  },
};

/* ───────────────── Type detection ───────────────── */

function detectType(raw: string): SnippetType {
  const t = raw.trim();
  if (!t) return "text";

  // Hex color (with or without #)
  if (/^#?[0-9a-f]{3}([0-9a-f]{3}|[0-9a-f]{5})?$/i.test(t)) return "color";

  // CSS color functions
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab)\s*\(/i.test(t) && /\)$/.test(t) && t.length < 80) return "color";

  // URL — must have protocol or look very URL-like
  if (/^https?:\/\/\S+$/i.test(t) && !/\s/.test(t)) return "url";

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length < 200) return "email";

  // JSON — try to actually parse the top-level structure
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try { JSON.parse(t); return "json"; } catch { /* fall through */ }
  }

  // Code heuristics: multi-line + code-like punctuation density
  if (t.includes("\n")) {
    const codeyRatio = (t.match(/[{};()=><[\]]/g) ?? []).length / t.length;
    if (codeyRatio > 0.04) return "code";
    if (/^(function|const|let|var|class|import|export|def |async |if \(|for \(|return |#include|<\?php|<!DOCTYPE|<html|<svg|SELECT |INSERT |UPDATE |\$\(|console\.|print\()/m.test(t)) return "code";
  }

  return "text";
}

function tryPrettyJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

/* ───────────────── Time formatting ───────────────── */

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function bytesOf(s: string): number {
  // UTF-16 surrogate-aware approximation; localStorage stores UTF-16.
  return s.length * 2;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/* ───────────────── Component ───────────────── */

export default function ClipboardHistory() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [location] = useLocation();
  const seo = CB_SEO[location] ?? CB_SEO[CANONICAL];

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<SnippetType | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "", type: "success", visible: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tick every 30s so "2m ago" stays current without a per-item interval.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Track when initial load is finished so the persist effect can't fire with
  // an empty array on first paint and overwrite anything sitting in storage —
  // critical for migration safety if the v2 blob is malformed.
  const [hydrated, setHydrated] = useState(false);

  /* ── Load + migrate ── */
  useEffect(() => {
    const tryParseV2 = (raw: string | null): Snippet[] | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((s: any) => s && typeof s.text === "string");
      } catch { return null; }
    };
    const tryMigrateLegacy = (raw: string | null): Snippet[] | null => {
      if (!raw) return null;
      try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return null;
        return arr
          .filter((x: any) => typeof x === "string" && x.trim())
          .map((text: string, i: number) => ({
            id: `m-${Date.now()}-${i}`,
            text,
            type: detectType(text),
            pinned: false,
            createdAt: Date.now() - i * 1000,
          }));
      } catch { return null; }
    };

    const v2 = tryParseV2(localStorage.getItem(STORAGE_KEY));
    if (v2 !== null) {
      setSnippets(v2);
    } else {
      // v2 absent or unreadable — try legacy. Don't overwrite v2 storage with
      // empty until we've at least attempted recovery.
      const migrated = tryMigrateLegacy(localStorage.getItem(LEGACY_KEY));
      if (migrated) setSnippets(migrated);
    }
    setHydrated(true);
  }, []);

  /* ── Persist (gated until hydration completes) ── */
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets)); } catch { /* quota */ }
  }, [snippets, hydrated]);

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Save snippet (dedupe by exact text) ── */
  const addSnippet = useCallback((text: string, source: "manual" | "paste" = "manual") => {
    const trimmed = text.replace(/\s+$/g, "");
    if (!trimmed.trim()) return;
    setSnippets((prev) => {
      // Dedupe: if identical text already exists, bump it to top (preserve pin)
      const existing = prev.find((s) => s.text === trimmed);
      if (existing) {
        const rest = prev.filter((s) => s.id !== existing.id);
        showToast("Already saved — moved to top");
        return [{ ...existing, createdAt: Date.now() }, ...rest];
      }
      const item: Snippet = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: trimmed,
        type: detectType(trimmed),
        pinned: false,
        createdAt: Date.now(),
      };
      const combined = [item, ...prev];
      // Cap-aware eviction: pinned items are never auto-removed. Drop the
      // oldest unpinned snippet first; only refuse the new save if every
      // slot is pinned.
      if (combined.length <= MAX_ITEMS) {
        showToast(source === "paste" ? "Captured from clipboard" : "Saved to history");
        return combined;
      }
      // Find an unpinned victim — scan from oldest end. Skip the new item
      // (which is at index 0 and not pinned but we want to keep).
      let victimIdx = -1;
      for (let i = combined.length - 1; i >= 1; i--) {
        if (!combined[i].pinned) { victimIdx = i; break; }
      }
      if (victimIdx === -1) {
        // Every existing item is pinned — refuse rather than evict pinned data.
        showToast("History full of pinned items — unpin one to save", "error");
        return prev;
      }
      const trimmedList = combined.filter((_, i) => i !== victimIdx);
      showToast(source === "paste" ? "Captured from clipboard" : "Saved to history");
      return trimmedList;
    });
  }, [showToast]);

  const handleManualSave = useCallback(() => {
    if (!input.trim()) return;
    addSnippet(input, "manual");
    setInput("");
  }, [input, addSnippet]);

  /* ── Per-item actions ── */
  const copySnippet = useCallback(async (s: Snippet, opts?: { pretty?: boolean }) => {
    const out = opts?.pretty && s.type === "json" ? tryPrettyJson(s.text) : s.text;
    try {
      await navigator.clipboard.writeText(out);
      showToast(opts?.pretty ? "Copied (formatted)" : "Copied to clipboard");
    } catch {
      showToast("Couldn't access clipboard", "error");
    }
  }, [showToast]);

  const togglePin = useCallback((id: string) => {
    setSnippets((prev) => prev.map((s) => s.id === id ? { ...s, pinned: !s.pinned } : s));
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const startEdit = useCallback((s: Snippet) => {
    setEditingId(s.id);
    setEditText(s.text);
    // Focus on next frame after the textarea mounts.
    requestAnimationFrame(() => editRef.current?.focus());
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const t = editText.replace(/\s+$/g, "");
    if (!t.trim()) {
      // Empty edit deletes the snippet for convenience.
      deleteSnippet(editingId);
      setEditingId(null);
      setEditText("");
      showToast("Snippet deleted");
      return;
    }
    setSnippets((prev) => prev.map((s) => s.id === editingId ? { ...s, text: t, type: detectType(t) } : s));
    setEditingId(null);
    setEditText("");
    showToast("Snippet updated");
  }, [editingId, editText, deleteSnippet, showToast]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  /* ── Bulk ── */
  const clearAll = useCallback(() => {
    setSnippets([]);
    setConfirmingClear(false);
    showToast("History cleared");
  }, [showToast]);

  const exportJson = useCallback(() => {
    if (!snippets.length) {
      showToast("Nothing to export", "error");
      return;
    }
    const payload = {
      schema: "ankitjaiswal.in/clipboard-history",
      version: 2,
      exportedAt: new Date().toISOString(),
      count: snippets.length,
      snippets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `clipboard-history-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Exported ${snippets.length} snippet${snippets.length === 1 ? "" : "s"}`);
  }, [snippets, showToast]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let incoming: any[] = [];
      if (Array.isArray(data)) incoming = data;
      else if (Array.isArray(data?.snippets)) incoming = data.snippets;
      else throw new Error("Unrecognized format");

      const valid: Snippet[] = incoming
        .map((s: any) => {
          // Accept both v2 snippet objects and bare strings.
          const txt = typeof s === "string" ? s : (typeof s?.text === "string" ? s.text : null);
          if (!txt || !txt.trim()) return null;
          return {
            id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: txt,
            type: detectType(txt),
            pinned: typeof s === "object" && !!s?.pinned,
            createdAt: typeof s === "object" && typeof s?.createdAt === "number" ? s.createdAt : Date.now(),
          } as Snippet;
        })
        .filter((x): x is Snippet => !!x);

      if (!valid.length) {
        showToast("No snippets found in file", "error");
        return;
      }

      setSnippets((prev) => {
        // Merge by deduped text, prefer existing pin/createdAt where present.
        const byText = new Map<string, Snippet>();
        prev.forEach((s) => byText.set(s.text, s));
        valid.forEach((s) => {
          if (!byText.has(s.text)) byText.set(s.text, s);
        });
        const merged = Array.from(byText.values()).slice(0, MAX_ITEMS);
        return merged;
      });
      showToast(`Imported ${valid.length} snippet${valid.length === 1 ? "" : "s"}`);
    } catch {
      showToast("Couldn't read that file", "error");
    }
  }, [showToast]);

  /* ── Global Ctrl+V capture & shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || (t?.isContentEditable ?? false);

      // Ctrl/Cmd+V outside any input → capture from clipboard
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && !inField) {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text && text.trim()) addSnippet(text, "paste");
          else showToast("Clipboard is empty", "error");
        }).catch(() => {
          showToast("Browser blocked clipboard read — paste into the input", "error");
          inputRef.current?.focus();
        });
        return;
      }

      // "/" focus search (when not typing)
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Esc — close edit dialog or clear search/confirm
      if (e.key === "Escape") {
        if (editingId) { cancelEdit(); return; }
        if (confirmingClear) { setConfirmingClear(false); return; }
        if (search && document.activeElement === searchRef.current) {
          setSearch("");
          return;
        }
      }

      // Ctrl+S in main input → save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" &&
          (t === inputRef.current)) {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addSnippet, showToast, editingId, cancelEdit, confirmingClear, search, handleManualSave]);

  /* ── Derived: filtered + sorted list ── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = snippets.filter((s) => {
      if (filterType !== "all" && s.type !== filterType) return false;
      if (q && !s.text.toLowerCase().includes(q)) return false;
      return true;
    });
    const cmp = (a: Snippet, b: Snippet) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortMode) {
        case "recent":  return b.createdAt - a.createdAt;
        case "oldest":  return a.createdAt - b.createdAt;
        case "longest": return b.text.length - a.text.length;
        case "alpha":   return a.text.localeCompare(b.text);
      }
    };
    return [...list].sort(cmp);
  }, [snippets, search, filterType, sortMode]);

  /* ── Type filter chip counts ── */
  const counts = useMemo(() => {
    const c: Record<SnippetType | "all", number> = { all: snippets.length, url: 0, email: 0, color: 0, json: 0, code: 0, text: 0 };
    snippets.forEach((s) => { c[s.type] += 1; });
    return c;
  }, [snippets]);

  const totalBytes = useMemo(() => snippets.reduce((acc, s) => acc + bytesOf(s.text), 0), [snippets]);
  const overWarn = totalBytes > MAX_BYTES_WARN;

  /* ───────────────── SEO data ───────────────── */

  const features: ToolFeature[] = [
    { icon: Zap, title: "One-key capture", desc: "Press Ctrl+V anywhere on the page to capture whatever's on your clipboard. No clicking around." },
    { icon: Sparkles, title: "Auto-detect type", desc: "URLs, emails, hex colors, JSON, code, and plain text are tagged automatically — and rendered with the right affordances." },
    { icon: Pin, title: "Pin what matters", desc: "Important snippets stay at the top. Pinned items survive sort changes and aren't pushed out by the 200-item cap." },
    { icon: Search, title: "Instant search", desc: "Full-text search across every snippet. Press / from anywhere to jump straight into the search box." },
    { icon: Database, title: "Export & import", desc: "Download your entire history as a JSON file. Import it on another device — or merge with your existing list." },
    { icon: Lock, title: "Stays on your device", desc: "Everything is stored in your browser's localStorage. Nothing is uploaded, no account exists, no analytics watch what you save." },
  ];

  const steps: ToolHowToStep[] = [
    { title: "Open the tool in a browser tab", body: "No install, no extension. The page works offline once it's loaded — refresh-proof, restart-proof." },
    { title: "Press Ctrl+V (or Cmd+V on Mac)", body: "Anywhere on the page — outside any input — to capture whatever's on your clipboard. Or paste into the input box and click Save Snippet." },
    { title: "Your snippet is auto-tagged", body: "URLs, emails, hex colors, JSON and code blocks are detected automatically and tagged with the right icon and colour." },
    { title: "Pin, search, edit, reuse", body: "Pin important snippets to the top. Search with /, filter by type, edit in place, or copy back to clipboard with one click." },
    { title: "Export when you need to", body: "Download everything as a JSON file. Move between machines, back up your snippets, or share a curated set with a teammate." },
  ];

  const faqs: ToolFAQItem[] = [
    {
      q: "Where are my snippets actually stored?",
      a: "In your browser's localStorage, on this device, scoped to the ankitjaiswal.in domain. They never leave your machine. There is no account, no sync, no server-side database. If you clear browser data for this site, your snippets are gone — that's why the export button exists.",
    },
    {
      q: "Will my history sync across devices?",
      a: "No, and that's a deliberate choice. Sync requires uploading your clipboard content somewhere — which defeats the privacy purpose of a clipboard manager. To move snippets between machines, use the Export button on one device and Import on the other.",
    },
    {
      q: "Why doesn't it auto-capture everything I copy?",
      a: "Browsers, for very good reasons, only let pages read the clipboard in response to a user gesture (a paste event or button click). A page that watches every clipboard change in the background would be a surveillance tool. So you press Ctrl+V to opt in to each capture, instead.",
    },
    {
      q: "How many snippets can I store?",
      a: "Up to 200, after which the oldest unpinned snippet is removed when you save a new one. localStorage has a per-site quota of around 5 MB in most browsers, so the tool also warns you when your total snippet size approaches 1.5 MB.",
    },
    {
      q: "What does the type detection actually do?",
      a: "When you save a snippet, the tool runs a small set of pattern checks to tag it: hex colors (#fff, #112233), CSS color functions, URLs, emails, valid JSON (parsed, not just bracket-matched), and code (multi-line with a high punctuation density or recognisable keywords). Anything else is tagged as plain text. You can filter by type from the toolbar.",
    },
    {
      q: "Is the search case-sensitive?",
      a: "No. Search is case-insensitive substring matching across the full snippet text. To find an exact phrase, just type it — quotes aren't needed.",
    },
    {
      q: "Can I edit a snippet after saving?",
      a: "Yes — click the edit icon on any snippet to open an inline editor. Save your changes and the type tag is recomputed automatically. Saving an empty snippet deletes it.",
    },
    {
      q: "How does pinning work with the 200-item cap?",
      a: "Pinned snippets are never auto-removed, and they always sort to the top regardless of sort mode. So pin anything you want to keep permanently — passwords for a project (use a real password manager though), email templates, frequent reply snippets, code patterns.",
    },
    {
      q: "What's in the exported JSON file?",
      a: "A small wrapper object with a schema identifier, version, timestamp, count, and the full snippet array — including pin status, type, and creation time. Importing it on another device merges new snippets into your existing list (deduped by text content), so re-importing is safe.",
    },
    {
      q: "Does it work offline?",
      a: "Yes. Once the page loads, the tool runs entirely from local code and localStorage. You can disconnect from the internet, refresh, even close the tab and come back later — your snippets persist as long as your browser keeps your site data.",
    },
  ];

  const related: RelatedTool[] = [
    { name: "Online notepad", desc: "A focused, distraction-free editor with autosave, code blocks, and PDF export.", href: "/online-notepad" },
    { name: "Pomodoro Timer", desc: "Drift-proof focus timer with daily and lifetime stats — pairs with this clipboard.", href: "/tools/pomodoro" },
    { name: "Paste-to-Image", desc: "Paste a screenshot, annotate or blur it, and save as PNG. Browser-only.", href: "/tools/paste-to-image" },
    { name: "YouTube Summary", desc: "Turn any video transcript into tuned prompts for ChatGPT, Claude, Perplexity, or Gemini.", href: "/tools/youtube-summary" },
  ];

  const jsonLd = buildToolJsonLd({
    name: "Clipboard History",
    description: seo.description,
    path: CANONICAL,
    breadcrumbName: "Clipboard History",
    category: "BrowserApplication",
    faqs,
  });

  /* ───────────────── Render ───────────────── */

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={location}
      seoCanonicalPath={CANONICAL}
      seoKeywords="clipboard history, clipboard manager, snippet manager, save clipboard text, browser clipboard history, free clipboard manager, private clipboard, clipboard saver"
      seoJsonLd={jsonLd}
      title="Clipboard History"
      tagline="Save, search & reuse text snippets — privately"
      backHref="/tools"
    >
      <ClipboardStyles />

      {/* ── Interactive UI ── */}
      <main style={{ padding: "32px 18px 60px" }} ref={mainRef}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>

          {/* Composer */}
          <section className="cb-card" aria-label="Save a new snippet">
            <div className="cb-card-head">
              <div>
                <h2 className="cb-card-title">Capture a snippet</h2>
                <p className="cb-card-sub">
                  Press <kbd className="tool-kbd">Ctrl</kbd> + <kbd className="tool-kbd">V</kbd> anywhere on the page to capture from clipboard, or type below.
                </p>
              </div>
              <div className="cb-stats" aria-label="Storage statistics">
                <span><b>{snippets.length}</b><span>/{MAX_ITEMS}</span></span>
                <span className={overWarn ? "cb-stats-warn" : ""}>{formatBytes(totalBytes)}</span>
              </div>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleManualSave();
                }
              }}
              placeholder="Paste or type anything… URLs, emails, JSON, code — types are detected automatically."
              className="cb-textarea"
              rows={4}
              aria-label="New snippet text"
            />
            <div className="cb-composer-actions">
              <span className="cb-hint">
                <kbd className="tool-kbd">Ctrl</kbd> + <kbd className="tool-kbd">Enter</kbd> to save
              </span>
              <button
                type="button"
                onClick={handleManualSave}
                disabled={!input.trim()}
                className="cb-btn cb-btn-primary"
                aria-label="Save snippet"
              >
                <Plus size={15} strokeWidth={2.2} />
                Save snippet
              </button>
            </div>
          </section>

          {/* Toolbar */}
          {snippets.length > 0 && (
            <section className="cb-toolbar" aria-label="Filter and sort">
              <div className="cb-search-wrap">
                <Search size={14} strokeWidth={1.8} className="cb-search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search snippets…"
                  className="cb-search-input"
                  aria-label="Search snippets"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="cb-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                )}
                <kbd className="tool-kbd cb-search-kbd" aria-hidden="true">/</kbd>
              </div>

              <div className="cb-toolbar-row">
                <div className="cb-chips" role="group" aria-label="Filter by type">
                  {(["all", "url", "email", "color", "json", "code", "text"] as const).map((t) => {
                    const active = filterType === t;
                    const c = counts[t];
                    const isAll = t === "all";
                    const meta = isAll ? null : TYPE_META[t];
                    const Icon = meta?.Icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFilterType(t)}
                        disabled={c === 0}
                        className={`cb-chip${active ? " cb-chip-active" : ""}`}
                      >
                        {Icon && <Icon size={11} strokeWidth={2} />}
                        <span>{isAll ? "All" : meta!.label}</span>
                        <span className="cb-chip-count">{c}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="cb-sort-group">
                  <ListOrdered size={13} strokeWidth={1.8} />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="cb-sort"
                    aria-label="Sort snippets"
                  >
                    <option value="recent">Recent first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="longest">Longest first</option>
                    <option value="alpha">A → Z</option>
                  </select>
                </div>
              </div>

              <div className="cb-bulk">
                <button type="button" onClick={exportJson} className="cb-btn cb-btn-ghost" disabled={!snippets.length}>
                  <Download size={13} strokeWidth={2} /> Export
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="cb-btn cb-btn-ghost">
                  <Upload size={13} strokeWidth={2} /> Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                    e.target.value = "";
                  }}
                />
                {confirmingClear ? (
                  <span className="cb-confirm">
                    <span>Clear all?</span>
                    <button type="button" onClick={clearAll} className="cb-confirm-yes">Yes, delete</button>
                    <button type="button" onClick={() => setConfirmingClear(false)} className="cb-confirm-no">Cancel</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="cb-btn cb-btn-danger"
                    disabled={!snippets.length}
                  >
                    <Trash2 size={13} strokeWidth={2} /> Clear all
                  </button>
                )}
              </div>
            </section>
          )}

          {/* List */}
          <section aria-label="Saved snippets" style={{ marginTop: 18 }}>
            {snippets.length === 0 ? (
              <EmptyState />
            ) : visible.length === 0 ? (
              <div className="cb-empty-search">
                <p>No snippets match those filters.</p>
                <button type="button" onClick={() => { setSearch(""); setFilterType("all"); }} className="cb-btn cb-btn-ghost">
                  Reset filters
                </button>
              </div>
            ) : (
              <ul className="cb-list" role="list">
                <AnimatePresence initial={false}>
                  {visible.map((s) => (
                    <motion.li
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    >
                      <SnippetItem
                        snippet={s}
                        now={now}
                        isEditing={editingId === s.id}
                        editText={editText}
                        editRef={editRef}
                        isExpanded={expandedIds.has(s.id)}
                        onToggleExpand={() => toggleExpanded(s.id)}
                        onEditChange={setEditText}
                        onCommitEdit={commitEdit}
                        onCancelEdit={cancelEdit}
                        onCopy={() => copySnippet(s)}
                        onCopyPretty={() => copySnippet(s, { pretty: true })}
                        onPin={() => togglePin(s.id)}
                        onEdit={() => startEdit(s)}
                        onDelete={() => deleteSnippet(s.id)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>
      </main>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full border shadow-2xl backdrop-blur-md
              flex items-center gap-3 text-sm font-medium
              ${toast.type === "success"
                ? "bg-[#0D0F14]/95 border-white/20 text-white"
                : "bg-[#0D0F14]/95 border-red-500/40 text-red-300"}`}
          >
            {toast.type === "success" ? <Check size={15} /> : <X size={15} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SEO article ── */}
      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine={<>Updated April 2026 · By <a href="/about" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>Ankit Jaiswal</a></>}
      >
        <ToolSection width="grid">
          <SectionHeading kicker="What's inside" title="Built like a desktop app, but in a tab" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="How to use" title="Five steps from zero to fluent" />
          <ToolHowToSteps steps={steps} />
        </ToolSection>

        <ToolSection width="prose">
          <SectionHeading kicker="Why a browser-based clipboard manager" title="The privacy trade you didn't know you were making" align="left" />
          <div className="tool-prose">
            <p>
              Native clipboard managers — Maccy on macOS, the built-in Windows Clipboard, Ditto, Paste, ClipboardFusion — are wonderful. They run in the background, watch every change, and let you paste any of the last hundreds of copies. They are also, by design, <strong>tools that read everything you copy</strong>: passwords pulled from a password manager, two-factor codes, the contents of internal docs, half-finished emails, drafts, search queries you intended to be ephemeral.
            </p>
            <p>
              That's the cost of "auto-capture everything", and most of the time the trade is worth it. Sometimes it isn't — like when you're on a borrowed machine, when you're researching something sensitive, or when you simply don't want a third-party process inspecting every Cmd+C you make.
            </p>
            <p>
              This tool is the opposite end of that spectrum. It's a clipboard history that <strong>only sees what you explicitly hand it</strong>. Press Ctrl+V (the universal "paste" gesture) on the page and it captures whatever's on your clipboard. Skip a copy and it never knows. There's no background process; close the tab and the tool stops running. There's no server; the page is static HTML and JavaScript, and your snippets live in your browser's localStorage.
            </p>
            <p>
              The trade-off is real: this can't beat a native clipboard manager for raw convenience. You have to deliberately switch to the tab and paste. In exchange, you get something most native managers don't offer — a complete privacy guarantee, type-aware tagging, and a single JSON export you can move between machines without trusting a sync service.
            </p>
            <p>
              It's the right tool when convenience isn't the only thing you're optimising for.
            </p>
          </div>
        </ToolSection>

        <ToolSection width="prose">
          <SectionHeading kicker="Smart detection" title="What gets tagged, and how" align="left" />
          <div className="tool-table-wrap">
            <table className="tool-table">
              <thead>
                <tr><th>Type</th><th>What we detect</th><th>What you get</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><Badge type="url" /></td>
                  <td>Anything starting with <code>http://</code> or <code>https://</code> on a single line.</td>
                  <td>An "Open" button that launches the link in a new tab.</td>
                </tr>
                <tr>
                  <td><Badge type="email" /></td>
                  <td>Standard <code>name@domain.tld</code> patterns under 200 chars.</td>
                  <td>A "Mail" button that opens your default mail client to compose.</td>
                </tr>
                <tr>
                  <td><Badge type="color" /></td>
                  <td>Hex codes (<code>#fff</code>, <code>#112233</code>, <code>#11223344</code>) and CSS color functions (<code>rgb()</code>, <code>hsl()</code>, <code>oklch()</code>).</td>
                  <td>An inline color swatch so you can see the colour at a glance.</td>
                </tr>
                <tr>
                  <td><Badge type="json" /></td>
                  <td>Text that <em>actually parses</em> as JSON — not just text wrapped in braces.</td>
                  <td>A "Copy formatted" action that pretty-prints with 2-space indentation.</td>
                </tr>
                <tr>
                  <td><Badge type="code" /></td>
                  <td>Multi-line text with high punctuation density or recognisable keywords (<code>function</code>, <code>const</code>, <code>def</code>, <code>SELECT</code>, etc.).</td>
                  <td>A monospace preview so indentation and structure stay readable.</td>
                </tr>
                <tr>
                  <td><Badge type="text" /></td>
                  <td>Anything else.</td>
                  <td>The default — a clean text preview with full search support.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ToolSection>

        <ToolSection width="prose">
          <SectionHeading kicker="Keyboard" title="Shortcuts to learn first" align="left" />
          <div className="tool-table-wrap">
            <table className="tool-table">
              <thead>
                <tr><th>Action</th><th>Shortcut</th></tr>
              </thead>
              <tbody>
                <tr><td>Capture from clipboard (anywhere on the page)</td><td><kbd className="tool-kbd">Ctrl</kbd> / <kbd className="tool-kbd">⌘</kbd> + <kbd className="tool-kbd">V</kbd></td></tr>
                <tr><td>Save the input you've typed</td><td><kbd className="tool-kbd">Ctrl</kbd> / <kbd className="tool-kbd">⌘</kbd> + <kbd className="tool-kbd">Enter</kbd></td></tr>
                <tr><td>Save shortcut while in the input</td><td><kbd className="tool-kbd">Ctrl</kbd> / <kbd className="tool-kbd">⌘</kbd> + <kbd className="tool-kbd">S</kbd></td></tr>
                <tr><td>Focus the search box</td><td><kbd className="tool-kbd">/</kbd></td></tr>
                <tr><td>Clear search / cancel edit / close confirm</td><td><kbd className="tool-kbd">Esc</kbd></td></tr>
              </tbody>
            </table>
          </div>
        </ToolSection>

        <ToolSection width="privacy">
          <ToolPrivacyBand
            heading="Your snippets stay on your device"
            body="There is no server-side database, no analytics that read your snippets, and no third-party scripts. Your snippets are stored in your browser's localStorage, scoped to ankitjaiswal.in. Clearing site data wipes them — that's why the export button exists. Importing a JSON file merges with what you have, deduped by content."
          />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="FAQ" title="Quick answers" />
          <ToolFAQ items={faqs} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Other tools" title="Tools that pair well with this one" />
          <ToolRelatedTools items={related} />
        </ToolSection>

        <ToolSection marginBottom={64}>
          <ToolAuthorCard />
        </ToolSection>

        <ToolSection marginBottom={120}>
          <FeedbackInlineCard />
        </ToolSection>
      </ToolSEOArticle>

      <ToolStatusBar
        stats={[
          snippets.length > 0
            ? { key: "n", label: `${snippets.length} snippet${snippets.length === 1 ? "" : "s"}` }
            : { key: "status", label: "No snippets yet", accent: "muted" },
          ...(snippets.filter((s) => s.pinned).length > 0
            ? [{ key: "p", label: `${snippets.filter((s) => s.pinned).length} pinned` } as ToolStatusStat]
            : []),
          ...(snippets.length > 0
            ? [{ key: "b", label: formatBytes(snippets.reduce((acc, s) => acc + new Blob([s.text]).size, 0)), accent: "muted" } as ToolStatusStat]
            : []),
          ...(filterType !== "all" || search
            ? [{ key: "f", label: search ? `Searching "${search.slice(0, 20)}"` : `Filter: ${filterType}`, accent: "warn" } as ToolStatusStat]
            : []),
        ]}
        shortcuts={[
          {
            group: "Capture",
            items: [
              { key: "Ctrl+V", label: "Paste from clipboard" },
              { key: "Ctrl+Enter", label: "Save snippet" },
            ],
          },
          {
            group: "Navigate",
            items: [
              { key: "/", label: "Focus search" },
              { key: "Esc", label: "Cancel / clear" },
            ],
          },
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}

/* ───────────────── Sub-components ───────────────── */

function EmptyState() {
  return (
    <div className="cb-empty">
      <div className="cb-empty-icon"><Clipboard size={26} strokeWidth={1.5} /></div>
      <h3>No snippets yet</h3>
      <p>
        Press <kbd className="tool-kbd">Ctrl</kbd>+<kbd className="tool-kbd">V</kbd> anywhere on this page to capture from clipboard, or type into the box above.
      </p>
      <ul className="cb-empty-tips">
        <li><Sparkles size={11} strokeWidth={2} /> URLs, JSON, colors, and code are tagged automatically</li>
        <li><Pin size={11} strokeWidth={2} /> Pin snippets to keep them at the top</li>
        <li><Lock size={11} strokeWidth={2} /> Everything stays on your device</li>
      </ul>
    </div>
  );
}

function Badge({ type }: { type: SnippetType }) {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  return (
    <span className="cb-badge" style={{ color: meta.color, borderColor: `${meta.color}33`, background: `${meta.color}10` }}>
      <Icon size={11} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

function SnippetItem({
  snippet, now, isEditing, editText, editRef, isExpanded, onToggleExpand,
  onEditChange, onCommitEdit, onCancelEdit,
  onCopy, onCopyPretty, onPin, onEdit, onDelete,
}: {
  snippet: Snippet;
  now: number;
  isEditing: boolean;
  editText: string;
  editRef: React.RefObject<HTMLTextAreaElement | null>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditChange: (s: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onCopy: () => void;
  onCopyPretty: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[snippet.type];
  const Icon = meta.Icon;
  const lines = snippet.text.split("\n").length;
  const chars = snippet.text.length;
  const isLong = lines > 5 || chars > 280;

  // For URL & email rows, the text itself is the action; show open/mail.
  const openHref =
    snippet.type === "url" ? snippet.text :
    snippet.type === "email" ? `mailto:${snippet.text}` : null;

  return (
    <article className={`cb-item${snippet.pinned ? " cb-item-pinned" : ""}`}>
      <div className="cb-item-side" aria-hidden="true">
        <span
          className="cb-item-typebadge"
          style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}33` }}
          title={meta.label}
        >
          <Icon size={13} strokeWidth={2} />
        </span>
        {snippet.type === "color" && /^#?[0-9a-f]{3,8}$/i.test(snippet.text.trim()) && (
          <span
            className="cb-color-swatch"
            style={{ background: snippet.text.trim().startsWith("#") ? snippet.text.trim() : `#${snippet.text.trim()}` }}
            aria-label={`Color ${snippet.text}`}
          />
        )}
      </div>

      <div className="cb-item-body">
        {isEditing ? (
          <>
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onCommitEdit(); }
                if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
              }}
              rows={Math.min(10, Math.max(3, editText.split("\n").length))}
              className="cb-edit-textarea"
              aria-label="Edit snippet"
            />
            <div className="cb-edit-actions">
              <span className="cb-hint">
                <kbd className="tool-kbd">Ctrl</kbd>+<kbd className="tool-kbd">Enter</kbd> save · <kbd className="tool-kbd">Esc</kbd> cancel
              </span>
              <button type="button" onClick={onCancelEdit} className="cb-btn cb-btn-ghost">Cancel</button>
              <button type="button" onClick={onCommitEdit} className="cb-btn cb-btn-primary">
                <Check size={13} strokeWidth={2.2} /> Save
              </button>
            </div>
          </>
        ) : (
          <>
            <pre
              className={`cb-item-text${snippet.type === "code" || snippet.type === "json" ? " cb-mono" : ""}${isLong && !isExpanded ? " cb-item-clipped" : ""}`}
            >{snippet.text}</pre>
            {isLong && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="cb-expand"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Show less" : `Show full snippet (${lines} lines)`}
              </button>
            )}
            <div className="cb-item-meta">
              <span>{timeAgo(snippet.createdAt, now)}</span>
              <span aria-hidden="true">·</span>
              <span>{chars.toLocaleString()} char{chars === 1 ? "" : "s"}</span>
              {lines > 1 && (<><span aria-hidden="true">·</span><span>{lines} lines</span></>)}
              {snippet.pinned && (<><span aria-hidden="true">·</span><span className="cb-pinned-tag"><Pin size={9} strokeWidth={2.2} /> pinned</span></>)}
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="cb-item-actions">
          {openHref && (
            <a
              href={openHref}
              target={snippet.type === "url" ? "_blank" : undefined}
              rel={snippet.type === "url" ? "noopener noreferrer" : undefined}
              className="cb-action"
              title={snippet.type === "url" ? "Open URL" : "Compose email"}
              aria-label={snippet.type === "url" ? "Open URL" : "Compose email"}
            >
              <ExternalLink size={14} strokeWidth={1.8} />
            </a>
          )}
          <button type="button" onClick={onCopy} className="cb-action" title="Copy" aria-label="Copy snippet">
            <Copy size={14} strokeWidth={1.8} />
          </button>
          {snippet.type === "json" && (
            <button type="button" onClick={onCopyPretty} className="cb-action" title="Copy formatted JSON" aria-label="Copy formatted JSON">
              <Braces size={14} strokeWidth={1.8} />
            </button>
          )}
          <button type="button" onClick={onPin} className={`cb-action${snippet.pinned ? " cb-action-on" : ""}`} title={snippet.pinned ? "Unpin" : "Pin"} aria-label={snippet.pinned ? "Unpin snippet" : "Pin snippet"}>
            {snippet.pinned ? <PinOff size={14} strokeWidth={1.8} /> : <Pin size={14} strokeWidth={1.8} />}
          </button>
          <button type="button" onClick={onEdit} className="cb-action" title="Edit" aria-label="Edit snippet">
            <Edit3 size={14} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={onDelete} className="cb-action cb-action-danger" title="Delete" aria-label="Delete snippet">
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}
    </article>
  );
}

/* ───────────────── Local styles ───────────────── */

function ClipboardStyles() {
  return (
    <style>{`
      /* Composer card */
      .cb-card {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 18px;
        padding: 22px 22px 18px;
      }
      .cb-card-head {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
        margin-bottom: 14px;
      }
      .cb-card-title {
        font-family: ${tokens.font.display};
        font-weight: 700; font-size: 16px;
        color: ${tokens.text.primary};
        margin: 0 0 4px;
        letter-spacing: -0.01em;
      }
      .cb-card-sub {
        font-size: 13px;
        color: ${tokens.text.quiet};
        margin: 0;
        line-height: 1.5;
      }
      .cb-stats {
        display: flex; align-items: center; gap: 12px;
        font-family: ${tokens.font.mono};
        font-size: 11.5px;
        color: ${tokens.text.quiet};
        white-space: nowrap;
      }
      .cb-stats span b { color: ${tokens.text.primary}; font-weight: 600; }
      .cb-stats-warn { color: #FBBF24; }

      .cb-textarea {
        width: 100%;
        background: rgba(0,0,0,0.25);
        border: 1px solid ${tokens.border.default};
        border-radius: 12px;
        padding: 14px 16px;
        font-family: ${tokens.font.body};
        font-size: 14px;
        line-height: 1.55;
        color: ${tokens.text.primary};
        resize: vertical;
        min-height: 96px;
        transition: border-color .15s ease, background .15s ease;
        outline: none;
      }
      .cb-textarea::placeholder { color: rgba(255,255,255,0.28); }
      .cb-textarea:focus {
        border-color: ${tokens.border.focus};
        background: rgba(0,0,0,0.32);
      }

      .cb-composer-actions {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin-top: 12px; flex-wrap: wrap;
      }
      .cb-hint {
        font-size: 11.5px; color: ${tokens.text.quiet};
        display: inline-flex; align-items: center; gap: 6px;
      }

      /* Buttons */
      .cb-btn {
        display: inline-flex; align-items: center; gap: 6px;
        height: 32px; padding: 0 14px;
        border-radius: 8px;
        font-family: ${tokens.font.body};
        font-size: 12.5px; font-weight: 500;
        cursor: pointer;
        transition: background .15s ease, border-color .15s ease, color .15s ease, transform .12s ease;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .cb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .cb-btn:focus-visible { outline: 2px solid ${tokens.border.focus}; outline-offset: 2px; }
      .cb-btn-primary {
        background: #fff; color: #0A0C10;
        border-color: #fff;
      }
      .cb-btn-primary:hover:not(:disabled) {
        background: rgba(255,255,255,0.92);
        transform: translateY(-1px);
      }
      .cb-btn-ghost {
        background: transparent;
        color: ${tokens.text.body};
        border-color: ${tokens.border.default};
      }
      .cb-btn-ghost:hover:not(:disabled) {
        background: rgba(255,255,255,0.05);
        border-color: ${tokens.border.hover};
        color: ${tokens.text.primary};
      }
      .cb-btn-danger {
        background: transparent;
        color: rgba(248, 113, 113, 0.85);
        border-color: rgba(248, 113, 113, 0.25);
      }
      .cb-btn-danger:hover:not(:disabled) {
        background: rgba(248, 113, 113, 0.08);
        border-color: rgba(248, 113, 113, 0.5);
        color: rgb(252, 165, 165);
      }

      /* Toolbar */
      .cb-toolbar {
        margin-top: 18px;
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 14px;
        padding: 12px;
        display: flex; flex-direction: column; gap: 12px;
      }
      .cb-toolbar-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-wrap: wrap;
      }

      /* Search */
      .cb-search-wrap {
        position: relative;
        display: flex; align-items: center;
      }
      .cb-search-icon {
        position: absolute; left: 12px;
        color: ${tokens.text.quiet};
        pointer-events: none;
      }
      .cb-search-input {
        width: 100%;
        height: 38px;
        padding: 0 64px 0 34px;
        background: rgba(0,0,0,0.25);
        border: 1px solid ${tokens.border.default};
        border-radius: 10px;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 13.5px;
        outline: none;
        transition: border-color .15s ease;
      }
      .cb-search-input::placeholder { color: rgba(255,255,255,0.28); }
      .cb-search-input:focus { border-color: ${tokens.border.focus}; }
      .cb-search-clear {
        position: absolute; right: 38px;
        background: rgba(255,255,255,0.06);
        border: none;
        width: 20px; height: 20px;
        border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        color: ${tokens.text.quiet};
        cursor: pointer;
        transition: background .15s ease, color .15s ease;
      }
      .cb-search-clear:hover { background: rgba(255,255,255,0.12); color: ${tokens.text.primary}; }
      .cb-search-kbd {
        position: absolute; right: 10px;
        font-size: 11px;
        opacity: 0.55;
        pointer-events: none;
      }

      /* Type chips */
      .cb-chips {
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      }
      .cb-chip {
        display: inline-flex; align-items: center; gap: 6px;
        height: 28px; padding: 0 10px;
        background: rgba(255,255,255,0.03);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 999px;
        color: ${tokens.text.muted};
        font-family: ${tokens.font.body};
        font-size: 11.5px;
        font-weight: 500;
        cursor: pointer;
        transition: background .15s ease, border-color .15s ease, color .15s ease;
      }
      .cb-chip:hover:not(:disabled) {
        background: rgba(255,255,255,0.06);
        border-color: ${tokens.border.hover};
        color: ${tokens.text.primary};
      }
      .cb-chip:disabled {
        opacity: 0.35; cursor: not-allowed;
      }
      .cb-chip-active {
        background: rgba(255,255,255,0.10);
        border-color: ${tokens.border.focus};
        color: ${tokens.text.primary};
      }
      .cb-chip-count {
        font-family: ${tokens.font.mono};
        font-size: 10.5px;
        opacity: 0.6;
        padding-left: 2px;
      }

      /* Sort */
      .cb-sort-group {
        display: inline-flex; align-items: center; gap: 6px;
        color: ${tokens.text.quiet};
      }
      .cb-sort {
        height: 28px;
        background: rgba(255,255,255,0.03);
        border: 1px solid ${tokens.border.subtle};
        border-radius: 8px;
        color: ${tokens.text.body};
        font-family: ${tokens.font.body};
        font-size: 12px;
        padding: 0 10px;
        cursor: pointer;
        outline: none;
      }
      .cb-sort:focus { border-color: ${tokens.border.focus}; }

      /* Bulk */
      .cb-bulk {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        padding-top: 4px;
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 12px;
      }
      .cb-confirm {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 12px; color: rgba(248, 113, 113, 0.95);
        padding-left: 4px;
      }
      .cb-confirm-yes, .cb-confirm-no {
        background: transparent; border: 1px solid rgba(255,255,255,0.16);
        color: ${tokens.text.body};
        height: 26px; padding: 0 10px; border-radius: 6px;
        font-size: 12px; cursor: pointer;
        transition: background .15s ease, border-color .15s ease, color .15s ease;
      }
      .cb-confirm-yes {
        color: rgb(252, 165, 165);
        border-color: rgba(248, 113, 113, 0.4);
      }
      .cb-confirm-yes:hover { background: rgba(248, 113, 113, 0.12); }
      .cb-confirm-no:hover { background: rgba(255,255,255,0.06); color: ${tokens.text.primary}; }

      /* List */
      .cb-list {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 8px;
      }
      .cb-item {
        display: grid;
        grid-template-columns: 28px 1fr auto;
        gap: 14px;
        padding: 14px 14px 14px 16px;
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
        transition: border-color .15s ease, background .15s ease;
      }
      .cb-item:hover {
        border-color: ${tokens.border.hover};
        background: rgba(255,255,255,0.035);
      }
      .cb-item-pinned {
        border-color: rgba(255, 220, 130, 0.22);
        background: linear-gradient(180deg, rgba(255,220,130,0.04) 0%, ${tokens.bg.card} 60%);
      }
      .cb-item-pinned:hover {
        border-color: rgba(255, 220, 130, 0.4);
      }

      .cb-item-side {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding-top: 2px;
      }
      .cb-item-typebadge {
        width: 26px; height: 26px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 8px;
        border: 1px solid;
      }
      .cb-color-swatch {
        width: 22px; height: 22px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.4) inset;
      }

      .cb-item-body { min-width: 0; }
      .cb-item-text {
        font-family: ${tokens.font.body};
        font-size: 13.5px;
        line-height: 1.55;
        color: rgba(255,255,255,0.82);
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        position: relative;
      }
      .cb-item-clipped {
        max-height: 7em;
        overflow: hidden;
        mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
        -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
      }
      .cb-expand {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        padding: 0;
        background: transparent;
        border: none;
        font-family: ${tokens.font.body};
        font-size: 11.5px;
        font-weight: 500;
        color: rgba(255,255,255,0.55);
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: rgba(255,255,255,0.18);
        text-underline-offset: 3px;
        transition: color .15s ease, text-decoration-color .15s ease;
      }
      .cb-expand:hover {
        color: ${tokens.text.primary};
        text-decoration-color: ${tokens.text.primary};
      }
      .cb-expand:focus-visible {
        outline: 2px solid ${tokens.border.focus};
        outline-offset: 2px;
        border-radius: 4px;
      }
      .cb-mono {
        font-family: ${tokens.font.mono};
        font-size: 12.5px;
        color: rgba(255,255,255,0.78);
      }
      .cb-item-meta {
        margin-top: 8px;
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        font-family: ${tokens.font.mono};
        font-size: 11px;
        color: rgba(255,255,255,0.4);
      }
      .cb-pinned-tag {
        display: inline-flex; align-items: center; gap: 3px;
        color: rgba(255, 220, 130, 0.85);
      }

      .cb-item-actions {
        display: flex; align-items: flex-start; gap: 2px;
        opacity: 0.55;
        transition: opacity .15s ease;
      }
      .cb-item:hover .cb-item-actions,
      .cb-item:focus-within .cb-item-actions { opacity: 1; }
      .cb-action {
        width: 28px; height: 28px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 7px;
        color: ${tokens.text.muted};
        cursor: pointer;
        transition: background .12s ease, color .12s ease, border-color .12s ease;
        text-decoration: none;
      }
      .cb-action:hover {
        background: rgba(255,255,255,0.06);
        color: ${tokens.text.primary};
        border-color: ${tokens.border.subtle};
      }
      .cb-action-on {
        color: rgba(255, 220, 130, 0.95);
        background: rgba(255, 220, 130, 0.08);
      }
      .cb-action-danger:hover {
        color: rgb(252, 165, 165);
        background: rgba(248, 113, 113, 0.10);
        border-color: rgba(248, 113, 113, 0.3);
      }

      /* Edit */
      .cb-edit-textarea {
        width: 100%;
        background: rgba(0,0,0,0.3);
        border: 1px solid ${tokens.border.focus};
        border-radius: 8px;
        padding: 10px 12px;
        font-family: ${tokens.font.mono};
        font-size: 12.5px;
        line-height: 1.55;
        color: ${tokens.text.primary};
        resize: vertical;
        outline: none;
      }
      .cb-edit-actions {
        margin-top: 8px;
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      }
      .cb-edit-actions .cb-hint { margin-right: auto; }

      /* Empty states */
      .cb-empty {
        text-align: center;
        padding: 64px 24px 56px;
        background: ${tokens.bg.card};
        border: 1px dashed ${tokens.border.subtle};
        border-radius: 16px;
      }
      .cb-empty-icon {
        width: 56px; height: 56px;
        margin: 0 auto 18px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 16px;
        background: rgba(255,255,255,0.03);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.muted};
      }
      .cb-empty h3 {
        font-family: ${tokens.font.display};
        font-weight: 700; font-size: 17px;
        color: ${tokens.text.primary};
        margin: 0 0 6px;
        letter-spacing: -0.01em;
      }
      .cb-empty p {
        font-size: 13.5px;
        color: ${tokens.text.quiet};
        max-width: 380px;
        margin: 0 auto 22px;
        line-height: 1.6;
      }
      .cb-empty-tips {
        list-style: none; padding: 0; margin: 0;
        display: inline-flex; flex-direction: column; gap: 8px;
        text-align: left;
      }
      .cb-empty-tips li {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 12px;
        color: ${tokens.text.muted};
      }
      .cb-empty-tips li svg { color: ${tokens.text.quiet}; }

      .cb-empty-search {
        text-align: center;
        padding: 32px;
        color: ${tokens.text.quiet};
        font-size: 13px;
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
      }
      .cb-empty-search p { margin: 0 0 14px; }

      /* Type badge inline (in tables) */
      .cb-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid;
        font-size: 11px;
        font-weight: 500;
        font-family: ${tokens.font.body};
        text-transform: none;
        white-space: nowrap;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .cb-card { padding: 18px 16px; }
        .cb-card-head { flex-direction: column; align-items: flex-start; gap: 8px; }
        .cb-toolbar { padding: 10px; }
        .cb-toolbar-row { flex-direction: column; align-items: stretch; }
        .cb-sort-group { justify-content: flex-end; }
        .cb-item {
          grid-template-columns: 24px 1fr;
          gap: 10px;
          padding: 12px;
        }
        .cb-item-actions {
          grid-column: 1 / -1;
          opacity: 1;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.04);
          justify-content: flex-end;
        }
        .cb-empty { padding: 48px 18px 40px; }
      }
    `}</style>
  );
}
