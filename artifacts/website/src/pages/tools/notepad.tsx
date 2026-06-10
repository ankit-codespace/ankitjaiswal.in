import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Link, useLocation } from "wouter";
import { Seo } from "@/components/Seo";
import { SITE, PERSON_SAME_AS } from "@/lib/site";
import { useFeedback, FeedbackInlineCard } from "@/components/FeedbackWidget";
import {
  ToolSEOArticle,
  SectionHeading,
  ToolSection,
  ToolFAQ,
  ToolRelatedTools,
  ToolAuthorCard,
  ToolPrivacyBand,
  ToolHowToSteps,
  ToolFeatureGrid,
} from "@/components/tool/ToolSEOArticle";
import { ToolFooter } from "@/components/tool/ToolFooter";
import { tokens } from "@/components/tool/tokens";
import { useEditor, EditorContent } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TipTapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

// Extend Image to persist a "size" attribute (small/medium/large/full).
// Rendered as data-size on <img>; CSS in index.css maps each value to a max-width.
// Defined at module scope so the node type identity is stable across renders.
const ResizableImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "medium",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-size") || "medium",
        renderHTML: (attrs) => (attrs.size ? { "data-size": attrs.size } : {}),
      },
    };
  },
});
type ImgSize = "small" | "medium" | "large" | "full";
import TipTapLink from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  ArrowLeft, Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  ImageIcon, Link as LinkIcon, Minus, Undo2, Redo2, Search, X, Maximize2,
  Minimize2, Cloud, CloudOff, Download, ChevronDown, ChevronRight, Plus, FileText,
  Check, Highlighter, AlignLeft, Clock, Loader2, Quote, Settings, Pencil, MoreHorizontal,
  Trash2,
  Lock, Zap, Layers, Sparkles, GraduationCap, PenLine, Code2, Briefcase,
  ArrowUpRight, FileDown, Eye, Save,
  Keyboard, BookOpen, Shield, ListChecks, Table2, Lightbulb, MousePointer2,
  Wand2, Globe,
  Copy as CopyIcon, MessageSquarePlus,
} from "lucide-react";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextSelection } from "@tiptap/pm/state";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface NotepadDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  driveFileId?: string;
}

interface NotepadSettings {
  fontSize: number;
  lineHeight: number;
  writingWidth: "wide" | "focused" | "narrow";
  lightSurface: boolean;
  spellCheck: boolean;
  bgColor: string;    // hex; empty = use lightSurface default
  textColor: string;  // hex; empty = use lightSurface default
  ruledLines: boolean;
  paperGrain: boolean; // subtle paper-fiber texture on the canvas
  imageBorder: boolean; // soft hairline border around inline images
}

// ── Constants ──────────────────────────────────────────────────────────────────
const LS_DOCS = "notepad_docs_v2";
const LS_ACTIVE = "notepad_active_v2";
const LS_SETTINGS = "notepad_settings_v1";

const DEFAULT_SETTINGS: NotepadSettings = {
  fontSize: 18,
  lineHeight: 2.1,
  writingWidth: "wide",
  lightSurface: false,
  spellCheck: false,
  bgColor: "",
  textColor: "",
  ruledLines: true,
  paperGrain: true,
  imageBorder: true,
};

/**
 * Five opinionated, writing-tuned themes. Each ships its own accent color
 * applied to caret, selection, and links. The `dark` flag is what drives
 * the OS-preference auto-pick on first load.
 */
const THEMES = [
  // Default for OS dark mode — warm-tinted near-black, emerald accent
  { label: "Slate",    bg: "#161615", tabStripBg: "#0C0C0C", text: "#F0EDE8", accent: "#52C47A", dark: true },
  // Default for OS light mode — warm cream, amber gold accent
  { label: "Paper",    bg: "#FAF8F2", tabStripBg: "#EAE6DF", text: "#1F1B16", accent: "#C8863A", dark: false },
  // True warm near-black for night-mode purists
  { label: "Midnight", bg: "#0F0F0E", tabStripBg: "#000000", text: "#D4D0C8", accent: "#EDE8DF", dark: true },
  // Warm sepia for long reading sessions
  { label: "Sepia",    bg: "#F4ECD8", tabStripBg: "#E3DAC2", text: "#3D2B1F", accent: "#C8863A", dark: false },
  // Warm-neutral light grey
  { label: "Mist",     bg: "#EAE6DF", tabStripBg: "#DAD6CE", text: "#1F1B16", accent: "#7A7874", dark: false },
] as const;

/** Returns true if the hex colour is perceptually light (>128 brightness). */
function isLightHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 128;
}

// ── LocalStorage helpers ───────────────────────────────────────────────────────
function genId() { return `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function newDoc(title = "Untitled"): NotepadDoc {
  return { id: genId(), title, content: "", createdAt: Date.now(), updatedAt: Date.now() };
}

function loadDocs(): NotepadDoc[] {
  try {
    const raw = localStorage.getItem(LS_DOCS);
    if (raw) {
      const docs = JSON.parse(raw) as NotepadDoc[];
      if (docs.length > 0) return docs;
    }
  } catch {}
  const d = newDoc();
  localStorage.setItem(LS_DOCS, JSON.stringify([d]));
  return [d];
}

function saveDocs(docs: NotepadDoc[]) { localStorage.setItem(LS_DOCS, JSON.stringify(docs)); }

function loadActiveId(docs: NotepadDoc[]): string {
  const saved = localStorage.getItem(LS_ACTIVE);
  if (saved && docs.find((d) => d.id === saved)) return saved;
  return docs[0].id;
}

function loadSettings(): NotepadSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  // First-time visitor: pick Slate (dark) or Paper (light) based on OS preference.
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches !== false;
  const t = prefersDark ? THEMES[0] : THEMES[1];
  return {
    ...DEFAULT_SETTINGS,
    bgColor: t.bg,
    textColor: t.text,
    lightSurface: !t.dark,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
// Stable last-updated timestamp for the SEO content. Bump this whenever the
// long-form copy below changes — Google reads it as a freshness signal via
// the Article schema we emit and the visible byline at the bottom.
const NOTEPAD_LAST_UPDATED = "2026-04-21";
const NOTEPAD_LAST_UPDATED_HUMAN = "April 2026";

type NotepadSeo = {
  title: string;
  description: string;
  path: string;
  h1: string;
  heading: string;
  intro: string;
  keywords: string;
  // Long-form variant content per alias route. Lets /text-to-pdf read as a
  // PDF-conversion guide while /online-notepad reads as a notepad guide,
  // even though the editor itself is identical.
  whatIsTitle: string;
  whatIsBody: string[]; // paragraphs
  howToTitle: string;
  howToIntro: string;
  howToSteps: { title: string; body: string }[];
};

// ── Variant copy reused across notepad-flavored routes ────────────────────
const NOTEPAD_WHAT_IS: string[] = [
  "An online notepad is a web-based text editor that runs entirely inside your browser. Unlike a desktop app like Microsoft Notepad, TextEdit or Notepad++, you don't install anything — you open a URL and start writing immediately. Unlike a cloud document tool like Google Docs or Notion, your notes don't have to live on someone else's server.",
  "This notepad is a modern take on the format. It saves every keystroke locally, supports rich text formatting (headings, lists, quotes, code blocks, tables, highlights, colors), lets you paste images directly from your clipboard, and exports to PDF, DOCX, Markdown or HTML in one click. It works offline after the first page load, runs on any device with a browser, and never asks for an account.",
  "The trade-off most online notepads make is privacy: to give you sync across devices, they upload your text to a server. This one doesn't. Everything you type is stored in your browser's local storage and stays on your machine. That makes it ideal for personal notes, draft writing, sensitive snippets, or anywhere you want a no-friction text editor without thinking about who can read your data.",
];

const NOTEPAD_HOWTO_NOTEPAD: { title: string; body: string }[] = [
  { title: "Open the notepad", body: "Visit the page in any modern browser — Chrome, Safari, Firefox, Edge or Brave. The editor loads in under a second and is ready to type into immediately. No signup, no install, no popup." },
  { title: "Start typing", body: "Click anywhere in the paper area and write. Your text autosaves to your browser's local storage on every keystroke, so you can close the tab and come back to exactly where you left off." },
  { title: "Format your text", body: "Use the floating toolbar for bold, italics, headings, bullet and numbered lists, checklists, code blocks, blockquotes, highlighting and link insertion. Or use familiar keyboard shortcuts like Cmd/Ctrl + B for bold." },
  { title: "Paste images directly", body: "Copy any image to your clipboard and paste it into the notepad with Cmd/Ctrl + V. The image embeds inline at small, medium, large or full width — you choose. Drag-and-drop also works." },
  { title: "Manage multiple notes", body: "Open the documents menu to create a new note, switch between notes, rename or delete them. Deleted notes can be restored with Cmd/Ctrl + Z." },
  { title: "Export when you're done", body: "Click Export in the top toolbar and pick PDF, DOCX, Markdown or HTML. The file downloads instantly to your device — no cloud round-trip, no watermark." },
];

const NOTEPAD_HOWTO_PDF: { title: string; body: string }[] = [
  { title: "Open the converter", body: "Load the page in your browser — there's nothing to install and no account to create. The editor is ready in under a second." },
  { title: "Paste or type your text", body: "Paste plain text or rich text from anywhere — Word, Google Docs, a webpage, a chat. Formatting like headings, bold, lists and links is preserved automatically." },
  { title: "Format the document", body: "Use the toolbar to fine-tune headings, paragraph spacing, alignment, code blocks and more. Add a page title, switch fonts, or insert images directly from your clipboard." },
  { title: "Insert images if needed", body: "Drag and drop or paste any image. It embeds in the document at the size you choose and renders inside the PDF exactly as it appears in the editor." },
  { title: "Click Export → PDF", body: "Open the Export menu in the top-right toolbar and pick PDF. The conversion happens entirely in your browser — your text is never uploaded to a server." },
  { title: "Download and share", body: "The PDF downloads to your device immediately. No watermark, no signup, no email gate. Share it, print it, or attach it to anything." },
];

const NOTEPAD_HOWTO_EDITOR: { title: string; body: string }[] = [
  { title: "Open the editor", body: "Load the page in any modern browser. The editor mounts in under a second and is keyboard-ready immediately — no toolbars to enable, no extensions to install." },
  { title: "Use rich text formatting", body: "Headings (H1–H3), bullet lists, numbered lists, checklists, blockquotes, code blocks, inline code, bold, italics, underline, strikethrough, highlights and text colors are all built in." },
  { title: "Insert media and links", body: "Paste images directly from your clipboard, drop them in, or use the image button. Insert links, horizontal rules, and tables with a click." },
  { title: "Find and replace", body: "Press Cmd/Ctrl + F to open find. Use Cmd/Ctrl + Shift + F for find-and-replace across your entire document." },
  { title: "Use focus mode", body: "Toggle focus mode to hide everything except the paragraph you're editing — perfect for long-form writing without distractions." },
  { title: "Export your work", body: "Pick PDF, DOCX, Markdown or HTML from the Export menu. All four formats render exactly what you see on screen, including embedded images." },
];

const NOTEPAD_SEO: Record<string, NotepadSeo> = {
  "/online-notepad": {
    title: "Online Notepad — Free Browser Notepad with PDF Export",
    description: "Free online notepad with rich text, image paste, autosave and one-click PDF export. Works in your browser, no signup, fully private.",
    path: "/online-notepad",
    h1: "Online Notepad — Free, Private, Rich Text & PDF Export",
    heading: "The fastest online notepad in your browser",
    intro: "Open the page, start typing. Your work autosaves locally and never leaves your device. Paste images, format with rich text, and export to PDF, DOCX, Markdown or HTML when you're done.",
    keywords: "online notepad, notepad online, free notepad, browser notepad, notepad app, web notepad",
    whatIsTitle: "What is an online notepad?",
    whatIsBody: NOTEPAD_WHAT_IS,
    howToTitle: "How to use the online notepad",
    howToIntro: "Six steps from blank page to a saved, exported document — no account, no install, no upload.",
    howToSteps: NOTEPAD_HOWTO_NOTEPAD,
  },
  "/notepad": {
    title: "Notepad Online — Free, Private, No Signup",
    description: "A clean online notepad. Rich text, image paste, autosave, multiple documents, dark mode and PDF export. No account required.",
    path: "/notepad",
    h1: "Notepad Online — Free Private Notes in Your Browser",
    heading: "A simple notepad that respects your privacy",
    intro: "Notes save automatically to your browser. Nothing is uploaded. Switch documents, paste images, change fonts, go fullscreen, export anywhere.",
    keywords: "notepad, notepad online, online notes, free notes app, browser notes, private notepad",
    whatIsTitle: "What is an online notepad?",
    whatIsBody: NOTEPAD_WHAT_IS,
    howToTitle: "How to use the notepad",
    howToIntro: "From blank page to exported document in six steps. No account, no install, no upload.",
    howToSteps: NOTEPAD_HOWTO_NOTEPAD,
  },
  "/text-to-pdf": {
    title: "Text to PDF Converter — Free Online, Instant Download",
    description: "Convert text to PDF in one click. Paste or type your content, format it with rich text and images, then download as a clean PDF — free, no signup.",
    path: "/text-to-pdf",
    h1: "Text to PDF Converter — Free, Instant, Browser-Based",
    heading: "Turn text into a polished PDF in seconds",
    intro: "Paste your text, format it the way you want, drop in images if you need, then click Export → PDF. The conversion runs in your browser. No upload, no watermark, no signup.",
    keywords: "text to pdf, text to pdf converter, convert text to pdf, txt to pdf, online text to pdf, free pdf converter",
    whatIsTitle: "What is a text-to-PDF converter?",
    whatIsBody: [
      "A text-to-PDF converter takes plain or formatted text and generates a PDF (Portable Document Format) file you can download, print or share. Most online converters require you to upload your text to a server, where the conversion happens — and that's a problem if your text is private, confidential, or just personal.",
      "This converter works differently. The conversion runs entirely in your browser using client-side rendering. You paste or type your text, format it with rich text controls, optionally add images, and click Export → PDF. The PDF is generated on your device and downloads instantly — your text is never sent anywhere.",
      "The output is a clean, professional PDF with proper typography, preserved formatting (headings, lists, tables, code blocks), embedded images at the size you chose, and no watermark. It opens correctly in every PDF viewer — Adobe Reader, Preview, Chrome's built-in viewer, mobile readers — and looks identical to what you saw in the editor.",
    ],
    howToTitle: "How to convert text to PDF",
    howToIntro: "Six steps from raw text to a downloaded PDF — no signup, no upload, no watermark.",
    howToSteps: NOTEPAD_HOWTO_PDF,
  },
  "/online-text-editor": {
    title: "Online Text Editor — Free Rich Text Editor in Your Browser",
    description: "Free online text editor with rich text, headings, lists, code blocks, image paste, autosave, and export to PDF, DOCX, Markdown or HTML.",
    path: "/online-text-editor",
    h1: "Online Text Editor — Free Rich Text Editor in Your Browser",
    heading: "A real text editor that runs in your browser",
    intro: "Headings, lists, code blocks, tables, images, links, undo history, find & replace, focus mode, dark mode. All offline-friendly, all free.",
    keywords: "online text editor, rich text editor, web text editor, free text editor, browser text editor, wysiwyg online",
    whatIsTitle: "What is an online text editor?",
    whatIsBody: [
      "An online text editor is a web-based application for writing and formatting text — somewhere between a basic notepad and a full word processor. It runs in your browser, so there's nothing to install, and the best ones work just as well as native desktop editors.",
      "This text editor is built on a modern WYSIWYG (what-you-see-is-what-you-get) engine. It supports rich text formatting, semantic headings, ordered and unordered lists, checklists, code blocks with syntax-aware spacing, tables, blockquotes, highlights, text colors, inline links, and image embedding. Every action has a keyboard shortcut.",
      "It's designed to feel like a real editor — fast keystrokes, no input lag, undo and redo with full history, find and replace, focus mode for distraction-free writing, and a dark mode that's easy on the eyes. All of it runs client-side, so your text stays private.",
    ],
    howToTitle: "How to use the text editor",
    howToIntro: "Six core workflows that turn this into a real writing tool.",
    howToSteps: NOTEPAD_HOWTO_EDITOR,
  },
  "/tools/notepad": {
    title: "Notepad — Private Browser Notepad with Auto-Save",
    description: "Private browser notepad. Rich text, autosave, multiple documents, dark mode and smart export. Never lose your work.",
    path: "/tools/notepad",
    h1: "Browser Notepad — Private, Auto-Saving, Rich Text",
    heading: "Your private browser notepad",
    intro: "Rich text, autosave, multiple documents, dark mode and smart export. Built for writers who want zero friction.",
    keywords: "notepad, browser notepad, online notepad, autosave notepad, rich text notepad",
    whatIsTitle: "What is a browser notepad?",
    whatIsBody: NOTEPAD_WHAT_IS,
    howToTitle: "How to use the browser notepad",
    howToIntro: "Six steps from blank page to exported document — entirely client-side.",
    howToSteps: NOTEPAD_HOWTO_NOTEPAD,
  },
};

const DEFAULT_NOTEPAD_SEO = NOTEPAD_SEO["/online-notepad"];

function buildNotepadJsonLd(seo: NotepadSeo) {
  const url = SITE.url + seo.path;
  const name = seo.h1.split(" — ")[0];
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name,
      url,
      applicationCategory: "Productivity",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      // creator + sameAs together tell Google "this app was built by this
      // specific person, and here are their verified profiles". This is the
      // E-E-A-T signal that turns a tool page into an authored work.
      creator: {
        "@type": "Person",
        name: "Ankit Jaiswal",
        url: SITE.url + "/",
        sameAs: PERSON_SAME_AS,
      },
      featureList: [
        "Rich text editing",
        "Image paste",
        "Autosave",
        "Multiple documents",
        "Dark mode",
        "Export to PDF, DOCX, Markdown and HTML",
        "Find and replace",
        "Focus mode",
        "Works offline in your browser",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url + "/" },
        { "@type": "ListItem", position: 2, name: "Tools", item: SITE.url + "/tools" },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: NOTEPAD_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    // HowTo schema — Google's AI Overviews and rich results pull these
    // step-by-step structures verbatim. The visible <ol> matches 1:1.
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: seo.howToTitle,
      description: seo.howToIntro,
      totalTime: "PT2M",
      step: seo.howToSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
        url: `${url}#step-${i + 1}`,
      })),
    },
    // Article schema — emits datePublished / dateModified / author so Google
    // gets a freshness signal and an E-E-A-T author connection. Without this,
    // the page is treated as undated marketing copy.
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: seo.h1,
      description: seo.description,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: {
        "@type": "Person",
        name: "Ankit Jaiswal",
        url: SITE.url + "/",
        sameAs: PERSON_SAME_AS,
      },
      publisher: {
        "@type": "Person",
        name: "Ankit Jaiswal",
        url: SITE.url + "/",
        sameAs: PERSON_SAME_AS,
      },
      datePublished: "2025-01-01",
      dateModified: NOTEPAD_LAST_UPDATED,
      inLanguage: "en",
    },
  ];
}

const NOTEPAD_FAQS: { q: string; a: string }[] = [
  { q: "Is this online notepad free?", a: "Yes — it's completely free with no signup, no ads inside the editor, and no usage limits. Open it and start typing." },
  { q: "Where are my notes saved?", a: "Notes are saved locally in your browser using localStorage. Nothing is sent to any server, so your text stays on your device." },
  { q: "Can I export my notes to PDF?", a: "Yes. Click Export → PDF and the notepad converts your formatted text and images to a clean PDF file you can download or share." },
  { q: "Does it work offline?", a: "After the first load the editor runs entirely client-side, so once the page is open you can keep writing even without an internet connection." },
  { q: "Can I paste images directly into the notepad?", a: "Yes. Paste any image from your clipboard, drag-and-drop, or use the image button. Images are embedded in the document and exported with it." },
  { q: "What file formats can I export to?", a: "PDF, DOCX (Microsoft Word), Markdown and HTML. Use the Export menu in the top-right toolbar." },
  { q: "Is this notepad private?", a: "Yes. There's no account, no analytics on the editor, and no upload. Everything you type lives in your browser only." },
  { q: "Can I have multiple notes open?", a: "Yes. Use the documents menu to create, switch, rename and delete multiple notes. Deletes can be undone with Cmd/Ctrl + Z." },
  { q: "Which browsers does it work in?", a: "Every modern browser — Chrome, Safari, Firefox, Edge, Brave, Arc and Opera, on desktop and mobile. There are no browser-specific features and no plugins required." },
  { q: "How is this different from Notepad++ or Google Docs?", a: "Notepad++ is a desktop app for Windows only. Google Docs is great but requires a Google account and stores everything on Google's servers. This notepad runs in any browser, requires no account, and keeps every note on your device — with rich text, image paste and one-click PDF export built in." },
  { q: "Is there a word count?", a: "Yes — character and word counts update live in the status bar at the bottom of the editor. Useful for essays, articles, social posts or any writing with a length target." },
  { q: "Can I sync notes across devices?", a: "Not by default — and that's intentional. Sync would require uploading your text to a server, which would break the privacy guarantee. If you need notes on another device, export to PDF, Markdown or DOCX and move the file yourself." },
];

// ── Keyboard shortcuts reference ─────────────────────────────────────────────
const NOTEPAD_SHORTCUTS: { group: string; rows: { keys: string; action: string }[] }[] = [
  {
    group: "Formatting",
    rows: [
      { keys: "Cmd/Ctrl + B", action: "Bold" },
      { keys: "Cmd/Ctrl + I", action: "Italic" },
      { keys: "Cmd/Ctrl + U", action: "Underline" },
      { keys: "Cmd/Ctrl + Shift + X", action: "Strikethrough" },
      { keys: "Cmd/Ctrl + E", action: "Inline code" },
      { keys: "Cmd/Ctrl + Shift + H", action: "Highlight" },
    ],
  },
  {
    group: "Headings & blocks",
    rows: [
      { keys: "Cmd/Ctrl + Alt + 1", action: "Heading 1" },
      { keys: "Cmd/Ctrl + Alt + 2", action: "Heading 2" },
      { keys: "Cmd/Ctrl + Alt + 3", action: "Heading 3" },
      { keys: "Cmd/Ctrl + Shift + 7", action: "Numbered list" },
      { keys: "Cmd/Ctrl + Shift + 8", action: "Bullet list" },
      { keys: "Cmd/Ctrl + Shift + 9", action: "Checklist" },
      { keys: "Cmd/Ctrl + Shift + B", action: "Blockquote" },
      { keys: "Cmd/Ctrl + Alt + C", action: "Code block" },
    ],
  },
  {
    group: "Document",
    rows: [
      { keys: "Cmd/Ctrl + Z", action: "Undo (also restores deleted notes)" },
      { keys: "Cmd/Ctrl + Shift + Z", action: "Redo" },
      { keys: "Cmd/Ctrl + F", action: "Find in document" },
      { keys: "Cmd/Ctrl + Shift + F", action: "Find and replace" },
      { keys: "Cmd/Ctrl + V", action: "Paste text or image from clipboard" },
      { keys: "Cmd/Ctrl + K", action: "Insert link" },
    ],
  },
];

// ── Comparison: this notepad vs the obvious alternatives ─────────────────────
const NOTEPAD_COMPARISON_HEADERS = [
  "Feature",
  "This notepad",
  "Notepad++",
  "Google Docs",
  "Apple Notes",
];
const NOTEPAD_COMPARISON_ROWS: string[][] = [
  ["Runs in browser",          "Yes",  "No (Windows only)", "Yes",  "Web app + macOS/iOS"],
  ["Install required",         "No",   "Yes",               "No",   "Built into Apple devices"],
  ["Account / signup",         "No",   "No",                "Yes (Google)", "Yes (Apple ID)"],
  ["Notes stay on your device","Yes",  "Yes",               "No (synced to Google)", "Synced to iCloud"],
  ["Rich text formatting",     "Yes",  "Limited (plugins)", "Yes",  "Yes"],
  ["Image paste",              "Yes",  "No",                "Yes",  "Yes"],
  ["Export to PDF",            "Yes (one click)", "Plugin only",   "Yes", "Yes (via Print)"],
  ["Export to DOCX",           "Yes",  "No",                "Yes",  "No"],
  ["Export to Markdown",       "Yes",  "Plugin",            "No",   "No"],
  ["Works offline",            "Yes",  "Yes",               "Limited", "Yes"],
  ["Free forever",             "Yes",  "Yes (open source)", "Yes (with Google account)", "Yes (Apple devices only)"],
];

// ── Tips & tricks for power users ────────────────────────────────────────────
const NOTEPAD_TIPS: { icon: typeof Lightbulb; title: string; body: string }[] = [
  { icon: Wand2,         title: "Smart paste from anywhere",   body: "Paste from Word, Google Docs, Notion or any webpage and the notepad strips junk styling while keeping headings, lists, links and bold/italic intact." },
  { icon: ImageIcon,     title: "Resize images on the fly",    body: "Click any pasted image to switch between small, medium, large and full-width — no need to re-upload or edit elsewhere." },
  { icon: Eye,           title: "Use focus mode for long writing", body: "Toggle focus mode to fade out everything except the paragraph you're editing. Combined with full-screen, it's a distraction-free studio." },
  { icon: Layers,        title: "Keep separate notes for separate jobs", body: "Open the documents menu and create a note per project. Each one autosaves independently and you can rename or reorder them at will." },
  { icon: Search,        title: "Find and replace across the whole doc", body: "Cmd/Ctrl + Shift + F opens find-and-replace. Works on huge documents without lag because it runs natively in your browser." },
  { icon: FileDown,      title: "Pick the right export format",  body: "PDF for sharing or printing. DOCX for sending to people who edit in Word. Markdown for blogs, GitHub or Notion. HTML for the web." },
];

const RELATED_TOOLS = [
  { name: "YouTube Summary", desc: "Turn video transcripts into tuned AI prompts", href: "/tools/youtube-summary" },
  { name: "Clipboard History", desc: "Save text snippets locally", href: "/tools/clipboard-history" },
  { name: "Paste to Image", desc: "Paste, annotate and download screenshots", href: "/tools/paste-to-image" },
  { name: "All Tools", desc: "Browse every privacy-first tool", href: "/tools" },
];

// ── Feature cards shown in the SEO section below the editor ────────────────
const NOTEPAD_FEATURES: { icon: typeof Lock; title: string; desc: string }[] = [
  { icon: Lock,       title: "Private by default",   desc: "Your notes never leave your browser. No account, no upload, no analytics inside the editor." },
  { icon: Save,       title: "Autosave, always",     desc: "Every keystroke is saved to local storage. Refresh, close the tab, come back tomorrow." },
  { icon: Sparkles,   title: "Rich text formatting", desc: "Headings, lists, quotes, code, tables, highlights, colors and inline images." },
  { icon: FileDown,   title: "Export to PDF & more", desc: "One-click export to PDF, DOCX, Markdown or HTML. Clean output, ready to share." },
  { icon: Layers,     title: "Multiple notes",       desc: "Switch between documents with a sidebar. Rename, delete, undo — Cmd/Ctrl + Z restores." },
  { icon: Zap,        title: "Fast & offline",       desc: "Loads instantly, runs entirely client-side. Works without an internet connection after first load." },
];

// ── Use-case sections — these double as long-tail SEO and AI-citation units ─
const NOTEPAD_USE_CASES: { icon: typeof GraduationCap; title: string; desc: string }[] = [
  { icon: GraduationCap, title: "For students",      desc: "Take lecture notes that survive browser refreshes and tab closes — autosave runs on every keystroke. Paste screenshots from slides, diagrams from textbooks, or photos of the whiteboard directly into your notes. When the semester ends, export each subject as a clean PDF you can submit, print, or archive. No app to install on a school laptop, no Google account to sign into on a shared computer." },
  { icon: PenLine,       title: "For writers",       desc: "Draft articles, essays and short fiction in a distraction-free editor. Toggle focus mode to fade everything except the paragraph you're working on. The word counter updates live, headings collapse the document into an outline, and when the draft is ready you ship clean Markdown or HTML straight into your blog, Substack, Ghost or any CMS — no copy-paste cleanup required." },
  { icon: Code2,         title: "For developers",    desc: "Keep code snippets in syntax-aware code blocks that preserve indentation. Drop screenshots of stack traces, terminal output or Figma designs into the same document. Sketch out architecture decisions, write up bugs, draft pull request descriptions, then export everything to Markdown for GitHub, Linear, Jira or Notion. Stays private — no risk of a code snippet ending up in someone's training data." },
  { icon: Briefcase,     title: "For professionals", desc: "Capture meeting notes during a call without your client wondering what app you're using. Paste screenshots from a deck, a Figma board, or a spreadsheet. Build a quick brief, an internal memo, or a proposal with proper formatting and export to PDF or DOCX in one click. Everything stays on your laptop — useful when you're working with confidential or pre-release information." },
];

export default function Notepad() {
  const [location] = useLocation();
  const seo = useMemo<NotepadSeo>(() => NOTEPAD_SEO[location] ?? DEFAULT_NOTEPAD_SEO, [location]);
  const jsonLd = useMemo(() => buildNotepadJsonLd(seo), [seo]);
  const [docs, setDocs] = useState<NotepadDoc[]>(() => loadDocs());
  const [activeId, setActiveId] = useState<string>(() => loadActiveId(loadDocs()));
  const [settings, setSettings] = useState<NotepadSettings>(() => loadSettings());
  const [focusMode, setFocusMode] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [showDocMenu, setShowDocMenu] = useState(false);
  // Inline-confirm state for delete actions in the doc switcher
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(() => new Date());
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveSaving, setDriveSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { open: openFeedback } = useFeedback();
  // Hide the bottom status bar once the user has scrolled past the editor
  // into the SEO content. The sentinel lives inside <NotepadSeoContent> (a
  // separate memoized component) and reports its visibility back here via
  // the onScrolledPastEditor callback. Keeping the state in the parent lets
  // the status bar — which also lives in this component — react instantly.
  const [scrolledPastEditor, setScrolledPastEditor] = useState(false);
  // Copy-to-clipboard state for the toolbar Copy button. Transitions:
  // idle → copied (success, 1.6s) → idle, or idle → error (failure, 2s) → idle.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  // Track the reset timer so rapid consecutive clicks always honour the most
  // recent action's full visual duration instead of being cut short by an
  // earlier setTimeout firing.
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image controls: floating toolbar shown when an image node is selected,
  // and a fullscreen lightbox triggered by double-clicking an image.
  const [imgToolbar, setImgToolbar] = useState<{ pos: number; size: ImgSize; top: number; left: number } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const driveSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isChangingDocRef = useRef(false);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const docMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [docMenuLeft, setDocMenuLeft] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);
  const [tableMenuLeft, setTableMenuLeft] = useState(0);
  const tableBtnRef = useRef<HTMLButtonElement>(null);

  // --- Scroll Gate & Lock State ---
  const [isSeoUnlocked, setIsSeoUnlocked] = useState(() => {
    // Bot detection bypass to guarantee crawler indexing
    if (typeof navigator !== "undefined") {
      const isBot = /bot|google|baidu|bing|msn|duckduckgo|teoma|slurp|yandex/i.test(navigator.userAgent);
      if (isBot) return true;
    }
    return false;
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const scrollProgressRef = useRef(0);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDoc = useMemo(() => docs.find((d) => d.id === activeId) ?? docs[0], [docs, activeId]);
  const GCID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

  // ── Settings helpers ───────────────────────────────────────────────────────
  const updateSetting = <K extends keyof NotepadSettings>(key: K, val: NotepadSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  // ── Editor ─────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Provided separately with custom config below — disable StarterKit's built-ins
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      Underline,
      ResizableImage.configure({ inline: false, allowBase64: true }),
      TipTapLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      CharacterCount,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: activeDoc?.content ?? "",
    editorProps: {
      attributes: {
        class: "notepad-editor",
        spellcheck: String(settings.spellCheck),
        // Include style here so TipTap/ProseMirror owns and preserves it on every
        // state update. Direct DOM manipulation (editor.view.dom.style.*) gets
        // wiped when ProseMirror re-applies editorProps.attributes via setProps().
        style: `line-height: ${settings.lineHeight}; font-size: ${settings.fontSize}px;`,
      },
      handleKeyDown(view, event) {
        // Top-priority Enter handler: when the cursor is in an empty paragraph
        // sandwiched between an image (above) and a non-empty paragraph (below),
        // pressing Enter removes the redundant blank line and lands the cursor
        // at the start of the next paragraph (e.g. "Hello"). Runs before any
        // other Enter handler so it can't be intercepted by Paragraph/StarterKit.
        if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false;
        const { state, dispatch } = view;
        const { $from, empty } = state.selection;
        if (!empty) return false;
        const node = $from.parent;
        if (node.type.name !== "paragraph" || node.content.size !== 0) return false;
        if ($from.depth !== 1) return false;
        const doc = state.doc;
        const paraIndex = $from.index(0);
        if (paraIndex === 0 || paraIndex >= doc.childCount - 1) return false;
        const prevNode = doc.child(paraIndex - 1);
        const nextNode = doc.child(paraIndex + 1);
        if (prevNode.type.name !== "image") return false;
        if (nextNode.content.size === 0) return false;
        const paraStart = $from.before();
        const paraEnd = paraStart + node.nodeSize;
        const nextStart = paraStart + 1;
        const tr = state.tr.delete(paraStart, paraEnd);
        try {
          tr.setSelection(TextSelection.create(tr.doc, nextStart));
        } catch { /* fall through */ }
        dispatch(tr);
        return true;
      },
      handlePaste(view, event) {
        // 1. Image paste — keep existing behavior.
        const items = Array.from(event.clipboardData?.items ?? []);
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const blob = item.getAsFile();
            if (!blob) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src })));
            };
            reader.readAsDataURL(blob);
            return true;
          }
        }

        // 2. Plain-text paste with newlines.
        // Default TipTap behavior prefers text/html on the clipboard. When the
        // source HTML doesn't encode newlines as <br>/block boundaries (very
        // common for code copied from terminals / IDEs / view-source), every
        // line collapses into one paragraph. We intercept multi-line plain
        // text to preserve line structure regardless of HTML.
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!text || !text.includes("\n")) return false;

        const html = event.clipboardData?.getData("text/html") ?? "";
        // Defer to TipTap only when the HTML carries real structural formatting
        // (lists, tables, headings, blockquotes, explicit code/preformatted
        // blocks). We deliberately skip generic <div>/<p>/<br> wrappers because
        // IDEs, terminals and view-source put each line in its own <div> or
        // <p>, which TipTap then collapses into a single paragraph.
        const richHtml = html && /<(li|ul|ol|h[1-6]|pre|table|tr|blockquote)\b/i.test(html);
        if (richHtml) return false;

        // Plain text with newlines → split into paragraphs. Each line becomes
        // its own paragraph; blank lines stay as empty paragraphs so vertical
        // spacing is preserved. Works the same whether the content is code,
        // prose, or anything else — no special-casing.
        const { schema, tr } = view.state;
        const { from, to } = view.state.selection;
        const paragraphType = schema.nodes.paragraph;
        const nodes = text.split("\n").map((line) =>
          line.length === 0
            ? paragraphType.create()
            : paragraphType.create(null, schema.text(line)),
        );
        view.dispatch(tr.replaceWith(from, to, nodes).scrollIntoView());
        return true;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? 0;
              view.dispatch(view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src })));
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      if (isChangingDocRef.current) return;
      setSaveStatus("unsaved");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const html = editor.getHTML();
        setDocs((prev) => {
          const next = prev.map((d) => d.id === activeId ? { ...d, content: html, updatedAt: Date.now() } : d);
          saveDocs(next);
          return next;
        });
        setSaveStatus("saved");
        setLastSaved(new Date());
        if (accessTokenRef.current) {
          clearTimeout(driveSaveTimerRef.current);
          driveSaveTimerRef.current = setTimeout(() => syncToDrive(html), 4000);
        }
      }, 1200);
    },
  });

  // ── Switch doc ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const doc = docs.find((d) => d.id === activeId);
    if (doc) {
      isChangingDocRef.current = true;
      editor.commands.setContent(doc.content || "");
      setTimeout(() => { isChangingDocRef.current = false; }, 50);
    }
    localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]); // eslint-disable-line

  // ── Spellcheck toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.querySelector(".notepad-editor");
    if (el) el.setAttribute("spellcheck", String(settings.spellCheck));
  }, [settings.spellCheck]);

  // ── Load Google Identity Services ──────────────────────────────────────────
  useEffect(() => {
    if (!GCID) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch {} };
  }, [GCID]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "d") { e.preventDefault(); handleSmartExport(); }
      if (ctrl && e.key === "f") {
        e.preventDefault();
        if (showFind) { setShowFind(false); setShowReplace(false); }
        else { setShowFind(true); setShowReplace(false); setTimeout(() => findInputRef.current?.focus(), 50); }
      }
      if (ctrl && e.key === "h") {
        e.preventDefault();
        if (!showFind) { setShowFind(true); setShowReplace(true); setTimeout(() => findInputRef.current?.focus(), 50); }
        else if (!showReplace) { setShowReplace(true); setTimeout(() => replaceInputRef.current?.focus(), 50); }
        else { setShowReplace(false); }
      }
      if (ctrl && e.key === "\\") { e.preventDefault(); toggleFocus(); }
      if (e.key === "Escape") { setShowFind(false); setShowReplace(false); setShowDocMenu(false); setShowExportMenu(false); setShowSettings(false); setShowMoreMenu(false); cancelConfirm(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, activeDoc, showFind, showReplace]); // eslint-disable-line

  // Cmd/Ctrl+Z restores last deleted note(s) when focus is OUTSIDE the editor
  // (e.g. doc menu open). Inside the editor, ProseMirror handles its own undo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      if (!ctrl || e.shiftKey || e.key.toLowerCase() !== "z") return;
      // Only intercept if user is NOT typing in the editor / an input
      const ae = document.activeElement as HTMLElement | null;
      const inEditor = ae?.closest?.(".ProseMirror");
      const inInput = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
      if (inEditor || inInput) return;
      if (undoStackRef.current.length === 0) return;
      e.preventDefault();
      undoLastDeleteRef.current?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setFocusMode(false); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Image selection toolbar + double-click lightbox ────────────────────────
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const sel: any = editor.state.selection;
      const node = sel.node;
      if (node && node.type.name === "image") {
        const dom = editor.view.nodeDOM(sel.from) as HTMLElement | null;
        if (dom) {
          const r = dom.getBoundingClientRect();
          setImgToolbar({
            pos: sel.from,
            size: (node.attrs.size || "medium") as ImgSize,
            top: r.top - 44,
            left: r.left,
          });
          return;
        }
      }
      setImgToolbar(null);
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    // Guard against HMR / mount-order timing where view may not be attached yet.
    // TipTap throws (rather than returning undefined) if you read .view before mount,
    // so we wrap the access AND retry until the editor view is ready.
    const onDbl = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && t.tagName === "IMG") {
        e.preventDefault();
        setLightboxSrc((t as HTMLImageElement).src);
      }
    };
    let attachedDom: HTMLElement | null = null;
    let retryTimer: number | null = null;
    const tryAttach = () => {
      if (attachedDom || (editor as any).isDestroyed) return;
      let dom: HTMLElement | null = null;
      try { dom = editor.view.dom as HTMLElement; } catch { /* not mounted yet */ }
      if (dom) {
        attachedDom = dom;
        dom.addEventListener("dblclick", onDbl);
      } else {
        retryTimer = window.setTimeout(tryAttach, 100);
      }
    };
    tryAttach();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      if (retryTimer != null) window.clearTimeout(retryTimer);
      if (attachedDom) attachedDom.removeEventListener("dblclick", onDbl);
    };
  }, [editor]);

  // Esc closes the lightbox.
  useEffect(() => {
    if (!lightboxSrc) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxSrc(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightboxSrc]);

  const setImgSize = useCallback((size: ImgSize) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { size }).run();
  }, [editor]);


  // ── Find & Replace ─────────────────────────────────────────────────────────
  const doReplace = useCallback((all: boolean) => {
    if (!editor || !findText.trim()) return;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const cursorPos = editor.state.selection.from;
    const matches: Array<{ from: number; to: number }> = [];

    // Collect matches (single: first occurrence at or after cursor; all: every occurrence)
    editor.state.doc.descendants((node, pos): boolean | void => {
      if (matches.length > 0 && !all) return false;
      if (!node.isText || !node.text) return true;
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(node.text)) !== null) {
        const from = pos + m.index;
        const to = from + m[0].length;
        if (all || from >= cursorPos) { matches.push({ from, to }); if (!all) return false; }
      }
    });

    // Wrap-around for single replace
    if (!all && matches.length === 0) {
      editor.state.doc.descendants((node, pos): boolean | void => {
        if (matches.length > 0) return false;
        if (!node.isText || !node.text) return true;
        regex.lastIndex = 0;
        const m = regex.exec(node.text);
        if (m) matches.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      });
    }

    if (matches.length === 0) { toast.error(`"${findText}" not found`); return; }

    // Apply in reverse order so earlier positions are unaffected by later replacements
    const { tr } = editor.state;
    [...matches].reverse().forEach(({ from, to }) => {
      const marks = editor.state.doc.nodeAt(from)?.marks ?? [];
      if (replaceText) tr.replaceWith(from, to, editor.state.schema.text(replaceText, marks));
      else tr.delete(from, to);
    });
    editor.view.dispatch(tr);

    if (all) toast.success(`Replaced ${matches.length} occurrence${matches.length > 1 ? "s" : ""}`);
  }, [editor, findText, replaceText]);

  // ── Doc management ─────────────────────────────────────────────────────────
  const createDoc = () => {
    const d = newDoc();
    setDocs((prev) => { const next = [...prev, d]; saveDocs(next); return next; });
    setActiveId(d.id);
    setShowDocMenu(false);
    setTimeout(() => titleInputRef.current?.select(), 80);
  };

  // ── Two-stage delete with undo ────────────────────────────────────────────
  // Pattern matches Linear/Notion: row morphs into "Delete?" inline confirm,
  // confirm pushes a snapshot onto an undo stack so Ctrl+Z (when not focused
  // in the editor) or the toast "Undo" action restores the docs.
  const undoStackRef = useRef<Array<{ docs: NotepadDoc[]; activeId: string }>>([]);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelConfirm = useCallback(() => {
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
    setConfirmDeleteId(null);
    setConfirmClearAll(false);
  }, []);

  const armConfirm = useCallback((id: string | null, all: boolean) => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmDeleteId(id);
    setConfirmClearAll(all);
    // Auto-cancel after 4s — gives user time but doesn't leave the menu armed forever
    confirmTimerRef.current = setTimeout(() => {
      setConfirmDeleteId(null);
      setConfirmClearAll(false);
      confirmTimerRef.current = null;
    }, 4000);
  }, []);

  const undoLastDelete = useCallback(() => {
    const snap = undoStackRef.current.pop();
    if (!snap) return;
    setDocs(snap.docs);
    saveDocs(snap.docs);
    setActiveId(snap.activeId);
    toast.success("Restored");
  }, []);
  const undoLastDeleteRef = useRef(undoLastDelete);
  useEffect(() => { undoLastDeleteRef.current = undoLastDelete; }, [undoLastDelete]);

  const deleteDoc = (id: string) => {
    if (docs.length === 1) { toast.error("Need at least one document."); cancelConfirm(); return; }
    // Snapshot BEFORE delete so undo restores exact prior state
    undoStackRef.current.push({ docs: [...docs], activeId });
    if (undoStackRef.current.length > 10) undoStackRef.current.shift();

    const next = docs.filter((d) => d.id !== id);
    setDocs(next); saveDocs(next);
    if (activeId === id) setActiveId(next[0].id);
    cancelConfirm();

    toast.success("Note deleted", {
      action: { label: "Undo", onClick: undoLastDelete },
      duration: 6000,
    });
  };

  const clearAllDocs = () => {
    if (docs.length === 0) return;
    const count = docs.length;
    undoStackRef.current.push({ docs: [...docs], activeId });
    if (undoStackRef.current.length > 10) undoStackRef.current.shift();

    const fresh = newDoc();
    setDocs([fresh]); saveDocs([fresh]);
    setActiveId(fresh.id);
    cancelConfirm();

    toast.success(`${count} note${count === 1 ? "" : "s"} cleared`, {
      action: { label: "Undo", onClick: undoLastDelete },
      duration: 8000,
    });
  };

  const updateTitle = (title: string) => {
    setDocs((prev) => { const next = prev.map((d) => d.id === activeId ? { ...d, title } : d); saveDocs(next); return next; });
  };

  const toggleFocus = () => {
    if (!focusMode) { document.documentElement.requestFullscreen?.().catch(() => {}); setFocusMode(true); }
    else { document.exitFullscreen?.().catch(() => {}); setFocusMode(false); }
  };

  // ── Insert helpers ─────────────────────────────────────────────────────────
  const insertImage = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result && editor) editor.chain().focus().setImage({ src: ev.target.result as string }).run(); };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const insertLink = () => {
    const existing = editor?.getAttributes("link").href ?? "";
    const url = window.prompt("URL:", existing);
    if (url === null) return;
    if (url === "") { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url }).run();
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  function dl(content: string, name: string, mime: string) {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([content], { type: mime })),
      download: name,
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  const exportTxt = () => { dl(editor?.getText() ?? "", `${activeDoc.title}.txt`, "text/plain"); setShowExportMenu(false); };

  const exportMd = async () => {
    setShowExportMenu(false);
    const html = editor?.getHTML() ?? "";
    const TDS = (await import("turndown")) as any;
    const TurndownService = TDS.default ?? TDS;
    const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
    td.addRule("task", {
      filter: (n: Element) => n.nodeName === "LI" && n.getAttribute("data-type") === "taskItem",
      replacement: (content: string, node: Element) =>
        `- [${node.getAttribute("data-checked") === "true" ? "x" : " "}] ${content.replace(/^\n+/, "").trimEnd()}\n`,
    });
    dl(td.turndown(html), `${activeDoc.title}.md`, "text/markdown");
  };

  const exportPdf = async () => {
    setShowExportMenu(false);
    setExportingPdf(true);
    try {
      const el = document.querySelector(".notepad-editor") as HTMLElement;
      if (!el) return;
      const { default: html2canvas } = await import("html2canvas");
      const jsPDFMod = await import("jspdf");
      const jsPDF = (jsPDFMod as any).default ?? jsPDFMod.jsPDF;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: surfBg });

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();   // 595.28 pt
      const ph = pdf.internal.pageSize.getHeight();  // 841.89 pt
      const margin = 72;                             // 1 inch all sides — matches word processors

      const contentW = pw - margin * 2;  // printable width
      const contentH = ph - margin * 2;  // printable height per page

      // Total rendered height in pt at the scaled content width
      const totalRenderH = (canvas.height * contentW) / canvas.width;

      let rendered = 0;
      let firstPage = true;
      while (rendered < totalRenderH) {
        const sliceH = Math.min(contentH, totalRenderH - rendered);
        const srcY = (rendered / totalRenderH) * canvas.height;
        const srcH = (sliceH / totalRenderH) * canvas.height;

        const sc = document.createElement("canvas");
        sc.width = canvas.width;
        sc.height = Math.ceil(srcH);
        sc.getContext("2d")?.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        if (!firstPage) pdf.addPage();
        firstPage = false;

        // Place image inside the margin box on every page
        pdf.addImage(sc.toDataURL("image/png"), "PNG", margin, margin, contentW, sliceH);
        rendered += contentH;
      }

      pdf.save(`${activeDoc.title}.pdf`);
      toast.success("PDF downloaded.");
    } catch { toast.error("PDF export failed."); }
    finally { setExportingPdf(false); }
  };

  const exportHtml = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDoc.title}</title><style>body{font-family:Inter,sans-serif;max-width:760px;margin:48px auto;line-height:1.75;font-size:18px;color:#1a1a1a;padding:0 24px}h1,h2,h3{font-family:Sora,sans-serif}</style></head><body>${editor?.getHTML() ?? ""}</body></html>`;
    dl(html, `${activeDoc.title}.html`, "text/html");
    setShowExportMenu(false);
  };

  // Copy the entire active note to the clipboard. Writes BOTH text/html
  // (with embedded base64 images preserved) AND text/plain at once via the
  // modern Clipboard API, so pasting into Notion / Word / Gmail keeps the
  // formatting and images, while pasting into a plain text field gets the
  // text only. Falls back to writeText for older browsers.
  const handleCopy = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML() ?? "";
    const text = editor.getText() ?? "";
    if (!html && !text) {
      toast.message("Nothing to copy", { description: "This note is empty." });
      return;
    }
    try {
      const NavClipboard = navigator.clipboard as Clipboard | undefined;
      const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (NavClipboard && typeof NavClipboard.write === "function" && CI) {
        await NavClipboard.write([
          new CI({
            "text/html":  new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else if (NavClipboard && typeof NavClipboard.writeText === "function") {
        await NavClipboard.writeText(text);
      } else {
        throw new Error("Clipboard API not available");
      }
      setCopyState("copied");
      toast.success("Note copied", {
        description: "Formatting and images preserved. Plain text is also on the clipboard.",
      });
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 1600);
    } catch (err) {
      setCopyState("error");
      toast.error("Couldn't copy", {
        description: "Your browser blocked clipboard access. Try Cmd/Ctrl + A then Cmd/Ctrl + C.",
      });
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [editor]);

  // Clean up the copy reset timer on unmount to avoid setting state on an
  // unmounted component.
  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  const handleSmartExport = useCallback(() => {
    const html = editor?.getHTML() ?? "";
    const text = editor?.getText() ?? "";
    const hasImages = html.includes("<img");
    const isPlain = !hasImages && (html === `<p>${text}</p>` || html === "<p></p>" || html === "" || text === "");
    if (hasImages) exportPdf();
    else if (!isPlain) exportMd();
    else exportTxt();
  }, [editor, activeDoc]); // eslint-disable-line

  // ── Google Drive ───────────────────────────────────────────────────────────
  const connectDrive = useCallback(() => {
    if (!(window as any).google?.accounts) { toast.error("Google not loaded yet — try again."); return; }
    (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GCID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: async (res: any) => {
        if (res.error) { toast.error("Drive auth failed."); return; }
        accessTokenRef.current = res.access_token;
        setDriveConnected(true);
        toast.success("Connected to Google Drive!");
        await syncToDrive(editor?.getHTML() ?? "", res.access_token);
      },
    }).requestAccessToken();
  }, [GCID, editor]);

  const syncToDrive = async (html?: string, token?: string) => {
    const t = token ?? accessTokenRef.current;
    if (!t) return;
    const content = html ?? editor?.getHTML() ?? "";
    const doc = docs.find((d) => d.id === activeId);
    const name = `${doc?.title ?? "Untitled"}.html`;
    const fid = doc?.driveFileId;
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name, mimeType: "text/html" })], { type: "application/json" }));
    form.append("file", new Blob([content], { type: "text/html" }));
    setDriveSaving(true);
    try {
      if (fid) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fid}?uploadType=multipart`, { method: "PATCH", headers: { Authorization: `Bearer ${t}` }, body: form });
      } else {
        const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: form });
        const data = await r.json();
        setDocs((prev) => { const next = prev.map((d) => d.id === activeId ? { ...d, driveFileId: data.id } : d); saveDocs(next); return next; });
        toast.success("Saved to Google Drive!");
      }
    } catch { toast.error("Drive sync failed."); }
    finally { setDriveSaving(false); }
  };

  const surfBg  = settings.bgColor   || (settings.lightSurface ? "#FAF8F2" : "#161615");
  const surfTxt = settings.textColor || (settings.lightSurface ? "#1F1B16" : "#F0EDE8");
  // Derive light/dark for marker colors etc. based on effective bg
  const effectiveDark = settings.bgColor ? !isLightHex(settings.bgColor) : !settings.lightSurface;

  // ── Toolbar helpers ────────────────────────────────────────────────────────
  const tb = (active?: boolean): React.CSSProperties => {
    const fg = effectiveDark 
      ? (active ? "var(--t1)" : "var(--t2)") 
      : (active ? "#111111" : "rgba(0, 0, 0, 0.54)");
    const bg = active 
      ? (effectiveDark ? "var(--bg2)" : "rgba(0, 0, 0, 0.08)") 
      : "transparent";
    return {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
      background: bg,
      color: fg,
      transition: "background 0.14s, color 0.14s", flexShrink: 0,
    };
  };

  const sepColor = effectiveDark ? "var(--b0)" : "rgba(0, 0, 0, 0.08)";
  const sep = <div style={{ width: 1, height: 20, background: sepColor, margin: "0 8px", flexShrink: 0 }} />;
  // Look up the accent for the current theme; fall back per light/dark.
  const surfAccent = (() => {
    const match = THEMES.find((t) => t.bg === settings.bgColor && t.text === settings.textColor);
    if (match) return match.accent;
    return effectiveDark ? "#10B981" : "#5D4FB8";
  })();
  
  // Look up the tabStripBg for the current theme; fall back per light/dark.
  const tabStripBg = (() => {
    const match = THEMES.find((t) => t.bg === settings.bgColor && t.text === settings.textColor);
    if (match) return match.tabStripBg;
    return effectiveDark ? "#0C0C0C" : "#EAE6DF";
  })();


  // --- Scroll Gate & Lock Effects ---

  // Detect if the user is near the bottom of the editor
  useEffect(() => {
    if (isSeoUnlocked) {
      setIsNearBottom(false);
      return;
    }
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = docHeight - winHeight;
      // Trigger indicator within 24px of the bottom scroll limit
      const near = scrollY >= maxScroll - 24 && maxScroll > 50;
      setIsNearBottom(near);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSeoUnlocked]);

  // Handle relocking scroll gate when user scrolls back to the very top (scrollY === 0)
  useEffect(() => {
    if (!isSeoUnlocked) return;
    const handleScrollRelock = () => {
      if (window.scrollY === 0) {
        setIsSeoUnlocked(false);
        setScrollProgress(0);
        scrollProgressRef.current = 0;
        toast.message("Scroll gate locked", {
          description: "Scroll to the bottom of the editor to unlock the guide again.",
        });
      }
    };
    window.addEventListener("scroll", handleScrollRelock, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollRelock);
  }, [isSeoUnlocked]);

  // Intercept scroll wheel, touch swipe, and key downs when locked at bottom of the page
  useEffect(() => {
    if (isSeoUnlocked) return;

    const handleWheel = (e: WheelEvent) => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = docHeight - winHeight;
      const atBottom = scrollY >= maxScroll - 5;
      if (!atBottom) return;

      if (e.deltaY > 0) {
        e.preventDefault(); // Stop native overscroll / elastic bounce

        if (drainTimerRef.current) {
          clearInterval(drainTimerRef.current);
          drainTimerRef.current = null;
        }

        // Standardize step sizes across different scroll gears
        const step = Math.min(20, Math.max(4, Math.abs(e.deltaY) * 0.08));
        const nextProgress = Math.min(100, scrollProgressRef.current + step);
        scrollProgressRef.current = nextProgress;
        setScrollProgress(nextProgress);

        if (nextProgress >= 100) {
          unlockGate();
        } else {
          resetDrainTimer();
        }
      }
    };

    let touchStartY: number | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY === null) return;

      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = docHeight - winHeight;
      const atBottom = scrollY >= maxScroll - 5;
      if (!atBottom) return;

      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY; // Swiping UP scrolls down

      if (deltaY > 0) {
        e.preventDefault(); // Prevent default pull-up scroll bounce

        if (drainTimerRef.current) {
          clearInterval(drainTimerRef.current);
          drainTimerRef.current = null;
        }

        const step = Math.min(12, deltaY * 0.2);
        const nextProgress = Math.min(100, scrollProgressRef.current + step);
        scrollProgressRef.current = nextProgress;
        setScrollProgress(nextProgress);

        touchStartY = currentY; // Track movement dynamically

        if (nextProgress >= 100) {
          unlockGate();
        } else {
          resetDrainTimer();
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartY = null;
      resetDrainTimer();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = docHeight - winHeight;
      const atBottom = scrollY >= maxScroll - 5;
      if (!atBottom) return;

      const isDownKey = e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey);
      if (isDownKey) {
        e.preventDefault();

        if (drainTimerRef.current) {
          clearInterval(drainTimerRef.current);
          drainTimerRef.current = null;
        }

        const step = e.key === "ArrowDown" ? 15 : 35;
        const nextProgress = Math.min(100, scrollProgressRef.current + step);
        scrollProgressRef.current = nextProgress;
        setScrollProgress(nextProgress);

        if (nextProgress >= 100) {
          unlockGate();
        } else {
          resetDrainTimer();
        }
      }
    };

    const unlockGate = () => {
      setIsSeoUnlocked(true);
      setIsNearBottom(false);
      setScrollProgress(100);
      scrollProgressRef.current = 100;

      setTimeout(() => {
        window.scrollBy({ top: 160, behavior: "smooth" });
        toast.success("Documentation unlocked", {
          description: "You can now scroll down to read the guide.",
        });
      }, 100);
    };

    const resetDrainTimer = () => {
      if (drainTimerRef.current) clearInterval(drainTimerRef.current);
      drainTimerRef.current = setInterval(() => {
        const nextProgress = Math.max(0, scrollProgressRef.current - 8);
        scrollProgressRef.current = nextProgress;
        setScrollProgress(nextProgress);
        if (nextProgress === 0 && drainTimerRef.current) {
          clearInterval(drainTimerRef.current);
          drainTimerRef.current = null;
        }
      }, 40);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      if (drainTimerRef.current) clearInterval(drainTimerRef.current);
    };
  }, [isSeoUnlocked]);


  /** Apply a preset theme: sets bgColor, textColor, lightSurface in one shot. */
  const applyTheme = (bg: string, text: string) => {
    setSettings((prev) => {
      const next = { ...prev, bgColor: bg, textColor: text, lightSurface: isLightHex(bg) };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  const savedAgo = (() => {
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    if (s < 5) return "Just saved";
    if (s < 60) return `Saved ${s}s ago`;
    return `Saved ${Math.round(s / 60)}m ago`;
  })();

  // ── Editor container layout based on width setting ─────────────────────────
  const editorInnerStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      color: surfTxt,
      // Set line-height as a real CSS property so it reliably propagates to the
      // TipTap contenteditable and its <p> children via normal CSS inheritance.
      // Using a CSS variable for this was fragile — React passes the number as-is
      // to setProperty() and the browser may ignore non-string custom property values,
      // silently falling back to the var() default (1.78) for every option.
      lineHeight: settings.lineHeight,
      // Keep --np-lh as a properly-quoted string so the task-list checkbox CSS
      // (which uses calc(var(--np-lh) * var(--np-fs))) still works.
      ["--np-lh" as string]: String(settings.lineHeight),
      ["--np-fs" as string]: `${settings.fontSize}px`,
    };
    if (settings.writingWidth === "wide") return { ...base, padding: "44px 7% 96px" };
    if (settings.writingWidth === "focused") return { ...base, maxWidth: 760, margin: "0 auto", padding: "44px 40px 96px" };
    return { ...base, maxWidth: 580, margin: "0 auto", padding: "44px 40px 96px" };
  })();

  // ── Pill button for settings popup ────────────────────────────────────────
  const pill = (active: boolean, onClick: () => void, label: string) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        // inline-flex + line-height:1 removes the font's leading so the visible
        // glyphs (not the empty line-box) sit at the optical centre. Without
        // this, Inter's cap-heavy text reads as "stuck to the top" inside an
        // equally-padded pill.
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        height: 26, padding: "0 12px",
        borderRadius: 6, border: "1px solid",
        borderColor: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)",
        background: active ? "rgba(255,255,255,0.93)" : "transparent",
        color: active ? "#0A0C10" : "rgba(255,255,255,0.4)",
        fontSize: 12, lineHeight: 1, cursor: "pointer", fontFamily: "Inter, sans-serif",
        transition: "all 0.12s", whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: surfBg, minHeight: "100vh" }}>
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        canonicalPath="/online-notepad"
        keywords={seo.keywords}
        jsonLd={jsonLd}
      />

      {/*
        TOOLBAR — two-zone layout (Notion / Linear pattern):
        • LEFT ZONE  — scrollable, contains all formatting tools
        • RIGHT ZONE — fixed, never scrolls; contains action buttons that
                       must always be reachable (Find, Focus, Settings, Export).
        This ensures the right-side buttons are NEVER hidden by overflow,
        regardless of viewport width or fullscreen mode.
      */}
      {/*
        DOUBLE-ROW TOOLBAR:
        • ROW 1 (Window & File Tabs) — height 40px, displays open note tabs and file action controls
        • ROW 2 (Formatting Tools)   — height 38px, displays rich-text formatting buttons and view controls
      */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", flexDirection: "column" }}>
        
        {/* ── ROW 1: Window header, file tabs, and file action buttons ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 40, borderBottom: `1px solid ${sepColor}`, padding: "0 10px", width: "100%", boxSizing: "border-box", background: tabStripBg }}>
          
          {/* Left Zone: Back and Tabs */}
          <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 2, flex: 1, minWidth: 0 }}>
            {/* Back Button */}
            <Link href="/tools" className="notepad-back-link" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, color: effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)", textDecoration: "none", alignSelf: "center", flexShrink: 0 }} title="Back to Tools">
              <ArrowLeft size={15} />
            </Link>
            <span className="notepad-back-link" style={{ alignSelf: "center" }}>{sep}</span>

            {/* Browser Tabs Scrollable Container */}
            <div
              className="notepad-tabs-container"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 0,
                overflowX: "auto",
                height: "100%",
                flex: 1,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              {docs.map((doc, idx) => {
                const isActive = doc.id === activeId;
                const isArmed = confirmDeleteId === doc.id;
                const isNextActive = idx + 1 < docs.length && docs[idx + 1].id === activeId;
                const showDivider = !isActive && !isNextActive && idx < docs.length - 1;
                
                return (
                  <div
                    key={doc.id}
                    className={`notepad-tab-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (!isActive) {
                        setActiveId(doc.id);
                        cancelConfirm();
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      height: 32,
                      padding: "0 12px",
                      borderRadius: "8px 8px 0 0",
                      border: "none",
                      background: isActive ? surfBg : "transparent",
                      color: isActive ? surfTxt : (effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)"),
                      cursor: "pointer",
                      position: "relative",
                      minWidth: 80,
                      maxWidth: 150,
                      marginBottom: isActive ? -1 : 0,
                      zIndex: isActive ? 2 : 1,
                      ["--active-tab-bg" as any]: surfBg,
                      ["--active-border-color" as any]: surfAccent,
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 8,
                          borderTop: `1px solid ${surfAccent}`,
                          borderLeft: `1px solid ${surfAccent}`,
                          borderRight: `1px solid ${surfAccent}`,
                          borderRadius: "8px 8px 0 0",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {isActive ? (
                      <input
                        ref={titleInputRef}
                        value={doc.title}
                        onChange={(e) => updateTitle(e.target.value)}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: surfTxt,
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          width: "100%",
                          padding: 0,
                          margin: 0,
                          letterSpacing: "-0.01em",
                        }}
                        spellCheck={false}
                        title="Rename note"
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          fontFamily: "Inter, sans-serif",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                        }}
                      >
                        {doc.title || "Untitled"}
                      </span>
                    )}

                    {docs.length > 1 && (
                      isArmed ? (
                        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <button
                            onClick={() => deleteDoc(doc.id)}
                            style={{ border: "none", background: "var(--err)", color: "#fff", fontSize: 9, padding: "2px 4px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                            title="Confirm delete"
                          >
                            Del
                          </button>
                          <button
                            onClick={cancelConfirm}
                            style={{ border: "none", background: "transparent", color: "var(--t2)", fontSize: 9, padding: "2px 2px", cursor: "pointer" }}
                            title="Cancel"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            armConfirm(doc.id, false);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: isActive ? (effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.4)") : (effectiveDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 2,
                            borderRadius: 4,
                            cursor: "pointer",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--err)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isActive ? (effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.4)") : (effectiveDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)");
                          }}
                          title="Delete note"
                        >
                          <X size={10} />
                        </button>
                      )
                    )}

                    {/* Vertical tab divider lines (Chrome aesthetic) */}
                    {showDivider && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 9,
                          width: 1,
                          height: 14,
                          background: effectiveDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                );
              })}
              
              {/* Plus Button inside tab bar row */}
              <button
                onClick={createDoc}
                style={{
                  ...tb(),
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  alignSelf: "center",
                  marginLeft: 8,
                  flexShrink: 0,
                  zIndex: 1,
                }}
                title="New note"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Right Zone: Status, Cloud, Settings, Feedback */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingBottom: 6 }}>
            <span style={{ fontSize: 11, color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)", fontFamily: "Inter, sans-serif" }} className="notepad-shortcuts-btn">
              {savedAgo}
            </span>

            {GCID && (
              <button style={tb(driveConnected)} onClick={driveConnected ? () => syncToDrive() : connectDrive} title={driveConnected ? "Sync to Drive now" : "Connect Google Drive"}>
                {driveSaving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : driveConnected ? <Cloud size={13} /> : <CloudOff size={13} />}
              </button>
            )}

            {sep}

            {/* Shortcuts */}
            <button style={tb(showShortcuts)} onClick={() => setShowShortcuts(!showShortcuts)} title="Keyboard Shortcuts" className="notepad-shortcuts-btn">
              <Clock size={13} />
            </button>

            {/* Feedback */}
            <button style={tb()} onClick={openFeedback} title="Send feedback" className="notepad-shortcuts-btn">
              <MessageSquarePlus size={13} />
            </button>
          </div>

        </div>

        {/* ── ROW 2: Rich-text formatting tools and view/export options ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 38, padding: "0 10px", boxSizing: "border-box", width: "100%", background: surfBg, borderBottom: `1px solid ${sepColor}`, transition: "background 0.3s" }}>
          
          {/* Row 2 Left Zone: Formatting buttons (scrollable) */}
          <div className="notepad-toolbar" style={{ display: "flex", alignItems: "center", height: "100%", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            {/* FORMAT */}
            <button style={tb(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><BoldIcon size={14} /></button>
            <button style={tb(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><ItalicIcon size={14} /></button>
            <button style={tb(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><UnderlineIcon size={14} /></button>
            <button style={tb(editor?.isActive("strike"))} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={14} /></button>
            <button style={tb(editor?.isActive("highlight"))} onClick={() => editor?.chain().focus().toggleHighlight().run()} title="Highlight"><Highlighter size={13} /></button>
            {sep}

            {/* HEADINGS */}
            <button style={tb(editor?.isActive("paragraph") && !editor?.isActive("heading"))} onClick={() => editor?.chain().focus().setParagraph().run()} title="Paragraph"><AlignLeft size={14} /></button>
            <button style={tb(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 size={14} /></button>
            <button style={tb(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 size={14} /></button>
            <button style={tb(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 size={14} /></button>
            {sep}

            {/* TABLE DYNAMIC CREATOR */}
            <button
              ref={tableBtnRef}
              style={tb(showTableGrid || editor?.isActive("table"))}
              onClick={() => {
                const r = tableBtnRef.current?.getBoundingClientRect();
                if (r) setTableMenuLeft(r.left);
                setShowTableGrid(!showTableGrid);
                setShowDocMenu(false);
                setShowMoreMenu(false);
                setShowSettings(false);
                cancelConfirm();
              }}
              title="Insert table (dynamic grid)"
              aria-label="Insert table"
            >
              <Table2 size={14} />
            </button>
            {sep}

            {/* HISTORY */}
            <button style={{ ...tb(), opacity: editor?.can().undo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
            <button style={{ ...tb(), opacity: editor?.can().redo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)"><Redo2 size={13} /></button>
          </div>

          {/* Row 2 Right Zone: Fixed layout and export options */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingLeft: 6 }}>
            {/* MORE Menu */}
            <button
              ref={moreMenuBtnRef}
              style={{ ...tb(showMoreMenu), width: "auto", padding: "0 8px", gap: 3, flexShrink: 0 }}
              onClick={() => { setShowMoreMenu(!showMoreMenu); setShowDocMenu(false); setShowSettings(false); setShowExportMenu(false); }}
              title="More — lists, insert image/link, colors"
            >
              <MoreHorizontal size={15} />
            </button>
            {sep}

            {/* FIND */}
            <button
              style={tb(showFind)}
              onClick={() => { if (showFind) { setShowFind(false); setShowReplace(false); } else { setShowFind(true); setTimeout(() => findInputRef.current?.focus(), 50); } }}
              title="Find (Ctrl+F) · Find & Replace (Ctrl+H)"
            >
              <Search size={14} />
            </button>

            {/* FOCUS / FULLSCREEN */}
            <button style={tb(focusMode)} onClick={toggleFocus} title="Focus / fullscreen (Ctrl+\\)">{focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>

            {sep}

            {/* SETTINGS */}
            <button style={tb(showSettings)} onClick={() => { setShowSettings(!showSettings); setShowExportMenu(false); setShowMoreMenu(false); }} title="Settings" aria-label="Editor settings">
              <Settings size={14} />
            </button>

            {/* COPY */}
            <button
              className="notepad-export-btn notepad-copy-btn"
              style={{
                ...tb(),
                width: "auto",
                padding: "0 10px",
                gap: 5,
                fontSize: 12.5,
                fontWeight: 600,
                color: copyState === "copied"
                  ? "rgba(140, 230, 170, 0.95)"
                  : copyState === "error"
                  ? "rgba(255, 150, 150, 0.95)"
                  : "rgba(255,255,255,0.75)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 6,
                flexShrink: 0,
              }}
              onClick={handleCopy}
              title="Copy note to clipboard (with formatting & images)"
              aria-label={
                copyState === "copied" ? "Note copied to clipboard"
                : copyState === "error" ? "Copy failed"
                : "Copy note to clipboard"
              }
              aria-live="polite"
            >
              {copyState === "copied"
                ? <Check size={12} />
                : <CopyIcon size={12} />}
              <span className="notepad-export-label" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>
                {copyState === "copied" ? "Copied" : copyState === "error" ? "Failed" : "Copy"}
              </span>
            </button>

            {/* EXPORT */}
            <button
              className="notepad-export-btn"
              style={{ ...tb(), width: "auto", padding: "0 10px", gap: 5, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.07)", borderRadius: 6, flexShrink: 0 }}
              onClick={() => { setShowExportMenu(!showExportMenu); setShowSettings(false); setShowMoreMenu(false); }}
              title="Export (Ctrl+D for smart export)"
            >
              {exportingPdf ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={12} />}
              <span className="notepad-export-label" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Export</span>
              <ChevronDown size={10} />
            </button>
          </div>

        </div>

      </div>

      {/* ── MORE MENU PANEL — position: fixed, escapes all overflow contexts ── */}
      {showMoreMenu && (
        <div
          style={{
            position: "fixed",
            top: 82,
            left: (() => { const r = moreMenuBtnRef.current?.getBoundingClientRect(); return r ? Math.min(r.left, window.innerWidth - 280) : 120; })(),
            background: "var(--bg1)",
            border: "1px solid var(--b0)",
            borderRadius: "var(--r)",
            width: 260,
            padding: "10px",
            zIndex: 200,
            boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
          }}
        >
          {/* Section: Lists */}
          <div style={{ color: "var(--t3)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Lists</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button style={{ ...tb(editor?.isActive("bulletList")), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { editor?.chain().focus().toggleBulletList().run(); setShowMoreMenu(false); }} title="Bullet list">
              <List size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Bullet</span>
            </button>
            <button style={{ ...tb(editor?.isActive("orderedList")), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { editor?.chain().focus().toggleOrderedList().run(); setShowMoreMenu(false); }} title="Numbered list">
              <ListOrdered size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Numbered</span>
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button style={{ ...tb(editor?.isActive("taskList")), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { editor?.chain().focus().toggleTaskList().run(); setShowMoreMenu(false); }} title="Checklist">
              <CheckSquare size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Checklist</span>
            </button>
            <button style={{ ...tb(editor?.isActive("blockquote")), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { editor?.chain().focus().toggleBlockquote().run(); setShowMoreMenu(false); }} title="Blockquote">
              <Quote size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Quote</span>
            </button>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0 10px" }} />

          {/* Section: Insert */}
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Insert</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button style={{ ...tb(), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { insertImage(); setShowMoreMenu(false); }} title="Insert image">
              <ImageIcon size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Image</span>
            </button>
            <button style={{ ...tb(editor?.isActive("link")), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { insertLink(); setShowMoreMenu(false); }} title="Insert link">
              <LinkIcon size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Link</span>
            </button>
            <button style={{ ...tb(), flex: 1, width: "auto", padding: "0 8px", gap: 5 }} onClick={() => { editor?.chain().focus().setHorizontalRule().run(); setShowMoreMenu(false); }} title="Divider">
              <Minus size={13} /><span style={{ fontSize: 12, fontFamily: "Inter,sans-serif" }}>Divider</span>
            </button>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0 10px" }} />

          {/* Section: Text Color */}
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Text Color</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {(["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#A855F7"] as const).map((color) => {
              const isActive = editor?.isActive("textStyle", { color });
              return (
                <button
                  key={color}
                  title={color}
                  onClick={() => { isActive ? editor?.chain().focus().unsetColor().run() : editor?.chain().focus().setColor(color).run(); }}
                  style={{ width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer", background: color, flexShrink: 0, outline: isActive ? "2px solid white" : "2px solid transparent", outlineOffset: 2, transition: "outline 0.1s" }}
                />
              );
            })}
            <label title="Custom color" style={{ ...tb(), cursor: "pointer", position: "relative", marginLeft: 2 }}>
              <Pencil size={13} />
              <input
                ref={colorInputRef}
                type="color"
                style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }}
                onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              />
            </label>
          </div>

          {/* Section: Table Actions (Only visible inside table) */}
          {editor?.isActive("table") && (
            <>
              <div style={{ borderTop: "1px solid var(--b0)", margin: "8px 0 10px" }} />
              <div style={{ color: "var(--t3)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Table Actions</div>
              
              <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif" }}
                  onClick={() => { editor.chain().focus().addRowBefore().run(); }}
                  title="Insert row above"
                >
                  Row Above
                </button>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif" }}
                  onClick={() => { editor.chain().focus().addRowAfter().run(); }}
                  title="Insert row below"
                >
                  Row Below
                </button>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif" }}
                  onClick={() => { editor.chain().focus().addColumnBefore().run(); }}
                  title="Insert column left"
                >
                  Col Left
                </button>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif" }}
                  onClick={() => { editor.chain().focus().addColumnAfter().run(); }}
                  title="Insert column right"
                >
                  Col Right
                </button>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif", color: "var(--err)" }}
                  onClick={() => { editor.chain().focus().deleteRow().run(); }}
                  title="Delete row"
                >
                  Delete Row
                </button>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif", color: "var(--err)" }}
                  onClick={() => { editor.chain().focus().deleteColumn().run(); }}
                  title="Delete column"
                >
                  Delete Col
                </button>
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif" }}
                  onClick={() => { editor.chain().focus().toggleHeaderRow().run(); }}
                  title="Toggle header row style"
                >
                  Toggle Header
                </button>
                <button
                  style={{ ...tb(), flex: 1, width: "auto", padding: "4px 8px", fontSize: 11, fontFamily: "Inter,sans-serif", color: "var(--err)", fontWeight: 600 }}
                  onClick={() => { editor.chain().focus().deleteTable().run(); setShowMoreMenu(false); }}
                  title="Delete entire table"
                >
                  Delete Table
                </button>
              </div>
            </>
          )}
        </div>
      )}

        {/* ── DOC MENU PANEL — position: fixed so it escapes the overflow context ── */}
        {showDocMenu && (
          <div style={{ position: "fixed", top: 80, left: docMenuLeft, background: "var(--bg1)", border: "1px solid var(--b0)", borderRadius: "var(--r)", minWidth: 240, padding: "6px 0", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.65)" }}>
            {docs.map((d) => {
              const armed = confirmDeleteId === d.id;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", padding: "7px 12px",
                    cursor: "pointer",
                    background: armed
                      ? "color-mix(in srgb, var(--err) 8%, transparent)"
                      : d.id === activeId ? "var(--bg2)" : "transparent",
                    transition: "background 140ms ease",
                  }}
                >
                  <span
                    style={{ flex: 1, color: "var(--t1)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={() => { if (!armed) { setActiveId(d.id); setShowDocMenu(false); } }}
                  >
                    {d.title || "Untitled"}
                  </span>
                  {!armed && d.id === activeId && (
                    <Check size={12} style={{ color: "var(--t2)", flexShrink: 0 }} />
                  )}
                  {docs.length > 1 && (
                    armed ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 6 }}>
                        <button
                          autoFocus
                          onClick={(e) => { e.stopPropagation(); deleteDoc(d.id); }}
                          style={{
                            fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 600,
                            padding: "3px 11px", borderRadius: 999,
                            background: "var(--err)", color: "#fff",
                            border: "1px solid var(--err)", cursor: "pointer",
                            letterSpacing: "0.01em",
                            boxShadow: "0 1px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                          }}
                          title="Confirm delete"
                        >Delete</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelConfirm(); }}
                          style={{
                            fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 500,
                            padding: "3px 9px", borderRadius: 999,
                            background: "transparent", color: "var(--t2)",
                            border: "1px solid var(--b0)", cursor: "pointer",
                          }}
                          title="Cancel"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        style={{ ...tb(), width: 20, height: 20, marginLeft: 4, opacity: 0.55, color: "var(--t2)" }}
                        onClick={(e) => { e.stopPropagation(); armConfirm(d.id, false); }}
                        onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "1"; el.style.color = "var(--err)"; el.style.background = "color-mix(in srgb, var(--err) 12%, transparent)"; }}
                        onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "0.55"; el.style.color = "var(--t2)"; el.style.background = "transparent"; }}
                        title="Delete note"
                      >
                        <X size={10} />
                      </button>
                    )
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--b0)", margin: "4px 0" }} />
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 12, transition: "background 0.12s, color 0.12s" }}
              onClick={createDoc}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; (e.currentTarget as HTMLElement).style.color = "var(--t1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
            >
              <Plus size={12} /> New document
            </button>
            <div style={{ borderTop: "1px solid var(--b0)", margin: "4px 0" }} />
            {confirmClearAll ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "color-mix(in srgb, var(--err) 8%, transparent)" }}>
                <span style={{ fontSize: 11.5, color: "var(--t1)", fontFamily: "Inter,sans-serif", flex: 1 }}>
                  {docs.length === 1 ? "Delete this note?" : `Delete all ${docs.length} notes?`}
                </span>
                <button
                  autoFocus
                  onClick={(e) => { e.stopPropagation(); clearAllDocs(); }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 999,
                    background: "var(--err)", color: "#fff",
                    border: "1px solid var(--err)", cursor: "pointer",
                    fontFamily: "Inter,sans-serif", letterSpacing: "0.01em",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >{docs.length === 1 ? "Delete" : "Delete all"}</button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelConfirm(); }}
                  style={{
                    fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 500,
                    padding: "3px 9px", borderRadius: 999,
                    background: "transparent", color: "var(--t2)",
                    border: "1px solid var(--b0)", cursor: "pointer",
                  }}
                  title="Cancel"
                >No</button>
              </div>
            ) : (
              <button
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 11.5, fontFamily: "Inter,sans-serif", transition: "background 0.12s, color 0.12s" }}
                onClick={() => armConfirm(null, true)}
                title={docs.length === 1 ? "Clear this note" : "Clear all notes"}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--err)"; (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--t2)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <Trash2 size={11} /> {docs.length === 1 ? "Clear note" : "Clear all"}
              </button>
            )}
          </div>
        )}

        {/* ── TABLE CREATOR DYNAMIC GRID POPOVER ── */}
        {showTableGrid && (
          <div
            style={{
              position: "fixed",
              top: 80,
              left: tableMenuLeft,
              background: "var(--bg1)",
              border: "1px solid var(--b0)",
              borderRadius: "var(--r)",
              padding: 12,
              zIndex: 200,
              boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              userSelect: "none"
            }}
            onMouseLeave={() => {
              setHoveredRows(0);
              setHoveredCols(0);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--t1)", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, paddingBottom: 4 }}>
              <span>Insert Table</span>
              <span style={{ color: hoveredCols > 0 ? surfAccent : "var(--t3)" }}>
                {hoveredCols > 0 ? `${hoveredCols} × ${hoveredRows}` : "0 × 0"}
              </span>
            </div>

            {/* Grid container (10x10) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 16px)", gap: 3 }}>
              {Array.from({ length: 10 }).map((_, r) =>
                Array.from({ length: 10 }).map((_, c) => {
                  const isHighlighted = (r < hoveredRows) && (c < hoveredCols);
                  return (
                    <div
                      key={`${r}-${c}`}
                      onMouseEnter={() => {
                        setHoveredRows(r + 1);
                        setHoveredCols(c + 1);
                      }}
                      onClick={() => {
                        const rows = r + 1;
                        const cols = c + 1;
                        editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                        setShowTableGrid(false);
                        setHoveredRows(0);
                        setHoveredCols(0);
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: isHighlighted
                          ? surfAccent
                          : "rgba(255, 255, 255, 0.08)",
                        border: isHighlighted
                          ? `1px solid ${surfAccent}`
                          : "1px solid rgba(255, 255, 255, 0.15)",
                        cursor: "pointer",
                        transition: "background 100ms ease, border-color 100ms ease"
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS PANEL — position: fixed anchored top-right ── */}
        {showSettings && (
          <div
            className="notepad-settings-panel"
            // data-lenis-prevent tells the global Lenis smooth-scroll engine
            // (which hijacks wheel/touch on the page) to leave this element
            // alone, so its own overflow:auto can scroll natively.
            data-lenis-prevent
            style={{
              position: "fixed", top: 82, right: 10,
              background: "var(--bg1)", border: "1px solid var(--b0)",
              borderRadius: "var(--r)", width: 316, padding: "14px",
              zIndex: 200,
              boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
              maxHeight: "calc(100vh - 88px)",
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "thin" as React.CSSProperties["scrollbarWidth"],
              scrollbarColor: "rgba(255,255,255,0.18) transparent",
              overscrollBehavior: "contain",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "var(--t1)", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Editor Settings</span>
              <button style={{ ...tb(), width: 24, height: 24 }} onClick={() => setShowSettings(false)}><X size={12} /></button>
            </div>

            {/* Font size — preset pills + inline stepper on a single row */}
            <div style={{ paddingTop: 14, marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Font size</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0, justifyContent: "flex-start" }}>
                  {[12, 14, 16, 18, 22].map((s) => {
                    const active = settings.fontSize === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateSetting("fontSize", s)}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          height: 26, minWidth: 30, padding: "0 6px",
                          borderRadius: 6, border: "1px solid",
                          borderColor: active ? "var(--b1)" : "var(--b0)",
                          background: active ? "var(--bg3)" : "transparent",
                          color: active ? "var(--t1)" : "var(--t2)",
                          fontSize: 12, lineHeight: 1, cursor: "pointer", fontFamily: "Inter, sans-serif",
                          transition: "all 0.12s",
                        }}
                      >{s}</button>
                    );
                  })}
                </div>
                <div aria-hidden style={{ width: 1, height: 18, background: "var(--b0)", flexShrink: 0 }} />
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--b0)", borderRadius: 6, overflow: "hidden", flexShrink: 0, height: 26, boxSizing: "border-box" }}>
                  <button onClick={() => updateSetting("fontSize", Math.max(10, settings.fontSize - 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
                  <input type="number" min={10} max={72} step={1} value={settings.fontSize} onChange={(e) => { const v = Math.min(72, Math.max(10, parseInt(e.target.value) || 10)); updateSetting("fontSize", v); }} style={{ width: 32, height: "100%", background: "transparent", border: "none", outline: "none", textAlign: "center", color: "var(--t1)", fontSize: 12, fontFamily: "Inter,sans-serif", padding: 0 } as React.CSSProperties} />
                  <button onClick={() => updateSetting("fontSize", Math.min(72, settings.fontSize + 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
                </div>
              </div>
            </div>

            {/* Writing width */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Writing width</div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["wide", "focused", "narrow"] as const).map((w) => pill(settings.writingWidth === w, () => updateSetting("writingWidth", w), w.charAt(0).toUpperCase() + w.slice(1)))}
              </div>
            </div>

            {/* Line height */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Line height</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ v: 1.5, l: "Compact" }, { v: 2.1, l: "Normal" }, { v: 2.6, l: "Relaxed" }].map(({ v, l }) => pill(settings.lineHeight === v, () => updateSetting("lineHeight", v), l))}
              </div>
            </div>

            {/* Theme presets — all 5 swatches in ONE row at 28×28px */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Themes</div>
              <div style={{ display: "flex", gap: 5 }}>
                {THEMES.map((t) => {
                  const isActive = settings.bgColor === t.bg && settings.textColor === t.text;
                  return (
                    <button
                      key={t.label}
                      title={t.label}
                      onClick={() => applyTheme(t.bg, t.text)}
                      style={{
                        width: 28, height: 28, borderRadius: 7, border: "none", flexShrink: 0,
                        background: t.bg, cursor: "pointer", position: "relative",
                        outline: isActive ? "2px solid var(--t1)" : "2px solid var(--b0)",
                        outlineOffset: 1,
                      }}
                    >
                      <span style={{ position: "absolute", bottom: 3, right: 3, width: 7, height: 7, borderRadius: "50%", background: t.text, display: "block" }} />
                      {isActive && <Check size={9} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--t1)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom colours */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Custom colours</div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", borderRadius: 7, padding: "5px 9px", cursor: "pointer", border: "1px solid var(--b0)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: surfBg, border: "1px solid var(--b0)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <input type="color" value={surfBg.startsWith("#") ? surfBg : "#111318"} onChange={(e) => { updateSetting("bgColor", e.target.value); updateSetting("lightSurface", isLightHex(e.target.value)); }} style={{ position: "absolute", opacity: 0, width: "200%", height: "200%", top: "-50%", left: "-50%", cursor: "pointer" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--t2)", fontFamily: "Inter,sans-serif" }}>Background</span>
                </label>
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", borderRadius: 7, padding: "5px 9px", cursor: "pointer", border: "1px solid var(--b0)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: surfTxt.startsWith("rgba") ? "#c9d1d9" : surfTxt, border: "1px solid var(--b0)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <input type="color" value={surfTxt.startsWith("#") ? surfTxt : "#c9d1d9"} onChange={(e) => updateSetting("textColor", e.target.value)} style={{ position: "absolute", opacity: 0, width: "200%", height: "200%", top: "-50%", left: "-50%", cursor: "pointer" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--t2)", fontFamily: "Inter,sans-serif" }}>Text</span>
                </label>
              </div>
            </div>

            {/* Binary toggles arranged in a 2×2 grid — visually grouped, with
                generous row spacing so each setting reads as its own block. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 22, paddingTop: 22, marginTop: 18, borderTop: "1px solid var(--b0)" }}>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Lines</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.ruledLines, () => updateSetting("ruledLines", false), "None")}
                  {pill(settings.ruledLines, () => updateSetting("ruledLines", true), "Ruled")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Underline typos as you write">Spell check</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(settings.spellCheck, () => updateSetting("spellCheck", true), "On")}
                  {pill(!settings.spellCheck, () => updateSetting("spellCheck", false), "Off")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Subtle paper-fiber texture overlay on the canvas">Paper grain</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.paperGrain, () => updateSetting("paperGrain", false), "Off")}
                  {pill(settings.paperGrain, () => updateSetting("paperGrain", true), "On")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Soft hairline frame around inline images">Image border</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(settings.imageBorder, () => updateSetting("imageBorder", true), "On")}
                  {pill(!settings.imageBorder, () => updateSetting("imageBorder", false), "Off")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EXPORT PANEL — position: fixed anchored top-right ── */}
        {showExportMenu && (
          <div style={{ position: "fixed", top: 82, right: 10, background: "var(--bg1)", border: "1px solid var(--b0)", borderRadius: "var(--r)", minWidth: 216, padding: "6px 0", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)" }}>
            {[
              { label: "Smart Export", sub: "Ctrl+D · auto-detect format", fn: handleSmartExport, accent: true },
              null,
              { label: "Plain Text (.txt)", sub: "No formatting preserved", fn: exportTxt, accent: false },
              { label: "Markdown (.md)", sub: "Headings, lists, bold, links", fn: exportMd, accent: false },
              { label: "PDF (.pdf)", sub: "Includes images & layout", fn: exportPdf, accent: false },
              { label: "HTML (.html)", sub: "Full web-ready format", fn: exportHtml, accent: false },
            ].map((item, i) =>
              item === null ? (
                <div key={i} style={{ borderTop: "1px solid var(--b0)", margin: "4px 0" }} />
              ) : (
                <button
                  key={item.label}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                  onClick={item.fn}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <span style={{ color: "var(--t1)", fontSize: 13, fontWeight: item.accent ? 600 : 400, fontFamily: "Inter,sans-serif" }}>{item.label}</span>
                  <span style={{ color: "var(--t3)", fontSize: 11, marginTop: 1, fontFamily: "Inter,sans-serif" }}>{item.sub}</span>
                </button>
              )
            )}
          </div>
        )}

      {/* ── FIND / REPLACE BAR ─────────────────────────────────────────────── */}
      {showFind && (
        <div style={{ background: "var(--bg0)", borderBottom: "1px solid var(--b0)", padding: "6px 10px" }}>
          {/* Find row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: showReplace ? 4 : 0 }}>
            {/* Toggle replace */}
            <button
              style={{ ...tb(), color: showReplace ? "var(--t2)" : "var(--t4)" }}
              onClick={() => { setShowReplace(!showReplace); if (!showReplace) setTimeout(() => replaceInputRef.current?.focus(), 50); }}
              title={showReplace ? "Collapse replace (Ctrl+H)" : "Expand replace (Ctrl+H)"}
            >
              <ChevronRight size={12} style={{ transform: showReplace ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            <Search size={12} style={{ color: "var(--t3)", flexShrink: 0 }} />
            <input
              ref={findInputRef}
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); (window as any).find(findText, false, e.shiftKey, true); }
                if (e.key === "Escape") { setShowFind(false); setShowReplace(false); }
              }}
              placeholder="Find… (Enter ↓  Shift+Enter ↑)"
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--t1)", fontSize: 13, flex: 1, fontFamily: "Inter,sans-serif", minWidth: 0 }}
            />
            <button style={{ ...tb() }} onClick={() => { setShowFind(false); setShowReplace(false); }} title="Close (Esc)"><X size={12} /></button>
          </div>
          {/* Replace row */}
          {showReplace && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Spacer matching the chevron toggle width */}
              <div style={{ width: 28, flexShrink: 0 }} />
              <ArrowLeft size={12} style={{ color: "var(--t3)", flexShrink: 0, transform: "rotate(180deg)" }} />
              <input
                ref={replaceInputRef}
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); doReplace(false); }
                  if (e.key === "Escape") { setShowFind(false); setShowReplace(false); }
                }}
                placeholder="Replace with…"
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--t1)", fontSize: 13, flex: 1, fontFamily: "Inter,sans-serif", minWidth: 0 }}
              />
              <button
                style={{ ...tb(), padding: "0 10px", width: "auto", fontSize: 11, fontFamily: "Inter,sans-serif", color: "var(--t2)", letterSpacing: "0.01em" }}
                onClick={() => doReplace(false)} title="Replace next (Enter)"
              >
                Replace
              </button>
              <button
                style={{ ...tb(), padding: "0 10px", width: "auto", fontSize: 11, fontFamily: "Inter,sans-serif", color: "var(--t2)", letterSpacing: "0.01em" }}
                onClick={() => doReplace(true)} title="Replace all occurrences"
              >
                All
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── EDITOR AREA ─────────────────────────────────────────────────────── */}
      <div
        ref={editorWrapRef}
        className={[
          effectiveDark ? "surface-dark" : "surface-light",
          settings.paperGrain ? "notepad-grain" : "",
        ].filter(Boolean).join(" ")}
        style={{
          backgroundColor: surfBg,
          color: surfTxt,
          minHeight: "calc(100vh - 78px - 38px)",
          transition: "background 0.3s, color 0.3s",
          cursor: "text",
          // Clip overflow-x so the full-width ::after rule lines (width: 100vw) on
          // each paragraph don't cause a horizontal scrollbar.
          overflowX: "clip",
          // Per-theme accent — caret, selection, links pick this up via var().
          ["--np-accent" as string]: surfAccent,
        } as React.CSSProperties}
        onClick={(e) => {
          if (e.target === editorWrapRef.current) editor?.commands.focus("end");
          setShowDocMenu(false); setShowExportMenu(false); setShowSettings(false); setShowShortcuts(false); cancelConfirm();
        }}
      >
        <div style={editorInnerStyle} className={[settings.ruledLines ? "notepad-ruled" : "", settings.imageBorder ? "notepad-img-border" : ""].filter(Boolean).join(" ")}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ── Image floating toolbar (shown when an image node is selected) ──── */}
      {imgToolbar && (
        <div
          style={{
            position: "fixed",
            top: Math.max(8, imgToolbar.top),
            left: imgToolbar.left,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "#1A1D24",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: 4,
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            fontFamily: "Inter,sans-serif",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {(["small", "medium", "large", "full"] as ImgSize[]).map((s) => {
            const active = imgToolbar.size === s;
            const labels: Record<ImgSize, string> = { small: "S", medium: "M", large: "L", full: "Full" };
            return (
              <button
                key={s}
                onClick={() => setImgSize(s)}
                title={s.charAt(0).toUpperCase() + s.slice(1)}
                style={{
                  background: active ? "#FFFFFF" : "transparent",
                  color: active ? "#0D0F14" : "rgba(255,255,255,0.72)",
                  border: "none",
                  borderRadius: 5,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  minWidth: 28,
                }}
              >
                {labels[s]}
              </button>
            );
          })}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
          <button
            onClick={() => {
              const dom = editor?.view.nodeDOM(imgToolbar.pos) as HTMLImageElement | null;
              if (dom?.src) setLightboxSrc(dom.src);
            }}
            title="Open fullscreen"
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.72)",
              border: "none",
              borderRadius: 5,
              padding: "5px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* ── Image lightbox ──────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5,7,10,0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            cursor: "zoom-out",
            padding: 32,
          }}
        >
          <img
            src={lightboxSrc}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(95vw, 1600px)",
              maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              cursor: "default",
            }}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            title="Close (Esc)"
            style={{
              position: "fixed",
              top: 18,
              right: 18,
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}



      {/* ──────────────────────────────────────────────────────────────────────
          SEO + AI-citation content. Lives BELOW the editor so tool users never
          see it (analytics: <5% of tool visitors scroll past the editor). For
          the visitors who do scroll, and for crawlers (Google, Bing, AI
          assistants like Perplexity, ChatGPT browse, Bing Copilot), this
          section provides:
            • A clear visual boundary — you have to deliberately scroll into it
            • H1 keyword anchor + value prop
            • Atomic feature cards (citation-friendly)
            • Use-case sections for long-tail queries ("notepad for students" etc)
            • FAQ in <details> — the strongest single AI-citation pattern
            • Related-tools internal links + footer band
          Pure CSS/HTML. No extra JS. Zero impact on editor performance.
         ────────────────────────────────────────────────────────────────────── */}
      <motion.div
        animate={{
          height: isSeoUnlocked ? "auto" : 0,
          opacity: isSeoUnlocked ? 1 : 0,
        }}
        initial={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: "hidden" }}
      >
        <NotepadSeoContent seo={seo} onScrolledPastEditor={setScrolledPastEditor} />
      </motion.div>

      {/* Floating Scroll Gate Indicator */}
      <AnimatePresence>
        {isNearBottom && !isSeoUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: effectiveDark ? "rgba(15, 17, 22, 0.82)" : "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1px solid ${effectiveDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
              borderRadius: 14,
              padding: "10px 16px 10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              zIndex: 100,
              boxShadow: `0 12px 40px ${effectiveDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.12)"}`,
              width: "max-content",
              maxWidth: "90vw",
            }}
          >
            <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke={effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke={surfAccent}
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={(2 * Math.PI * 14) - (scrollProgress / 100) * (2 * Math.PI * 14)}
                  strokeLinecap="round"
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "18px 18px",
                    transition: "stroke-dashoffset 80ms linear",
                  }}
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {scrollProgress >= 100 ? (
                  <Check size={14} style={{ color: surfAccent }} />
                ) : (
                  <ChevronDown size={14} style={{ color: surfAccent }} />
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "#FFFFFF" : "#1A1A1A", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em" }}>
                Scroll down to unlock guide
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: effectiveDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)", fontFamily: "Inter, sans-serif" }}>
                  Accidental scroll protection
                </span>
                <span style={{ color: effectiveDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)", fontSize: 10 }}>•</span>
                <button
                  onClick={() => {
                    setIsSeoUnlocked(true);
                    setIsNearBottom(false);
                    setScrollProgress(100);
                    scrollProgressRef.current = 100;
                    setTimeout(() => {
                      window.scrollBy({ top: 180, behavior: "smooth" });
                      toast.success("Documentation unlocked", {
                        description: "You can now scroll down to read the guide.",
                      });
                    }, 100);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: surfAccent,
                    fontSize: 11,
                    fontWeight: 500,
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Show guide
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Below-the-fold SEO + AI-citation content ─────────────────────────────────
// Memoized so editor keystrokes (which re-render <Notepad> frequently) don't
// reconcile the entire static marketing subtree. The `seo` prop is itself
// memoized per-route, so this trivially short-circuits.
const NotepadSeoContent = memo(function NotepadSeoContent({
  seo,
  onScrolledPastEditor,
}: {
  seo: NotepadSeo;
  /** Reports whether the SEO article has scrolled into view (true once the
   *  user is past the editor). The parent uses this to hide its bottom
   *  status bar so it doesn't overlap the SEO content. */
  onScrolledPastEditor?: (v: boolean) => void;
}) {
  // Sentinel sits at the very top of the SEO <article>. When it scrolls
  // above the viewport (top < 0 and not intersecting), we know the user
  // has entered the SEO content and the parent should hide its status bar.
  const seoSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onScrolledPastEditor) return;
    const el = seoSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        onScrolledPastEditor(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onScrolledPastEditor]);
  return (
    <>
      <div ref={seoSentinelRef} aria-hidden="true" style={{ height: 1, width: "100%" }} />
      <ToolSEOArticle
        eyebrow="About this tool"
        h1={seo.h1}
        intro={seo.intro}
        metaLine={
          <>
            Updated {NOTEPAD_LAST_UPDATED_HUMAN} · By{" "}
            <Link href="/" className="tool-footer-link" style={{ color: "var(--t3)" }}>
              Ankit Jaiswal
            </Link>
          </>
        }
      >
        {/* ── WHAT IS (definition) ── */}
        <ToolSection>
          <SectionHeading kicker="The basics" title={seo.whatIsTitle} />
          <div className="tool-prose">
            {seo.whatIsBody.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </ToolSection>

        {/* ── FEATURE CARDS ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="Features" title="Everything you need, nothing you don't" />
          <ToolFeatureGrid items={NOTEPAD_FEATURES} />
        </ToolSection>

        {/* ── HOW TO USE (numbered steps) ── */}
        <ToolSection>
          <SectionHeading kicker="Step by step" title={seo.howToTitle} />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "var(--t2)",
            margin: "-12px 0 32px",
          }}>
            {seo.howToIntro}
          </p>
          <ToolHowToSteps steps={seo.howToSteps} />
        </ToolSection>

        {/* ── KEYBOARD SHORTCUTS ── */}
        <ToolSection>
          <SectionHeading kicker="Reference" title="Keyboard shortcuts" />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "var(--t2)",
            margin: "-12px 0 32px",
          }}>
            Every formatting action has a shortcut. Mac uses <kbd className="tool-kbd">Cmd</kbd>; Windows and Linux use <kbd className="tool-kbd">Ctrl</kbd>.
          </p>
          {NOTEPAD_SHORTCUTS.map((group) => (
            <div key={group.group} style={{ marginBottom: 32 }}>
              <div className="tool-shortcut-group-title" style={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--t3)",
                margin: "32px 0 12px",
              }}>{group.group}</div>
              <div className="tool-table-wrap">
                <table className="tool-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45%" }}>Shortcut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r) => (
                      <tr key={r.keys}>
                        <td><kbd className="tool-kbd">{r.keys}</kbd></td>
                        <td>{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </ToolSection>

        {/* ── USE CASES ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="Use cases" title="Built for the way you actually work" />
          <ToolFeatureGrid items={NOTEPAD_USE_CASES} />
        </ToolSection>

        {/* ── COMPARISON TABLE ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="How it compares" title="This notepad vs other popular options" />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "var(--t2)",
            margin: "-12px 0 32px", maxWidth: 700,
          }}>
            A quick side-by-side with the most common alternatives — Notepad++ on Windows, Google Docs in the browser, and Apple Notes on Mac and iOS.
          </p>
          <div className="tool-table-wrap" style={{ overflowX: "auto" }}>
            <table className="tool-table tool-compare-table">
              <thead>
                <tr>
                  {NOTEPAD_COMPARISON_HEADERS.map((h, i) => (
                    <th key={h} style={i === 0 ? { width: "26%" } : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTEPAD_COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, ci) => {
                      const isYes = ci > 0 && /^Yes(\b|$)/.test(cell);
                      const isNo  = ci > 0 && /^No(\b|$)/.test(cell);
                      return (
                        <td key={ci} className={isYes ? "tool-compare-yes" : isNo ? "tool-compare-no" : undefined}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ToolSection>

        {/* ── TIPS & TRICKS ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="Tips & tricks" title="Get more out of the editor" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {NOTEPAD_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.title} className="tool-tip" style={{ display: "flex", gap: 16, padding: 22 }}>
                  <span className="tool-icon" style={{ marginBottom: 0 }}>
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 style={{
                      fontFamily: tokens.font.display, fontWeight: 700,
                      fontSize: 15, color: tokens.text.primary, margin: "4px 0 6px",
                      letterSpacing: "-0.005em",
                    }}>{tip.title}</h3>
                    <p style={{
                      fontSize: 13.5, lineHeight: 1.65, color: "var(--t2)",
                      margin: 0,
                    }}>{tip.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ToolSection>

        {/* ── PRIVACY EXPLAINER ── */}
        <ToolSection width="grid">
          <ToolPrivacyBand
            heading="Your notes never leave your device"
            body="This editor stores everything in your browser's local storage. There's no server-side database, no analytics inside the editor, no third-party scripts reading your text. When you export to PDF, DOCX, Markdown or HTML, the conversion runs in your browser and the file downloads directly to your device — your text is never uploaded. Clearing your browser data clears your notes; nothing is recoverable from anywhere else, because nothing was ever sent anywhere else."
          />
        </ToolSection>

        {/* ── FAQ ── */}
        <ToolSection>
          <SectionHeading kicker="FAQ" title="Frequently asked questions" />
          <ToolFAQ items={NOTEPAD_FAQS} />
        </ToolSection>

        {/* ── AUTHOR CARD ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="About the maker" title="Who built this" />
          <ToolAuthorCard
            bio={
              <>
                I build fast, useful web tools and help businesses become impossible to ignore in the age of AI search. This notepad is the one I use every day.
              </>
            }
          />
        </ToolSection>

        {/* ── RELATED TOOLS ── */}
        <ToolSection width="grid">
          <SectionHeading kicker="More tools" title="Other free, privacy-first tools" />
          <ToolRelatedTools items={RELATED_TOOLS} />
        </ToolSection>

        {/* ── INLINE FEEDBACK CARD ── */}
        <ToolSection width="grid">
          <FeedbackInlineCard />
        </ToolSection>
      </ToolSEOArticle>

      {/* ── FOOTER BAND ── */}
      <ToolFooter />
    </>
  );
});

