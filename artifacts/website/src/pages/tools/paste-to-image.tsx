import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Download, Check, X, Clipboard, Copy, ChevronDown,
  Settings, Square, Circle, ArrowUpRight, Crop, Undo2, Trash2,
  Maximize2, Minimize2, Droplets, MoreVertical, FlipHorizontal, FlipVertical,
  RotateCw, RotateCcw, Type,
  Zap, Lock, Keyboard, EyeOff, Image as ImageIcon, Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ─────────────── Aliases & SEO copy ─────────────── */

// Canonical was originally /tools/paste-to-download-image, but the shorter
// /tools/paste-to-image won out across the directory, sitemap, and internal
// linking. Older URL still works as a 200-OK alias and sets canonical to here.
const CANONICAL = "/tools/paste-to-image";

const ROUTE_ALIASES = [
  "/tools/paste-to-image",
  "/tools/paste-to-download-image",
  "/tools/screenshot-editor",
  "/tools/clipboard-to-image",
  "/paste-to-image",
] as const;

type SeoCopy = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
};

const PTI_SEO: Record<string, SeoCopy> = {
  "/tools/paste-to-download-image": {
    title: "Paste Image to Download — Annotate, Blur & Save | Ankit Jaiswal",
    description: "Paste any image from your clipboard, annotate with arrows/shapes, blur sensitive info, crop, then download as JPG, PNG, or WebP. 100% in your browser. No uploads, no signup.",
    eyebrow: "Free · Private · No signup",
    h1: "Paste an image, annotate it, save it",
    intro: "The fastest way to turn a clipboard screenshot into a polished, shareable file. Paste with Ctrl+V, mark it up with arrows and shapes, blur anything sensitive, then download. Nothing ever leaves your browser.",
  },
  "/tools/paste-to-image": {
    title: "Paste Image — Save Clipboard Screenshot to File | Ankit Jaiswal",
    description: "Free online paste-to-image tool. Press Ctrl+V to paste a screenshot, annotate it, and download as JPG, PNG, or WebP. Works with screenshots from Snipping Tool, Cmd+Shift+4, and copied images.",
    eyebrow: "Clipboard → file",
    h1: "Paste an image and save it as a file",
    intro: "Paste any image from your clipboard and download it instantly — no uploads, no signup. Perfect for converting screenshots, copied web images, or any clipboard image into a real file you can save and share.",
  },
  "/tools/screenshot-editor": {
    title: "Online Screenshot Editor — Annotate & Blur, Free | Ankit Jaiswal",
    description: "Free browser-based screenshot editor. Paste a screenshot, add arrows and shapes, blur passwords or PII, crop, then download. Faster than installing an app — and nothing is uploaded.",
    eyebrow: "Annotate · Blur · Crop",
    h1: "Edit any screenshot in your browser",
    intro: "Skip installing yet another desktop app. Paste a screenshot, annotate it with arrows, rectangles, and circles, blur out sensitive information, crop to size, and download — all in your browser, all in seconds.",
  },
  "/tools/clipboard-to-image": {
    title: "Clipboard to Image File — Save as PNG/JPG/WebP | Ankit Jaiswal",
    description: "Convert any image in your clipboard to a downloadable file. Paste with Ctrl+V, choose JPG, PNG, or WebP, and save. Works with screenshots, copied images, and any clipboard graphic.",
    eyebrow: "PNG · JPG · WebP",
    h1: "Save your clipboard image as a real file",
    intro: "Got an image on your clipboard with nowhere to put it? Paste it here, choose your format and quality, and download. The fastest path from copied pixels to a saved file.",
  },
  "/paste-to-image": {
    title: "Paste to Image — Free Clipboard Image Saver | Ankit Jaiswal",
    description: "Paste an image from your clipboard and download it. Free, private, no signup. Annotate with arrows, blur sensitive info, crop, and save as JPG, PNG, or WebP — all in your browser.",
    eyebrow: "Free · Browser-only",
    h1: "Paste an image, get a file",
    intro: "Paste any image from your clipboard and download it instantly. Annotate, blur, crop, choose your format. Everything happens in your browser — nothing is uploaded.",
  },
};

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

type Tool = "select" | "rectangle" | "circle" | "arrow" | "blur" | "crop" | "text";
type Format = "jpeg" | "png" | "webp" | "pdf";

interface Annotation {
  type: "rectangle" | "circle" | "arrow" | "blur" | "text";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  // Text-specific (only present when type === "text")
  text?: string;
  fontSize?: number;  // normalized to image-native pixels at display scale
  textStyle?: "plain" | "highlight" | "solid";
}

type StrokeWidth = 2 | 4 | 6;

const COLORS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#FFFFFF"];

function isLightHex(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length === 3) {
    const r = parseInt(c[0] + c[0], 16);
    const g = parseInt(c[1] + c[1], 16);
    const b = parseInt(c[2] + c[2], 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/* ─────────────── SEO content ─────────────── */

const FEATURES: ToolFeature[] = [
  {
    icon: Zap,
    title: "Instant paste",
    desc: "Press Ctrl+V (or ⌘V) and your image is on the canvas before your finger leaves the key. No upload, no spinner, no wait.",
  },
  {
    icon: Wand2,
    title: "Annotate fast",
    desc: "Rectangle, circle, arrow, blur — keyboard shortcuts (R / O / A / B) so you never reach for the mouse twice.",
  },
  {
    icon: EyeOff,
    title: "Blur sensitive info",
    desc: "Drag a blur box over passwords, names, faces, or PII before you ship the screenshot. The blur is rendered into the export — not just an overlay.",
  },
  {
    icon: ImageIcon,
    title: "JPG, PNG or WebP",
    desc: "Pick the right format for the job — JPG for chat, PNG for transparency, WebP for the web. Adjust quality with a single slider.",
  },
  {
    icon: Lock,
    title: "Nothing is uploaded",
    desc: "The entire editor runs in your browser. The image, the annotations, the export — none of it touches a server. Safe for confidential work.",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first workflow",
    desc: "V / R / O / A / B / C switch tools. Ctrl+Z undoes. Ctrl+C copies the edited image straight back to your clipboard. Esc clears the active tool.",
  },
];

const HOW_TO: ToolHowToStep[] = [
  {
    title: "Take a screenshot or copy an image",
    body: "Use Snipping Tool, ⌘+Shift+4, Win+Shift+S, or right-click → Copy on any web image. Anything that lands on your clipboard works.",
  },
  {
    title: "Paste it here",
    body: "Click into the canvas and press Ctrl+V (Cmd+V on Mac), or click the dropzone — the browser will read your clipboard if it has permission.",
  },
  {
    title: "Mark it up",
    body: "Pick a tool from the toolbar — rectangle to highlight, arrow to point, blur to redact. Tap a color, set the stroke weight, draw. Undo with Ctrl+Z.",
  },
  {
    title: "Crop to size (optional)",
    body: "Hit C to crop. Drag a region, then click ‘Apply Crop’. Useful for trimming chrome out of a window screenshot before you share it.",
  },
  {
    title: "Download or copy",
    body: "Pick JPG / PNG / WebP in the settings panel, name your file, then click Download — or hit Ctrl+C to copy the edited image back to your clipboard.",
  },
];

const FAQS: ToolFAQItem[] = [
  {
    q: "How is this different from just pasting into Paint or Preview?",
    a: "It’s designed for the one task you keep doing — paste a screenshot, mark it up, share it. No save dialog hunting, no learning a 30-tool toolbar, no installs. Open the URL, press Ctrl+V, draw, download. The whole loop takes seconds.",
  },
  {
    q: "Are my images uploaded anywhere?",
    a: "No. Every step — paste, render, annotate, blur, crop, encode, download — happens in your browser. There is no upload endpoint. You can disconnect from the internet after the page loads and the editor still works. Safe for screenshots of internal dashboards, financial data, or anything confidential.",
  },
  {
    q: "Does the blur tool actually obscure sensitive info, or just hide it visually?",
    a: "It permanently blurs the underlying pixels in the exported file (12px Gaussian blur, baked into the bitmap). It is not a layer that someone can remove later — there is no layer. That said, blurring tiny text can sometimes be reversed with AI deblur tools, so for truly sensitive content, prefer a solid rectangle in black or white over the area instead.",
  },
  {
    q: "Which format should I pick — JPG, PNG, or WebP?",
    a: "JPG for screenshots you’re sharing in chat (small files, no transparency). PNG when you need a transparent background, sharp text, or lossless quality. WebP for blog posts and the web — typically 25–35% smaller than JPG at the same visual quality, supported in every modern browser.",
  },
  {
    q: "What’s the right quality setting?",
    a: "92% (the default) is the sweet spot for screenshots — visually identical to lossless, ~5x smaller than PNG. Drop to 80% for quick chat shares. Push to 100% for archival or when you’ll re-edit later.",
  },
  {
    q: "Can I copy the edited image back to my clipboard instead of downloading?",
    a: "Yes — press Ctrl+C (or click Copy). The annotated, cropped, blurred result goes straight back to your clipboard as a PNG, ready to paste into Slack, an email, a Notion doc, or anywhere else.",
  },
  {
    q: "What keyboard shortcuts are available?",
    a: "V = select / pan, R = rectangle, O = circle (oval), A = arrow, B = blur, C = crop, Ctrl+Z = undo, Ctrl+C = copy edited image, Esc = exit tool. The shortcuts only fire when you’re not typing in an input.",
  },
  {
    q: "Why is there a paid online screenshot tool when this exists?",
    a: "Honest answer — most of those tools sell cloud storage, team libraries, and link sharing on top of the basic edit-and-export loop. If you don’t need the cloud bits, an in-browser editor is faster, more private, and free. That’s what this is.",
  },
  {
    q: "Does it work on my phone?",
    a: "Pasting from the iOS / Android clipboard works on Safari and Chrome (long-press → Paste in the dropzone). The annotation toolbar is touch-friendly, but for serious markup a laptop is much faster. The downloaded file works the same on every device.",
  },
  {
    q: "What image formats can I paste in?",
    a: "Anything your browser can decode — PNG, JPG, WebP, GIF (first frame), BMP, and SVG. The editor renders to a canvas, so the input format doesn’t matter; only the output format you choose for the download does.",
  },
];

const RELATED: RelatedTool[] = [
  { href: "/tools/webp-converter",          name: "WebP Converter",                desc: "Convert PNGs and JPGs to WebP — typically 25–35% smaller for the same quality." },
  { href: "/tools/yt-thumbnail-downloader", name: "YouTube Thumbnail Downloader",  desc: "Grab any YouTube thumbnail in HD (1280×720), SD, HQ, or medium." },
  { href: "/online-notepad",                name: "Online Notepad",                desc: "A focused, private notepad with autosave and Markdown — runs in your browser." },
  { href: "/tools/clipboard-history",       name: "Clipboard History",             desc: "Save, search and reuse the snippets and URLs you copy throughout the day." },
];

export default function PasteToImage() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>("select");
  const [currentColor, setCurrentColor] = useState("#FF3B30");
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [format, setFormat] = useState<Format>("jpeg");
  const [quality, setQuality] = useState(0.92);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });
  const [customFilename, setCustomFilename] = useState("clip");
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [textStyle, setTextStyle] = useState<"plain" | "highlight" | "solid">("plain");
  const [activeTextPos, setActiveTextPos] = useState<{ x: number; y: number } | null>(null);
  const [autoDownload, setAutoDownload] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pti_auto_download") === "true";
    }
    return false;
  });
  const [shouldAutoDownload, setShouldAutoDownload] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pti_auto_download", String(autoDownload));
    }
  }, [autoDownload]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSetupRef = useRef<{ needsSetup: boolean }>({ needsSetup: false });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filenameInputRef = useRef<HTMLInputElement>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const setupCanvas = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    return ctx;
  }, []);

  useLayoutEffect(() => {
    if (!image || !pendingSetupRef.current.needsSetup) return;
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const doSetup = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (canvas && container && container.clientWidth > 0) {
        const containerWidth = (container.clientWidth - 48) * 0.85;
        const scale = Math.min(1, containerWidth / image.width);
        const displayWidth = Math.floor(image.width * scale);
        const displayHeight = Math.floor(image.height * scale);
        
        setupCanvas(canvas, displayWidth, displayHeight);
        setDisplaySize({ width: displayWidth, height: displayHeight });
        pendingSetupRef.current.needsSetup = false;
        return true;
      }
      return false;
    };
    
    const trySetup = () => {
      if (!doSetup() && attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(trySetup);
      }
    };
    
    trySetup();
  }, [image, setupCanvas]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || displaySize.width === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: displayWidth, height: displayHeight } = displaySize;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

    annotations.forEach(ann => {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const sx = ann.startX * displayWidth;
      const sy = ann.startY * displayHeight;
      const ex = ann.endX * displayWidth;
      const ey = ann.endY * displayHeight;

      if (ann.type === "rectangle") {
        ctx.strokeRect(sx, sy, ex - sx, ey - sy);
      } else if (ann.type === "circle") {
        const centerX = (sx + ex) / 2;
        const centerY = (sy + ey) / 2;
        const radiusX = Math.abs(ex - sx) / 2;
        const radiusY = Math.abs(ey - sy) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === "arrow") {
        drawArrow(ctx, sx, sy, ex, ey, ann.color, ann.strokeWidth);
      } else if (ann.type === "blur") {
        const blurX = Math.min(sx, ex);
        const blurY = Math.min(sy, ey);
        const blurW = Math.abs(ex - sx);
        const blurH = Math.abs(ey - sy);
        if (blurW > 0 && blurH > 0) {
          ctx.save();
          ctx.filter = "blur(8px)";
          ctx.beginPath();
          ctx.rect(blurX, blurY, blurW, blurH);
          ctx.clip();
          ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
          ctx.restore();
        }
      } else if (ann.type === "text" && ann.text) {
        // Render text annotation at display scale
        const imageScale = image.width / displayWidth;
        const displayFontSize = (ann.fontSize ?? 20 * imageScale) / imageScale;
        ctx.save();
        ctx.font = `500 ${displayFontSize}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = "top";

        const lines = ann.text.split("\n");
        let maxLineWidth = 0;
        lines.forEach(line => {
          const width = ctx.measureText(line).width;
          if (width > maxLineWidth) maxLineWidth = width;
        });
        const lineHeight = displayFontSize * 1.35;
        const totalHeight = lines.length * lineHeight;

        const paddingX = displayFontSize * 0.4;
        const paddingY = displayFontSize * 0.2;
        const bgX = sx - paddingX;
        const bgY = sy - paddingY;
        const bgW = maxLineWidth + paddingX * 2;
        const bgH = totalHeight + paddingY * 2;

        const style = ann.textStyle ?? "plain";

        if (style === "highlight") {
          ctx.fillStyle = "rgba(255, 235, 59, 0.95)";
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, displayFontSize * 0.2);
          ctx.fill();
          ctx.fillStyle = "#000000";
        } else if (style === "solid") {
          ctx.fillStyle = ann.color;
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, displayFontSize * 0.2);
          ctx.fill();
          ctx.fillStyle = isLightHex(ann.color) ? "#000000" : "#FFFFFF";
        } else {
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = ann.color;
        }

        lines.forEach((line, i) => {
          ctx.fillText(line, sx, sy + i * lineHeight);
        });
        ctx.restore();
      }
    });

    if (isDrawing && (currentTool === "rectangle" || currentTool === "circle" || currentTool === "arrow" || currentTool === "blur")) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      
      if (currentTool === "rectangle") {
        ctx.strokeRect(drawStart.x, drawStart.y, drawEnd.x - drawStart.x, drawEnd.y - drawStart.y);
      } else if (currentTool === "circle") {
        const centerX = (drawStart.x + drawEnd.x) / 2;
        const centerY = (drawStart.y + drawEnd.y) / 2;
        const radiusX = Math.abs(drawEnd.x - drawStart.x) / 2;
        const radiusY = Math.abs(drawEnd.y - drawStart.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentTool === "arrow") {
        drawArrow(ctx, drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, currentColor, strokeWidth);
      } else if (currentTool === "blur") {
        const blurX = Math.min(drawStart.x, drawEnd.x);
        const blurY = Math.min(drawStart.y, drawEnd.y);
        const blurW = Math.abs(drawEnd.x - drawStart.x);
        const blurH = Math.abs(drawEnd.y - drawStart.y);
        if (blurW > 0 && blurH > 0) {
          ctx.save();
          ctx.filter = "blur(8px)";
          ctx.beginPath();
          ctx.rect(blurX, blurY, blurW, blurH);
          ctx.clip();
          ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
          ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(blurX, blurY, blurW, blurH);
          ctx.setLineDash([]);
        }
      }
    }

    if (isCropping && cropArea) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.clearRect(cropArea.x, cropArea.y, cropArea.w, cropArea.h);
      
      const srcX = (cropArea.x / displayWidth) * image.width;
      const srcY = (cropArea.y / displayHeight) * image.height;
      const srcW = (cropArea.w / displayWidth) * image.width;
      const srcH = (cropArea.h / displayHeight) * image.height;
      ctx.drawImage(image, srcX, srcY, srcW, srcH, cropArea.x, cropArea.y, cropArea.w, cropArea.h);
      
      ctx.strokeStyle = "#4F7DFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.w, cropArea.h);
      ctx.setLineDash([]);
    }
  }, [image, annotations, isDrawing, drawStart, drawEnd, currentTool, currentColor, strokeWidth, isCropping, cropArea, displaySize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, lineWidth: number = 4) => {
    const headLen = 10 + lineWidth * 2;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    const lineEndX = toX - headLen * Math.cos(angle) * 0.7;
    const lineEndY = toY - headLen * Math.sin(angle) * 0.7;
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const loadImage = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      URL.revokeObjectURL(url);
      setAnnotations([]);
      setCropArea(null);
      setIsCropping(false);
      pendingSetupRef.current.needsSetup = true;
      setImage(img);
      setCurrentTool("arrow");
      showToast("Image loaded!", "success");
      
      // Auto-detect contrasting annotation color based on image luminance and hue
      try {
        const sampleCanvas = document.createElement("canvas");
        const sampleCtx = sampleCanvas.getContext("2d");
        if (sampleCtx) {
          sampleCanvas.width = 50;
          sampleCanvas.height = 50;
          sampleCtx.drawImage(img, 0, 0, 50, 50);
          const imgData = sampleCtx.getImageData(0, 0, 50, 50).data;
          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const alpha = imgData[i + 3];
            if (alpha > 50) {
              totalR += imgData[i];
              totalG += imgData[i + 1];
              totalB += imgData[i + 2];
              count++;
            }
          }
          if (count > 0) {
            const avgR = totalR / count;
            const avgG = totalG / count;
            const avgB = totalB / count;
            const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
            
            let detectedColor = "#FF3B30"; // Default to premium red
            
            if (luminance < 75) {
              detectedColor = "#FFCC00"; // Neon yellow/amber contrasts great with dark/black
            } else if (luminance > 220) {
              detectedColor = "#FF3B30"; // Bright red pops on pure white
            } else {
              const maxVal = Math.max(avgR, avgG, avgB);
              if (maxVal === avgR && avgR > avgG + 15 && avgR > avgB + 15) {
                detectedColor = "#007AFF"; // Blue contrasts with red
              } else if (maxVal === avgG && avgG > avgR + 15 && avgG > avgB + 15) {
                detectedColor = "#FF3B30"; // Red contrasts with green
              } else if (maxVal === avgB && avgB > avgR + 15 && avgB > avgG + 15) {
                detectedColor = "#FFCC00"; // Yellow/Orange contrasts with blue
              }
            }
            setCurrentColor(detectedColor);
          }
        }
      } catch (err) {
        console.warn("Failed to sample image color", err);
      }

      if (autoDownload) {
        setShouldAutoDownload(true);
      }
    } catch {
      URL.revokeObjectURL(url);
      showToast("Failed to load image", "error");
    }
  }, [showToast, autoDownload]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) { loadImage(blob); return; }
        }
      }
      showToast("No image in clipboard", "error");
    };
    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [loadImage, showToast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadImage(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      loadImage(e.dataTransfer.files[0]);
    }
  }, [loadImage]);

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

  const handleBrowseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleZoneClick = async () => {
    if (image) return;
    try {
      if (navigator.clipboard && "read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            loadImage(blob);
            return;
          }
        }
      }
      showToast("No image in clipboard. Click 'Browse' or drag a file.", "error");
    } catch {
      showToast("Use Ctrl+V to paste, or click 'Browse' to upload.", "error");
    }
  };

  const getMousePos = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawEndRef = useRef({ x: 0, y: 0 });
  const drawStartRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);

  const handleDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawingRef.current || !image) return;
    const pos = getMousePos(e);
    drawEndRef.current = pos;
    setDrawEnd(pos);
    
    if (currentTool === "crop") {
      setCropArea({
        x: Math.min(drawStartRef.current.x, pos.x),
        y: Math.min(drawStartRef.current.y, pos.y),
        w: Math.abs(pos.x - drawStartRef.current.x),
        h: Math.abs(pos.y - drawStartRef.current.y)
      });
    }
  }, [image, currentTool]);

  const handleDocumentMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
    
    if (!isDrawingRef.current || !image || displaySize.width === 0) {
      isDrawingRef.current = false;
      setIsDrawing(false);
      return;
    }
    
    if (currentTool === "rectangle" || currentTool === "circle" || currentTool === "arrow" || currentTool === "blur") {
      const start = drawStartRef.current;
      const end = drawEndRef.current;
      if (Math.abs(end.x - start.x) > 5 || Math.abs(end.y - start.y) > 5) {
        setAnnotations(prev => [...prev, {
          type: currentTool,
          startX: start.x / displaySize.width,
          startY: start.y / displaySize.height,
          endX: end.x / displaySize.width,
          endY: end.y / displaySize.height,
          color: currentColor,
          strokeWidth: strokeWidth
        }]);
      }
    }
    
    isDrawingRef.current = false;
    setIsDrawing(false);
  }, [image, displaySize, currentTool, currentColor, strokeWidth, handleDocumentMouseMove]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;

    // Text tool: show overlay at click position, don't start a draw
    if (currentTool === "text") {
      const pos = getMousePos(e);
      setActiveTextPos(pos);
      // Focus the overlay after React has rendered it
      requestAnimationFrame(() => {
        const el = textOverlayRef.current;
        if (el) {
          el.focus();
          // Place cursor at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
      return;
    }

    if (currentTool === "select") return;
    const pos = getMousePos(e);
    
    isDrawingRef.current = true;
    drawStartRef.current = pos;
    drawEndRef.current = pos;
    
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawEnd(pos);
    
    if (currentTool === "crop") {
      setIsCropping(true);
      setCropArea({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
    
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
  };

  // Commit the text overlay to the annotations array
  const commitTextAnnotation = useCallback(() => {
    const el = textOverlayRef.current;
    const text = el?.innerText.trim();
    if (!text || !activeTextPos || !image || displaySize.width === 0) {
      setActiveTextPos(null);
      return;
    }
    // Store position normalized to 0-1 range, fontSize in image-native pixels
    const imageScale = image.width / displaySize.width;
    setAnnotations(prev => [...prev, {
      type: "text",
      startX: activeTextPos.x / displaySize.width,
      startY: activeTextPos.y / displaySize.height,
      endX: 0,
      endY: 0,
      color: currentColor,
      strokeWidth: 0,
      text,
      fontSize: fontSize * imageScale,
      textStyle: textStyle,
    }]);
    setActiveTextPos(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTextPos, currentColor, fontSize, image, displaySize, textStyle]);

  const discardTextAnnotation = useCallback(() => {
    setActiveTextPos(null);
  }, []);

  const applyCrop = () => {
    if (!cropArea || !image || cropArea.w < 10 || cropArea.h < 10 || displaySize.width === 0) {
      setIsCropping(false);
      setCropArea(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const scaleX = image.width / displaySize.width;
    const scaleY = image.height / displaySize.height;

    const clampedX = Math.max(0, Math.min(cropArea.x, displaySize.width));
    const clampedY = Math.max(0, Math.min(cropArea.y, displaySize.height));
    const clampedW = Math.min(cropArea.w, displaySize.width - clampedX);
    const clampedH = Math.min(cropArea.h, displaySize.height - clampedY);

    if (clampedW < 10 || clampedH < 10) {
      setIsCropping(false);
      setCropArea(null);
      showToast("Crop area too small", "error");
      return;
    }

    const cropWidth = Math.round(clampedW * scaleX);
    const cropHeight = Math.round(clampedH * scaleY);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(
      image,
      clampedX * scaleX,
      clampedY * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL();
    
    const currentImage = image;
    
    newImg.decode().then(() => {
      if (image !== currentImage) return;
      const container = containerRef.current;
      const containerWidth = container ? (container.clientWidth - 48) * 0.85 : cropWidth;
      const displayScale = Math.min(1, containerWidth / cropWidth);
      const newDisplayWidth = Math.floor(cropWidth * displayScale);
      const newDisplayHeight = Math.floor(cropHeight * displayScale);
      setupCanvas(canvas, newDisplayWidth, newDisplayHeight);
      setDisplaySize({ width: newDisplayWidth, height: newDisplayHeight });
      setAnnotations([]);
      setCropArea(null); setIsCropping(false); setCurrentTool("select");
      setImage(newImg);
      showToast("Cropped!", "success");
    }).catch(() => {
      setCropArea(null);
      setIsCropping(false);
      setCurrentTool("select");
      showToast("Failed to apply crop", "error");
    });
  };

  const undo = useCallback(() => {
    setAnnotations(prev => prev.slice(0, -1));
  }, []);

  const clearAll = () => {
    setImage(null);
    setAnnotations([]);
    setCropArea(null);
    setIsCropping(false);
  };

  const transformImage = useCallback((transform: "flipH" | "flipV" | "rotateL" | "rotateR") => {
    if (!image) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isRotate = transform === "rotateL" || transform === "rotateR";
    if (isRotate) { canvas.width = image.height; canvas.height = image.width; }
    else { canvas.width = image.width; canvas.height = image.height; }
    ctx.save();
    if (transform === "flipH") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    else if (transform === "flipV") { ctx.translate(0, canvas.height); ctx.scale(1, -1); }
    else if (transform === "rotateR") { ctx.translate(canvas.width, 0); ctx.rotate(Math.PI / 2); }
    else if (transform === "rotateL") { ctx.translate(0, canvas.height); ctx.rotate(-Math.PI / 2); }
    ctx.drawImage(image, 0, 0);
    ctx.restore();
    const newImage = new Image();
    newImage.onload = () => {
      setImage(newImage);
      setAnnotations([]);
      setCropArea(null);
      setIsCropping(false);
      setCurrentTool("select");
      pendingSetupRef.current.needsSetup = true;
    };
    newImage.src = canvas.toDataURL();
    setShowMoreMenu(false);
  }, [image]);

  // ── Export helpers ──
  const buildExportCanvas = (): HTMLCanvasElement => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image!.width;
    exportCanvas.height = image!.height;
    const ctx = exportCanvas.getContext("2d")!;
    const imageScale = image!.width / displaySize.width;
    ctx.drawImage(image!, 0, 0);
    annotations.forEach(ann => {
      const scaledStroke = ann.strokeWidth * imageScale;
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = scaledStroke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const sx = ann.startX * image!.width, sy = ann.startY * image!.height;
      const ex = ann.endX * image!.width, ey = ann.endY * image!.height;
      if (ann.type === "rectangle") {
        ctx.strokeRect(sx, sy, ex - sx, ey - sy);
      } else if (ann.type === "circle") {
        ctx.beginPath();
        ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === "arrow") {
        ctx.fillStyle = ann.color;
        const headLen = (10 + ann.strokeWidth * 2) * imageScale;
        const angle = Math.atan2(ey - sy, ex - sx);
        const lineEndX = ex - headLen * Math.cos(angle) * 0.7;
        const lineEndY = ey - headLen * Math.sin(angle) * 0.7;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath(); ctx.fill();
      } else if (ann.type === "blur") {
        const bx = Math.min(sx, ex), by = Math.min(sy, ey);
        const bw = Math.abs(ex - sx), bh = Math.abs(ey - sy);
        if (bw > 0 && bh > 0) {
          ctx.save(); ctx.filter = "blur(12px)";
          ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
          ctx.drawImage(image!, 0, 0, image!.width, image!.height);
          ctx.restore();
        }
      } else if (ann.type === "text" && ann.text) {
        const px = ann.startX * image!.width;
        const py = ann.startY * image!.height;
        const fs = ann.fontSize ?? (20 * imageScale);
        ctx.save();
        ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = "top";
        ctx.textRendering = "optimizeLegibility" as unknown as CanvasTextRendering;

        const lines = ann.text.split("\n");
        let maxLineWidth = 0;
        lines.forEach(line => {
          const width = ctx.measureText(line).width;
          if (width > maxLineWidth) maxLineWidth = width;
        });
        const lineHeight = fs * 1.35;
        const totalHeight = lines.length * lineHeight;

        const paddingX = fs * 0.4;
        const paddingY = fs * 0.2;
        const bgX = px - paddingX;
        const bgY = py - paddingY;
        const bgW = maxLineWidth + paddingX * 2;
        const bgH = totalHeight + paddingY * 2;

        const style = ann.textStyle ?? "plain";

        if (style === "highlight") {
          ctx.fillStyle = "rgba(255, 235, 59, 0.95)";
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, fs * 0.2);
          ctx.fill();
          ctx.fillStyle = "#000000";
        } else if (style === "solid") {
          ctx.fillStyle = ann.color;
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, fs * 0.2);
          ctx.fill();
          ctx.fillStyle = isLightHex(ann.color) ? "#000000" : "#FFFFFF";
        } else {
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = 4 * imageScale;
          ctx.shadowOffsetX = 1 * imageScale;
          ctx.shadowOffsetY = 1 * imageScale;
          ctx.fillStyle = ann.color;
        }

        // Draw each line (support multi-line)
        lines.forEach((line, i) => {
          ctx.fillText(line, px, py + i * lineHeight);
        });
        ctx.restore();
      }
    });
    return exportCanvas;
  };

  const downloadImage = useCallback((overrideFormat?: Format) => {
    if (!image || displaySize.width === 0) return;
    const activeFormat = overrideFormat ?? format;
    const ext = activeFormat === "jpeg" ? "jpg" : activeFormat;
    const filename = `${customFilename}.${ext}`;

    if (activeFormat === "pdf") {
      (async () => {
        const { jsPDF } = await import("jspdf");
        const dataUrl = buildExportCanvas().toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: image.width > image.height ? "l" : "p",
          unit: "px",
          format: [image.width, image.height],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
        pdf.save(filename);
        showToast(`Saved as ${filename}`, "success");
        if (document.fullscreenElement) document.exitFullscreen();
      })();
      return;
    }

    buildExportCanvas().toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Saved as ${filename}`, "success");
      if (document.fullscreenElement) document.exitFullscreen();
    }, `image/${activeFormat}`, activeFormat === "png" ? undefined : quality);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, annotations, format, quality, customFilename, displaySize, showToast]);

  const copyToClipboard = useCallback(async () => {
    if (!image || displaySize.width === 0) return;
    try {
      buildExportCanvas().toBlob(async blob => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        if (document.fullscreenElement) document.exitFullscreen();
        if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }, "image/png");
    } catch { showToast("Failed to copy", "error"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, annotations, displaySize, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;
      
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !isInputFocused) {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey && !isInputFocused) {
        const selection = window.getSelection();
        if (!selection || selection.toString() === "") {
          e.preventDefault();
          copyToClipboard();
        }
      }
      
      if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            setCurrentTool("text");
            setIsCropping(false);
            break;
          case "r":
            e.preventDefault();
            setCurrentTool("rectangle");
            setIsCropping(false);
            break;
          case "o":
            e.preventDefault();
            setCurrentTool("circle");
            setIsCropping(false);
            break;
          case "a":
            e.preventDefault();
            setCurrentTool("arrow");
            setIsCropping(false);
            break;
          case "b":
            e.preventDefault();
            setCurrentTool("blur");
            setIsCropping(false);
            break;
          case "c":
            e.preventDefault();
            setCurrentTool("crop");
            setIsCropping(true);
            break;
          case "v":
            e.preventDefault();
            setCurrentTool("select");
            setIsCropping(false);
            break;
          case "escape":
            setCurrentTool("select");
            setIsCropping(false);
            setCropArea(null);
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [image, annotations, undo, copyToClipboard]);

  const toggleFullscreen = useCallback(async () => {
    const container = editorContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const calculateDisplaySize = useCallback((img: HTMLImageElement, fullscreen: boolean) => {
    const container = containerRef.current;
    const editorContainer = editorContainerRef.current;
    const toolbar = toolbarRef.current;
    if (!container) return null;
    
    let scale: number;
    
    if (fullscreen && editorContainer) {
      const toolbarHeight = toolbar?.clientHeight || 60;
      const padding = 48;
      const statusBarHeight = 30;
      const availableWidth = editorContainer.clientWidth - padding;
      const availableHeight = editorContainer.clientHeight - toolbarHeight - statusBarHeight - padding;
      const widthScale = availableWidth / img.width;
      const heightScale = availableHeight / img.height;
      scale = Math.min(1, widthScale, heightScale);
    } else {
      const containerWidth = (container.clientWidth - 48) * 0.85;
      scale = Math.min(1, containerWidth / img.width);
    }
    
    return {
      width: Math.floor(img.width * scale),
      height: Math.floor(img.height * scale)
    };
  }, []);

  useEffect(() => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    const editorContainer = editorContainerRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const newSize = calculateDisplaySize(image, isFullscreen);
      if (!newSize) return;
      
      if (newSize.width !== displaySize.width || newSize.height !== displaySize.height) {
        setupCanvas(canvas, newSize.width, newSize.height);
        setDisplaySize(newSize);
      }
    };
    
    resizeCanvas();
    
    if (isFullscreen && editorContainer) {
      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(editorContainer);
      window.addEventListener("resize", resizeCanvas);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", resizeCanvas);
      };
    }
    return undefined;
  }, [isFullscreen, image, setupCanvas, displaySize.width, displaySize.height, calculateDisplaySize]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
    return undefined;
  }, [showSettings]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
    return undefined;
  }, [showMoreMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
    return undefined;
  }, [showDownloadMenu]);
  useEffect(() => {
    if (image && displaySize.width > 0 && shouldAutoDownload) {
      setShouldAutoDownload(false);
      downloadImage();
    }
  }, [image, displaySize, shouldAutoDownload, downloadImage]);

  const [location] = useLocation();
  const seo = useMemo(() => {
    const key = ROUTE_ALIASES.find((a) => a === location) ?? CANONICAL;
    return PTI_SEO[key] ?? PTI_SEO[CANONICAL];
  }, [location]);

  const jsonLd = useMemo(() => buildToolJsonLd({
    name: "Paste Image to Download",
    description: seo.description,
    path: CANONICAL,
    breadcrumbName: "Paste Image to Download",
    category: "MultimediaApplication",
    faqs: FAQS,
  }), [seo.description]);

  const tools = [
    { id: "rectangle" as Tool, icon: Square, label: "Rectangle (R)" },
    { id: "circle" as Tool, icon: Circle, label: "Circle (O)" },
    { id: "arrow" as Tool, icon: ArrowUpRight, label: "Arrow (A)" },
    { id: "blur" as Tool, icon: Droplets, label: "Blur (B)" },
    { id: "text" as Tool, icon: Type, label: "Text (T)" },
    { id: "crop" as Tool, icon: Crop, label: "Crop (C)" },
  ];

  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={location}
      seoCanonicalPath={CANONICAL}
      seoKeywords="paste image to download, screenshot editor online, clipboard to image, paste screenshot online, annotate screenshot, blur screenshot, save clipboard image"
      seoJsonLd={jsonLd}
      title="Paste Image to Download"
      tagline="Paste, annotate, blur, crop — download in seconds"
      backHref="/tools"
      backLabel="Tools"
      bgColor="transparent"
    >
      <style>{`
        .pti-shell {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin: 0 auto;
          padding: 44px 24px 52px;
        }
        @media (max-width: 640px) {
          .pti-shell {
            padding: 28px 12px 36px;
            gap: 16px;
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
        .txt-accent-tnr {
          font-family: var(--tnr);
          font-style: italic;
          color: var(--hi);
          font-size: 1.08em;
          padding: 0 1px;
          font-weight: normal;
        }
        
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
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
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
        .dz.dragging { background: var(--bg2); border-color: var(--b3); }
        .dz-ico {
          width: 42px; height: 42px; border-radius: 10px;
          background: var(--bg3); border: 1px solid var(--b1);
          display: flex; align-items: center; justify-content: center;
          color: var(--t3);
          transition: color .18s, border-color .18s, background .18s;
          position: relative; z-index: 1;
        }
        .dz-shell:hover .dz-ico, .dz.dragging .dz-ico {
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

        .fmts { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; }
        .fmt {
          font-family: var(--s); font-size: 9px; padding: 2px 7px;
          border-radius: var(--rs-xs); background: transparent; color: var(--t3);
          border: 1px solid var(--b0); letter-spacing: .08em; text-transform: uppercase;
          transition: color .15s, border-color .15s;
        }
        .dz-shell:hover .fmt { color: var(--t2); border-color: var(--b1); }

        /* Unified Liquid Split Button */
        .btn-split-liquid {
          background: #ffffff !important;
          color: #0A0C10 !important;
          border: 1px solid var(--b1) !important;
          padding: 0 !important;
          border-radius: 8px !important;
          display: inline-flex;
          align-items: center;
          height: 30px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
          overflow: hidden;
          transition: border-color 0.25s ease, box-shadow 0.25s ease !important;
        }
        .btn-split-liquid:hover {
          color: #ffffff !important;
          border-color: #10B981 !important;
          box-shadow: 0 4px 28px rgba(16, 185, 129, 0.25) !important;
        }
        .btn-split-liquid::after {
          background: #10B981 !important;
        }
        .btn-split-action {
          background: transparent !important;
          border: none !important;
          color: inherit !important;
          padding: 5px 12px 5px 14px !important;
          font-size: 12.5px !important;
          height: 30px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          cursor: pointer !important;
          transition: color 0.14s ease !important;
        }
        .btn-split-trigger {
          background: transparent !important;
          border: none !important;
          color: inherit !important;
          padding: 5px 8px !important;
          height: 30px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          transition: color 0.14s ease !important;
        }
        .btn-split-sep {
          width: 1px;
          height: 16px;
          background: rgba(0, 0, 0, 0.08) !important;
          transition: background 0.2s ease;
        }
        .btn-split-liquid:hover .btn-split-sep {
          background: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {!image ? (
        <main className="pti-shell" ref={mainRef}>
          <div className="hero">
            <span className="eyebrow">Clipboard &rarr; Image</span>
            <h1>Paste to <em>Image</em></h1>
            <p>
              Annotate, blur, crop, and save clipboard images <em className="txt-accent-tnr">locally</em> in your browser.
              No servers, no queues, no uploads.
            </p>
          </div>

          <div className="dz-shell">
            <div
              onClick={() => handleZoneClick()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`dz ${isDragOver ? "dragging" : ""}`}
            >
              <div className="dz-ico">
                <Clipboard size={18} strokeWidth={1.5} />
              </div>

              <div className="dz-txt">
                <h2>Click anywhere to paste or press Ctrl+V</h2>
                <p>
                  or drag & drop your image here to <span>begin</span>
                </p>
              </div>

              <div className="dz-btns">
                <button className="btn btn-pri" onClick={(e) => { e.stopPropagation(); handleZoneClick(); }}>
                  Paste from clipboard
                </button>
                <button className="btn btn-sec" onClick={handleBrowseClick}>
                  Browse files
                </button>
              </div>

              <div className="fmts">
                <span className="fmt">PNG</span>
                <span className="fmt">JPG</span>
                <span className="fmt">WEBP</span>
                <span className="fmt">PDF</span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main ref={mainRef} className="flex-1 flex flex-col items-center px-4 pt-6 pb-8" style={{ background: "transparent" }}>
          <div className="w-full max-w-5xl">
            <div style={{ background: "#161615", border: "1px solid #252523", borderRadius: 10, overflow: "hidden" }}>
              <div className="relative px-5 py-3" style={{ borderBottom: "1px solid #252523" }}>
                <div className="flex items-center justify-between gap-4">
                  <div
                    className="text-[10px] font-medium tracking-[0.14em] uppercase truncate"
                    style={{ color: "#3E3E3B" }}
                    aria-hidden={!image}
                  >
                    Editor
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(!showSettings);
                      setShowMoreMenu(false);
                    }}
                    className="p-1.5 rounded-[7px] transition-all duration-[140ms] shrink-0 hover:text-[#F0EDE8] hover:bg-[#222221]"
                    style={showSettings ? { background: "#222221", color: "#F0EDE8" } : { color: "#8C8A85" }}
                    title="Output settings"
                    aria-label="Output settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      ref={settingsPanelRef}
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full right-5 mt-2 z-50 w-56 border rounded-[10px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
                      style={{ background: "#1C1C1B", borderColor: "#2E2E2C" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-5">
                        <div>
                          <span className="text-[10px] font-medium tracking-[0.12em] uppercase block mb-2.5" style={{ color: "#3E3E3B" }}>Format</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(["jpeg", "png", "webp", "pdf"] as Format[]).map((f) => (
                              <button
                                key={f}
                                onClick={() => setFormat(f)}
                                className="py-1.5 px-2.5 rounded-[7px] text-[11px] font-medium tracking-[0.08em] uppercase transition-all duration-[140ms]"
                                style={format === f
                                  ? { background: "#F0EDE8", color: "#0F0F0E" }
                                  : { background: "#222221", color: "#7A7874", border: "1px solid #2E2E2C" }
                                }
                              >
                                {f === "jpeg" ? "JPG" : f.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {format !== "png" && format !== "pdf" && (
                          <div>
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-[11px] font-medium" style={{ color: "#7A7874" }}>Quality</span>
                              <span className="text-[12px] font-medium tabular-nums" style={{ color: "#F0EDE8" }}>{Math.round(quality * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="1.0"
                              step="0.05"
                              value={quality}
                              onChange={(e) => setQuality(parseFloat(e.target.value))}
                              className="w-full appearance-none cursor-pointer rounded-full"
                              style={{ height: 2, background: `linear-gradient(to right,#F0EDE8 ${(quality - 0.5) * 200}%,#2E2E2C ${(quality - 0.5) * 200}%)` }}
                            />
                          </div>
                        )}

                        <div className="pt-3 border-t" style={{ borderColor: "#2E2E2C" }}>
                          <label className="flex items-center justify-between cursor-pointer select-none">
                            <span className="text-[11px] font-medium" style={{ color: "#7A7874" }}>Auto-download</span>
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={autoDownload}
                                onChange={(e) => setAutoDownload(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 rounded-full transition-colors duration-[140ms] peer-focus:outline-none"
                                   style={{ background: autoDownload ? "#52C47A" : "#2E2E2C" }}
                              />
                              <div className="absolute top-[2px] left-[2px] w-3 h-3 bg-[#F0EDE8] rounded-full transition-transform duration-[140ms]"
                                   style={{ transform: autoDownload ? "translateX(16px)" : "none" }}
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={containerRef} className="p-6">
                <div
                  ref={editorContainerRef}
                  className={`space-y-3 ${isFullscreen ? "p-6 flex flex-col h-full overflow-hidden" : ""}`}
                  style={isFullscreen ? { background: "#0F0F0E" } : {}}
                >
                  <div ref={toolbarRef} className="flex flex-wrap items-center gap-1 p-1.5 rounded-[10px]" style={{ background: "#1C1C1B", border: "1px solid #252523" }}>
                    <div className="flex gap-0.5 shrink-0">
                      {tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setCurrentTool(tool.id);
                            if (tool.id !== "crop") {
                              setIsCropping(false);
                              setCropArea(null);
                            }
                          }}
                          className="p-1.5 rounded-[7px] transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221]"
                          style={currentTool === tool.id
                            ? { background: "#282826", color: "#F0EDE8" }
                            : { color: "#8C8A85" }
                          }
                          title={tool.label}
                        >
                          <tool.icon className="h-4 w-4" />
                        </button>
                      ))}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoreMenu(!showMoreMenu);
                          }}
                          className="p-1.5 rounded-[7px] transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221]"
                          style={showMoreMenu
                            ? { background: "#222221", color: "#7A7874" }
                            : { color: "#8C8A85" }
                          }
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {showMoreMenu && (
                            <motion.div
                              ref={moreMenuRef}
                              initial={{ opacity: 0, y: -8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.96 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute top-full left-0 mt-2 z-50 border rounded-[10px] py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] min-w-[168px]"
                              style={{ background: "#1C1C1B", borderColor: "#2E2E2C" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => transformImage("flipH")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] transition-all duration-[140ms]"
                              style={{ color: "#7A7874" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; (e.currentTarget as HTMLElement).style.background = "#222221"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#7A7874"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <FlipHorizontal className="h-4 w-4" />
                                Flip Horizontal
                              </button>
                              <button
                                onClick={() => transformImage("flipV")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] transition-all duration-[140ms]"
                              style={{ color: "#7A7874" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; (e.currentTarget as HTMLElement).style.background = "#222221"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#7A7874"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <FlipVertical className="h-4 w-4" />
                                Flip Vertical
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button
                                onClick={() => transformImage("rotateL")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] transition-all duration-[140ms]"
                              style={{ color: "#7A7874" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; (e.currentTarget as HTMLElement).style.background = "#222221"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#7A7874"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <RotateCcw className="h-4 w-4" />
                                Rotate Left
                              </button>
                              <button
                                onClick={() => transformImage("rotateR")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] transition-all duration-[140ms]"
                              style={{ color: "#7A7874" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; (e.currentTarget as HTMLElement).style.background = "#222221"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#7A7874"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <RotateCw className="h-4 w-4" />
                                Rotate Right
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="w-px h-4 shrink-0" style={{ background: "#252523" }} />

                    <div className="flex gap-0.5 shrink-0">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCurrentColor(color)}
                          className={`w-5 h-5 rounded-full transition-all duration-[140ms] ${
                            currentColor === color ? "ring-1 ring-[#F0EDE8] ring-offset-1 ring-offset-[#1C1C1B]" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    <div className="w-px h-4 shrink-0" style={{ background: "#252523" }} />

                    {currentTool === "text" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Font size stepper — shown only when text tool active */}
                        <div className="flex items-center gap-0.5" title="Font size">
                          <button
                            onClick={() => setFontSize(s => Math.max(10, s - 2))}
                            className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[14px] font-medium transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221]"
                            style={{ color: "#8C8A85" }}
                            title="Decrease font size"
                          >−</button>
                          <span
                            className="w-7 text-center text-[12px] font-medium tabular-nums select-none"
                            style={{ color: "#F0EDE8" }}
                          >{fontSize}</span>
                          <button
                            onClick={() => setFontSize(s => Math.min(72, s + 2))}
                            className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[14px] font-medium transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221]"
                            style={{ color: "#8C8A85" }}
                            title="Increase font size"
                          >+</button>
                        </div>

                        <div className="w-px h-4 shrink-0" style={{ background: "#252523" }} />

                        {/* Text style selector */}
                        <div className="flex gap-0.5" title="Text Style">
                          {(["plain", "highlight", "solid"] as const).map((styleOption) => (
                            <button
                              key={styleOption}
                              onClick={() => setTextStyle(styleOption)}
                              className="px-2.5 h-6 rounded-[5px] text-[11px] font-medium transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221] capitalize"
                              style={textStyle === styleOption
                                ? { background: "#282826", color: "#F0EDE8" }
                                : { color: "#8C8A85" }
                              }
                              title={
                                styleOption === "plain"
                                  ? "Plain text with drop shadow"
                                  : styleOption === "highlight"
                                    ? "Yellow highlight box"
                                    : "Solid color fill box"
                              }
                            >
                              {styleOption}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-0.5 shrink-0" title="Stroke Width">
                        {([2, 4, 6] as StrokeWidth[]).map((w) => (
                          <button
                            key={w}
                            onClick={() => setStrokeWidth(w)}
                            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all duration-[140ms] hover:text-[#F0EDE8] hover:bg-[#222221]"
                            style={strokeWidth === w
                              ? { background: "#282826", color: "#F0EDE8" }
                              : { color: "#8C8A85" }
                            }
                            title={w === 2 ? "Thin" : w === 4 ? "Medium" : "Thick"}
                          >
                            <div
                              className="rounded-full bg-current"
                              style={{ width: w + 2, height: w + 2 }}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="w-px h-4 shrink-0" style={{ background: "#252523" }} />

                    <button
                      onClick={undo}
                      disabled={annotations.length === 0}
                      className="p-1.5 rounded-[7px] transition-all duration-[140ms] disabled:opacity-25 disabled:pointer-events-none shrink-0 hover:text-[#F0EDE8] hover:bg-[#222221]"
                      style={{ color: "#8C8A85" }}
                      title="Undo"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={clearAll}
                      className="p-1.5 rounded-[7px] transition-all duration-[140ms] shrink-0 hover:bg-[#C4483E]/10"
                      style={{ color: "#C4483E" }}
                      title="Clear"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex-1 min-w-2" />

                    {isCropping && cropArea && cropArea.w > 10 && (
                      <button
                        onClick={applyCrop}
                        className="px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all duration-[140ms] shrink-0"
                        style={{ background: "#52C47A", color: "#0F0F0E" }}
                      >
                        Apply Crop
                      </button>
                    )}

                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all duration-[140ms] flex items-center gap-1.5 shrink-0 border hover:text-[#F0EDE8] hover:bg-[#222221]"
                      style={copied
                        ? { background: "rgba(82,196,122,0.07)", borderColor: "rgba(82,196,122,0.2)", color: "#52C47A" }
                        : { background: "#1C1C1B", borderColor: "#2E2E2C", color: "#8C8A85" }
                      }
                      title="Copy to clipboard (Ctrl+C)"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>

                    <div className="relative shrink-0">
                      <div className="relative flex items-center btn-liquid btn-split-liquid">
                        <button
                          onClick={() => downloadImage()}
                          className="btn-split-action font-medium"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <div className="btn-split-sep" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDownloadMenu(!showDownloadMenu);
                          }}
                          className="btn-split-trigger"
                          title="Choose format"
                          aria-label="Choose format"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {showDownloadMenu && (
                          <motion.div
                            ref={downloadMenuRef}
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full right-0 mt-2 z-50 border rounded-[10px] py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] min-w-[140px]"
                            style={{ background: "#1C1C1B", borderColor: "#2E2E2C" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(["png", "jpeg", "webp", "pdf"] as Format[]).map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  setFormat(f);
                                  setShowDownloadMenu(false);
                                  downloadImage(f);
                                }}
                                className="w-full flex items-center justify-between px-4 py-2 text-[12px] transition-all duration-[140ms] text-left"
                                style={{ color: format === f ? "#F0EDE8" : "#7A7874" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0EDE8"; (e.currentTarget as HTMLElement).style.background = "#222221"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = format === f ? "#F0EDE8" : "#7A7874"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <span>{f === "jpeg" ? "JPG" : f.toUpperCase()}</span>
                                <span className="text-[10px] opacity-40">.{f === "jpeg" ? "jpg" : f}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-[7px] transition-all duration-[140ms] shrink-0 border hover:text-[#F0EDE8] hover:bg-[#222221]"
                      style={{ background: "#1C1C1B", borderColor: "#2E2E2C", color: "#8C8A85" }}
                      title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen (F11)"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className={`relative flex items-center justify-center ${
                    isFullscreen 
                      ? "flex-1 min-h-0 py-4" 
                      : "py-8 mb-4"
                  }`}>
                    <div ref={canvasWrapperRef} className="relative">
                      {image && (
                        <div
                          style={{
                            position: "absolute",
                            top: -26,
                            left: 0,
                            fontSize: 10,
                            fontFamily: "var(--m)",
                            color: "var(--t3)",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            padding: "2px 8px",
                            borderRadius: "5px",
                            pointerEvents: "none",
                            userSelect: "none"
                          }}
                        >
                          {image.width} × {image.height} px
                        </div>
                      )}
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        className={`rounded-[7px] block ${
                          currentTool === "text"
                            ? "cursor-text"
                            : currentTool !== "select" ? "cursor-crosshair" : ""
                        }`}
                        style={{ border: "1.5px dashed rgba(255, 255, 255, 0.24)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                      />

                      {/* Floating text input overlay — appears at click position when text tool active */}
                      {activeTextPos && currentTool === "text" && (
                        <div
                          ref={textOverlayRef}
                          contentEditable
                          suppressContentEditableWarning
                          spellCheck={false}
                          onBlur={commitTextAnnotation}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              discardTextAnnotation();
                            }
                            // Ctrl+Enter also commits
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).blur();
                            }
                          }}
                          style={{
                            position: "absolute",
                            left: activeTextPos.x,
                            top: activeTextPos.y,
                            minWidth: 80,
                            maxWidth: displaySize.width - activeTextPos.x - 8,
                            outline: "none",
                            border: textStyle === "plain" ? "1px dashed rgba(240,237,232,0.2)" : "none",
                            borderRadius: "4px",
                            padding: `${fontSize * 0.2}px ${fontSize * 0.4}px`,
                            margin: `-${fontSize * 0.2}px -${fontSize * 0.4}px`,
                            color: textStyle === "highlight" 
                              ? "#000000" 
                              : (textStyle === "solid" 
                                  ? (isLightHex(currentColor) ? "#000000" : "#FFFFFF") 
                                  : currentColor),
                            fontSize: fontSize,
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            background: textStyle === "highlight" 
                              ? "rgba(255, 235, 59, 0.95)" 
                              : (textStyle === "solid" ? currentColor : "transparent"),
                            textShadow: textStyle === "plain" 
                              ? "1px 1px 1px rgba(0, 0, 0, 0.75), 0 0 4px rgba(0, 0, 0, 0.75)" 
                              : "none",
                            whiteSpace: "pre",
                            caretColor: textStyle === "highlight" 
                              ? "#000000" 
                              : (textStyle === "solid" 
                                  ? (isLightHex(currentColor) ? "#000000" : "#FFFFFF") 
                                  : currentColor),
                            zIndex: 10,
                            pointerEvents: "auto",
                            // Prevent layout from shifting the canvas
                            transform: "translateZ(0)",
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="text-center text-[11px] flex items-center justify-center gap-1" style={{ color: "#3E3E3B" }}>
                    <span>{format === "jpeg" ? "JPG" : format.toUpperCase()} · {format === "png" ? "Lossless" : format === "pdf" ? "PDF export" : `${Math.round(quality * 100)}% quality`} · </span>
                    {isEditingFilename ? (
                      <input
                        ref={filenameInputRef}
                        type="text"
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') || 'clip')}
                        onBlur={() => setIsEditingFilename(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingFilename(false);
                          }
                        }}
                        className="px-1.5 py-0.5 rounded text-center focus:outline-none w-24"
                        style={{ background: "#1C1C1B", border: "1px solid #3A3A37", color: "#7A7874", fontSize: 11 }}
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditingFilename(true);
                          setTimeout(() => filenameInputRef.current?.select(), 0);
                        }}
                        className="cursor-pointer transition-colors duration-[140ms] underline underline-offset-2 decoration-dotted text-[11px]"
                        style={{ color: "#7A7874" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#F0EDE8")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#7A7874")}
                        title="Click to edit filename"
                      >
                        {customFilename}
                      </button>
                    )}
                    <span>.{format === "jpeg" ? "jpg" : format}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )}

      <ToolSEOArticle
        eyebrow={seo.eyebrow}
        h1={seo.h1}
        intro={seo.intro}
        metaLine="Updated April 2026 · By Ankit Jaiswal"
      >
        <ToolSection width="grid">
          <SectionHeading kicker="Features" title="Why this paste-to-image tool" />
          <ToolFeatureGrid items={FEATURES} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="How to" title="From clipboard to file in five steps" />
          <ToolHowToSteps steps={HOW_TO} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Workflow" title="Why ‘paste to image’ deserves its own tool" />
          <div style={{ fontSize: 16, lineHeight: 1.75, color: tokens.text.body }}>
            <p style={{ margin: "0 0 18px" }}>
              Take a screenshot. Tap a square around the bug. Draw an arrow at the broken pixel. Blur out the customer’s name. Save it as a file you can drop into a Linear ticket. Send.
            </p>
            <p style={{ margin: "0 0 18px" }}>
              That tiny five-step loop is something every PM, designer, support engineer, and developer runs <em>dozens</em> of times a week. The standard answers — Paint, Preview, the Mac default markup tool, your team’s SaaS screenshot suite — all bury that loop under either too many features (Photoshop) or not enough (Preview’s arrow tool is one stroke weight, no blur, and the file dialog is two clicks deep).
            </p>
            <p style={{ margin: "0 0 18px" }}>
              This tool does the loop and nothing else. Open the URL once, bookmark it, and the next time you need to ship a marked-up screenshot, the round trip is: <strong>Ctrl+V → R-and-drag → A-and-drag → Ctrl+C → paste into Slack</strong>. No app open, no save dialog, no upload, no signup, no tracking.
            </p>
            <h3 style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 19, color: tokens.text.primary, margin: "32px 0 12px", letterSpacing: "-0.01em" }}>
              The blur tool is the one that earns its keep
            </h3>
            <p style={{ margin: "0 0 18px" }}>
              Most quick screenshot tools either don’t have a blur, or they fake it with a translucent grey box (which doesn’t actually obscure anything zoomed in). The blur here renders a real 12-pixel Gaussian blur into the bitmap before you export — the underlying pixels are gone in the saved file, not just hidden behind a layer.
            </p>
            <p style={{ margin: "0 0 18px" }}>
              Use it for: passwords in a terminal, customer names in a CRM, account balances, faces in a meeting screenshot, addresses, internal URLs, anything in <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>config.yaml</code> you’d rather not put on the internet.
            </p>
            <p style={{ margin: 0, color: tokens.text.muted }}>
              For genuinely high-stakes redaction (legal documents, regulated data) — use a solid black or white rectangle on top instead. Blur can occasionally be partially reversed by AI deblur models on tiny text. A rectangle cannot.
            </p>
          </div>
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Cheatsheet" title="Keyboard shortcuts" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              fontFamily: tokens.font.mono,
              fontSize: 13,
            }}
          >
            {[
              ["V", "Select / pan"],
              ["R", "Rectangle"],
              ["O", "Circle / oval"],
              ["A", "Arrow"],
              ["B", "Blur (redact)"],
              ["C", "Crop"],
              ["Ctrl + Z", "Undo last annotation"],
              ["Ctrl + C", "Copy edited image"],
              ["Esc", "Exit current tool"],
            ].map(([key, label]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: tokens.bg.card,
                  border: `1px solid ${tokens.border.subtle}`,
                  borderRadius: 10,
                }}
              >
                <kbd
                  style={{
                    fontFamily: tokens.font.mono,
                    fontSize: 12,
                    background: "rgba(255,255,255,0.08)",
                    border: `1px solid ${tokens.border.default}`,
                    padding: "2px 8px",
                    borderRadius: 6,
                    color: tokens.text.primary,
                    minWidth: 64,
                    textAlign: "center",
                  }}
                >
                  {key}
                </kbd>
                <span style={{ color: tokens.text.soft, fontFamily: tokens.font.body }}>{label}</span>
              </div>
            ))}
          </div>
        </ToolSection>

        <ToolSection width="grid">
          <ToolPrivacyBand
            heading="Private by default"
            body="The entire editor — paste handler, canvas renderer, blur filter, JPG/PNG/WebP encoder, download — runs in your browser. There is no upload endpoint, no analytics ping that includes the image, no clipboard logging. Disconnect from the internet after the page loads and the editor still works. That’s how it should be for screenshots of internal dashboards, financial data, or anything you wouldn’t paste into a public Discord."
          />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Questions" title="Frequently asked" />
          <ToolFAQ items={FAQS} />
        </ToolSection>

        <ToolSection width="grid">
          <ToolAuthorCard />
        </ToolSection>

        <ToolSection width="grid">
          <SectionHeading kicker="Related tools" title="Other tools by Ankit" />
          <ToolRelatedTools items={RELATED} />
        </ToolSection>

        <ToolSection width="grid">
          <FeedbackInlineCard />
        </ToolSection>
      </ToolSEOArticle>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 14, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 14, x: "-50%" }}
            className={`tool-toast tool-toast-${toast.type}`}
            role="status"
          >
            {toast.type === "success" ? (
              <Check size={14} />
            ) : (
              <X size={14} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ToolStatusBar
        stats={[
          image
            ? { key: "size", label: `${image.naturalWidth}×${image.naturalHeight}` }
            : { key: "status", label: "Paste an image to begin", accent: "muted" },
          { key: "fmt", label: format.toUpperCase() },
          ...(image && format !== "pdf"
            ? [{ key: "q", label: `Quality ${Math.round(quality * 100)}` } as ToolStatusStat]
            : []),
          ...(annotations.length > 0
            ? [{ key: "ann", label: `${annotations.length} annotation${annotations.length === 1 ? "" : "s"}`, accent: "success" } as ToolStatusStat]
            : []),
        ]}
        shortcuts={[
          {
            group: "Capture",
            items: [
              { key: "Ctrl+V", label: "Paste image from clipboard" },
            ],
          },
          {
            group: "Edit",
            items: [
              { key: "Ctrl+Z", label: "Undo annotation" },
              { key: "Ctrl+C", label: "Copy result to clipboard" },
              { key: "Esc", label: "Deselect / cancel" },
            ],
          },
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}
