import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Settings as SettingsIcon, Clipboard, Plus, Check, X, Image as ImageIcon,
  Download, Trash2, Sparkles, Zap, Lock, Sliders, Maximize2, Layers,
  Globe, Code2, ShoppingBag, FileImage,
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

type WebPSeo = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  eyebrow: string;
};

const CANONICAL = "/tools/webp-converter";

const WEBP_SEO: Record<string, WebPSeo> = {
  "/tools/webp-converter": {
    title: "WebP Converter — Free, Private, Browser-Based · Ankit Jaiswal",
    description:
      "Convert PNG, JPG, GIF, and BMP to WebP instantly. Runs entirely in your browser — no uploads, no signup, no quality compromise.",
    h1: "The free WebP converter that respects your privacy",
    intro:
      "Convert images to WebP without sending them to a server. Drop a file, paste from clipboard, or pick from disk — your photos are encoded right inside your browser using the same Canvas API that powers Figma and Photopea.",
    eyebrow: "Built for the modern web",
  },
  "/tools/png-to-webp": {
    title: "PNG to WebP Converter — Free, Browser-Based · Ankit Jaiswal",
    description:
      "Convert PNG to WebP in your browser. Lossless or lossy, transparency preserved, no upload required. Free forever.",
    h1: "Convert PNG to WebP without losing transparency",
    intro:
      "PNG → WebP is the single biggest file-size win on the modern web. Drop a PNG and watch it shrink by 60–80% with the same crisp transparency, identical color, and zero artifacts. No upload, no signup.",
    eyebrow: "PNG → WebP",
  },
  "/tools/jpg-to-webp": {
    title: "JPG to WebP Converter — Free, Browser-Based · Ankit Jaiswal",
    description:
      "Convert JPG / JPEG to WebP in your browser. Smaller files at the same visual quality. No upload, no signup, no quality compromise.",
    h1: "Convert JPG to WebP at the quality you decide",
    intro:
      "JPGs are everywhere, but they're 25–35% larger than they need to be. Convert any JPG to WebP right here — drag, paste, or browse — and download a leaner version that looks identical to the source.",
    eyebrow: "JPG → WebP",
  },
  "/tools/image-to-webp": {
    title: "Image to WebP Converter — PNG, JPG, GIF, BMP · Ankit Jaiswal",
    description:
      "Convert any image to WebP. Works with PNG, JPG, GIF, BMP, and more. Runs in your browser — no upload, no limits.",
    h1: "Convert any image to WebP — instantly, privately",
    intro:
      "One drop zone, one output format, zero compromise. Whatever your source image — PNG, JPG, GIF, BMP — this tool reads it, optionally resizes it, and re-encodes it as a perfectly modern WebP file you can use anywhere.",
    eyebrow: "Universal image converter",
  },
  "/png-to-webp": {
    title: "PNG to WebP Converter — Free, Browser-Based · Ankit Jaiswal",
    description:
      "Convert PNG to WebP in your browser. Lossless or lossy, transparency preserved, no upload required. Free forever.",
    h1: "Convert PNG to WebP without losing transparency",
    intro:
      "PNG → WebP is the single biggest file-size win on the modern web. Drop a PNG and watch it shrink by 60–80% with the same crisp transparency, identical color, and zero artifacts. No upload, no signup.",
    eyebrow: "PNG → WebP",
  },
};

const DEFAULT_SEO = WEBP_SEO[CANONICAL];

/* ────────────────────────────────────────────────────────────────────────── */
/* Types                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

interface ResultItem {
  id: string;
  thumbDataUrl: string;
  originalName: string;
  originalSize: number;
  newSize: number;
  webpUrl: string;
  webpName: string;
  width: number;
  height: number;
}

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Utilities                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDelta(orig: number, next: number): { text: string; tone: "good" | "neutral" | "bad" } {
  if (!orig) return { text: "—", tone: "neutral" };
  const pct = Math.round(((orig - next) / orig) * 100);
  if (pct > 0) return { text: `−${pct}%`, tone: "good" };
  if (pct === 0) return { text: "±0%", tone: "neutral" };
  return { text: `+${Math.abs(pct)}%`, tone: "bad" };
}

const SETTINGS_KEY = "webp-converter:settings";

interface PersistedSettings {
  quality: number;     // 1–100
  maxWidth: string;    // "" or "1920"
  lossless: boolean;
}

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") return { quality: 80, maxWidth: "", lossless: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { quality: 80, maxWidth: "", lossless: false };
    const parsed = JSON.parse(raw);
    return {
      quality: Math.max(1, Math.min(100, Number(parsed.quality) || 80)),
      maxWidth: typeof parsed.maxWidth === "string" ? parsed.maxWidth : "",
      lossless: !!parsed.lossless,
    };
  } catch {
    return { quality: 80, maxWidth: "", lossless: false };
  }
}

function saveSettings(s: PersistedSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Component                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export default function WebPConverter() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [location] = useLocation();
  const seo = useMemo(() => WEBP_SEO[location] ?? DEFAULT_SEO, [location]);

  // ── settings (persisted) ──
  const initialSettings = useMemo(loadSettings, []);
  const [quality, setQuality] = useState<number>(initialSettings.quality);
  const [maxWidth, setMaxWidth] = useState<string>(initialSettings.maxWidth);
  const [lossless, setLossless] = useState<boolean>(initialSettings.lossless);

  useEffect(() => {
    saveSettings({ quality, maxWidth, lossless });
  }, [quality, maxWidth, lossless]);

  // ── UI state ──
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount: revoke any unreleased object URLs and clear timers.
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      results.forEach((r) => URL.revokeObjectURL(r.webpUrl));
    };
    // We intentionally only run cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── toast ──
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2800);
  }, []);

  // ── conversion core ──
  const convertFile = useCallback(
    (file: File | Blob, originalName: string): Promise<ResultItem | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onloadend = () => {
          const img = new Image();
          img.onerror = () => resolve(null);
          img.onload = () => {
            // Main canvas — apply max-width if present.
            let w = img.width;
            let h = img.height;
            const mw = maxWidth ? parseInt(maxWidth, 10) : NaN;
            if (Number.isFinite(mw) && mw > 0 && w > mw) {
              h = Math.round(h * (mw / w));
              w = mw;
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0, w, h);

            // Thumbnail (max 96px on long edge) for the results queue.
            const thumbCanvas = document.createElement("canvas");
            const thumbMax = 96;
            let tw = w;
            let th = h;
            if (tw >= th) { th = Math.round(th * (thumbMax / tw)); tw = thumbMax; }
            else { tw = Math.round(tw * (thumbMax / th)); th = thumbMax; }
            thumbCanvas.width = Math.max(1, tw);
            thumbCanvas.height = Math.max(1, th);
            const tctx = thumbCanvas.getContext("2d");
            tctx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
            const thumbDataUrl = thumbCanvas.toDataURL("image/webp", 0.7);

            const opts = lossless ? undefined : Math.max(0.01, Math.min(1, quality / 100));
            canvas.toBlob(
              (blob) => {
                if (!blob) return resolve(null);
                const url = URL.createObjectURL(blob);
                const baseName = originalName.includes(".")
                  ? originalName.split(".").slice(0, -1).join(".")
                  : originalName || "image";
                const webpName = `${baseName}.webp`;
                resolve({
                  id: typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  thumbDataUrl,
                  originalName,
                  originalSize: file.size,
                  newSize: blob.size,
                  webpUrl: url,
                  webpName,
                  width: w,
                  height: h,
                });
              },
              "image/webp",
              opts
            );
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    },
    [quality, maxWidth, lossless]
  );

  const triggerDownload = useCallback((url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const processFiles = useCallback(
    async (files: File[] | FileList) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      setIsConverting(true);
      let successCount = 0;
      const newResults: ResultItem[] = [];
      for (const f of arr) {
        if (!f.type.startsWith("image/")) {
          showToast(`Skipped ${("name" in f && f.name) || "file"} — not an image`, "error");
          continue;
        }
        const r = await convertFile(f, ("name" in f && f.name) || "pasted-image");
        if (r) {
          newResults.push(r);
          triggerDownload(r.webpUrl, r.webpName);
          successCount++;
        } else {
          showToast(`Could not convert ${("name" in f && f.name) || "file"}`, "error");
        }
      }
      if (newResults.length) setResults((prev) => [...newResults, ...prev]);
      setIsConverting(false);
      if (successCount === 1) showToast("Converted & downloaded", "success");
      else if (successCount > 1) showToast(`Converted ${successCount} images`, "success");
    },
    [convertFile, showToast, triggerDownload]
  );

  // ── results-queue actions ──
  const reDownload = useCallback((r: ResultItem) => {
    triggerDownload(r.webpUrl, r.webpName);
  }, [triggerDownload]);

  const removeResult = useCallback((id: string) => {
    setResults((prev) => {
      const r = prev.find((x) => x.id === id);
      if (r) URL.revokeObjectURL(r.webpUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setResults((prev) => {
      prev.forEach((r) => URL.revokeObjectURL(r.webpUrl));
      return [];
    });
    showToast("Cleared all", "success");
  }, [showToast]);

  // ── drag and drop ──
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDropZoneClick = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  // ── paste handlers ──
  const handlePasteButton = useCallback(async () => {
    try {
      // Modern clipboard API (Chrome / Edge / Safari with permission)
      if (navigator.clipboard && "read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith("image/"));
          if (imgType) {
            const blob = await item.getType(imgType);
            await processFiles([new File([blob], "pasted-image", { type: imgType })]);
            return;
          }
        }
        showToast("No image found in clipboard", "error");
      } else {
        showToast("Press Ctrl+V to paste an image", "error");
      }
    } catch {
      showToast("Press Ctrl+V to paste an image", "error");
    }
  }, [processFiles, showToast]);

  // Global Ctrl+V paste listener — works even when nothing is focused.
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) processFiles(files);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [processFiles]);

  // ── settings popover: click outside to close ──
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        !settingsBtnRef.current?.contains(target)
      ) {
        setShowSettings(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [showSettings]);

  /* ── SEO content data ── */

  const features: ToolFeature[] = [
    { icon: Lock, title: "Stays in your browser", desc: "Files are encoded by the HTML5 Canvas API on your device. Nothing is uploaded to any server. Works offline once the page is loaded." },
    { icon: Zap, title: "Instant batch convert", desc: "Drop one file or twenty. Each one converts and downloads automatically — no queue, no progress bar theatre." },
    { icon: Sliders, title: "Quality you control", desc: "Slide from 1 to 100. Most photos hit the sweet spot at 75–85, where WebP looks identical to the source and weighs 60–80% less." },
    { icon: Maximize2, title: "Resize on the fly", desc: "Set a max width and oversized images shrink proportionally before encoding. Perfect for hero shots that don't need to be 4000px wide." },
    { icon: Layers, title: "Lossless when you need it", desc: "Toggle lossless mode for icons, illustrations, and screenshots where every pixel matters and quality cannot drift." },
    { icon: Globe, title: "Works with anything", desc: "Reads PNG, JPEG, GIF, BMP, and most other browser-native formats. Output is universal WebP that every modern browser renders." },
  ];

  const steps: ToolHowToStep[] = [
    { title: "Drop, paste, or browse", body: "Drag image files onto the drop zone, paste from your clipboard with Ctrl+V (or ⌘+V), or click the zone to browse your computer." },
    { title: "Adjust quality if needed", body: "Most users can leave the defaults. For finer control, open Settings and slide quality, set a max width, or flip to lossless mode." },
    { title: "Convert and download", body: "Each file encodes in milliseconds. Your browser downloads the WebP automatically and it appears in the queue below for re-download." },
    { title: "Use anywhere", body: "Drop the WebP into your CMS, GitHub README, design tool, or web project. Every modern browser will render it natively." },
  ];

  const useCases: ToolFeature[] = [
    { icon: Code2, title: "Web developers", desc: "Cut Largest Contentful Paint by 30–50% just by swapping JPEGs to WebP. Lighthouse scores climb, Core Web Vitals turn green." },
    { icon: Sparkles, title: "Designers", desc: "Export PNGs from Figma at 2× and convert to lossless WebP. Same crisp quality on retina, half the bandwidth." },
    { icon: ImageIcon, title: "Bloggers", desc: "Featured images, social cards, hero shots — convert all of them in one drop and your blog feels twice as fast on mobile." },
    { icon: ShoppingBag, title: "E-commerce", desc: "Product photography goes from megabytes to kilobytes without losing detail. Faster pages, higher conversion rates." },
  ];

  const faqs: ToolFAQItem[] = [
    { q: "Are my images uploaded anywhere?", a: "No. Conversion happens in your browser using the HTML5 Canvas API. Nothing leaves your device — you can verify this in the Network tab of your browser's developer tools while you convert." },
    { q: "Why use WebP instead of JPEG?", a: "WebP delivers 25–35% smaller files than JPEG at the same visual quality, supports both lossy and lossless compression in a single format, handles transparency (which JPEG cannot), and is supported by every modern browser including Chrome, Safari, Firefox, and Edge." },
    { q: "What's the difference between lossy and lossless WebP?", a: "Lossy compression discards information your eyes can't easily detect, producing dramatically smaller files — ideal for photographs. Lossless preserves every pixel exactly, producing larger but pixel-perfect files — ideal for screenshots, icons, illustrations, and anything with sharp edges or text." },
    { q: "Can I convert multiple images at once?", a: "Yes. Drop a whole folder's worth and each image converts and downloads sequentially. There's no batch limit and no queue — your CPU is the only constraint." },
    { q: "Does WebP work in Safari?", a: "Yes. Safari has supported WebP since version 14 (released September 2020). Every browser shipping today renders WebP natively, including iOS Safari and macOS Safari." },
    { q: "What quality setting should I use?", a: "Start at 80. For photos shown on the web, 75–85 is visually indistinguishable from the original at a fraction of the file size. Drop to 60–70 for thumbnails. Use lossless mode for screenshots, logos, or anything where every pixel matters." },
    { q: "Can WebP handle transparency?", a: "Yes — both in lossy and lossless modes. WebP is the modern replacement for JPEG (photos) and PNG (transparent graphics) in a single format, which is part of why it has taken over the modern web." },
    { q: "Will this work offline?", a: "Yes. Once the page has loaded, the converter runs entirely in JavaScript on your device. You can disconnect from the internet and keep converting indefinitely." },
    { q: "What's the maximum file size?", a: "There's no hard limit set by the tool. The practical limit is your browser's memory — modern desktop browsers handle 50+ MB images without trouble. Mobile browsers usually top out around 20 MB." },
    { q: "How is WebP different from AVIF?", a: "AVIF compresses even more aggressively (often 20% smaller than WebP) but takes longer to encode and isn't yet supported in some older browsers. WebP is the safer, faster default for production today; AVIF is worth considering when you control the delivery pipeline and can afford the encoding time." },
  ];

  const related: RelatedTool[] = [
    { name: "Notepad", desc: "A distraction-free writing surface with markdown export.", href: "/online-notepad" },
    { name: "Paste-to-Image", desc: "Paste from clipboard, download as PNG instantly.", href: "/tools/paste-to-image" },
    { name: "Domain Age Checker", desc: "See exactly how old a domain is — free WHOIS lookup.", href: "/tools/domain-age-checker" },
    { name: "YT Thumbnail Downloader", desc: "Pull any YouTube thumbnail in maximum resolution.", href: "/tools/yt-thumbnail-downloader" },
  ];

  // ── Settings popover positioned under the header right side ──
  const settingsPanel = (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          ref={settingsPanelRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: 64,
            right: 18,
            zIndex: 60,
            width: 280,
            background: "#13161D",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 24px 64px -8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
          role="dialog"
          aria-label="Conversion settings"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: tokens.font.display, fontSize: 13, fontWeight: 600, color: tokens.text.primary, letterSpacing: "-0.005em" }}>
              Conversion settings
            </span>
            <button
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
              style={{ background: "transparent", border: "none", color: tokens.text.quiet, cursor: "pointer", padding: 4, borderRadius: 6, display: "inline-flex" }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Quality */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: tokens.text.muted, fontFamily: tokens.font.body }}>Quality</span>
                <span style={{
                  fontFamily: tokens.font.mono, fontSize: 12, color: lossless ? tokens.text.quiet : tokens.text.primary,
                  background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  {lossless ? "—" : `${quality}`}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={quality}
                disabled={lossless}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                aria-label="Quality"
                style={{ width: "100%", accentColor: "#fff", opacity: lossless ? 0.4 : 1 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: tokens.text.kicker, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: tokens.font.body }}>
                <span>Smaller</span>
                <span>Better</span>
              </div>
            </div>

            {/* Max width */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: tokens.text.muted, fontFamily: tokens.font.body }}>Max width</span>
                <span style={{ fontSize: 11, color: tokens.text.kicker, fontFamily: tokens.font.body }}>px</span>
              </div>
              <input
                type="number"
                placeholder="No limit"
                value={maxWidth}
                onChange={(e) => setMaxWidth(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                aria-label="Max width in pixels"
                style={{
                  width: "100%",
                  background: "#0A0C10",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                  color: tokens.text.primary,
                  fontFamily: tokens.font.body,
                  outline: "none",
                }}
              />
            </div>

            {/* Lossless toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12.5, color: tokens.text.muted, fontFamily: tokens.font.body }}>Lossless</div>
                <div style={{ fontSize: 11, color: tokens.text.kicker, marginTop: 2, fontFamily: tokens.font.body }}>For icons & screenshots</div>
              </div>
              <button
                onClick={() => setLossless((v) => !v)}
                role="switch"
                aria-checked={lossless}
                aria-label="Lossless mode"
                style={{
                  position: "relative",
                  width: 40, height: 22,
                  borderRadius: 999,
                  background: lossless ? "#fff" : "rgba(255,255,255,0.12)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.18s ease",
                  padding: 0,
                }}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  style={{
                    position: "absolute",
                    top: 3,
                    left: lossless ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: lossless ? "#0A0C10" : "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  }}
                />
              </button>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
              <button
                onClick={() => { setQuality(80); setMaxWidth(""); setLossless(false); }}
                style={{
                  fontSize: 11.5,
                  color: tokens.text.soft,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: tokens.font.body,
                  letterSpacing: "0.02em",
                }}
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ── Header action: Settings button ── */
  const headerActions = (
    <button
      ref={settingsBtnRef}
      onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
      className="tool-header-btn"
      aria-label="Settings"
      aria-expanded={showSettings}
      style={
        showSettings
          ? { background: "rgba(255,255,255,0.06)", color: "#fff", borderColor: "rgba(255,255,255,0.26)" }
          : undefined
      }
    >
      <SettingsIcon size={13} strokeWidth={2} />
      <span>Settings</span>
    </button>
  );

  /* ────────────────────────────────────────────────────────────────────── */
  /* Render                                                                  */
  /* ────────────────────────────────────────────────────────────────────── */

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={location}
      seoCanonicalPath={CANONICAL}
      seoKeywords="webp converter, png to webp, jpg to webp, image to webp, free webp converter, browser webp converter, convert image to webp"
      seoJsonLd={buildToolJsonLd({
        name: "WebP Converter",
        description: DEFAULT_SEO.description,
        path: CANONICAL,
        category: "MultimediaApplication",
        faqs,
      })}
      title="WebP Converter"
      tagline="Convert any image to WebP — locally, instantly"
      headerActions={headerActions}
    >
      {/* Local styles for the converter UI (keeps the SEO/design system clean) */}
      <style>{`
        .wc-shell {
          padding: 56px 24px 96px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @media (max-width: 640px) { .wc-shell { padding: 36px 18px 72px; } }
        .wc-card {
          width: 100%;
          max-width: 720px;
          background: #0D0F14;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02);
        }
        .wc-drop {
          margin: 22px;
          border-radius: 16px;
          border: 2px dashed rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.012);
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease, box-shadow .25s ease, transform .25s ease;
          padding: 64px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
        }
        .wc-drop:hover {
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.025);
        }
        .wc-drop.is-drag {
          border-color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.04), inset 0 0 60px rgba(255,255,255,0.04);
          transform: scale(1.005);
        }
        .wc-drop-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.55);
          margin-bottom: 18px;
          transition: color .2s ease, background .2s ease, border-color .2s ease;
        }
        .wc-drop.is-drag .wc-drop-icon { color: #fff; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.22); }
        .wc-drop-title {
          font-family: ${tokens.font.display};
          font-size: 17px;
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }
        .wc-drop-sub {
          font-size: 13.5px;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
        }
        .wc-drop-sub kbd {
          display: inline-block;
          font-family: ${tokens.font.mono};
          font-size: 11.5px;
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
        }
        .wc-actions {
          padding: 0 22px 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wc-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          font-weight: 500;
          font-family: ${tokens.font.body};
          letter-spacing: -0.005em;
          cursor: pointer;
          transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .wc-pill:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.22); }
        .wc-pill:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .wc-meta {
          padding: 10px 22px 22px;
          display: flex; align-items: center; justify-content: center;
          gap: 14px;
          font-size: 11.5px;
          color: rgba(255,255,255,0.36);
          font-family: ${tokens.font.body};
          letter-spacing: 0.02em;
          text-align: center;
          flex-wrap: wrap;
        }
        .wc-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.22); }

        /* Results queue */
        .wc-queue {
          width: 100%;
          max-width: 720px;
          margin-top: 28px;
        }
        .wc-queue-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
          padding: 0 4px;
        }
        .wc-queue-title {
          font-family: ${tokens.font.display};
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }
        .wc-queue-clear {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: ${tokens.font.body};
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .wc-queue-clear:hover { color: #fff; background: rgba(255,255,255,0.04); }
        .wc-row {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          border-radius: 14px;
          transition: border-color .15s ease, background .15s ease;
        }
        .wc-row + .wc-row { margin-top: 8px; }
        .wc-row:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.035); }
        .wc-thumb {
          width: 48px; height: 48px;
          border-radius: 8px;
          background: #0A0C10 center / contain no-repeat;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .wc-row-info {
          min-width: 0;
          flex: 1;
        }
        .wc-row-name {
          font-family: ${tokens.font.body};
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.92);
          letter-spacing: -0.005em;
          margin: 0 0 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .wc-row-meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.46);
          font-family: ${tokens.font.body};
          flex-wrap: wrap;
        }
        .wc-row-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.18); }
        .wc-row-arrow {
          color: rgba(255,255,255,0.22);
          font-size: 12px;
          padding: 0 2px;
        }
        .wc-delta {
          font-family: ${tokens.font.mono};
          font-size: 11.5px;
          padding: 2px 7px;
          border-radius: 5px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .wc-delta-good {
          color: rgba(140, 230, 170, 0.95);
          background: rgba(140, 230, 170, 0.08);
          border: 1px solid rgba(140, 230, 170, 0.18);
        }
        .wc-delta-neutral {
          color: rgba(255,255,255,0.55);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
        }
        .wc-delta-bad {
          color: rgba(255, 170, 170, 0.95);
          background: rgba(255, 100, 100, 0.06);
          border: 1px solid rgba(255, 100, 100, 0.18);
        }
        .wc-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .wc-icon-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: rgba(255,255,255,0.55);
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .wc-icon-btn:hover { color: #fff; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.22); }
        .wc-icon-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        /* Converting badge */
        .wc-converting {
          margin-top: 16px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          display: inline-flex; align-items: center; gap: 8px;
          font-family: ${tokens.font.body};
        }
        .wc-spinner {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: rgba(255,255,255,0.7);
          animation: wc-spin 0.7s linear infinite;
        }
        @keyframes wc-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* Settings popover */}
      {settingsPanel}

      <main className="wc-shell" ref={mainRef}>
        <div className="wc-card">
          <div
            className={`wc-drop${isDragOver ? " is-drag" : ""}`}
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            aria-label="Drop images here or click to browse"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleDropZoneClick();
              }
            }}
          >
            <motion.div
              className="wc-drop-icon"
              animate={{ scale: isDragOver ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
            >
              <Plus size={26} strokeWidth={1.6} />
            </motion.div>
            <div className="wc-drop-title">
              {isDragOver ? "Drop to convert" : "Drop images here"}
            </div>
            <div className="wc-drop-sub">
              or click to browse · paste with <kbd>Ctrl</kbd> <kbd>V</kbd>
            </div>
          </div>

          <div className="wc-actions">
            <button onClick={handlePasteButton} className="wc-pill" aria-label="Paste from clipboard">
              <Clipboard size={13} strokeWidth={2} />
              Paste from clipboard
            </button>
            <button onClick={handleDropZoneClick} className="wc-pill" aria-label="Browse files">
              <FileImage size={13} strokeWidth={2} />
              Browse files
            </button>
          </div>

          <div className="wc-meta">
            <span>PNG · JPG · GIF · BMP · and more</span>
            <span className="wc-meta-dot" aria-hidden="true" />
            <span>{lossless ? "Lossless" : `Quality ${quality}`}</span>
            {maxWidth && (
              <>
                <span className="wc-meta-dot" aria-hidden="true" />
                <span>Max width {maxWidth}px</span>
              </>
            )}
          </div>
        </div>

        {isConverting && (
          <div className="wc-converting" role="status" aria-live="polite">
            <span className="wc-spinner" />
            Converting…
          </div>
        )}

        {results.length > 0 && (
          <div className="wc-queue" aria-label="Converted files">
            <div className="wc-queue-head">
              <span className="wc-queue-title">Converted · {results.length}</span>
              <button onClick={clearAll} className="wc-queue-clear" aria-label="Clear all converted files">
                <Trash2 size={12} strokeWidth={2} />
                Clear all
              </button>
            </div>
            <AnimatePresence initial={false}>
              {results.map((r) => {
                const delta = formatDelta(r.originalSize, r.newSize);
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="wc-row"
                  >
                    <div
                      className="wc-thumb"
                      style={{ backgroundImage: `url(${r.thumbDataUrl})` }}
                      aria-hidden="true"
                    />
                    <div className="wc-row-info">
                      <div className="wc-row-name" title={r.webpName}>{r.webpName}</div>
                      <div className="wc-row-meta">
                        <span>{r.width}×{r.height}</span>
                        <span className="wc-row-meta-dot" aria-hidden="true" />
                        <span>{formatBytes(r.originalSize)}</span>
                        <span className="wc-row-arrow">→</span>
                        <span style={{ color: "rgba(255,255,255,0.78)" }}>{formatBytes(r.newSize)}</span>
                        <span className={`wc-delta wc-delta-${delta.tone}`}>{delta.text}</span>
                      </div>
                    </div>
                    <div className="wc-row-actions">
                      <button
                        onClick={() => reDownload(r)}
                        className="wc-icon-btn"
                        aria-label={`Re-download ${r.webpName}`}
                        title="Download again"
                      >
                        <Download size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => removeResult(r.id)}
                        className="wc-icon-btn"
                        aria-label={`Remove ${r.webpName}`}
                        title="Remove from list"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── SEO article ── */}
      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine={<>Updated April 2026 · By Ankit Jaiswal · ~3 min read</>}
      >
        {/* What is WebP */}
        <ToolSection>
          <SectionHeading kicker="The format" title="What is WebP, exactly?" />
          <div className="tool-prose">
            <p>
              WebP is an image format Google released in 2010 to make the web faster.
              It pulls off something neither JPEG nor PNG can: <strong>both lossy and lossless compression in a single file format</strong>,
              with optional transparency and animation. The result, in practice, is files that are 25–35% smaller than JPEG and
              up to 80% smaller than PNG — at the same visual quality.
            </p>
            <p>
              For years WebP felt like a Chrome-only experiment. That changed in late 2020, when Safari 14 added support.
              Today every modern browser — Chrome, Safari, Firefox, Edge, plus their mobile counterparts — renders WebP natively.
              It is the de-facto modern image format, and the single biggest free performance win on most websites.
            </p>
            <p>
              This converter takes any image your browser can read — PNG, JPG, GIF, BMP — and re-encodes it as WebP using the
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob" target="_blank" rel="noopener noreferrer"> HTMLCanvasElement.toBlob</a> API.
              Because the encoder ships with your browser, the file never leaves your device. No upload. No queue. No "premium"
              tier. Drop a file, get a WebP.
            </p>
          </div>
        </ToolSection>

        {/* Features */}
        <ToolSection width="grid">
          <SectionHeading kicker="Why this one" title="Built for engineers, designers, and anyone who ships images" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        {/* How to */}
        <ToolSection>
          <SectionHeading kicker="How it works" title="Convert an image in four steps" />
          <ToolHowToSteps steps={steps} />
        </ToolSection>

        {/* WebP vs JPEG explainer */}
        <ToolSection>
          <SectionHeading kicker="The honest comparison" title="WebP vs JPEG: which should you use in 2026?" />
          <div className="tool-prose">
            <p>
              Use WebP. The honest answer is almost always WebP, and it has been since 2021.
              At the same perceived quality, WebP is 25–35% smaller than JPEG. On a typical landing page that's the
              difference between a 4-second LCP and a sub-2-second one. Browser support is universal — Safari 14+ on
              iOS and macOS, every Chromium browser, every Firefox.
            </p>
            <p>
              The cases where JPEG still wins are narrow. Some legacy embedded systems (older e-readers, certain
              industrial cameras, pre-2018 office printers) can't decode WebP. If you're feeding a system you don't
              control — say, an old client management tool — JPEG is the safe choice. For the open web in 2026, WebP
              is the default.
            </p>
            <p>
              <strong>What about AVIF?</strong> AVIF compresses about 20% more aggressively than WebP. It's the long-term
              future. But AVIF encoding is significantly slower, browser support is still catching up in older devices,
              and the marginal gains over WebP rarely justify the operational overhead today. Pick WebP if you have to
              pick one. Use both with <code>&lt;picture&gt;</code> tags if you're optimizing aggressively.
            </p>
          </div>
        </ToolSection>

        {/* Use cases */}
        <ToolSection width="grid">
          <SectionHeading kicker="Who it's for" title="Real use cases" />
          <ToolFeatureGrid items={useCases} />
        </ToolSection>

        {/* Privacy band */}
        <ToolSection width="privacy">
          <ToolPrivacyBand
            heading="Your images never leave your device"
            body="Every conversion happens with the HTML5 Canvas API in your own browser. There is no server-side image pipeline. There are no analytics on your files. The only network call this page makes is to load itself — once that's done, you could disconnect from the internet and convert thousands of images. Open your browser's DevTools and watch the Network tab while you convert. You'll see nothing. That's the point."
          />
        </ToolSection>

        {/* FAQ */}
        <ToolSection>
          <SectionHeading kicker="Questions" title="Frequently asked" />
          <ToolFAQ items={faqs} />
        </ToolSection>

        {/* Inline feedback */}
        <ToolSection>
          <FeedbackInlineCard />
        </ToolSection>

        {/* Related tools */}
        <ToolSection width="grid">
          <SectionHeading kicker="Keep going" title="Other useful tools" />
          <ToolRelatedTools items={related} />
        </ToolSection>

        {/* Author card */}
        <ToolSection width="privacy" marginBottom={140}>
          <ToolAuthorCard />
        </ToolSection>
      </ToolSEOArticle>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(13,15,20,0.96)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${toast.type === "success" ? "rgba(140,230,170,0.30)" : "rgba(255,120,120,0.32)"}`,
              color: toast.type === "success" ? "rgba(180,240,200,0.95)" : "rgba(255,170,170,0.95)",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: tokens.font.body,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)",
            }}
          >
            {toast.type === "success" ? <Check size={14} strokeWidth={2.4} /> : <X size={14} strokeWidth={2.4} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <ToolStatusBar
        stats={[
          results.length > 0
            ? { key: "n", label: `${results.length} converted` }
            : isConverting
              ? { key: "status", label: "Converting…", accent: "warn" }
              : { key: "status", label: "Drop or paste an image", accent: "muted" },
          { key: "q", label: lossless ? "Lossless" : `Quality ${quality}` },
          ...(maxWidth
            ? [{ key: "w", label: `Max width ${maxWidth}px`, accent: "muted" } as ToolStatusStat]
            : []),
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}
