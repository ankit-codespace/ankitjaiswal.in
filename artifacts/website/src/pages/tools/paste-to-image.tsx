import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Download, Check, X, Clipboard, Copy,
  Settings, Square, Circle, ArrowUpRight, Crop, Undo2, Trash2,
  Maximize2, Minimize2, Droplets, MoreVertical, FlipHorizontal, FlipVertical,
  RotateCw, RotateCcw,
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

type Tool = "select" | "rectangle" | "circle" | "arrow" | "crop" | "blur";
type Format = "jpeg" | "png" | "webp";

interface Annotation {
  type: "rectangle" | "circle" | "arrow" | "blur";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

type StrokeWidth = 2 | 4 | 6;

const COLORS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#FFFFFF"];

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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSetupRef = useRef<{ needsSetup: boolean }>({ needsSetup: false });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filenameInputRef = useRef<HTMLInputElement>(null);

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
      showToast("Image loaded!", "success");
    } catch (error) {
      URL.revokeObjectURL(url);
      showToast("Failed to load image", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            loadImage(blob);
            return;
          }
        }
      }
      showToast("No image in clipboard", "error");
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [loadImage, showToast]);

  const handleZoneClick = async () => {
    if (image) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          loadImage(blob);
          return;
        }
      }
      showToast("No image in clipboard", "error");
    } catch {
      showToast("Use Ctrl+V to paste", "error");
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
    if (!image || currentTool === "select") return;
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
      
      setAnnotations([]);
      const container = containerRef.current;
      const containerWidth = container ? (container.clientWidth - 48) * 0.85 : cropWidth;
      const displayScale = Math.min(1, containerWidth / cropWidth);
      const newDisplayWidth = Math.floor(cropWidth * displayScale);
      const newDisplayHeight = Math.floor(cropHeight * displayScale);
      
      setupCanvas(canvas, newDisplayWidth, newDisplayHeight);
      setDisplaySize({ width: newDisplayWidth, height: newDisplayHeight });
      setCropArea(null);
      setIsCropping(false);
      setCurrentTool("select");
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
    
    if (isRotate) {
      canvas.width = image.height;
      canvas.height = image.width;
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
    }
    
    ctx.save();
    
    if (transform === "flipH") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else if (transform === "flipV") {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    } else if (transform === "rotateR") {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
    } else if (transform === "rotateL") {
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
    }
    
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

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image || displaySize.width === 0) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.width;
    exportCanvas.height = image.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const imageScale = image.width / displaySize.width;

    ctx.drawImage(image, 0, 0);

    annotations.forEach(ann => {
      const scaledStroke = ann.strokeWidth * imageScale;
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = scaledStroke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const sx = ann.startX * image.width;
      const sy = ann.startY * image.height;
      const ex = ann.endX * image.width;
      const ey = ann.endY * image.height;

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
        ctx.fillStyle = ann.color;
        const headLen = (10 + ann.strokeWidth * 2) * imageScale;
        const angle = Math.atan2(ey - sy, ex - sx);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (ann.type === "blur") {
        const blurX = Math.min(sx, ex);
        const blurY = Math.min(sy, ey);
        const blurW = Math.abs(ex - sx);
        const blurH = Math.abs(ey - sy);
        if (blurW > 0 && blurH > 0) {
          ctx.save();
          ctx.filter = "blur(12px)";
          ctx.beginPath();
          ctx.rect(blurX, blurY, blurW, blurH);
          ctx.clip();
          ctx.drawImage(image, 0, 0, image.width, image.height);
          ctx.restore();
        }
      }
    });

    const mimeType = `image/${format}`;
    const ext = format === "jpeg" ? "jpg" : format;
    const filename = `${customFilename}.${ext}`;
    
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast(`Saved as ${filename}`, "success");
          if (document.fullscreenElement) document.exitFullscreen();
        }
      },
      mimeType,
      format === "png" ? undefined : quality
    );
  };

  const copyToClipboard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image || displaySize.width === 0) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.width;
    exportCanvas.height = image.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const imageScale = image.width / displaySize.width;

    ctx.drawImage(image, 0, 0);

    annotations.forEach(ann => {
      const scaledStroke = ann.strokeWidth * imageScale;
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = scaledStroke;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const sx = ann.startX * image.width;
      const sy = ann.startY * image.height;
      const ex = ann.endX * image.width;
      const ey = ann.endY * image.height;

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
        ctx.fillStyle = ann.color;
        const headLen = (10 + ann.strokeWidth * 2) * imageScale;
        const angle = Math.atan2(ey - sy, ex - sx);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (ann.type === "blur") {
        const blurX = Math.min(sx, ex);
        const blurY = Math.min(sy, ey);
        const blurW = Math.abs(ex - sx);
        const blurH = Math.abs(ey - sy);
        if (blurW > 0 && blurH > 0) {
          ctx.save();
          ctx.filter = "blur(12px)";
          ctx.beginPath();
          ctx.rect(blurX, blurY, blurW, blurH);
          ctx.clip();
          ctx.drawImage(image, 0, 0, image.width, image.height);
          ctx.restore();
        }
      }
    });

    try {
      exportCanvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          setCopied(true);
          if (document.fullscreenElement) document.exitFullscreen();
          if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
          copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
      }, "image/png");
    } catch {
      showToast("Failed to copy", "error");
    }
  }, [image, annotations, showToast, displaySize]);

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
    >
      <main ref={mainRef} className="flex-1 flex flex-col items-center px-4 pt-6 pb-8" style={{ background: tokens.bg.page }}>
        <div className="w-full max-w-5xl">
          <div className="bg-[#0D0F14] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative px-6 py-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between gap-4">
                <div
                  className="text-[11px] font-medium tracking-[0.12em] uppercase text-white/55 truncate"
                  aria-hidden={!image}
                >
                  {image ? "Editor" : "Paste image to begin"}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                    setShowMoreMenu(false);
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 shrink-0 ${
                    showSettings
                      ? "bg-[#4F7DFF]/10 text-[#4F7DFF]"
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  }`}
                  title="Output settings (format, quality)"
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
                    className="absolute top-full right-6 mt-2 z-50 w-64 bg-[#151820] border border-white/10 rounded-xl p-5 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-5">
                      <div>
                        <span className="text-sm text-white/60 block mb-3">Format</span>
                        <div className="flex gap-2">
                          {(["jpeg", "png", "webp"] as Format[]).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFormat(f)}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium uppercase transition-all ${
                                format === f
                                  ? "bg-[#4F7DFF] text-white"
                                  : "bg-white/5 text-white/50 hover:bg-white/10"
                              }`}
                            >
                              {f === "jpeg" ? "JPG" : f.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {format !== "png" && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-white/60">Quality</span>
                            <span className="text-sm font-mono text-[#4F7DFF]">{Math.round(quality * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1.0"
                            step="0.05"
                            value={quality}
                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                              [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                              [&::-webkit-slider-thumb]:hover:bg-[#4F7DFF] [&::-webkit-slider-thumb]:transition-colors
                              [&::-webkit-slider-thumb]:shadow-md"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div ref={containerRef} className="p-6">
              {!image ? (
                <div
                  onClick={handleZoneClick}
                  className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300
                    border-white/[0.12] bg-[#151A22] hover:border-[#4F7DFF]/40 hover:bg-[#181D26]"
                >
                  <div className="py-16 px-8 flex flex-col items-center justify-center">
                    <Clipboard className="h-12 w-12 text-white/30 mb-4" strokeWidth={1.5} />
                    <div className="text-sm font-medium tracking-wider uppercase text-white/50">
                      Click anywhere to paste or press Ctrl+V
                    </div>
                    <div className="mt-1.5 text-xs text-white/35">
                      Supports PNG, JPG, WebP and more
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  ref={editorContainerRef}
                  className={`space-y-4 ${
                    isFullscreen 
                      ? "bg-[#0A0C10] p-6 flex flex-col h-full overflow-hidden" 
                      : ""
                  }`}
                >
                  <div ref={toolbarRef} className="flex flex-wrap items-center gap-1.5 p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">
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
                          className={`p-2 rounded-lg transition-all ${
                            currentTool === tool.id
                              ? "bg-[#4F7DFF] text-white"
                              : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          }`}
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
                          className={`p-2 rounded-lg transition-all ${
                            showMoreMenu 
                              ? "bg-[#4F7DFF]/20 text-[#4F7DFF]" 
                              : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          }`}
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
                              className="absolute top-full left-0 mt-2 z-50 bg-[#151820] border border-white/10 rounded-xl py-2 shadow-2xl min-w-[160px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => transformImage("flipH")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <FlipHorizontal className="h-4 w-4" />
                                Flip Horizontal
                              </button>
                              <button
                                onClick={() => transformImage("flipV")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <FlipVertical className="h-4 w-4" />
                                Flip Vertical
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button
                                onClick={() => transformImage("rotateL")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Rotate Left
                              </button>
                              <button
                                onClick={() => transformImage("rotateR")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <RotateCw className="h-4 w-4" />
                                Rotate Right
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="w-px h-5 bg-white/10 shrink-0" />

                    <div className="flex gap-0.5 shrink-0">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCurrentColor(color)}
                          className={`w-5 h-5 rounded-full transition-all ${
                            currentColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-[#0D0F14]" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    <div className="w-px h-5 bg-white/10 shrink-0" />

                    <div className="flex gap-0.5 shrink-0" title="Stroke Width">
                      {([2, 4, 6] as StrokeWidth[]).map((w) => (
                        <button
                          key={w}
                          onClick={() => setStrokeWidth(w)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            strokeWidth === w
                              ? "bg-[#4F7DFF] text-white"
                              : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          }`}
                          title={w === 2 ? "Thin" : w === 4 ? "Medium" : "Thick"}
                        >
                          <div 
                            className="rounded-full bg-current" 
                            style={{ width: w + 2, height: w + 2 }}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="w-px h-5 bg-white/10 shrink-0" />

                    <button
                      onClick={undo}
                      disabled={annotations.length === 0}
                      className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-30 shrink-0"
                      title="Undo"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={clearAll}
                      className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                      title="Clear"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex-1 min-w-2" />

                    {isCropping && cropArea && cropArea.w > 10 && (
                      <button
                        onClick={applyCrop}
                        className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all shrink-0"
                      >
                        Apply Crop
                      </button>
                    )}

                    <button
                      onClick={copyToClipboard}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        copied
                          ? "bg-green-500/10 border border-green-500/30 text-green-400"
                          : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                      }`}
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

                    <button
                      onClick={downloadImage}
                      className="btn-liquid shrink-0"
                      style={{ padding: "5px 14px", fontSize: "12.5px", borderRadius: "8px" }}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shrink-0"
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
                    <div className="relative">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        className={`rounded-lg border-2 border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_32px_80px_rgba(0,0,0,0.5)] ${
                          currentTool !== "select" ? "cursor-crosshair" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-center text-xs text-white/30 flex items-center justify-center gap-1">
                    <span>{format.toUpperCase()} • {format !== "png" ? `${Math.round(quality * 100)}% quality` : "Lossless"} • </span>
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
                        className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white/70 w-24 text-center focus:outline-none focus:border-[#4F7DFF]/50"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditingFilename(true);
                          setTimeout(() => filenameInputRef.current?.select(), 0);
                        }}
                        className="text-[#4F7DFF]/70 hover:text-[#4F7DFF] transition-colors cursor-pointer underline underline-offset-2 decoration-dotted"
                        title="Click to edit filename"
                      >
                        {customFilename}
                      </button>
                    )}
                    <span>.{format === "jpeg" ? "jpg" : format}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!image && (
            <p className="text-center text-xs text-white/20 mt-4">
              Works with screenshots, copied images, and more
            </p>
          )}
        </div>
      </main>

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

        <ToolSection width="privacy">
          <ToolPrivacyBand
            heading="Private by default"
            body="The entire editor — paste handler, canvas renderer, blur filter, JPG/PNG/WebP encoder, download — runs in your browser. There is no upload endpoint, no analytics ping that includes the image, no clipboard logging. Disconnect from the internet after the page loads and the editor still works. That’s how it should be for screenshots of internal dashboards, financial data, or anything you wouldn’t paste into a public Discord."
          />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Questions" title="Frequently asked" />
          <ToolFAQ items={FAQS} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="Related tools" title="Other tools by Ankit" />
          <ToolRelatedTools items={RELATED} />
        </ToolSection>

        <ToolSection marginBottom={56}>
          <ToolAuthorCard />
        </ToolSection>

        <ToolSection marginBottom={120}>
          <FeedbackInlineCard />
        </ToolSection>
      </ToolSEOArticle>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full border shadow-2xl backdrop-blur-md
              flex items-center gap-3 text-sm font-medium
              ${toast.type === "success" 
                ? "bg-[#0D0F14]/95 border-[#4F7DFF]/40 text-[#4F7DFF]" 
                : "bg-[#0D0F14]/95 border-red-500/40 text-red-400"
              }`}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <ToolStatusBar
        stats={[
          image
            ? { key: "size", label: `${image.naturalWidth}×${image.naturalHeight}` }
            : { key: "status", label: "Paste an image to begin", accent: "muted" },
          { key: "fmt", label: format.toUpperCase() },
          ...(image
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
