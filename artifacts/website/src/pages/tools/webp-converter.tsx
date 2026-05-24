import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Settings as SettingsIcon, Clipboard, Plus, Check, X,
  Download, Trash2, Sliders, Maximize2, Layers, FileImage
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ToolPage, ToolSEOArticle, ToolSection, SectionHeading, ToolStatusBar,
  ToolFAQ, ToolHowToSteps, ToolFeatureGrid, ToolRelatedTools,
  ToolAuthorCard, ToolPrivacyBand, FeedbackInlineCard, buildToolJsonLd,
  type ToolFAQItem, type RelatedTool, type ToolHowToStep, type ToolFeature,
  type ToolStatusStat
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

  const downloadAll = useCallback(() => {
    results.forEach((r) => {
      triggerDownload(r.webpUrl, r.webpName);
    });
    showToast(`Downloading ${results.length} files`, "success");
  }, [results, triggerDownload, showToast]);

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
    { icon: FileImage, title: "Stays in your browser", desc: "Files are encoded by the HTML5 Canvas API on your device. Nothing is uploaded to any server. Works offline once the page is loaded." },
    { icon: FileImage, title: "Instant batch convert", desc: "Drop one file or twenty. Each one converts and downloads automatically — no queue, no progress bar theatre." },
    { icon: Sliders, title: "Quality you control", desc: "Slide from 1 to 100. Most photos hit the sweet spot at 75–85, where WebP looks identical to the source and weighs 60–80% less." },
    { icon: Maximize2, title: "Resize on the fly", desc: "Set a max width and oversized images shrink proportionally before encoding. Perfect for hero shots that don't need to be 4000px wide." },
    { icon: Layers, title: "Lossless when you need it", desc: "Toggle lossless mode for icons, illustrations, and screenshots where every pixel matters and quality cannot drift." },
    { icon: FileImage, title: "Works with anything", desc: "Reads PNG, JPEG, GIF, BMP, and most other browser-native formats. Output is universal WebP that every modern browser renders." },
  ];

  const steps: ToolHowToStep[] = [
    { title: "Drop, paste, or browse", body: "Drag image files onto the drop zone, paste from your clipboard with Ctrl+V (or ⌘+V), or click the zone to browse your computer." },
    { title: "Adjust quality if needed", body: "Most users can leave the defaults. For finer control, open Settings and slide quality, set a max width, or flip to lossless mode." },
    { title: "Convert and download", body: "Each file encodes in milliseconds. Your browser downloads the WebP automatically and it appears in the queue below for re-download." },
    { title: "Use anywhere", body: "Drop the WebP into your CMS, GitHub README, design tool, or web project. Every modern browser will render it natively." },
  ];

  const useCases: ToolFeature[] = [
    { icon: FileImage, title: "Web developers", desc: "Cut Largest Contentful Paint by 30–50% just by swapping JPEGs to WebP. Lighthouse scores climb, Core Web Vitals turn green." },
    { icon: FileImage, title: "Designers", desc: "Export PNGs from Figma at 2× and convert to lossless WebP. Same crisp quality on retina, half the bandwidth." },
    { icon: FileImage, title: "Bloggers", desc: "Featured images, social cards, hero shots — convert all of them in one drop and your blog feels twice as fast on mobile." },
    { icon: FileImage, title: "E-commerce", desc: "Product photography goes from megabytes to kilobytes without losing detail. Faster pages, higher conversion rates." },
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
            position: "absolute",
            top: 56,
            right: 0,
            zIndex: 60,
            width: 280,
            background: "var(--bg2)",
            border: "1px solid var(--b1)",
            borderRadius: "var(--r)",
            padding: 18,
            boxShadow: "0 24px 64px -8px rgba(0,0,0,0.55)",
          }}
          role="dialog"
          aria-label="Conversion settings"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--d)", fontSize: 13, fontWeight: 600, color: "var(--t1)", letterSpacing: "-0.005em" }}>
              Settings
            </span>
            <button
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
              style={{ background: "transparent", border: "none", color: "var(--t3)", cursor: "pointer", padding: 4, borderRadius: 6, display: "inline-flex" }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Max width */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--t2)", fontFamily: "var(--s)" }}>Max width</span>
                <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--s)" }}>px</span>
              </div>
              <input
                type="number"
                placeholder="No limit"
                value={maxWidth}
                onChange={(e) => setMaxWidth(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                aria-label="Max width in pixels"
                style={{
                  width: "100%",
                  background: "var(--bg0)",
                  border: "1px solid var(--b1)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                  color: "var(--t1)",
                  fontFamily: "var(--s)",
                  outline: "none",
                }}
              />
            </div>

            {/* Lossless toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--t2)", fontFamily: "var(--s)" }}>Lossless</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, fontFamily: "var(--s)" }}>For screenshots & logos</div>
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
                  background: lossless ? "var(--t1)" : "var(--bg4)",
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
                    background: lossless ? "var(--bg0)" : "var(--t1)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  }}
                />
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--b0)", paddingTop: 12 }}>
              <button
                onClick={() => { setQuality(80); setMaxWidth(""); setLossless(false); }}
                style={{
                  fontSize: 11.5,
                  color: "var(--t3)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--s)",
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
    <div style={{ position: "relative" }}>
      <button
        ref={settingsBtnRef}
        onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        className="tool-header-btn"
        aria-label="Settings"
        aria-expanded={showSettings}
        style={
          showSettings
            ? { background: "var(--bg4)", color: "var(--t1)", borderColor: "var(--b2)" }
            : undefined
        }
      >
        <SettingsIcon size={13} strokeWidth={2} />
        <span>Settings</span>
      </button>
      {settingsPanel}
    </div>
  );

  const sliderPercentage = ((quality - 1) / 99 * 100).toFixed(1);

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
      bgColor="var(--bg0)"
    >
      <style>{`
        /* ── CONVERTER ── */
        .wc-shell {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin: 0 auto;
          padding: 44px 24px 52px;
        }
        @media (max-width: 640px) {
          .wc-shell {
            padding: 36px 16px 44px;
          }
        }
        .hero {
          text-align: center;
          max-width: 580px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0 auto;
        }
        .eyebrow {
          font-family: var(--s);
          font-size: 10px;
          color: var(--t3);
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .hero h1 {
          font-family: var(--d);
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -.04em;
          line-height: 1.1;
          color: var(--t1);
        }
        .hero h1 em {
          font-style: italic;
          font-family: var(--tnr);
          font-size: 46px;
          color: var(--hi);
          letter-spacing: -.01em;
          line-height: .9;
          display: inline-block;
          vertical-align: -.08em;
        }
        .hero p {
          font-size: 13px;
          color: var(--t2);
          font-weight: 300;
          line-height: 1.65;
          letter-spacing: .01em;
        }
        .hero p b { font-weight: 500; color: var(--t1); }

        .cvt { width: 100%; display: flex; flex-direction: column; gap: 10px; }

        .dz-shell {
          border-radius: var(--r);
          border: 1px solid var(--b2);
          background: var(--bg1);
          transition: border-color .22s, background .22s;
        }
        .dz-shell:hover  { border-color: var(--b3); }
        .dz-shell.active { border-color: rgba(240,237,232,.22); background: var(--bg2); }

        .dz {
          border-radius: calc(var(--r) - 1px);
          padding: 40px 28px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          min-height: 210px;
          justify-content: center;
        }

        .dz::before {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          opacity: .022;
          pointer-events: none;
        }

        .dz::after {
          content: '';
          position: absolute; top: -30px; left: 50%;
          transform: translateX(-50%);
          width: 360px; height: 160px;
          background: radial-gradient(ellipse, rgba(240,237,232,.026) 0%, transparent 66%);
          pointer-events: none;
        }

        .dz.dragging { background: var(--bg2); }

        .dz-ico {
          width: 42px; height: 42px; border-radius: 10px;
          background: var(--bg3); border: 1px solid var(--b1);
          display: flex; align-items: center; justify-content: center;
          color: var(--t3);
          transition: color .18s, border-color .18s, background .18s;
          position: relative; z-index: 1;
        }
        .dz-shell:hover .dz-ico,
        .dz.dragging .dz-ico {
          color: var(--t2); border-color: var(--b2); background: var(--bg4);
        }

        .dz-txt { text-align: center; position: relative; z-index: 1; }
        .dz-txt h2 {
          font-family: var(--d); font-size: 15px; font-weight: 700;
          letter-spacing: -.025em; margin-bottom: 5px; color: var(--t1);
        }
        .dz-txt p { font-family: var(--s); font-size: 11px; color: var(--t3); }
        .dz-txt p span { color: var(--t2); }

        .dz-btns { display: flex; gap: 7px; position: relative; z-index: 1; }

        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: var(--rs);
          font-size: 12px; font-family: var(--s); font-weight: 500;
          cursor: pointer; transition: background .14s, color .14s, border-color .14s;
          border: none; letter-spacing: .005em;
        }
        .btn-sec {
          background: var(--bg3); color: var(--t2); border: 1px solid var(--b1);
        }
        .btn-sec:hover { background: var(--bg4); border-color: var(--b2); color: var(--t1); }

        .btn-pri { background: var(--t1); color: #0D0D0C; font-weight: 600; }
        .btn-pri:hover { background: var(--ac); }

        .btn-ghost { background: transparent; color: var(--t3); border: 1px solid var(--b0); }
        .btn-ghost:hover { color: var(--t2); border-color: var(--b1); }

        .fmts { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; }
        .fmt {
          font-family: var(--s); font-size: 9px; padding: 2px 7px;
          border-radius: var(--rs-xs); background: transparent; color: var(--t3);
          border: 1px solid var(--b0); letter-spacing: .08em; text-transform: uppercase;
          transition: color .15s, border-color .15s;
        }
        .dz-shell:hover .fmt { color: var(--t2); border-color: var(--b1); }

        .proc {
          display: none; position: absolute; inset: 0;
          background: rgba(15,15,14,.92); border-radius: calc(var(--r) - 1px);
          flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; z-index: 20;
        }
        .proc.on { display: flex; }
        .ring {
          width: 24px; height: 24px;
          border: 1.5px solid var(--b2);
          border-top-color: var(--t1);
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .proc-lbl { font-family: var(--s); font-size: 11px; color: var(--t2); letter-spacing: .04em; }

        .qbar {
          background: var(--bg1); border: 1px solid var(--b0);
          border-radius: var(--r); padding: 11px 18px;
          display: flex; align-items: center; gap: 16px;
        }
        .qlbl {
          font-family: var(--s); font-size: 10px; color: var(--t3);
          text-transform: uppercase; letter-spacing: .1em; white-space: nowrap;
        }
        .qslide { flex: 1; display: flex; align-items: center; gap: 12px; }
        input[type=range] {
          -webkit-appearance: none; flex: 1; height: 2px;
          border-radius: 1px; outline: none; cursor: pointer; background: var(--b1);
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 12px; height: 12px;
          border-radius: 50%; background: var(--t1);
          border: 2px solid var(--bg0); transition: transform .12s;
        }
        input[type=range]:hover::-webkit-slider-thumb { transform: scale(1.25); }
        .qval {
          font-family: var(--s); font-size: 13px; color: var(--t1);
          font-weight: 500; min-width: 26px; text-align: right; letter-spacing: -.01em;
        }
        .sep { width: 1px; height: 16px; background: var(--b0); flex-shrink: 0; }
        .hint { display: flex; align-items: center; gap: 4px; font-family: var(--s); font-size: 10px; color: var(--t3); }
        .kbd {
          padding: 2px 6px; background: var(--bg3); border: 1px solid var(--b1);
          border-radius: var(--rs-xs); font-family: var(--s); font-size: 10px; color: var(--t2);
        }

        .results { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
        .rcard {
          background: var(--bg1); border: 1px solid var(--b0);
          border-radius: var(--r); overflow: hidden;
          transition: border-color .2s;
        }
        .rcard:hover { border-color: var(--b1); }

        .rcard-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; border-bottom: 1px solid var(--b0);
          background: var(--bg2);
        }
        .rname { font-family: var(--s); font-size: 12px; color: var(--t1); font-weight: 500; }
        .rstatus { display: flex; align-items: center; gap: 5px; font-family: var(--s); font-size: 10px; color: var(--ok); }
        .rsdot { width: 4px; height: 4px; border-radius: 50%; background: var(--ok); }

        .rcard-body {
          padding: 16px; display: grid;
          grid-template-columns: 1fr 48px 1fr; gap: 12px; align-items: center;
        }
        .sblk { display: flex; flex-direction: column; gap: 3px; }
        .slbl { font-family: var(--s); font-size: 9px; color: var(--t3); text-transform: uppercase; letter-spacing: .1em; }
        .sval { font-family: var(--s); font-size: 20px; font-weight: 500; color: var(--t1); letter-spacing: -.03em; }
        .sval.ok   { color: var(--ok); }
        .sval.warn { color: var(--warn); }
        .ssub { font-family: var(--s); font-size: 10px; color: var(--t3); }
        .arrow-col { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .cbadge { font-family: var(--s); font-size: 10px; padding: 2px 7px; border-radius: var(--rs-xs); }
        .cbadge.ok   { background: var(--ok2); color: var(--ok); border: 1px solid rgba(82,196,122,.14); }
        .cbadge.warn { background: rgba(200,134,58,.07); color: var(--warn); border: 1px solid rgba(200,134,58,.16); }

        .rcard-foot { padding: 9px 16px; border-top: 1px solid var(--b0); display: flex; gap: 7px; }
        .btn-dl { flex: 1; justify-content: center; }

        .toast {
          position: fixed; bottom: 22px; left: 50%;
          transform: translateX(-50%) translateY(56px); opacity: 0;
          background: var(--bg3); border: 1px solid var(--b0);
          border-radius: var(--rs); padding: 9px 16px;
          font-family: var(--s); font-size: 11px;
          transition: transform .22s, opacity .22s; z-index: 200; white-space: nowrap;
          pointer-events: none;
        }
        .toast.on { transform: translateX(-50%) translateY(0); opacity: 1; }
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

      <main className="wc-shell" ref={mainRef}>
        <div className="hero">
          <span className="eyebrow">Image Utility</span>
          <h1>Convert to <em>WebP</em> instantly.</h1>
          <p><b>Runs entirely in your browser.</b> Your images never leave your machine.</p>
        </div>

        <div className="cvt">
          <div className={`dz-shell ${isDragOver ? "active" : ""}`} id="dzShell">
            <div
              className={`dz ${isDragOver ? "dragging" : ""}`}
              id="dz"
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
              <div className={`proc ${isConverting ? "on" : ""}`} id="proc">
                <div className="ring" />
                <span className="proc-lbl">converting...</span>
              </div>

              <div className="dz-ico">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2.5v9M5.5 8l3.5 4 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 13.5v1A1.5 1.5 0 004 16h10a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <div className="dz-txt">
                <h2>{isDragOver ? "Drop to convert" : "Drop images here"}</h2>
                <p>click to browse · <span>Ctrl+V</span> to paste</p>
              </div>

              <div className="dz-btns" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-sec" onClick={handleDropZoneClick}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                    <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 4v4M4 6h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Browse files
                </button>
                <button className="btn btn-sec" onClick={handlePasteButton}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                    <rect x="3" y="0.5" width="6" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M2 1.5H1.5a1 1 0 00-1 1v8a1 1 0 001 1h9a1 1 0 001-1v-8a1 1 0 00-1-1H10" stroke="currentColor" stroke-width="1.2" strokeLinecap="round" />
                  </svg>
                  Paste
                </button>
              </div>

              <div className="fmts">
                <span className="fmt">PNG</span>
                <span className="fmt">JPG</span>
                <span className="fmt">GIF</span>
                <span className="fmt">BMP</span>
                <span className="fmt">TIFF</span>
                <span className="fmt">AVIF</span>
                <span className="fmt">SVG</span>
              </div>
            </div>
          </div>

          <div className="qbar">
            <span className="qlbl">Quality</span>
            <div className="qslide">
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                disabled={lossless}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                style={{
                  background: `linear-gradient(90deg, var(--t1) ${sliderPercentage}%, var(--b1) ${sliderPercentage}%)`
                }}
              />
              <span className="qval">{lossless ? "—" : quality}</span>
            </div>
            <div className="sep" />
            <div className="hint">
              <span className="kbd">Ctrl</span>
              <span style={{ color: "var(--t3)" }}>+</span>
              <span className="kbd">V</span>
              <span style={{ marginLeft: 3 }}>to paste</span>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="results" id="results">
            <div className="rcard-top" style={{ background: "transparent", border: "none", padding: "0 4px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="rname" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: ".1em", color: "var(--t3)", fontFamily: "var(--s)" }}>
                Converted · {results.length}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={downloadAll}
                  className="btn btn-sec"
                  style={{ padding: "4px 10px", fontSize: 11, color: "var(--t1)" }}
                >
                  <Download size={11} style={{ marginRight: 4 }} />
                  Download all
                </button>
                <button
                  onClick={clearAll}
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11, color: "var(--t2)" }}
                >
                  Clear all
                </button>
              </div>
            </div>
            {results.map((r) => {
              const delta = formatDelta(r.originalSize, r.newSize);
              const smaller = r.newSize < r.originalSize;
              const pct = Math.round(Math.abs((r.originalSize - r.newSize) / r.originalSize) * 100);

              return (
                <div key={r.id} className="rcard">
                  <div className="rcard-top">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--rs-xs)",
                        overflow: "hidden",
                        border: "1px solid var(--b1)",
                        background: "var(--bg0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <img
                          src={r.thumbDataUrl}
                          alt=""
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <span className="rname">{r.webpName}</span>
                    </div>
                    <div className="rstatus">
                      <div className="rsdot" />
                      converted · q{lossless ? "lossless" : quality} · {r.width}×{r.height}px
                    </div>
                  </div>
                  <div className="rcard-body">
                    <div className="sblk">
                      <span className="slbl">Original</span>
                      <span className="sval">{formatBytes(r.originalSize)}</span>
                      <span className="ssub">{r.originalName.split(".").pop()?.toUpperCase() || "IMG"}</span>
                    </div>
                    <div className="arrow-col">
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                        <path d="M2.5 8.5h12M10 5l4 3.5-4 3.5" stroke="var(--t3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className={`cbadge ${smaller ? "ok" : "warn"}`}>
                        {smaller ? "-" : "+"}{pct}%
                      </span>
                    </div>
                    <div className="sblk">
                      <span className="slbl">Converted</span>
                      <span className={`sval ${smaller ? "ok" : "warn"}`}>{formatBytes(r.newSize)}</span>
                      <span className="ssub">WebP</span>
                    </div>
                  </div>
                  <div className="rcard-foot">
                    <button className="btn btn-pri btn-dl" onClick={() => reDownload(r)}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                        <path d="M6 1.5v7M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Download WebP
                    </button>
                    <button className="btn btn-ghost" onClick={() => removeResult(r.id)} title="Dismiss">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
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
      <div className={`toast ${toast.visible ? "on" : ""}`} style={{
        borderColor: toast.type === "success" ? "rgba(82,196,122,.28)" : "rgba(196,72,62,.28)",
        color: toast.type === "success" ? "var(--ok)" : "var(--err)",
      }}>
        {toast.message}
      </div>

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
