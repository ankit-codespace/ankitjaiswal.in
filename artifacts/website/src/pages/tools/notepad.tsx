import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Link, useLocation } from "wouter";
import { Seo } from "@/components/Seo";
import { SITE, PERSON_SAME_AS } from "@/lib/site";
import { useFeedback, FeedbackInlineCard } from "@/components/FeedbackWidget";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TipTapImage from "@tiptap/extension-image";

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
  { label: "Slate",    bg: "#0F1115", text: "#E5E1D8", accent: "#10B981", dark: true },
  // Default for OS light mode — warm cream, indigo accent
  { label: "Paper",    bg: "#FAF8F2", text: "#1F1B16", accent: "#5D4FB8", dark: false },
  // True OLED black for night-mode purists
  { label: "Midnight", bg: "#000000", text: "#D4D0C8", accent: "#A78BFA", dark: true },
  // Warm sepia for long reading sessions
  { label: "Sepia",    bg: "#F4ECD8", text: "#3D2B1F", accent: "#8B5E2B", dark: false },
  // Cool light grey, Linear-style
  { label: "Mist",     bg: "#F1F3F5", text: "#1F2937", accent: "#3B82F6", dark: false },
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
const NOTEPAD_USE_CASES: { icon: typeof GraduationCap; title: string; copy: string }[] = [
  { icon: GraduationCap, title: "For students",      copy: "Take lecture notes that survive browser refreshes and tab closes — autosave runs on every keystroke. Paste screenshots from slides, diagrams from textbooks, or photos of the whiteboard directly into your notes. When the semester ends, export each subject as a clean PDF you can submit, print, or archive. No app to install on a school laptop, no Google account to sign into on a shared computer." },
  { icon: PenLine,       title: "For writers",       copy: "Draft articles, essays and short fiction in a distraction-free editor. Toggle focus mode to fade everything except the paragraph you're working on. The word counter updates live, headings collapse the document into an outline, and when the draft is ready you ship clean Markdown or HTML straight into your blog, Substack, Ghost or any CMS — no copy-paste cleanup required." },
  { icon: Code2,         title: "For developers",    copy: "Keep code snippets in syntax-aware code blocks that preserve indentation. Drop screenshots of stack traces, terminal output or Figma designs into the same document. Sketch out architecture decisions, write up bugs, draft pull request descriptions, then export everything to Markdown for GitHub, Linear, Jira or Notion. Stays private — no risk of a code snippet ending up in someone's training data." },
  { icon: Briefcase,     title: "For professionals", copy: "Capture meeting notes during a call without your client wondering what app you're using. Paste screenshots from a deck, a Figma board, or a spreadsheet. Build a quick brief, an internal memo, or a proposal with proper formatting and export to PDF or DOCX in one click. Everything stays on your laptop — useful when you're working with confidential or pre-release information." },
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

  const words = editor?.storage.characterCount?.words() ?? 0;
  const chars = editor?.storage.characterCount?.characters() ?? 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));

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

  // ── Toolbar helpers ────────────────────────────────────────────────────────
  const tb = (active?: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
    background: active ? "rgba(255,255,255,0.13)" : "transparent",
    color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
    transition: "background 0.12s, color 0.12s", flexShrink: 0,
  });

  const sep = <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.09)", margin: "0 8px", flexShrink: 0 }} />;

  const surfBg  = settings.bgColor   || (settings.lightSurface ? "#FAF8F2" : "#0F1115");
  const surfTxt = settings.textColor || (settings.lightSurface ? "#1F1B16" : "#E5E1D8");
  // Derive light/dark for marker colors etc. based on effective bg
  const effectiveDark = settings.bgColor ? !isLightHex(settings.bgColor) : !settings.lightSurface;
  // Look up the accent for the current theme; fall back per light/dark.
  const surfAccent = (() => {
    const match = THEMES.find((t) => t.bg === settings.bgColor && t.text === settings.textColor);
    if (match) return match.accent;
    return effectiveDark ? "#10B981" : "#5D4FB8";
  })();


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
    <div style={{ background: "#0A0C10", minHeight: "100vh" }}>
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
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#0D0F14", borderBottom: "1px solid rgba(255,255,255,0.06)", height: 48, display: "flex", alignItems: "center" }}>

        {/* ── LEFT ZONE: scrollable formatting tools ── */}
        <div className="notepad-toolbar" style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 6px 0 10px", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>

          {/* Back */}
          <Link href="/tools" className="notepad-back-link" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, color: "rgba(255,255,255,0.48)", textDecoration: "none", flexShrink: 0 }} title="Back to Tools">
            <ArrowLeft size={15} />
          </Link>
          <span className="notepad-back-link">{sep}</span>

          {/* Doc title — hidden on mobile (rename via documents menu instead) */}
          <input
            ref={titleInputRef}
            className="notepad-doc-title"
            value={activeDoc.title}
            onChange={(e) => updateTitle(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.90)", fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, width: 130, flexShrink: 0, letterSpacing: "-0.01em" }}
            spellCheck={false}
            title="Document title"
          />

          {/* Docs menu trigger */}
          <button
            ref={docMenuBtnRef}
            style={{ ...tb(), width: "auto", padding: "0 7px", gap: 4, flexShrink: 0 }}
            onClick={() => {
              const r = docMenuBtnRef.current?.getBoundingClientRect();
              if (r) setDocMenuLeft(r.left);
              setShowDocMenu(!showDocMenu);
              setShowMoreMenu(false);
              cancelConfirm();
            }}
            title="All documents"
          >
            <FileText size={13} />
            <ChevronDown size={11} />
          </button>
          {sep}

          {/* FORMAT — always visible core */}
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

          {/* HISTORY */}
          <button style={{ ...tb(), opacity: editor?.can().undo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
          <button style={{ ...tb(), opacity: editor?.can().redo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)"><Redo2 size={13} /></button>
        </div>

        {/* ── RIGHT ZONE: fixed actions — always visible, never scrolls off ── */}
        <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 10px 0 6px", gap: 2, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          {/* MORE — Lists / Insert (image, link, divider) / Colors. Lives in the
              fixed right zone so mobile users can always reach Insert Image. */}
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

          {/* DRIVE */}
          {GCID && (
            <button style={tb(driveConnected)} onClick={driveConnected ? () => syncToDrive() : connectDrive} title={driveConnected ? "Sync to Drive now" : "Connect Google Drive"}>
              {driveSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : driveConnected ? <Cloud size={14} /> : <CloudOff size={14} />}
            </button>
          )}

          {sep}

          {/* SETTINGS */}
          <button style={tb(showSettings)} onClick={() => { setShowSettings(!showSettings); setShowExportMenu(false); setShowMoreMenu(false); }} title="Settings" aria-label="Editor settings">
            <Settings size={14} />
          </button>

          {/* FEEDBACK — calm, always-present button so users can flag bugs or
              request features without ever leaving the editor. Replaced the
              old global floating widget which felt SaaS-y and intrusive. */}
          <button
            style={tb()}
            onClick={openFeedback}
            title="Send feedback or report a bug"
            aria-label="Send feedback"
          >
            <MessageSquarePlus size={14} />
          </button>

          {/* COPY — copies the active note (HTML + plain text + images) to clipboard.
              Same responsive collapse pattern as Export: label hides on narrow widths. */}
          <button
            className="notepad-export-btn notepad-copy-btn"
            style={{
              ...tb(),
              width: "auto",
              padding: "0 12px",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: copyState === "copied"
                ? "rgba(140, 230, 170, 0.95)"
                : copyState === "error"
                ? "rgba(255, 150, 150, 0.95)"
                : "rgba(255,255,255,0.75)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 7,
              marginLeft: 4,
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
              ? <Check size={13} />
              : <CopyIcon size={13} />}
            <span className="notepad-export-label" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>
              {copyState === "copied" ? "Copied" : copyState === "error" ? "Failed" : "Copy"}
            </span>
          </button>

          {/* EXPORT — collapses to icon-only on mobile */}
          <button
            className="notepad-export-btn"
            style={{ ...tb(), width: "auto", padding: "0 12px", gap: 6, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.07)", borderRadius: 7, marginLeft: 4, flexShrink: 0 }}
            onClick={() => { setShowExportMenu(!showExportMenu); setShowSettings(false); setShowMoreMenu(false); }}
            title="Export (Ctrl+D for smart export)"
          >
            {exportingPdf ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={13} />}
            <span className="notepad-export-label" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Export</span>
            <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* ── MORE MENU PANEL — position: fixed, escapes all overflow contexts ── */}
      {showMoreMenu && (
        <div
          style={{
            position: "fixed",
            top: 52,
            left: (() => { const r = moreMenuBtnRef.current?.getBoundingClientRect(); return r ? Math.min(r.left, window.innerWidth - 280) : 120; })(),
            background: "#171B24",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            width: 260,
            padding: "10px",
            zIndex: 200,
            boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
          }}
        >
          {/* Section: Lists */}
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Lists</div>
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
        </div>
      )}

        {/* ── DOC MENU PANEL — position: fixed so it escapes the overflow context ── */}
        {showDocMenu && (
          <div style={{ position: "fixed", top: 50, left: docMenuLeft, background: "#171B24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, minWidth: 240, padding: "6px 0", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.65)" }}>
            {docs.map((d) => {
              const armed = confirmDeleteId === d.id;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", padding: "7px 12px",
                    cursor: "pointer",
                    background: armed
                      ? "rgba(239,68,68,0.06)"
                      : d.id === activeId ? "rgba(255,255,255,0.04)" : "transparent",
                    transition: "background 140ms ease",
                  }}
                >
                  <span
                    style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={() => { if (!armed) { setActiveId(d.id); setShowDocMenu(false); } }}
                  >
                    {d.title || "Untitled"}
                  </span>
                  {!armed && d.id === activeId && (
                    <Check size={12} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0 }} />
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
                            background: "#E5484D", color: "#fff",
                            border: "1px solid #E5484D", cursor: "pointer",
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
                            background: "transparent", color: "rgba(255,255,255,0.55)",
                            border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer",
                          }}
                          title="Cancel"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        style={{ ...tb(), width: 20, height: 20, marginLeft: 4, opacity: 0.55, color: "rgba(255,255,255,0.6)" }}
                        onClick={(e) => { e.stopPropagation(); armConfirm(d.id, false); }}
                        onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "1"; el.style.color = "#FCA5A5"; el.style.background = "rgba(239,68,68,0.14)"; }}
                        onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "0.55"; el.style.color = "rgba(255,255,255,0.6)"; el.style.background = "transparent"; }}
                        title="Delete note"
                      >
                        <X size={10} />
                      </button>
                    )
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 12 }} onClick={createDoc}>
              <Plus size={12} /> New document
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
            {confirmClearAll ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(229,72,77,0.08)" }}>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter,sans-serif", flex: 1 }}>
                  {docs.length === 1 ? "Delete this note?" : `Delete all ${docs.length} notes?`}
                </span>
                <button
                  autoFocus
                  onClick={(e) => { e.stopPropagation(); clearAllDocs(); }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 999,
                    background: "#E5484D", color: "#fff",
                    border: "1px solid #E5484D", cursor: "pointer",
                    fontFamily: "Inter,sans-serif", letterSpacing: "0.01em",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >{docs.length === 1 ? "Delete" : "Delete all"}</button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelConfirm(); }}
                  style={{
                    fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 500,
                    padding: "3px 9px", borderRadius: 999,
                    background: "transparent", color: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer",
                  }}
                  title="Cancel"
                >No</button>
              </div>
            ) : (
              <button
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 11.5, fontFamily: "Inter,sans-serif" }}
                onClick={() => armConfirm(null, true)}
                title={docs.length === 1 ? "Clear this note" : "Clear all notes"}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(252,165,165,0.9)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
              >
                <Trash2 size={11} /> {docs.length === 1 ? "Clear note" : "Clear all"}
              </button>
            )}
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
              position: "fixed", top: 52, right: 10,
              background: "#171B24", border: "0.5px solid rgba(255,255,255,0.06)",
              borderRadius: 12, width: 316, padding: "14px",
              zIndex: 200,
              boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
              maxHeight: "calc(100vh - 58px)",
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "thin" as React.CSSProperties["scrollbarWidth"],
              scrollbarColor: "rgba(255,255,255,0.18) transparent",
              overscrollBehavior: "contain",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Editor Settings</span>
              <button style={{ ...tb(), width: 24, height: 24 }} onClick={() => setShowSettings(false)}><X size={12} /></button>
            </div>

            {/* Font size — preset pills + inline stepper on a single row */}
            <div style={{ paddingTop: 14, marginBottom: 4 }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Font size</div>
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
                          borderColor: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)",
                          background: active ? "rgba(255,255,255,0.93)" : "transparent",
                          color: active ? "#0A0C10" : "rgba(255,255,255,0.4)",
                          fontSize: 12, lineHeight: 1, cursor: "pointer", fontFamily: "Inter, sans-serif",
                          transition: "all 0.12s",
                        }}
                      >{s}</button>
                    );
                  })}
                </div>
                <div aria-hidden style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden", flexShrink: 0, height: 26, boxSizing: "border-box" }}>
                  <button onClick={() => updateSetting("fontSize", Math.max(10, settings.fontSize - 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
                  <input type="number" min={10} max={72} step={1} value={settings.fontSize} onChange={(e) => { const v = Math.min(72, Math.max(10, parseInt(e.target.value) || 10)); updateSetting("fontSize", v); }} style={{ width: 32, height: "100%", background: "transparent", border: "none", outline: "none", textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter,sans-serif", padding: 0 } as React.CSSProperties} />
                  <button onClick={() => updateSetting("fontSize", Math.min(72, settings.fontSize + 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
                </div>
              </div>
            </div>

            {/* Writing width */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Writing width</div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["wide", "focused", "narrow"] as const).map((w) => pill(settings.writingWidth === w, () => updateSetting("writingWidth", w), w.charAt(0).toUpperCase() + w.slice(1)))}
              </div>
            </div>

            {/* Line height */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Line height</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ v: 1.5, l: "Compact" }, { v: 2.1, l: "Normal" }, { v: 2.6, l: "Relaxed" }].map(({ v, l }) => pill(settings.lineHeight === v, () => updateSetting("lineHeight", v), l))}
              </div>
            </div>

            {/* Theme presets — all 5 swatches in ONE row at 28×28px */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Themes</div>
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
                        outline: isActive ? "2px solid rgba(255,255,255,0.72)" : "2px solid rgba(255,255,255,0.1)",
                        outlineOffset: 1,
                      }}
                    >
                      <span style={{ position: "absolute", bottom: 3, right: 3, width: 7, height: 7, borderRadius: "50%", background: t.text, display: "block" }} />
                      {isActive && <Check size={9} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.9)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom colours */}
            <div style={{ paddingTop: 22, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Custom colours</div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 7, padding: "5px 9px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: surfBg, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <input type="color" value={surfBg.startsWith("#") ? surfBg : "#111318"} onChange={(e) => { updateSetting("bgColor", e.target.value); updateSetting("lightSurface", isLightHex(e.target.value)); }} style={{ position: "absolute", opacity: 0, width: "200%", height: "200%", top: "-50%", left: "-50%", cursor: "pointer" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif" }}>Background</span>
                </label>
                <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 7, padding: "5px 9px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: surfTxt.startsWith("rgba") ? "#c9d1d9" : surfTxt, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <input type="color" value={surfTxt.startsWith("#") ? surfTxt : "#c9d1d9"} onChange={(e) => updateSetting("textColor", e.target.value)} style={{ position: "absolute", opacity: 0, width: "200%", height: "200%", top: "-50%", left: "-50%", cursor: "pointer" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif" }}>Text</span>
                </label>
              </div>
            </div>

            {/* Binary toggles arranged in a 2×2 grid — visually grouped, with
                generous row spacing so each setting reads as its own block. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 22, paddingTop: 22, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Lines</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.ruledLines, () => updateSetting("ruledLines", false), "None")}
                  {pill(settings.ruledLines, () => updateSetting("ruledLines", true), "Ruled")}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Underline typos as you write">Spell check</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(settings.spellCheck, () => updateSetting("spellCheck", true), "On")}
                  {pill(!settings.spellCheck, () => updateSetting("spellCheck", false), "Off")}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Subtle paper-fiber texture overlay on the canvas">Paper grain</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.paperGrain, () => updateSetting("paperGrain", false), "Off")}
                  {pill(settings.paperGrain, () => updateSetting("paperGrain", true), "On")}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }} title="Soft hairline frame around inline images">Image border</div>
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
          <div style={{ position: "fixed", top: 52, right: 10, background: "#171B24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, minWidth: 216, padding: "6px 0", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)" }}>
            {[
              { label: "Smart Export", sub: "Ctrl+D · auto-detect format", fn: handleSmartExport, accent: true },
              null,
              { label: "Plain Text (.txt)", sub: "No formatting preserved", fn: exportTxt, accent: false },
              { label: "Markdown (.md)", sub: "Headings, lists, bold, links", fn: exportMd, accent: false },
              { label: "PDF (.pdf)", sub: "Includes images & layout", fn: exportPdf, accent: false },
              { label: "HTML (.html)", sub: "Full web-ready format", fn: exportHtml, accent: false },
            ].map((item, i) =>
              item === null ? (
                <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
              ) : (
                <button key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }} onClick={item.fn}>
                  <span style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, fontWeight: 400, fontFamily: "Inter,sans-serif" }}>{item.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1, fontFamily: "Inter,sans-serif" }}>{item.sub}</span>
                </button>
              )
            )}
          </div>
        )}

      {/* ── FIND / REPLACE BAR ─────────────────────────────────────────────── */}
      {showFind && (
        <div style={{ background: "#0D0F14", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 10px" }}>
          {/* Find row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: showReplace ? 4 : 0 }}>
            {/* Toggle replace */}
            <button
              style={{ ...tb(), color: showReplace ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}
              onClick={() => { setShowReplace(!showReplace); if (!showReplace) setTimeout(() => replaceInputRef.current?.focus(), 50); }}
              title={showReplace ? "Collapse replace (Ctrl+H)" : "Expand replace (Ctrl+H)"}
            >
              <ChevronRight size={12} style={{ transform: showReplace ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            <Search size={12} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
            <input
              ref={findInputRef}
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); (window as any).find(findText, false, e.shiftKey, true); }
                if (e.key === "Escape") { setShowFind(false); setShowReplace(false); }
              }}
              placeholder="Find… (Enter ↓  Shift+Enter ↑)"
              style={{ background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13, flex: 1, fontFamily: "Inter,sans-serif", minWidth: 0 }}
            />
            <button style={{ ...tb() }} onClick={() => { setShowFind(false); setShowReplace(false); }} title="Close (Esc)"><X size={12} /></button>
          </div>
          {/* Replace row */}
          {showReplace && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Spacer matching the chevron toggle width */}
              <div style={{ width: 28, flexShrink: 0 }} />
              <ArrowLeft size={12} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0, transform: "rotate(180deg)" }} />
              <input
                ref={replaceInputRef}
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); doReplace(false); }
                  if (e.key === "Escape") { setShowFind(false); setShowReplace(false); }
                }}
                placeholder="Replace with…"
                style={{ background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13, flex: 1, fontFamily: "Inter,sans-serif", minWidth: 0 }}
              />
              <button
                style={{ ...tb(), padding: "0 10px", width: "auto", fontSize: 11, fontFamily: "Inter,sans-serif", color: "rgba(255,255,255,0.6)", letterSpacing: "0.01em" }}
                onClick={() => doReplace(false)} title="Replace next (Enter)"
              >
                Replace
              </button>
              <button
                style={{ ...tb(), padding: "0 10px", width: "auto", fontSize: 11, fontFamily: "Inter,sans-serif", color: "rgba(255,255,255,0.6)", letterSpacing: "0.01em" }}
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
          minHeight: "calc(100vh - 48px - 38px)",
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

      {/* ── STATUS BAR ──────────────────────────────────────────────────────── */}
      {/* Visibility tied to scroll position: visible while the user is in the
          editor area, slides out when they've scrolled into the SEO content
          below. pointer-events also disabled when hidden so it doesn't block
          clicks on whatever is now under the bottom of the screen. */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "#0D0F14",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          height: 38,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          transform: scrolledPastEditor ? "translateY(100%)" : "translateY(0)",
          opacity: scrolledPastEditor ? 0 : 1,
          pointerEvents: scrolledPastEditor ? "none" : "auto",
          transition: "transform .28s cubic-bezier(0.22,1,0.36,1), opacity .22s ease",
        }}
        aria-hidden={scrolledPastEditor}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif" }}>
          <span>{words.toLocaleString()} {words === 1 ? "word" : "words"}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{chars.toLocaleString()} chars</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />~{readingTime} min read</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: saveStatus === "unsaved" ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.22)" }}>
            {saveStatus === "unsaved" ? "Saving…" : savedAgo}
          </span>
          {driveConnected && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: 3 }}>
                {driveSaving ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Cloud size={10} />}Drive
              </span>
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />

        {/* ── Keyboard shortcuts panel ───────────────────────────────────────── */}
        {showShortcuts && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", bottom: 46, right: 10, zIndex: 400,
              background: "#13161F",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12,
              padding: "16px 20px",
              boxShadow: "0 -4px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
              width: 400,
              backdropFilter: "blur(18px)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)", fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2, display: "flex" }}><X size={12} /></button>
            </div>

            {/* Two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {[
                {
                  group: "Formatting",
                  items: [
                    { key: "Ctrl+B", label: "Bold" },
                    { key: "Ctrl+I", label: "Italic" },
                    { key: "Ctrl+U", label: "Underline" },
                    { key: "Ctrl+K", label: "Insert link" },
                    { key: "Ctrl+Shift+H", label: "Highlight" },
                  ],
                },
                {
                  group: "Headings",
                  items: [
                    { key: "Ctrl+Alt+1", label: "Heading 1" },
                    { key: "Ctrl+Alt+2", label: "Heading 2" },
                    { key: "Ctrl+Alt+3", label: "Heading 3" },
                  ],
                },
                {
                  group: "Document",
                  items: [
                    { key: "Ctrl+Z", label: "Undo" },
                    { key: "Ctrl+Y", label: "Redo" },
                    { key: "Ctrl+F", label: "Find" },
                    { key: "Ctrl+H", label: "Find & Replace" },
                    { key: "Ctrl+D", label: "Smart export" },
                    { key: "Ctrl+\\", label: "Focus mode" },
                  ],
                },
              ].map((section) => (
                <div key={section.group} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: "Inter,sans-serif", marginBottom: 7 }}>{section.group}</div>
                  {section.items.map(({ key, label }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", fontFamily: "Inter,sans-serif" }}>{label}</span>
                      <div style={{ display: "flex", gap: 3 }}>
                        {key.split("+").map((k) => (
                          <kbd key={k} style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)",
                            borderBottom: "2px solid rgba(255,255,255,0.07)",
                            borderRadius: 4, padding: "2px 5px", fontSize: 10,
                            color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif",
                            minWidth: 20, lineHeight: 1.4,
                          }}>{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Keyboard icon trigger — hidden on mobile (no physical keyboard) */}
        <button
          className="notepad-shortcuts-btn"
          onClick={(e) => { e.stopPropagation(); setShowShortcuts((v) => !v); }}
          title="Keyboard shortcuts"
          style={{
            background: showShortcuts ? "rgba(16,185,129,0.12)" : "transparent",
            border: "1px solid",
            borderColor: showShortcuts ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all 0.15s",
          }}
        >
          {/* Custom inline keyboard SVG */}
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none" style={{ color: showShortcuts ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.32)", transition: "color 0.15s" }}>
            <rect x="0.75" y="0.75" width="13.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="2.5" y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="5"   y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="7.5" y="2.5" width="1.6" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="10"  y="2.5" width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="2.5" y="5"   width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="5.5" y="5"   width="4"   height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="10"  y="5"   width="2.5" height="1.4" rx="0.5" fill="currentColor" opacity="0.7" />
            <rect x="3.8" y="7.2" width="7.4" height="1.2" rx="0.5" fill="currentColor" opacity="0.5" />
          </svg>
          <span style={{ fontSize: 11, color: showShortcuts ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", transition: "color 0.15s", letterSpacing: "0.01em" }}>Shortcuts</span>
        </button>
      </div>

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
      <NotepadSeoContent seo={seo} onScrolledPastEditor={setScrolledPastEditor} />
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
      <style>{`
        .nseo-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 22px 22px 20px;
          transition: border-color .2s ease, background .2s ease, transform .2s ease;
        }
        .nseo-card:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.035);
        }
        .nseo-icon {
          width: 38px; height: 38px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          color: #fff;
          margin-bottom: 16px;
        }
        .nseo-faq {
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .nseo-faq:first-child { border-top: 1px solid rgba(255,255,255,0.07); }
        .nseo-faq summary {
          list-style: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
          padding: 20px 4px;
          font-family: 'Sora', sans-serif;
          font-size: 15.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.92);
          outline: none;
          user-select: none;
        }
        .nseo-faq summary::-webkit-details-marker { display: none; }
        .nseo-faq summary:hover { color: #fff; }
        .nseo-faq summary:focus-visible {
          color: #fff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
          border-radius: 6px;
        }
        .nseo-related:focus-visible {
          outline: none;
          border-color: rgba(255,255,255,0.32);
          box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
        }
        .nseo-footer-link:focus-visible {
          outline: none;
          color: #fff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
          border-radius: 4px;
        }
        .nseo-faq .nseo-faq-chevron {
          flex-shrink: 0;
          transition: transform .2s ease;
          color: rgba(255,255,255,0.4);
        }
        .nseo-faq[open] .nseo-faq-chevron { transform: rotate(180deg); color: rgba(255,255,255,0.7); }
        .nseo-faq-answer {
          padding: 0 4px 22px;
          font-size: 14.5px;
          line-height: 1.75;
          color: rgba(255,255,255,0.62);
          max-width: 680px;
        }
        .nseo-related {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          text-decoration: none;
          color: #fff;
          transition: border-color .15s ease, background .15s ease, transform .15s ease;
        }
        .nseo-related:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.045);
          transform: translateY(-1px);
        }
        .nseo-related .nseo-related-arrow {
          color: rgba(255,255,255,0.35);
          transition: color .15s ease, transform .15s ease;
        }
        .nseo-related:hover .nseo-related-arrow {
          color: #fff;
          transform: translate(2px, -2px);
        }
        .nseo-footer-link {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          transition: color .15s ease;
        }
        .nseo-footer-link:hover { color: #fff; }

        /* Social icon links — square hit target, subtle ring on hover/focus
           to feel like a real interactive control without breaking the
           minimal, monochrome footer aesthetic. */
        .nseo-social-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          color: rgba(255,255,255,0.55);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          transition: color .18s ease, background .18s ease, border-color .18s ease, transform .18s ease;
        }
        .nseo-social-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }
        .nseo-social-link:focus-visible {
          outline: 2px solid rgba(255,255,255,0.55);
          outline-offset: 2px;
          color: #fff;
        }

        /* Author card — premium byline that pairs with Person JSON-LD */
        .nseo-author-card {
          position: relative;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.08) 100%);
          overflow: hidden;
        }
        .nseo-author-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: radial-gradient(120% 100% at 0% 0%, rgba(120, 130, 255, 0.10), transparent 60%);
          pointer-events: none;
        }
        .nseo-author-card-inner {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 24px;
          padding: 28px 30px;
          border-radius: 19px;
          background: linear-gradient(180deg, #0E1117 0%, #0A0C10 100%);
        }
        @media (max-width: 540px) {
          .nseo-author-card-inner {
            padding: 22px;
            gap: 18px;
          }
        }
        .nseo-author-avatar {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #2C2CF3 0%, #1A1AC4 100%);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.10),
            0 12px 28px -10px rgba(0,0,0,0.55);
        }
        .nseo-author-avatar img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .nseo-author-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .nseo-author-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }
        .nseo-author-cta:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.24);
          transform: translateY(-1px);
        }
        .nseo-author-cta:focus-visible {
          outline: 2px solid rgba(255,255,255,0.55);
          outline-offset: 2px;
        }
        .nseo-author-socials {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Long-form prose */
        .nseo-prose p {
          font-size: 16px;
          line-height: 1.8;
          color: rgba(255,255,255,0.7);
          margin: 0 0 22px;
        }
        .nseo-prose p:last-child { margin-bottom: 0; }
        .nseo-prose strong { color: #fff; font-weight: 600; }

        /* Numbered "how to" steps */
        .nseo-step {
          display: flex;
          gap: 18px;
          padding: 20px 22px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          transition: border-color .2s ease, background .2s ease;
        }
        .nseo-step:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.035);
        }
        .nseo-step-num {
          flex-shrink: 0;
          width: 30px; height: 30px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          font-family: 'Sora', sans-serif;
          font-size: 13px; font-weight: 600;
          color: #fff;
        }
        .nseo-step-title {
          font-family: 'Sora', sans-serif;
          font-weight: 700; font-size: 15.5px;
          color: #fff; margin: 4px 0 6px;
          letter-spacing: -0.005em;
        }
        .nseo-step-body {
          font-size: 14px;
          line-height: 1.65;
          color: rgba(255,255,255,0.62);
          margin: 0;
        }

        /* Keyboard shortcuts + comparison tables */
        .nseo-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13.5px;
          color: rgba(255,255,255,0.72);
        }
        .nseo-table th {
          text-align: left;
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.025);
        }
        .nseo-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          line-height: 1.55;
        }
        .nseo-table tr:last-child td { border-bottom: none; }
        .nseo-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
        .nseo-table-wrap {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,0.015);
        }
        .nseo-kbd {
          display: inline-block;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12.5px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          color: #fff;
          white-space: nowrap;
        }
        .nseo-shortcut-group-title {
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin: 32px 0 12px;
        }
        .nseo-shortcut-group-title:first-child { margin-top: 0; }
        .nseo-compare-table-wrap { overflow-x: auto; }
        .nseo-compare-table th + th,
        .nseo-compare-table td + td { text-align: center; }
        .nseo-compare-table td:first-child { color: #fff; font-weight: 500; }
        .nseo-compare-yes { color: rgba(140, 230, 170, 0.95); font-weight: 500; }
        .nseo-compare-no  { color: rgba(255,255,255,0.4); }

        /* Tips */
        .nseo-tip {
          display: flex; gap: 16px;
          padding: 22px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          transition: border-color .2s ease, background .2s ease;
        }
        .nseo-tip:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.035);
        }

        /* Privacy band */
        .nseo-privacy {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 36px 40px;
          display: flex; gap: 24px; align-items: flex-start;
        }
        @media (max-width: 640px) {
          .nseo-privacy { flex-direction: column; padding: 28px 24px; }
          .nseo-step { padding: 18px; gap: 14px; }
          .nseo-table th, .nseo-table td { padding: 11px 12px; font-size: 12.5px; }
        }
      `}</style>

      <article
        className="notepad-seo"
        style={{
          background: "#0A0C10",
          color: "rgba(255,255,255,0.78)",
          padding: "120px 24px 0",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Sentinel for the bottom status bar — when this scrolls above the
            viewport the IntersectionObserver hides the editor's status strip.
            Sits inline at 1px tall at the very top of the SEO article so it
            never visually disrupts the layout. */}
        <div ref={seoSentinelRef} aria-hidden="true" style={{ height: 1, width: "100%" }} />

        {/* ── HERO STRIP ── */}
        <header style={{ maxWidth: 760, margin: "0 auto 96px", textAlign: "center" }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.38)", marginBottom: 22, fontWeight: 500,
          }}>
            About this tool
          </p>
          <h1 style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800,
            fontSize: "clamp(28px, 4.5vw, 44px)", lineHeight: 1.1,
            color: "#fff", margin: "0 0 22px", letterSpacing: "-0.02em",
          }}>
            {seo.h1}
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.66)",
            margin: "0 auto", maxWidth: 580,
          }}>
            {seo.intro}
          </p>
          <p style={{
            fontSize: 12, color: "rgba(255,255,255,0.36)",
            marginTop: 18, fontFamily: "'Sora', sans-serif",
            letterSpacing: "0.04em",
          }}>
            Updated {NOTEPAD_LAST_UPDATED_HUMAN} · By{" "}
            <Link href="/" className="nseo-footer-link" style={{ color: "rgba(255,255,255,0.55)" }}>
              Ankit Jaiswal
            </Link>
          </p>
        </header>

        {/* ── WHAT IS (definition) ── */}
        <section style={{ maxWidth: 760, margin: "0 auto 120px" }}>
          <SectionHeading kicker="The basics" title={seo.whatIsTitle} />
          <div className="nseo-prose">
            {seo.whatIsBody.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* ── FEATURE CARDS ── */}
        <section style={{ maxWidth: 1040, margin: "0 auto 120px" }}>
          <SectionHeading kicker="Features" title="Everything you need, nothing you don't" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}>
            {NOTEPAD_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="nseo-card">
                  <span className="nseo-icon"><Icon size={18} strokeWidth={1.6} /></span>
                  <h3 style={{
                    fontFamily: "'Sora', sans-serif", fontWeight: 700,
                    fontSize: 16, color: "#fff", margin: "0 0 8px",
                    letterSpacing: "-0.005em",
                  }}>{f.title}</h3>
                  <p style={{
                    fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.6)",
                    margin: 0,
                  }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── HOW TO USE (numbered steps) ── */}
        <section style={{ maxWidth: 760, margin: "0 auto 120px" }}>
          <SectionHeading kicker="Step by step" title={seo.howToTitle} />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "rgba(255,255,255,0.6)",
            margin: "-12px 0 32px",
          }}>
            {seo.howToIntro}
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {seo.howToSteps.map((step, i) => (
              <li key={i} id={`step-${i + 1}`} className="nseo-step">
                <span className="nseo-step-num">{i + 1}</span>
                <div>
                  <h3 className="nseo-step-title">{step.title}</h3>
                  <p className="nseo-step-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── KEYBOARD SHORTCUTS ── */}
        <section style={{ maxWidth: 760, margin: "0 auto 120px" }}>
          <SectionHeading kicker="Reference" title="Keyboard shortcuts" />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "rgba(255,255,255,0.6)",
            margin: "-12px 0 32px",
          }}>
            Every formatting action has a shortcut. Mac uses <span className="nseo-kbd">Cmd</span>; Windows and Linux use <span className="nseo-kbd">Ctrl</span>.
          </p>
          {NOTEPAD_SHORTCUTS.map((group) => (
            <div key={group.group}>
              <p className="nseo-shortcut-group-title">{group.group}</p>
              <div className="nseo-table-wrap">
                <table className="nseo-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45%" }}>Shortcut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r) => (
                      <tr key={r.keys}>
                        <td><span className="nseo-kbd">{r.keys}</span></td>
                        <td>{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* ── USE CASES ── */}
        <section style={{ maxWidth: 1040, margin: "0 auto 120px" }}>
          <SectionHeading kicker="Use cases" title="Built for the way you actually work" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {NOTEPAD_USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="nseo-card" style={{ padding: "26px 24px 24px" }}>
                  <span className="nseo-icon"><Icon size={18} strokeWidth={1.6} /></span>
                  <h3 style={{
                    fontFamily: "'Sora', sans-serif", fontWeight: 700,
                    fontSize: 17, color: "#fff", margin: "0 0 10px",
                    letterSpacing: "-0.005em",
                  }}>{u.title}</h3>
                  <p style={{
                    fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.64)",
                    margin: 0,
                  }}>{u.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section style={{ maxWidth: 1040, margin: "0 auto 120px" }}>
          <SectionHeading kicker="How it compares" title="This notepad vs other popular options" />
          <p style={{
            fontSize: 15.5, lineHeight: 1.65, color: "rgba(255,255,255,0.6)",
            margin: "-12px 0 32px", maxWidth: 700,
          }}>
            A quick side-by-side with the most common alternatives — Notepad++ on Windows, Google Docs in the browser, and Apple Notes on Mac and iOS.
          </p>
          <div className="nseo-table-wrap nseo-compare-table-wrap">
            <table className="nseo-table nseo-compare-table">
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
                        <td key={ci} className={isYes ? "nseo-compare-yes" : isNo ? "nseo-compare-no" : undefined}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── TIPS & TRICKS ── */}
        <section style={{ maxWidth: 1040, margin: "0 auto 120px" }}>
          <SectionHeading kicker="Tips & tricks" title="Get more out of the editor" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {NOTEPAD_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.title} className="nseo-tip">
                  <span className="nseo-icon" style={{ marginBottom: 0 }}>
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 style={{
                      fontFamily: "'Sora', sans-serif", fontWeight: 700,
                      fontSize: 15, color: "#fff", margin: "4px 0 6px",
                      letterSpacing: "-0.005em",
                    }}>{tip.title}</h3>
                    <p style={{
                      fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,0.6)",
                      margin: 0,
                    }}>{tip.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PRIVACY EXPLAINER ── */}
        <section style={{ maxWidth: 920, margin: "0 auto 120px" }}>
          <div className="nseo-privacy">
            <span className="nseo-icon" style={{ marginBottom: 0, width: 44, height: 44 }}>
              <Shield size={20} strokeWidth={1.6} />
            </span>
            <div>
              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 700,
                fontSize: 20, color: "#fff", margin: "0 0 12px",
                letterSpacing: "-0.01em",
              }}>
                Your notes never leave your device
              </h2>
              <p style={{
                fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.66)",
                margin: 0,
              }}>
                This editor stores everything in your browser's local storage. There's no server-side database, no analytics inside the editor, no third-party scripts reading your text. When you export to PDF, DOCX, Markdown or HTML, the conversion runs in your browser and the file downloads directly to your device — your text is never uploaded. Clearing your browser data clears your notes; nothing is recoverable from anywhere else, because nothing was ever sent anywhere else.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 760, margin: "0 auto 120px" }}>
          <SectionHeading kicker="FAQ" title="Frequently asked questions" />
          <div>
            {NOTEPAD_FAQS.map((f) => (
              <details key={f.q} className="nseo-faq">
                <summary>
                  <span>{f.q}</span>
                  <ChevronDown size={16} strokeWidth={1.8} className="nseo-faq-chevron" />
                </summary>
                <p className="nseo-faq-answer">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── INLINE FEEDBACK CARD ── High-intent capture: users land here
            after they've actually used the tool, formed an opinion, and read
            the FAQ. Replaced the always-floating sticky widget. */}
        <section style={{ maxWidth: 760, margin: "0 auto 96px" }}>
          <FeedbackInlineCard />
        </section>

        {/* ── RELATED TOOLS ── */}
        <section style={{ maxWidth: 1040, margin: "0 auto 120px" }}>
          <SectionHeading kicker="More tools" title="Other free, privacy-first tools" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {RELATED_TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="nseo-related">
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Sora', sans-serif", fontSize: 14.5,
                    fontWeight: 600, marginBottom: 4, color: "#fff",
                  }}>{t.name}</div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5,
                  }}>{t.desc}</div>
                </div>
                <ArrowUpRight size={16} strokeWidth={1.8} className="nseo-related-arrow" />
              </Link>
            ))}
          </div>
        </section>
        {/* ── AUTHOR CARD ── Visible E-E-A-T proof on every notepad pageview.
            Tells humans (and AI crawlers) "this tool was made by a real,
            verifiable person." Pairs with the Person JSON-LD already in the
            page head for a redundant, machine-+-human-readable byline. ─── */}
        <section style={{ maxWidth: 760, margin: "0 auto 120px" }}>
          <SectionHeading kicker="About the maker" title="Who built this" />
          <div className="nseo-author-card">
            <div className="nseo-author-card-inner">
              <div className="nseo-author-avatar">
                <img
                  src={SITE.avatar}
                  alt="Ankit Jaiswal"
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                }}>
                  Ankit Jaiswal
                </div>
                <div style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 14,
                  fontWeight: 400,
                }}>
                  Independent web engineer · SEO specialist · India
                </div>
                <p style={{
                  fontSize: 14.5,
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.72)",
                  margin: "0 0 18px",
                  maxWidth: "52ch",
                }}>
                  I build fast, useful web tools and help businesses become impossible to ignore in the age of AI search. This notepad is the one I use every day.
                </p>
                <div className="nseo-author-actions">
                  <Link href="/about" className="nseo-author-cta">
                    More about Ankit
                    <ArrowUpRight size={14} strokeWidth={2} />
                  </Link>
                  <div className="nseo-author-socials" role="list">
                    <a
                      href={SITE.social.github}
                      target="_blank"
                      rel="noopener noreferrer me author"
                      className="nseo-social-link"
                      aria-label="Ankit Jaiswal on GitHub"
                      title="GitHub"
                    >
                      <GitHubIcon size={16} />
                    </a>
                    <a
                      href={SITE.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer me author"
                      className="nseo-social-link"
                      aria-label="Ankit Jaiswal on LinkedIn"
                      title="LinkedIn"
                    >
                      <LinkedInIcon size={16} />
                    </a>
                    <a
                      href={`https://x.com/${SITE.twitter.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer me author"
                      className="nseo-social-link"
                      aria-label="Ankit Jaiswal on X (Twitter)"
                      title="X (Twitter)"
                    >
                      <XIcon size={15} />
                    </a>
                    <a
                      href={SITE.social.threads}
                      target="_blank"
                      rel="noopener noreferrer me author"
                      className="nseo-social-link"
                      aria-label="Ankit Jaiswal on Threads"
                      title="Threads"
                    >
                      <ThreadsIcon size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ── FOOTER BAND ── */}
      <footer style={{
        background: "#0A0C10",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 24px 56px",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{
          maxWidth: 1040, margin: "0 auto",
          display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 20,
          fontSize: 13, color: "rgba(255,255,255,0.42)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              Built by{" "}
              <Link href="/" className="nseo-footer-link" style={{ fontWeight: 500 }}>
                Ankit Jaiswal
              </Link>
              . Free to use. No account required.
            </div>
            {/* Social proof row — gives Google a visible hint matching the
                JSON-LD Person.sameAs entity graph (GitHub + LinkedIn). */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <a
                href={SITE.social.github}
                target="_blank"
                rel="noopener noreferrer me author"
                className="nseo-social-link"
                aria-label="Ankit Jaiswal on GitHub"
                title="GitHub — see the code"
              >
                <GitHubIcon size={17} />
              </a>
              <a
                href={SITE.social.linkedin}
                target="_blank"
                rel="noopener noreferrer me author"
                className="nseo-social-link"
                aria-label="Ankit Jaiswal on LinkedIn"
                title="LinkedIn — connect with Ankit"
              >
                <LinkedInIcon size={17} />
              </a>
              <a
                href={`https://x.com/${SITE.twitter.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer me author"
                className="nseo-social-link"
                aria-label="Ankit Jaiswal on X (Twitter)"
                title="X — follow Ankit"
              >
                <XIcon size={15} />
              </a>
              <a
                href={SITE.social.threads}
                target="_blank"
                rel="noopener noreferrer me author"
                className="nseo-social-link"
                aria-label="Ankit Jaiswal on Threads"
                title="Threads — follow Ankit"
              >
                <ThreadsIcon size={16} />
              </a>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <Link href="/" className="nseo-footer-link">Home</Link>
            <Link href="/work" className="nseo-footer-link">Work</Link>
            <Link href="/tools" className="nseo-footer-link">Tools</Link>
            <Link href="/online-notepad" className="nseo-footer-link">Online Notepad</Link>
            <Link href="/text-to-pdf" className="nseo-footer-link">Text to PDF</Link>
          </nav>
        </div>
      </footer>
    </>
  );
});

// ── Brand SVG icons for social links ─────────────────────────────────────────
// Lucide doesn't ship logo glyphs (trademark reasons). Inlined SVGs keep the
// premium feel consistent with our minimal aesthetic and avoid pulling in a
// second icon library. Paths are the official simple-icons.org marks
// (CC0-licensed) at viewBox 24 24, currentColor for theme inheritance.
function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.39.97.01 1.95.14 2.87.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.71 21.39 24 17.08 24 12 24 5.65 18.85.5 12 .5Z" />
    </svg>
  );
}
function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function ThreadsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="currentColor" aria-hidden="true">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-43.046-41.434-43.206-.121-.001-.241-.001-.362-.001-14.978 0-27.435 6.396-35.095 18.036l13.781 9.452c5.72-8.679 14.694-10.529 21.32-10.529.084 0 .168 0 .251.001 8.25.053 14.479 2.452 18.516 7.131 2.937 3.405 4.902 8.111 5.886 14.05-7.41-1.26-15.424-1.65-23.994-1.158-24.146 1.39-39.668 15.473-38.626 35.046.529 9.931 5.473 18.474 13.926 24.052 7.146 4.713 16.349 7.018 25.916 6.495 12.63-.692 22.538-5.501 29.451-14.291 5.255-6.682 8.578-15.343 10.064-26.281 6.097 3.679 10.617 8.519 13.114 14.336 4.245 9.892 4.492 26.143-8.764 39.388-11.616 11.605-25.575 16.626-46.675 16.78-23.408-.174-41.108-7.682-52.626-22.317C39.502 137.343 33.92 116.728 33.71 96c.21-20.728 5.792-41.343 16.612-55.014C61.84 26.35 79.54 18.842 102.948 18.668c23.572.175 41.581 7.719 53.534 22.418 5.86 7.21 10.286 16.378 13.232 27.252l16.916-4.518c-3.58-13.385-9.218-24.918-16.85-34.299C154.557 12.275 132.882 2.215 102.952 2c-.04 0-.08 0-.12 0-29.886.215-51.342 10.305-66.292 28.79C20.962 47.515 13.085 71.064 12.842 95.964l.001.036v.036c.243 24.9 8.12 48.449 23.7 65.176 14.95 18.485 36.406 28.575 66.292 28.79.04 0 .08 0 .12 0 26.572-.183 45.314-7.121 60.749-22.601 20.197-20.224 19.607-45.583 13.045-61.137-4.704-11.13-13.654-20.176-25.881-26.176-.43-.211-.43-.211-.66-.32 1.92-9.08 6.16-15.04 10.69-19.46-7.62-4.84-13.31-7.5-21.07-9.39-2.25-3.13-4.94-6-8.04-8.55-9.31-7.69-22.27-11.92-37.61-12.13-15.39-.21-29.1 5.21-37.32 14.86-.61.71-1.18 1.45-1.72 2.21l13.78 9.45c.49-.69.99-1.36 1.55-1.99 5.48-6.45 14.78-9.91 24.51-9.81 9.69.13 17.86 3.02 23.78 7.4l.05.04c-.48-2.32-1.51-4.6-3.14-6.71l.01-.01ZM98.61 138.63c-3.78.21-7.78-.46-11.41-1.95-4.91-2.02-7.37-5.07-7.6-9.43-.31-5.83 4.06-12.4 19.16-13.27 1.74-.1 3.47-.15 5.18-.15 5.81 0 11.27.6 16.42 1.74-1.93 11.86-9.16 22.56-21.75 23.06Z" />
    </svg>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{
        fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.38)", margin: "0 0 12px", fontWeight: 500,
      }}>
        {kicker}
      </p>
      <h2 style={{
        fontFamily: "'Sora', sans-serif", fontWeight: 700,
        fontSize: "clamp(22px, 3vw, 28px)", lineHeight: 1.2,
        color: "#fff", margin: 0, letterSpacing: "-0.015em",
      }}>
        {title}
      </h2>
    </div>
  );
}

