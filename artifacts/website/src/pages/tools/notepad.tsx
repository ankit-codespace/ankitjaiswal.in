import { useState, useEffect, useCallback, useRef, useMemo, memo, Fragment, Component } from "react";
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
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, Extension } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { motion, AnimatePresence } from "framer-motion";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TipTapImage from "@tiptap/extension-image";
import CodeBlock from "@tiptap/extension-code-block";
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

// Custom React Node View for Tiptap Code Block extension
const CodeBlockNodeView = ({ node }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent || "");
    setCopied(true);
    toast.success("Code copied to clipboard", { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="notepad-code-block-wrapper">
      <pre className="notepad-code-block-pre">
        <code className="notepad-code-block-code">
          <NodeViewContent />
        </code>
      </pre>
      <button
        onClick={handleCopy}
        className="notepad-code-block-copy-btn"
        contentEditable={false}
        title="Copy code"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 6,
          border: "1px solid var(--code-btn-border, rgba(255,255,255,0.08))",
          background: "var(--code-btn-bg, rgba(0,0,0,0.5))",
          color: copied ? "var(--ok, #52C47A)" : "var(--t2, #A5A29B)",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        {copied ? <Check size={14} /> : <CopyIcon size={14} />}
      </button>
    </NodeViewWrapper>
  );
};

const CustomCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },

  addCommands() {
    return {
      toggleCodeBlock: () => ({ state, chain, commands }: any) => {
        const { selection } = state;
        const { from, to, empty } = selection;

        // If inside code block, toggle it off
        const isActive = this.editor.isActive("codeBlock");
        if (isActive) {
          return commands.toggleNode("codeBlock", "paragraph");
        }

        // If selection is empty, default toggle
        if (empty) {
          return commands.toggleNode("codeBlock", "paragraph");
        }

        // If selection is not empty, merge selected blocks into a single code block
        const selectedText = state.doc.textBetween(from, to, "\n");
        return chain()
          .insertContentAt({ from, to }, {
            type: "codeBlock",
            content: selectedText ? [{ type: "text", text: selectedText }] : []
          })
          .run();
      }
    } as any;
  }
});

interface SearchAndReplaceStorage {
  searchTerm: string;
  caseSensitive: boolean;
  activeIndex: number;
  results: { from: number; to: number }[];
}

const SearchAndReplace = Extension.create({
  name: "searchAndReplace",

  addStorage(): SearchAndReplaceStorage {
    return {
      searchTerm: "",
      caseSensitive: false,
      activeIndex: 0,
      results: [],
    };
  },

  addCommands() {
    return {
      setSearchTerm: (term: string) => ({ tr, dispatch }: any) => {
        this.storage.searchTerm = term;
        this.storage.activeIndex = 0;
        if (dispatch) {
          tr.setMeta("searchAndReplaceUpdate", true);
        }
        return true;
      },
      setSearchActiveIndex: (index: number) => ({ tr, dispatch }: any) => {
        this.storage.activeIndex = index;
        if (dispatch) {
          tr.setMeta("searchAndReplaceUpdate", true);
        }
        return true;
      },
      replace: (replaceText: string) => ({ state, dispatch }: any) => {
        const { results, activeIndex } = this.storage;
        if (!results.length || activeIndex < 0 || activeIndex >= results.length) return false;
        const match = results[activeIndex];
        if (dispatch) {
          const tr = state.tr.replaceWith(match.from, match.to, state.schema.text(replaceText));
          dispatch(tr);
        }
        return true;
      },
      replaceAll: (replaceText: string) => ({ state, dispatch }: any) => {
        const { results } = this.storage;
        if (!results.length) return false;
        if (dispatch) {
          let tr = state.tr;
          const sorted = [...results].sort((a, b) => b.from - a.from);
          sorted.forEach((match) => {
            tr = tr.replaceWith(match.from, match.to, state.schema.text(replaceText));
          });
          dispatch(tr);
        }
        return true;
      },
    } as any;
  },

  addProseMirrorPlugins() {
    const extension = this;
    const searchPluginKey = new PluginKey("searchAndReplace");

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            const docChanged = tr.docChanged;
            const forceUpdate = tr.getMeta("searchAndReplaceUpdate");

            if (!docChanged && !forceUpdate) {
              return oldState.map(tr.mapping, tr.doc);
            }

            const { searchTerm, caseSensitive, activeIndex } = extension.storage;
            const matches: { from: number; to: number }[] = [];

            if (searchTerm) {
              const escaped = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
              const flags = caseSensitive ? "g" : "gi";
              const regex = new RegExp(escaped, flags);

              tr.doc.descendants((node: any, pos: number) => {
                if (node.isText && node.text) {
                  const text = node.text;
                  let match;
                  while ((match = regex.exec(text)) !== null) {
                    const from = pos + match.index;
                    const to = from + match[0].length;
                    matches.push({ from, to });
                  }
                }
              });
            }

            extension.storage.results = matches;

            if (!matches.length) {
              return DecorationSet.empty;
            }

            const decos = matches.map((match, idx) => {
              const isActive = idx === activeIndex;
              return Decoration.inline(match.from, match.to, {
                class: isActive
                  ? "notepad-search-match-active"
                  : "notepad-search-match",
              });
            });

            return DecorationSet.create(tr.doc, decos);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
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
  Check, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, Pilcrow, Files, Loader2, Quote, Settings, Pencil, MoreHorizontal, Eraser,
  Trash2,
  Lock, Zap, Layers, Sparkles, GraduationCap, PenLine, Code2, Briefcase,
  ArrowUpRight, FileDown, Eye, Save, Code,
  Keyboard, BookOpen, Shield, ListChecks, Table2, Lightbulb, MousePointer2,
  Wand2, Globe,
  Copy as CopyIcon, MessageSquarePlus, Pin, PanelLeft, ExternalLink, Edit, Type
} from "lucide-react";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface NotepadDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  driveFileId?: string;
  isPinned?: boolean;
  color?: string;
  isUnsaved?: boolean;
  mode?: "rich" | "raw" | "markdown" | "html";
  closeBatchId?: string;
  lastRichContent?: string;
}

type SourcePreviewState = {
  format: "rich" | "html" | "markdown";
  title: string;
  value: string;
  htmlBody?: string;
  warning?: string;
  copied?: boolean;
};


interface DeleteConfirmState {
  docId: string;
  source: "tab" | "menu" | "switcher";
  x: number;
  y: number;
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
  imageBorder: boolean; // soft hairline frame around inline images
  zoom?: number;
  rulerOpacity?: "less" | "normal" | "more";
}

// ── Constants ──────────────────────────────────────────────────────────────────
function countWords(text: string): number {
  if (!text) return 0;
  const clean = text.trim();
  if (clean === "") return 0;
  const matches = clean.match(/\S+/g);
  return matches ? matches.length : 0;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const LS_DOCS = "notepad_docs_v2";
const LS_ACTIVE = "notepad_active_v2";
const LS_SETTINGS = "notepad_settings_v1";

const DEFAULT_SETTINGS: NotepadSettings = {
  fontSize: 18,
  lineHeight: 2.15,
  writingWidth: "wide",
  lightSurface: false,
  spellCheck: false,
  bgColor: "",
  textColor: "",
  ruledLines: true,
  paperGrain: true,
  imageBorder: true,
  zoom: 1.1,
  rulerOpacity: "normal",
};

/**
 * Five opinionated, writing-tuned themes. Each ships its own accent color
 * applied to caret, selection, and links. The `dark` flag is what drives
 * the OS-preference auto-pick on first load.
 */
const THEMES = [
  // Default for OS dark mode — warm-tinted near-black, emerald accent
  { label: "Slate", bg: "#161615", tabStripBg: "#0C0C0C", text: "#F0EDE8", accent: "#52C47A", dark: true },
  // Default for OS light mode — warm cream, amber gold accent
  { label: "Paper", bg: "#FAF8F2", tabStripBg: "#EAE6DF", text: "#1F1B16", accent: "#C8863A", dark: false },
  // True warm near-black for night-mode purists
  { label: "Midnight", bg: "#0F0F0E", tabStripBg: "#000000", text: "#D4D0C8", accent: "#EDE8DF", dark: true },
  // Warm sepia for long reading sessions
  { label: "Sepia", bg: "#F4ECD8", tabStripBg: "#E3DAC2", text: "#3D2B1F", accent: "#C8863A", dark: false },
  // Warm-neutral light grey
  { label: "Mist", bg: "#EAE6DF", tabStripBg: "#DAD6CE", text: "#1F1B16", accent: "#7A7874", dark: false },
] as const;

const TAB_COLORS = [
  { id: "red", name: "Rose Red", darkValue: "#E66B6B", lightValue: "#B24040" },
  { id: "yellow", name: "Warm Yellow", darkValue: "#FFE066", lightValue: "#C99A16" },
  { id: "green", name: "Sage Green", darkValue: "#60C988", lightValue: "#246944" },
  { id: "blue", name: "Slate Blue", darkValue: "#58A3E0", lightValue: "#205D8A" },
  { id: "purple", name: "Lavender", darkValue: "#9D7FE6", lightValue: "#6C42A1" },
];

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

function sanitizeDocContent(doc: NotepadDoc): NotepadDoc {
  if (!doc || !doc.content) return doc;

  const contentStr = typeof doc.content === "string" ? doc.content : "";
  const isPdf = contentStr.startsWith("%PDF");
  const hasNullByte = contentStr.includes("\x00") || contentStr.includes("\u0000");
  const isTooLarge = contentStr.length > 1572864; // 1.5MB character length

  if (isPdf || hasNullByte || isTooLarge) {
    let errorReason = "Unsupported Format";
    if (isTooLarge) errorReason = "File Too Large (> 1.5MB)";
    else if (isPdf) errorReason = "PDF File Blocked";
    else if (hasNullByte) errorReason = "Binary Content Blocked";

    return {
      ...doc,
      content: `<p>[Error: ${errorReason}]</p>`,
      title: `${doc.title.replace(/\s*\(Unsupported Format\)/g, "")} (${errorReason})`,
      isUnsaved: true,
      updatedAt: Date.now()
    };
  }
  return doc;
}

function getDefaultDocs(): NotepadDoc[] {
  const now = Date.now();
  return [
    {
      id: "welcome-note",
      title: "🚀 Welcome to I Love Notepad",
      mode: "rich",
      content: `<h1>Welcome to I Love Notepad!</h1>
<p>This is a fast, offline-first distraction-free notepad designed for writers, developers, and professionals.</p>
<hr />
<h2>Key Features</h2>
<ul>
  <li><strong>Formatting:</strong> Use bold, italic, underline, strikethrough, or <mark>highlight</mark> text.</li>
  <li><strong>Structure:</strong> Try out bullets, numbered lists, task checklists, code blocks, tables, and horizontal rows.</li>
  <li><strong>Autosave:</strong> Stored locally inside your browser. Your notes are private and never uploaded to any server.</li>
  <li><strong>Cross-Platform Parity:</strong> Switch format views, search, restore closed tabs, and export to PDF, HTML, Markdown, or Plain Text in one click.</li>
</ul>
<p>To learn more about keyboard shortcuts and advanced features, check out the <em>Markdown & Editor Tips</em> note in your sidebar!</p>`,
      createdAt: now - 2000,
      updatedAt: now - 2000,
      isPinned: true
    },
    {
      id: "markdown-tips",
      title: "💡 Markdown & Editor Tips",
      mode: "rich",
      content: `<h1>Editor Shortcuts & Features</h1>
<p>We support Markdown shortcuts as you type, allowing you to format text quickly without using the toolbar.</p>
<h2>Markdown Shortcuts</h2>
<ul>
  <li>Type <code>#</code> followed by a space to create a Heading 1.</li>
  <li>Type <code>##</code> or <code>###</code> for Heading 2 or Heading 3.</li>
  <li>Type <code>*</code> or <code>-</code> followed by a space for bullet lists.</li>
  <li>Type <code>1.</code> followed by a space for numbered lists.</li>
  <li>Type <code>- [ ]</code> followed by a space for a task checkbox.</li>
  <li>Type <code>**text**</code> or <code>__text__</code> for bold styling.</li>
  <li>Type <code>*text*</code> or <code>_text_</code> for italic styling.</li>
  <li>Type <code>\`code\`</code> for inline code snippets.</li>
</ul>
<hr />
<h2>Keyboard Shortcuts</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><code>Ctrl + N</code> — Create new note</li>
  <li data-type="taskItem" data-checked="false"><code>Ctrl + S</code> — Save current note (for local text files)</li>
  <li data-type="taskItem" data-checked="false"><code>Ctrl + D</code> — Smart Export (Auto-detect best format)</li>
  <li data-type="taskItem" data-checked="false"><code>Ctrl + Shift + T</code> or <code>Ctrl + Alt + T</code> — Restore last closed note</li>
</ul>`,
      createdAt: now - 1000,
      updatedAt: now - 1000,
      isPinned: false
    },
    {
      id: "sample-draft",
      title: "📝 Sample Draft: Project Alpha",
      mode: "rich",
      content: `<h1>Meeting Notes: Project Alpha</h1>
<p>Use this sample note to see how you can structure meeting summaries, task lists, or daily journals.</p>
<hr />
<h3>Agenda & Discussion</h3>
<ol>
  <li>Review Q3 roadmap and feature milestones.</li>
  <li>Discuss cross-platform UI alignments.</li>
  <li>Allocate resources for performance optimization.</li>
</ol>
<h3>Action Items</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true">Update formatting toggle SVG icons.</li>
  <li data-type="taskItem" data-checked="false">Integrate smart export split button.</li>
  <li data-type="taskItem" data-checked="false">Validate document restoration shortcuts.</li>
</ul>
<h3>Resource Links</h3>
<p>For official project docs, visit <a href="https://github.com/ankit-codespace/ankitjaiswal.in" target="_blank" rel="noopener noreferrer">GitHub Project Space</a>.</p>`,
      createdAt: now,
      updatedAt: now,
      isPinned: false
    }
  ];
}

function loadDocs(): NotepadDoc[] {
  try {
    const raw = localStorage.getItem(LS_DOCS);
    if (raw) {
      const docs = JSON.parse(raw) as NotepadDoc[];
      if (docs.length > 0) {
        let sanitized = false;
        const processed = docs.map(d => {
          const s = sanitizeDocContent(d);
          if (s !== d) sanitized = true;
          return s;
        });
        if (sanitized) {
          saveDocs(processed);
        }
        return processed;
      }
    }
  } catch { }
  const defaults = getDefaultDocs();
  localStorage.setItem(LS_DOCS, JSON.stringify(defaults));
  return defaults;
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.zoom === undefined) parsed.zoom = 1.1;
      if (parsed.lineHeight === 2.1) parsed.lineHeight = 2.15;
      if (parsed.lineHeight === 2.6 || parsed.lineHeight === 1.95) parsed.lineHeight = 2.65;
      if (parsed.lineHeight === 1.5 || parsed.lineHeight === 1.45) parsed.lineHeight = 1.65;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { }
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
        "Code blocks with copy button",
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

const isElectron = typeof window !== "undefined" && (
  !!(window as any).electron ||
  !!(window as any).api ||
  (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("electron"))
);

// ── Keyboard shortcuts reference ─────────────────────────────────────────────
const NOTEPAD_SHORTCUTS: { group: string; rows: { keys: string; action: string }[] }[] = [
  {
    group: "Formatting",
    rows: [
      { keys: "Cmd/Ctrl + B", action: "Bold" },
      { keys: "Cmd/Ctrl + I", action: "Italic" },
      { keys: "Cmd/Ctrl + U", action: "Underline" },
      { keys: "Cmd/Ctrl + Shift + X", action: "Strikethrough" },
      { keys: isElectron ? "Cmd/Ctrl + E" : "Cmd/Ctrl + Alt + E", action: "Inline code" },
      { keys: "Cmd/Ctrl + H or Cmd/Ctrl + Shift + H", action: "Highlight" },
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
      { keys: isElectron ? "Cmd/Ctrl + Shift + B" : "Cmd/Ctrl + Shift + Q", action: "Blockquote" },
      { keys: "Cmd/Ctrl + Alt + C", action: "Code block" },
    ],
  },
  {
    group: "Document & App",
    rows: [
      { keys: "Cmd/Ctrl + Z", action: "Undo" },
      { keys: "Cmd/Ctrl + Shift + Z", action: "Redo" },
      { keys: "Cmd/Ctrl + F", action: "Find in document" },
      { keys: "Cmd/Ctrl + Shift + F", action: "Find and replace" },
      { keys: "Cmd/Ctrl + O", action: "Open File..." },
      { keys: "Cmd/Ctrl + S", action: "Save File" },
      { keys: "Cmd/Ctrl + Shift + S", action: "Save As..." },
      { keys: "Cmd/Ctrl + P", action: "Print / Save PDF" },
      { keys: "Cmd/Ctrl + \\", action: "Toggle Outline sidebar" },
      { keys: "Cmd/Ctrl + Shift + \\", action: "Toggle Focus Mode" },
      { keys: "Cmd/Ctrl + + / -", action: "Zoom In / Out" },
      { keys: "Cmd/Ctrl + 0", action: "Reset Zoom" },
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
  ["Runs in browser", "Yes", "No (Windows only)", "Yes", "Web app + macOS/iOS"],
  ["Install required", "No", "Yes", "No", "Built into Apple devices"],
  ["Account / signup", "No", "No", "Yes (Google)", "Yes (Apple ID)"],
  ["Notes stay on your device", "Yes", "Yes", "No (synced to Google)", "Synced to iCloud"],
  ["Rich text formatting", "Yes", "Limited (plugins)", "Yes", "Yes"],
  ["Image paste", "Yes", "No", "Yes", "Yes"],
  ["Export to PDF", "Yes (one click)", "Plugin only", "Yes", "Yes (via Print)"],
  ["Export to DOCX", "Yes", "No", "Yes", "No"],
  ["Export to Markdown", "Yes", "Plugin", "No", "No"],
  ["Works offline", "Yes", "Yes", "Limited", "Yes"],
  ["Free forever", "Yes", "Yes (open source)", "Yes (with Google account)", "Yes (Apple devices only)"],
];

// ── Tips & tricks for power users ────────────────────────────────────────────
const NOTEPAD_TIPS: { icon: typeof Lightbulb; title: string; body: string }[] = [
  { icon: Wand2, title: "Smart paste from anywhere", body: "Paste from Word, Google Docs, Notion or any webpage and the notepad strips junk styling while keeping headings, lists, links and bold/italic intact." },
  { icon: ImageIcon, title: "Resize images on the fly", body: "Click any pasted image to switch between small, medium, large and full-width — no need to re-upload or edit elsewhere." },
  { icon: Eye, title: "Use focus mode for long writing", body: "Toggle focus mode to fade out everything except the paragraph you're editing. Combined with full-screen, it's a distraction-free studio." },
  { icon: Layers, title: "Keep separate notes for separate jobs", body: "Open the documents menu and create a note per project. Each one autosaves independently and you can rename or reorder them at will." },
  { icon: Search, title: "Find and replace across the whole doc", body: "Cmd/Ctrl + Shift + F opens find-and-replace. Works on huge documents without lag because it runs natively in your browser." },
  { icon: FileDown, title: "Pick the right export format", body: "PDF for sharing or printing. DOCX for sending to people who edit in Word. Markdown for blogs, GitHub or Notion. HTML for the web." },
];

const RELATED_TOOLS = [
  { name: "YouTube Summary", desc: "Turn video transcripts into tuned AI prompts", href: "https://recapyt.in/" },
  { name: "Clipboard History", desc: "Save text snippets locally", href: "/tools/clipboard-history" },
  { name: "Paste to Image", desc: "Paste, annotate and download screenshots", href: "/tools/paste-to-image" },
  { name: "All Tools", desc: "Browse every privacy-first tool", href: "/tools" },
];

// ── Feature cards shown in the SEO section below the editor ────────────────
const NOTEPAD_FEATURES: { icon: typeof Lock; title: string; desc: string }[] = [
  { icon: Lock, title: "Private by default", desc: "Your notes never leave your browser. No account, no upload, no analytics inside the editor." },
  { icon: Save, title: "Autosave, always", desc: "Every keystroke is saved to local storage. Refresh, close the tab, come back tomorrow." },
  { icon: Sparkles, title: "Rich text formatting", desc: "Headings, lists, quotes, code, tables, highlights, colors and inline images." },
  { icon: FileDown, title: "Export to PDF & more", desc: "One-click export to PDF, DOCX, Markdown or HTML. Clean output, ready to share." },
  { icon: Layers, title: "Multiple notes", desc: "Switch between documents with a sidebar. Rename, delete, undo — Cmd/Ctrl + Z restores." },
  { icon: Zap, title: "Fast & offline", desc: "Loads instantly, runs entirely client-side. Works without an internet connection after first load." },
];

// ── Use-case sections — these double as long-tail SEO and AI-citation units ─
const NOTEPAD_USE_CASES: { icon: typeof GraduationCap; title: string; desc: string }[] = [
  { icon: GraduationCap, title: "For students", desc: "Take lecture notes that survive browser refreshes and tab closes — autosave runs on every keystroke. Paste screenshots from slides, diagrams from textbooks, or photos of the whiteboard directly into your notes. When the semester ends, export each subject as a clean PDF you can submit, print, or archive. No app to install on a school laptop, no Google account to sign into on a shared computer." },
  { icon: PenLine, title: "For writers", desc: "Draft articles, essays and short fiction in a distraction-free editor. Toggle focus mode to fade everything except the paragraph you're working on. The word counter updates live, headings collapse the document into an outline, and when the draft is ready you ship clean Markdown or HTML straight into your blog, Substack, Ghost or any CMS — no copy-paste cleanup required." },
  { icon: Code2, title: "For developers", desc: "Keep code snippets in syntax-aware code blocks that preserve indentation. Drop screenshots of stack traces, terminal output or Figma designs into the same document. Sketch out architecture decisions, write up bugs, draft pull request descriptions, then export everything to Markdown for GitHub, Linear, Jira or Notion. Stays private — no risk of a code snippet ending up in someone's training data." },
  { icon: Briefcase, title: "For professionals", desc: "Capture meeting notes during a call without your client wondering what app you're using. Paste screenshots from a deck, a Figma board, or a spreadsheet. Build a quick brief, an internal memo, or a proposal with proper formatting and export to PDF or DOCX in one click. Everything stays on your laptop — useful when you're working with confidential or pre-release information." },
];

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
function getTooltip(name: string, shortcut?: string) {
  if (!shortcut) return name;
  const key = isMac ? shortcut.replace(/Ctrl\+/g, "⌘").replace(/Alt\+/g, "⌥").replace(/Shift\+/g, "⇧") : shortcut;
  return `${name} (${key})`;
}

function blendColors(fgType: "dark" | "light", bgHex: string, alpha: number): string {
  try {
    let hex = bgHex.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const bgR = parseInt(hex.slice(0, 2), 16) || 0;
    const bgG = parseInt(hex.slice(2, 4), 16) || 0;
    const bgB = parseInt(hex.slice(4, 6), 16) || 0;

    const fgR = fgType === "dark" ? 255 : 13;
    const fgG = fgType === "dark" ? 255 : 17;
    const fgB = fgType === "dark" ? 255 : 23;

    const r = Math.round(fgR * alpha + bgR * (1 - alpha));
    const g = Math.round(fgG * alpha + bgG * (1 - alpha));
    const b = Math.round(fgB * alpha + bgB * (1 - alpha));

    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fgType === "dark" ? "rgb(203, 204, 204)" : "rgb(153, 155, 157)";
  }
}

class NotepadErrorBoundary extends Component<
  {
    children: React.ReactNode;
    activeDoc: NotepadDoc | undefined;
    setDocs: React.Dispatch<React.SetStateAction<NotepadDoc[]>>;
    setActiveId: React.Dispatch<React.SetStateAction<string>>;
    setSaveStatus: React.Dispatch<React.SetStateAction<"saved" | "unsaved">>;
    effectiveDark: boolean;
    surfAccent: string;
  },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || "Unknown error" };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Editor Crash Boundary Caught:", error, errorInfo);
  }

  handleRecoverAsRaw = () => {
    const { activeDoc, setDocs } = this.props;
    if (activeDoc) {
      const div = document.createElement("div");
      div.innerHTML = activeDoc.content;
      const plainText = div.textContent || div.innerText || "";
      
      setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, content: plainText, mode: "raw", isUnsaved: true } : d));
      this.setState({ hasError: false, errorMsg: "" });
    }
  };

  handleExportBackup = () => {
    const { activeDoc } = this.props;
    if (activeDoc) {
      const blob = new Blob([activeDoc.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeDoc.title || "Note"}_recovery_backup.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  render() {
    if (this.state.hasError) {
      const { effectiveDark, surfAccent } = this.props;
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center",
          background: effectiveDark ? "rgba(220, 50, 50, 0.05)" : "rgba(220, 50, 50, 0.02)",
          border: effectiveDark ? "1px dashed rgba(220, 50, 50, 0.3)" : "1px dashed rgba(220, 50, 50, 0.2)",
          borderRadius: 8,
          margin: "20px 0",
          fontFamily: "Inter, sans-serif",
          color: effectiveDark ? "#FFF" : "#0D1117"
        }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, color: "#EF4444", marginBottom: 8 }}>
            Editor Render Isolated
          </h3>
          <p style={{ fontSize: 13, color: effectiveDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)", maxWidth: 420, lineHeight: 1.5, marginBottom: 20 }}>
            An unexpected error occurred while rendering this document's rich formatting. To protect your session, we've sandboxed this note.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleRecoverAsRaw}
              style={{
                background: "#EF4444",
                color: "#FFF",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.1s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Open as Plain Text
            </button>
            <button
              onClick={this.handleExportBackup}
              style={{
                background: effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)",
                color: effectiveDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)"; }}
            >
              Download Backup
            </button>
            <button
              onClick={() => this.setState({ hasError: false, errorMsg: "" })}
              style={{
                background: "transparent",
                color: effectiveDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Notepad() {
  const [location] = useLocation();
  const seo = useMemo<NotepadSeo>(() => NOTEPAD_SEO[location] ?? DEFAULT_NOTEPAD_SEO, [location]);
  const jsonLd = useMemo(() => buildNotepadJsonLd(seo), [seo]);
  const [docs, setDocs] = useState<NotepadDoc[]>(() => loadDocs());
  const [activeId, setActiveId] = useState<string>(() => loadActiveId(loadDocs()));
  const [settings, setSettings] = useState<NotepadSettings>(() => loadSettings());

  // Migrate old markdown/html docs on mount
  useEffect(() => {
    let changed = false;
    const migrated = docs.map(doc => {
      if ((doc.mode as any) === "markdown") {
        const html = parseMarkdownToHtml(doc.content || "");
        const content = restoreEmbeddedImages(html, doc.lastRichContent || "");
        changed = true;
        return { ...doc, content, mode: "rich" as const };
      } else if ((doc.mode as any) === "html") {
        changed = true;
        return { ...doc, mode: "rich" as const };
      }
      return doc;
    });
    if (changed) {
      setDocs(migrated);
      saveDocs(migrated);
    }
  }, []);
  const [focusMode, setFocusMode] = useState(false);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkPopoverCoords, setLinkPopoverCoords] = useState<{ top: number; left: number } | null>(null);
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number; visible: boolean; targetUrl?: string } | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [isFindFocused, setIsFindFocused] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [isReplaceFocused, setIsReplaceFocused] = useState(false);
  const [findResultsCount, setFindResultsCount] = useState(0);
  const [findActiveIndex, setFindActiveIndex] = useState(0);
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  // Inline-confirm state for delete actions in the doc switcher
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const dragSourceIdxRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggedWidthRef = useRef<number>(0);
  const draggedIsPinnedRef = useRef<boolean>(false);
  const [largeFilePrompt, setLargeFilePrompt] = useState<{ fileName: string; fileSize: number; fileText: string; handle?: FileSystemFileHandle } | null>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [fileMenuLeft, setFileMenuLeft] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [headings, setHeadings] = useState<{ text: string; level: number; index: number }[]>([]);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number | null>(null);
  const fileHandlesRef = useRef<Record<string, FileSystemFileHandle>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<SourcePreviewState | null>(null);
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
  const deleteConfirmCancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (deleteConfirm) {
      timer = setTimeout(() => {
        deleteConfirmCancelBtnRef.current?.focus();
      }, 50);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [deleteConfirm]);
  const [docMenuLeft, setDocMenuLeft] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMenuLeft, setColorMenuLeft] = useState(0);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableActionsMenuLeft, setTableActionsMenuLeft] = useState(0);
  const tableActionsBtnRef = useRef<HTMLButtonElement>(null);
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

  const contextMenuOpenTimeRef = useRef<number>(0);
  const undoStackRef = useRef<Array<{ docs: NotepadDoc[]; activeId: string }>>([]);

  // Load undo stack from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem("notepad_undo_stack");
      if (saved) {
        undoStackRef.current = JSON.parse(saved);
      }
    } catch {}
  }, []);

  const saveUndoStack = (stack: any[]) => {
    try {
      localStorage.setItem("notepad_undo_stack", JSON.stringify(stack));
    } catch (e) {
      console.error(e);
    }
  };
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<{ x: number; y: number; src: string; pos: number } | null>(null);

  const togglePin = useCallback((id: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, isPinned: !d.isPinned } : d);
      saveDocs(next);
      return next;
    });
  }, []);

  const duplicateDoc = useCallback((id: string) => {
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    const fresh: NotepadDoc = {
      ...target,
      id: genId(),
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      driveFileId: undefined,
    };
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      const next = [...prev];
      if (idx !== -1) {
        next.splice(idx + 1, 0, fresh);
      } else {
        next.push(fresh);
      }
      saveDocs(next);
      return next;
    });
    setActiveId(fresh.id);
    toast.success(`Duplicated "${target.title}"`);
  }, [docs]);

  const closeOtherDocs = useCallback((idToKeep: string) => {
    const target = docs.find((d) => d.id === idToKeep);
    if (!target) return;
    undoStackRef.current.push({ docs: [...docs], activeId });
    saveUndoStack(undoStackRef.current);
    const nextDocs = docs.filter((d) => d.id === idToKeep || d.isPinned);
    setDocs(nextDocs);
    saveDocs(nextDocs);
    if (!nextDocs.some((d) => d.id === activeId)) {
      setActiveId(target.id);
    }
    toast.success("Other tabs closed");
  }, [docs, activeId]);

  const sortedDocs = useMemo(() => {
    const pinned = docs.filter((d) => d.isPinned);
    const unpinned = docs.filter((d) => !d.isPinned);
    return [...pinned, ...unpinned];
  }, [docs]);

  const closeDocsToTheRight = useCallback((id: string) => {
    const idx = sortedDocs.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const idsToKeep = new Set(sortedDocs.slice(0, idx + 1).map((d) => d.id));
    undoStackRef.current.push({ docs: [...docs], activeId });
    saveUndoStack(undoStackRef.current);
    const nextDocs = docs.filter((d) => idsToKeep.has(d.id) || d.isPinned);
    setDocs(nextDocs);
    saveDocs(nextDocs);
    if (!nextDocs.some((d) => d.id === activeId)) {
      setActiveId(id);
    }
    toast.success("Tabs to the right closed");
  }, [docs, sortedDocs, activeId]);

  const setTabColor = useCallback((id: string, color?: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, color } : d);
      saveDocs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (Date.now() - contextMenuOpenTimeRef.current >= 100) {
        setContextMenu(null);
        setImageContextMenu(null);
      }
      const target = e.target as HTMLElement;
      if (target && !target.closest(".notepad-color-picker-trigger")) {
        setShowColorPicker(false);
      }
      if (target && !target.closest(".notepad-table-menu-trigger")) {
        setShowTableMenu(false);
      }
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, []);

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
        codeBlock: false,
      }),
      CustomCodeBlock,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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
      SearchAndReplace,
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
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target as HTMLElement;
          if (target && target.nodeName === "IMG") {
            event.preventDefault();
            setContextMenu(null);
            setImageContextMenu({
              x: event.clientX,
              y: event.clientY,
              src: target.getAttribute("src") || "",
              pos: view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? 0,
            });
            return true;
          }
          return false;
        }
      },
      handleKeyDown(view, event) {
        // If they press Space immediately after/at the end of a link
        if (event.key === " " || event.code === "Space") {
          const { state } = view;
          const { selection } = state;
          if (selection.empty) {
            const { $from } = selection;
            const hasLinkBefore = $from.nodeBefore && $from.nodeBefore.marks.some(m => m.type.name === "link");
            const hasLinkAfter = $from.nodeAfter && $from.nodeAfter.marks.some(m => m.type.name === "link");
            if (hasLinkBefore && !hasLinkAfter) {
              const tr = state.tr.insertText(" ", selection.from);
              const linkType = state.schema.marks.link;
              tr.removeStoredMark(linkType);
              view.dispatch(tr);
              event.preventDefault();
              return true;
            }
          }
        }

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
      setEditorVersion((v) => v + 1);
      if (isChangingDocRef.current) return;
      setSaveStatus("unsaved");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const html = editor.getHTML();
        setDocs((prev) => {
          const currentDoc = prev.find((d) => d.id === activeId);
          if (!currentDoc || currentDoc.mode === "raw") {
            return prev;
          }
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
    onSelectionUpdate() {
      setEditorVersion((v) => v + 1);
    },
    onTransaction({ editor, transaction }) {
      const storage = editor?.storage as any;
      if (storage?.searchAndReplace) {
        setFindResultsCount(storage.searchAndReplace.results.length);
        setFindActiveIndex(storage.searchAndReplace.activeIndex);
      }

      // Prevent link mark from leaking to subsequent typed characters at boundary
      if (transaction && transaction.selection.empty) {
        const { $from } = transaction.selection;
        const hasLinkBefore = $from.nodeBefore && $from.nodeBefore.marks.some(m => m.type.name === "link");
        const hasLinkAfter = $from.nodeAfter && $from.nodeAfter.marks.some(m => m.type.name === "link");
        if (hasLinkBefore && !hasLinkAfter) {
          const linkType = transaction.doc.type.schema.marks.link;
          if (linkType) {
            transaction.removeStoredMark(linkType);
          }
        }
      }
    },
  });

  // ── Switch doc ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const doc = docs.find((d) => d.id === activeId);
    if (doc) {
      isChangingDocRef.current = true;
      if (doc.mode === "raw") {
        editor.commands.setContent("");
      } else {
        editor.commands.setContent(doc.content || "");
      }
      setTimeout(() => { isChangingDocRef.current = false; }, 50);
    }
    localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]); // eslint-disable-line

  // Scroll active tab into view when activeId changes (boundary-checked)
  useEffect(() => {
    if (activeId) {
      const scrollTab = () => {
        const activeTabEl = document.querySelector(".notepad-tab-item.active") as HTMLElement;
        const container = document.querySelector(".notepad-tabs-container") as HTMLElement;
        if (activeTabEl && container) {
          const containerRect = container.getBoundingClientRect();
          const tabRect = activeTabEl.getBoundingClientRect();

          // Check if the tab is cut off on the left or right of the visible container
          const isLeftCutOff = tabRect.left < containerRect.left;
          const isRightCutOff = tabRect.right > containerRect.right;

          if (isLeftCutOff) {
            const targetScrollLeft = container.scrollLeft + (tabRect.left - containerRect.left) - 8;
            container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
          } else if (isRightCutOff) {
            const targetScrollLeft = container.scrollLeft + (tabRect.right - containerRect.right) + 8;
            container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
          }
        }
      };
      scrollTab();
      const timer = setTimeout(scrollTab, 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeId]);

  // ── Spellcheck toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.querySelector(".notepad-editor");
    if (el) el.setAttribute("spellcheck", String(settings.spellCheck));
  }, [settings.spellCheck]);

  // ── Snap rich blocks to baseline grid for ruled lines to prevent alignment drift ──
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const alignBlocksToGrid = () => {
      if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return;

      const runAlign = () => {
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return;
        const editorEl = editor.view.dom;
        if (!editorEl) return;

        const blocks = editorEl.querySelectorAll(".notepad-code-block-wrapper, table, blockquote, hr, img, .image-node");

        if (!settings.ruledLines) {
          // Clear snaps if ruled lines are turned off
          blocks.forEach((el: any) => {
            if (el.style.paddingBottom) el.style.paddingBottom = "";
            if (el.style.marginTop) el.style.marginTop = "";
            if (el.style.marginBottom) el.style.marginBottom = "";
          });
          return;
        }

        const G = settings.fontSize * settings.lineHeight; // exact grid height in pixels

        blocks.forEach((el: any) => {
          if (el.style.paddingBottom) el.style.paddingBottom = "";
          if (el.style.marginTop) el.style.marginTop = "";

          const naturalHeight = el.offsetHeight;
          if (naturalHeight === 0) return;

          const minGap = G / 2;
          const targetHeight = Math.ceil((naturalHeight + minGap) / G) * G;
          const needed = targetHeight - naturalHeight;
          const neededStr = needed > 0 ? `${needed}px` : "";

          // Snapping uses marginBottom in ruled mode to prevent stretching internal block backgrounds
          if (el.style.marginBottom !== neededStr) {
            el.style.marginBottom = neededStr;
          }
        });

        // Register onload listeners for all images inside the editor to re-align once loaded
        const images = editorEl.querySelectorAll("img");
        images.forEach((img: any) => {
          if (!img.onload) {
            img.onload = () => {
              alignBlocksToGrid();
            };
          }
        });
      };

      // Defer measurements to allow DOM layouts to compute and React custom node views to paint
      requestAnimationFrame(() => {
        runAlign();
        setTimeout(runAlign, 60);
        setTimeout(runAlign, 180);
      });
    };

    // Run initial alignment
    alignBlocksToGrid();

    // Observe changes inside the editor
    editor.on("update", alignBlocksToGrid);
    editor.on("selectionUpdate", alignBlocksToGrid);

    // Watch for window resize changes
    window.addEventListener("resize", alignBlocksToGrid);

    // Set up a MutationObserver to react to structural changes
    let observer: MutationObserver | null = null;
    if (editor.view && editor.view.dom) {
      observer = new MutationObserver(alignBlocksToGrid);
      observer.observe(editor.view.dom, {
        childList: true,
        subtree: true,
        attributes: false, // Crucial: false to prevent triggering loops on style updates
        characterData: true
      });
    }

    return () => {
      if (!editor.isDestroyed) {
        editor.off("update", alignBlocksToGrid);
        editor.off("selectionUpdate", alignBlocksToGrid);
      }
      window.removeEventListener("resize", alignBlocksToGrid);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [editor, settings.ruledLines, settings.fontSize, settings.lineHeight]);

  // Tab Switch Calibration Dispatcher
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(timer);
  }, [activeId]);

  // Reset link popover states when notes change to prevent leakage
  useEffect(() => {
    closeLinkPopover();
  }, [activeId]);

  // ── Load Google Identity Services ──────────────────────────────────────────
  useEffect(() => {
    if (!GCID) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch { } };
  }, [GCID]);

  // ── Find & Replace ─────────────────────────────────────────────────────────
  const scrollToMatch = useCallback((index: number, matches: { from: number; to: number }[]) => {
    if (!editor || !matches[index]) return;
    const { from, to } = matches[index];
    editor.commands.setTextSelection({ from, to });
    editor.commands.scrollIntoView();
  }, [editor]);

  const handleSearchChange = useCallback((term: string) => {
    setFindText(term);
    if (!editor) return;
    (editor.commands as any).setSearchTerm(term);
    const matches = (editor.storage as any).searchAndReplace?.results || [];
    setFindResultsCount(matches.length);
    setFindActiveIndex(0);
    if (matches.length > 0) {
      scrollToMatch(0, matches);
    }
  }, [editor, scrollToMatch]);

  const handleNextMatch = useCallback(() => {
    if (!editor) return;
    const matches = (editor.storage as any).searchAndReplace?.results || [];
    if (!matches.length) return;
    const nextIndex = (findActiveIndex + 1) % matches.length;
    setFindActiveIndex(nextIndex);
    (editor.commands as any).setSearchActiveIndex(nextIndex);
    scrollToMatch(nextIndex, matches);
  }, [editor, findActiveIndex, scrollToMatch]);

  const handlePrevMatch = useCallback(() => {
    if (!editor) return;
    const matches = (editor.storage as any).searchAndReplace?.results || [];
    if (!matches.length) return;
    const prevIndex = (findActiveIndex - 1 + matches.length) % matches.length;
    setFindActiveIndex(prevIndex);
    (editor.commands as any).setSearchActiveIndex(prevIndex);
    scrollToMatch(prevIndex, matches);
  }, [editor, findActiveIndex, scrollToMatch]);

  const handleReplace = useCallback(() => {
    if (!editor || !findText.trim()) return;
    (editor.commands as any).replace(replaceText);
    setTimeout(() => {
      const matches = (editor.storage as any).searchAndReplace?.results || [];
      setFindResultsCount(matches.length);
      const nextIndex = findActiveIndex >= matches.length ? 0 : findActiveIndex;
      setFindActiveIndex(nextIndex);
      (editor.commands as any).setSearchActiveIndex(nextIndex);
      if (matches.length > 0) {
        scrollToMatch(nextIndex, matches);
      }
    }, 10);
  }, [editor, findText, replaceText, findActiveIndex, scrollToMatch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !findText.trim()) return;
    (editor.commands as any).replaceAll(replaceText);
    setTimeout(() => {
      setFindText("");
      (editor.commands as any).setSearchTerm("");
      setFindResultsCount(0);
      setFindActiveIndex(0);
      toast.success("All occurrences replaced");
    }, 10);
  }, [editor, findText, replaceText]);

  const closeFind = useCallback(() => {
    setShowFind(false);
    setShowReplace(false);
    setFindText("");
    setReplaceText("");
    setFindResultsCount(0);
    setFindActiveIndex(0);
    if (editor) {
      (editor.commands as any).setSearchTerm("");
    }
  }, [editor]);

  // Debounced Outline Generator
  useEffect(() => {
    if (!editor || !showOutline) return undefined;

    const timer = setTimeout(() => {
      const headingElements = editor.view.dom.querySelectorAll("h1, h2, h3");
      const list = Array.from(headingElements).map((el, i) => ({
        text: el.textContent || "Untitled Heading",
        level: parseInt(el.tagName.charAt(1), 10),
        index: i
      }));
      setHeadings(list);
    }, 250);

    return () => clearTimeout(timer);
  }, [activeDoc?.content, editor, showOutline]);

  // Active heading tracker during scroll
  useEffect(() => {
    if (!showOutline || !editor) return undefined;

    const handleScroll = () => {
      const headingElements = editor.view.dom.querySelectorAll("h1, h2, h3");
      let currentActive: number | null = null;
      let minDiff = Infinity;
      const threshold = 140;

      headingElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold + 60) {
          const diff = Math.abs(rect.top - threshold);
          if (diff < minDiff) {
            minDiff = diff;
            currentActive = index;
          }
        }
      });

      if (currentActive === null && headingElements.length > 0) {
        currentActive = 0;
      }

      setActiveHeadingIndex(currentActive);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    editor.on("selectionUpdate", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      editor.off("selectionUpdate", handleScroll);
    };
  }, [editor, showOutline, headings]);

  // Ctrl + Mouse Wheel Zoom Listener
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setSettings((prev) => {
          const current = prev.zoom || 1.0;
          let nextVal = current;
          if (e.deltaY < 0) {
            nextVal = Math.min(1.5, parseFloat((current + 0.1).toFixed(1)));
          } else {
            nextVal = Math.max(0.8, parseFloat((current - 0.1).toFixed(1)));
          }
          if (nextVal !== current) {
            const next = { ...prev, zoom: nextVal };
            localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
            return next;
          }
          return prev;
        });
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const getSmartSaveExtension = (html: string): string => {
    const hasImages = html.includes("<img");
    const hasTables = html.includes("<table") || html.includes("<tr") || html.includes("<td");
    const hasHighlight = html.includes("<mark");
    const hasCodeBlocks = html.includes("<pre") || html.includes("<code");
    const hasRichFormatting = html.includes("<a ") || html.includes("<strong") || html.includes("<em") || html.includes("<u") || html.includes("<s") || html.includes("<h1") || html.includes("<h2") || html.includes("<h3") || html.includes("<ul") || html.includes("<ol");
    if (hasImages || hasTables || hasHighlight || hasCodeBlocks || hasRichFormatting) return "html";
    return "txt";
  };

  const htmlToMarkdown = async (html: string): Promise<string> => {
    const TDS = (await import("turndown")) as any;
    const TurndownService = TDS.default ?? TDS;
    const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
    td.addRule("task", {
      filter: (n: Element) => n.nodeName === "LI" && n.getAttribute("data-type") === "taskItem",
      replacement: (content: string, node: Element) =>
        `- [${node.getAttribute("data-checked") === "true" ? "x" : " "}] ${content.replace(/^\n+/, "").trimEnd()}\n`,
    });
    td.addRule("codeBlock", {
      filter: (n: Element) => n.nodeName === "PRE",
      replacement: (_content: string, node: Element) => {
        const code = node.querySelector("code");
        const text = code ? code.textContent || "" : node.textContent || "";
        return `\n\n\`\`\`\n${text.trimEnd()}\n\`\`\`\n\n`;
      },
    });
    td.addRule("highlight", { filter: ["mark"], replacement: (content: string) => content });
    td.addRule("table", { filter: ["table"], replacement: (_content: string, node: Element) => `\n\n${node.outerHTML}\n\n` });
    td.addRule("image", {
      filter: ["img"],
      replacement: (_content: string, node: Element) => {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "image";
        if (src.startsWith("data:")) return `\n\n![${alt}](embedded-image)\n\n`;
        return `\n\n![${alt}](${src})\n\n`;
      },
    });
    return td.turndown(html);
  };

  const beautifyHtmlNode = (node: Node, depth: number = 0): string => {
    const indent = "  ".repeat(depth);
    
    if (node.nodeType === 3) { // Node.TEXT_NODE
      const text = node.textContent?.replace(/\s+/g, ' ').trim() || "";
      return text ? text : "";
    }
    
    if (node.nodeType === 1) { // Node.ELEMENT_NODE
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      const isSelfClosing = ["img", "br", "hr", "input", "meta", "link"].includes(tagName);
      
      let attrs = "";
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs += ` ${attr.name}="${attr.value}"`;
      }
      
      if (isSelfClosing) {
        return `${indent}<${tagName}${attrs} />\n`;
      }

      const blockTags = ["html", "head", "body", "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "pre", "section", "article", "header", "footer", "style"];
      const isBlock = blockTags.includes(tagName);
      
      const hasBlockChild = Array.from(el.childNodes).some(child => 
        child.nodeType === 1 && blockTags.includes((child as Element).tagName.toLowerCase())
      );
      
      if (hasBlockChild || (isBlock && el.childNodes.length > 1)) {
        let childrenStr = "";
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          const childStr = beautifyHtmlNode(child, depth + 1);
          if (childStr) {
            childrenStr += childStr.endsWith("\n") ? childStr : `${"  ".repeat(depth + 1)}${childStr}\n`;
          }
        }
        return `${indent}<${tagName}${attrs}>\n${childrenStr}${indent}</${tagName}>\n`;
      } else {
        let inlineContent = "";
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === 3) {
            inlineContent += child.textContent || "";
          } else if (child.nodeType === 1) {
            const childEl = child as Element;
            const childTag = childEl.tagName.toLowerCase();
            let childAttrs = "";
            for (let j = 0; j < childEl.attributes.length; j++) {
              const attr = childEl.attributes[j];
              childAttrs += ` ${attr.name}="${attr.value}"`;
            }
            const childIsSelfClosing = ["img", "br", "hr"].includes(childTag);
            if (childIsSelfClosing) {
              inlineContent += `<${childTag}${childAttrs} />`;
            } else {
              inlineContent += `<${childTag}${childAttrs}>${childEl.textContent || ""}</${childTag}>`;
            }
          }
        }
        inlineContent = inlineContent.replace(/\s+/g, ' ').trim();
        return `${indent}<${tagName}${attrs}>${inlineContent}</${tagName}>\n`;
      }
    }
    
    return "";
  };

  const beautifyHtml = (html: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const hasDoctype = html.toLowerCase().includes("<!doctype");
      if (hasDoctype) {
        return "<!DOCTYPE html>\n" + beautifyHtmlNode(doc.documentElement).trim();
      } else {
        let result = "";
        for (let i = 0; i < doc.body.childNodes.length; i++) {
          result += beautifyHtmlNode(doc.body.childNodes[i]);
        }
        return result.trim();
      }
    } catch (e) {
      console.error("HTML beautification failed, returning raw html", e);
      return html;
    }
  };

  const beautifyMarkdown = (markdown: string): string => {
    let lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const result: string[] = [];
    let consecutiveBlanks = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      
      if (line === "") {
        consecutiveBlanks++;
        if (consecutiveBlanks <= 1 && result.length > 0) {
          result.push("");
        }
      } else {
        consecutiveBlanks = 0;
        const isHeading = /^#+\s/.test(line);
        const isList = /^([\*\-\+]\s|\d+\.\s)/.test(line);
        
        if (result.length > 0 && result[result.length - 1] !== "") {
          if (isHeading || (isList && !/^([\*\-\+]\s|\d+\.\s)/.test(result[result.length - 1]))) {
            result.push("");
          }
        }
        result.push(line);
      }
    }
    return result.join("\n").trim();
  };

  const generateFullHtml = (title: string, bodyContent: string): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; padding: 20px 24px; max-width: 720px; margin: 0 auto; color: #1a1a1a; background: #ffffff; }
    h1, h2, h3 { font-family: 'Sora', sans-serif; font-weight: 700; color: #0d1117; margin-top: 1.6em; margin-bottom: 0.5em; }
    h1 { font-size: 22pt; } h2 { font-size: 17pt; } h3 { font-size: 13pt; }
    p { margin-bottom: 0.75em; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; background: #f0f0f0; border: 1px solid #e0e0e0; border-radius: 3px; padding: 0.1em 0.35em; color: #c7254e; }
    pre { font-family: 'JetBrains Mono', monospace; font-size: 9pt; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 14px 18px; margin: 1em 0; white-space: pre-wrap; }
    pre code { background: none; border: none; padding: 0; color: #24292f; }
    blockquote { border-left: 4px solid #6366f1; margin: 1.2em 0; padding: 10px 16px; background: #f8f7ff; border-radius: 0 6px 6px 0; color: #374151; font-style: italic; }
    ul, ol { margin: 0.5em 0 0.75em 1.5em; }
    li { margin-bottom: 0.3em; }
    table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  };

  const handleOpenFileAccess = async () => {
    try {
      if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: "Text/HTML Files", accept: { "text/plain": [".txt"], "text/markdown": [".md"], "text/html": [".html", ".htm"] } }],
        });
        const file = await handle.getFile();
        const text = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, "");

        if (file.size > 1.0 * 1024 * 1024) {
          setLargeFilePrompt({
            fileName: file.name,
            fileSize: file.size,
            fileText: text,
            handle
          });
          return;
        }

        const newDoc: NotepadDoc = {
          id: Math.random().toString(36).substring(2, 11),
          title: title,
          content: text.includes("<p>") || text.includes("</div>") ? text : text.split("\n").map((l: string) => `<p>${l}</p>`).join(""),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        fileHandlesRef.current[newDoc.id] = handle;
        setDocs(prev => [newDoc, ...prev]);
        setActiveId(newDoc.id);
        setSaveStatus("saved");
        toast.success(`Opened ${file.name}`);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.md,.html,.htm";
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const text = await file.text();
          const title = file.name.replace(/\.[^/.]+$/, "");

          if (file.size > 1.0 * 1024 * 1024) {
            setLargeFilePrompt({
              fileName: file.name,
              fileSize: file.size,
              fileText: text
            });
            return;
          }

          const newDoc: NotepadDoc = {
            id: Math.random().toString(36).substring(2, 11),
            title: title,
            content: text.includes("<p>") || text.includes("</div>") ? text : text.split("\n").map((l: string) => `<p>${l}</p>`).join(""),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setDocs(prev => [newDoc, ...prev]);
          setActiveId(newDoc.id);
          setSaveStatus("saved");
          toast.success(`Opened ${file.name}`);
        };
        input.click();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        toast.error("Error opening file");
      }
    }
  };

  const handleSaveFileAccess = async (saveAs: boolean = false) => {
    if (!editor || !activeDoc) return;
    try {
      let handle = saveAs ? null : fileHandlesRef.current[activeDoc.id];
      const html = editor.getHTML();

      if (!handle) {
        const ext = getSmartSaveExtension(html);
        let defaultName = activeDoc.title || "Untitled";
        defaultName = defaultName.replace(/\.(txt|md|html|htm)$/i, "");
        defaultName = `${defaultName}.${ext}`;

        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultName,
            types: [
              {
                description: ext === "html" ? "HTML Files" : ext === "md" ? "Markdown Files" : "Text Files",
                accept: {
                  [ext === "html" ? "text/html" : ext === "md" ? "text/markdown" : "text/plain"]: [`.${ext}`],
                },
              },
            ],
          });
        }
      }

      if (handle) {
        const file = await handle.getFile();
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let contentToWrite = "";

        if (fileExt === 'md') {
          contentToWrite = await htmlToMarkdown(html);
        } else if (fileExt === 'html' || fileExt === 'htm') {
          contentToWrite = generateFullHtml(activeDoc.title, html);
        } else {
          contentToWrite = editor.getText();
        }

        const writable = await handle.createWritable();
        await writable.write(contentToWrite);
        await writable.close();

        const newTitle = file.name.replace(/\.[^/.]+$/, "");
        fileHandlesRef.current[activeDoc.id] = handle;

        setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, title: newTitle } : d));
        setLastSaved(new Date());
        setSaveStatus("saved");
        toast.success(`Saved to ${file.name}`);
      } else {
        const ext = getSmartSaveExtension(html);
        let defaultName = activeDoc.title || "Untitled";
        defaultName = defaultName.replace(/\.(txt|md|html|htm)$/i, "");
        defaultName = `${defaultName}.${ext}`;

        let contentToWrite = "";
        let mime = "text/plain";
        if (ext === 'md') {
          contentToWrite = await htmlToMarkdown(html);
          mime = "text/markdown";
        } else if (ext === 'html') {
          contentToWrite = generateFullHtml(activeDoc.title, html);
          mime = "text/html";
        } else {
          contentToWrite = editor.getText();
        }
        dl(contentToWrite, defaultName, mime);
        setLastSaved(new Date());
        setSaveStatus("saved");
        toast.success(`Exported ${defaultName}`);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        toast.error("Error saving file");
      }
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl + = or Ctrl + + (Zoom In) - Electron Only
      if (isElectron && ctrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setSettings((prev) => {
          const current = prev.zoom || 1.0;
          const nextVal = Math.min(1.5, parseFloat((current + 0.1).toFixed(1)));
          const next = { ...prev, zoom: nextVal };
          localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
          return next;
        });
        return;
      }

      // Ctrl + - (Zoom Out) - Electron Only
      if (isElectron && ctrl && e.key === "-") {
        e.preventDefault();
        setSettings((prev) => {
          const current = prev.zoom || 1.0;
          const nextVal = Math.max(0.8, parseFloat((current - 0.1).toFixed(1)));
          const next = { ...prev, zoom: nextVal };
          localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
          return next;
        });
        return;
      }

      // Ctrl + 0 (Reset Zoom) - Electron Only
      if (isElectron && ctrl && e.key === "0" && !e.shiftKey) {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, zoom: 1.0 };
          localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
          return next;
        });
        return;
      }

      // Ctrl + , (Settings)
      if (ctrl && e.key === ",") {
        e.preventDefault();
        setShowSettings(prev => !prev);
        setShowFileMenu(false);
        setShowExportMenu(false);
        return;
      }

      // Ctrl + / (Keyboard Shortcuts dialog)
      if (ctrl && e.key === "/") {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Ctrl + Shift + S (Save As)
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFileAccess(true);
        return;
      }

      // Ctrl + S (Save)
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFileAccess(false);
        return;
      }

      // Ctrl + O (Open)
      if (ctrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenFileAccess();
        return;
      }

      // Ctrl + P (Print / PDF Export)
      if (ctrl && e.key.toLowerCase() === "p") {
        e.preventDefault();
        exportPdf();
        return;
      }

      // Ctrl + \ (Toggle Outline sidebar)
      if (ctrl && !e.shiftKey && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        setShowOutline(prev => !prev);
        return;
      }

      // Ctrl + Shift + \ (Focus Mode)
      if (ctrl && e.shiftKey && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        toggleFocus();
        return;
      }

      // Ctrl + D (Smart Export)
      if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleSmartExport();
        return;
      }

      // New Note: Ctrl + Alt + N (Web) / Ctrl + N or Ctrl + T (Electron)
      const isNewNote = isElectron
        ? (ctrl && !e.shiftKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "t"))
        : (ctrl && e.altKey && e.key.toLowerCase() === "n");
      if (isNewNote) {
        e.preventDefault();
        createDoc();
        return;
      }

      // Close Current Note: Ctrl + Alt + W (Web) / Ctrl + W (Electron)
      const isCloseNote = isElectron
        ? (ctrl && !e.shiftKey && e.key.toLowerCase() === "w")
        : (ctrl && e.altKey && e.key.toLowerCase() === "w");
      if (isCloseNote) {
        e.preventDefault();
        deleteDoc(activeId);
        return;
      }

      // Restore Closed Note: Ctrl + Shift + T or Ctrl + Alt + T
      const isRestoreNote = ctrl && (e.shiftKey || e.altKey) && e.key.toLowerCase() === "t";
      if (isRestoreNote) {
        e.preventDefault();
        undoLastDelete();
        return;
      }

      // Next Tab: Ctrl + Alt + ArrowRight (Web) / Ctrl + Tab (Electron)
      const isNextTab = isElectron
        ? (ctrl && !e.shiftKey && e.key === "Tab")
        : (ctrl && e.altKey && (e.key === "ArrowRight" || e.code === "ArrowRight"));
      if (isNextTab) {
        e.preventDefault();
        if (sortedDocs.length > 1) {
          const currentIndex = sortedDocs.findIndex((d) => d.id === activeId);
          const nextIndex = (currentIndex + 1) % sortedDocs.length;
          setActiveId(sortedDocs[nextIndex].id);
        }
        return;
      }

      // Previous Tab: Ctrl + Alt + ArrowLeft (Web) / Ctrl + Shift + Tab (Electron)
      const isPrevTab = isElectron
        ? (ctrl && e.shiftKey && e.key === "Tab")
        : (ctrl && e.altKey && (e.key === "ArrowLeft" || e.code === "ArrowLeft"));
      if (isPrevTab) {
        e.preventDefault();
        if (sortedDocs.length > 1) {
          const currentIndex = sortedDocs.findIndex((d) => d.id === activeId);
          const prevIndex = (currentIndex - 1 + sortedDocs.length) % sortedDocs.length;
          setActiveId(sortedDocs[prevIndex].id);
        }
        return;
      }

      // Tab selection by index (1-9): Alt + [1-9] (Web) / Ctrl + [1-9] (Electron)
      const isTabIndexMatch = isElectron
        ? (ctrl && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key))
        : (!ctrl && e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key));
      if (isTabIndexMatch) {
        e.preventDefault();
        const tabNumber = parseInt(e.key, 10);
        if (tabNumber === 9) {
          if (sortedDocs.length > 0) {
            setActiveId(sortedDocs[sortedDocs.length - 1].id);
          }
        } else {
          const targetIndex = tabNumber - 1;
          if (targetIndex < sortedDocs.length) {
            setActiveId(sortedDocs[targetIndex].id);
          }
        }
        return;
      }

      // Editor-level focus check helpers
      const ae = document.activeElement as HTMLElement | null;
      const inEditor = ae?.closest?.(".ProseMirror");
      const inInput = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);

      // Highlight: Ctrl + H or Ctrl + Shift + H - editor focused only
      if (ctrl && e.key.toLowerCase() === "h") {
        if (inEditor) {
          e.preventDefault();
          editor?.chain().focus().toggleHighlight().run();
          return;
        }
      }

      // Ctrl + K (Link Popover)
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === "k") {
        if (inEditor) {
          e.preventDefault();
          insertLink();
          return;
        }
      }

      // Blockquote: Ctrl + Shift + B (Electron) vs. Ctrl + Shift + Q (Web)
      const isBlockquote = isElectron
        ? (ctrl && e.shiftKey && e.key.toLowerCase() === "b")
        : (ctrl && e.shiftKey && e.key.toLowerCase() === "q");
      if (isBlockquote) {
        if (inEditor) {
          e.preventDefault();
          editor?.chain().focus().toggleBlockquote().run();
          return;
        }
      }

      // Inline Code: Ctrl + E (Electron) vs. Ctrl + Alt + E (Web)
      const isInlineCode = isElectron
        ? (ctrl && !e.shiftKey && e.key.toLowerCase() === "e")
        : (ctrl && e.altKey && e.key.toLowerCase() === "e");
      if (isInlineCode) {
        if (inEditor) {
          e.preventDefault();
          editor?.chain().focus().toggleCode().run();
          return;
        }
      }

      // Ctrl + Shift + F (Replace Pane)
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (showFind && showReplace) {
          closeFind();
        } else {
          setShowFind(true);
          setShowReplace(true);
          setTimeout(() => {
            replaceInputRef.current?.focus();
            replaceInputRef.current?.select();
          }, 50);
        }
        return;
      }

      // Ctrl + F (Find Pane)
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === "f") {
        if (inEditor || inInput || showFind) {
          e.preventDefault();
          if (showFind && !showReplace) {
            findInputRef.current?.select();
          } else {
            setShowFind(true);
            setShowReplace(false);
            setTimeout(() => {
              findInputRef.current?.focus();
              findInputRef.current?.select();
            }, 50);
          }
        }
      }

      if (e.key === "Escape") {
        closeFind();
        setShowDocMenu(false);
        setShowExportMenu(false);
        setShowSettings(false);
        setShowShortcuts(false);
        setShowFileMenu(false);
        setShowColorPicker(false);
        setShowTableMenu(false);
        setContextMenu(null);
        setEditingTabId(null);
        cancelConfirm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, activeDoc, activeId, sortedDocs, showFind, showReplace, closeFind]); // eslint-disable-line

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

  useEffect(() => {
    const handleGlobalClick = () => {
      if (editorContextMenu?.visible) {
        setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
    };
  }, [editorContextMenu]);

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

  const copyImageToClipboard = useCallback(async (src: string) => {
    try {
      let response = await fetch(src);
      let blob = await response.blob();

      if (blob.type !== "image/png") {
        const img = new Image();
        img.src = src;
        await new Promise((resolve) => img.onload = resolve);

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/png");
          });
          if (pngBlob) {
            blob = pngBlob;
          }
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast.success("Image copied to clipboard");
    } catch (err) {
      console.error("Failed to copy image: ", err);
      toast.error("Failed to copy image to clipboard");
    }
  }, []);

  const downloadImage = useCallback((src: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = "notepad_image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image download started");
  }, []);

  const deleteImageAtPos = useCallback((pos: number) => {
    if (!editor) return;
    editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
    toast.success("Image deleted");
  }, [editor]);

  const setImageSizeAtPos = useCallback((pos: number, size: ImgSize) => {
    if (!editor) return;
    editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { size }).run();
  }, [editor]);


  // ── Doc management ─────────────────────────────────────────────────────────
  const createDoc = () => {
    const d = newDoc();
    setDocs((prev) => { const next = [...prev, d]; saveDocs(next); return next; });
    setActiveId(d.id);
    setEditingTabId(d.id);
    setShowDocMenu(false);
    setTimeout(() => titleInputRef.current?.select(), 80);
  };

  // ── Two-stage delete with undo ────────────────────────────────────────────
  // Pattern matches Linear/Notion: row morphs into "Delete?" inline confirm,
  // confirm pushes a snapshot onto an undo stack so Ctrl+Z (when not focused
  // in the editor) or the toast "Undo" action restores the docs.
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelConfirm = useCallback(() => {
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
    setConfirmDeleteId(null);
    setConfirmClearAll(false);
    setDeleteConfirm(null);
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
    saveUndoStack(undoStackRef.current);
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

    const targetDoc = docs.find((d) => d.id === id);
    if (targetDoc?.isPinned && !deleteConfirm) {
      const confirmClose = window.confirm(`Note "${targetDoc.title || "Untitled"}" is pinned. Are you sure you want to delete it?`);
      if (!confirmClose) { cancelConfirm(); return; }
    }

    // Snapshot BEFORE delete so undo restores exact prior state
    undoStackRef.current.push({ docs: [...docs], activeId });
    if (undoStackRef.current.length > 10) undoStackRef.current.shift();
    saveUndoStack(undoStackRef.current);

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
    saveUndoStack(undoStackRef.current);

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
    if (!focusMode) { document.documentElement.requestFullscreen?.().catch(() => { }); setFocusMode(true); }
    else { document.exitFullscreen?.().catch(() => { }); setFocusMode(false); }
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
    if (!editor) return;
    editor.commands.focus();
    const existing = editor.getAttributes("link").href ?? "";
    setLinkInputUrl(existing);
    setIsEditingLink(!existing); // if no existing link, start in editing mode; if there is one, start in preview mode
    setIsLinkPopoverOpen(true);
    setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        editor.view.dispatch(editor.state.tr);
      }
    }, 10);
  };

  const closeLinkPopover = () => {
    setIsLinkPopoverOpen(false);
    setIsEditingLink(false);
    setLinkInputUrl("");
    setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        editor.view.dispatch(editor.state.tr);
      }
    }, 10);
  };

  const updateLinkPopoverCoords = () => {
    if (!editor || !isLinkPopoverOpen) {
      setLinkPopoverCoords(null);
      return;
    }
    try {
      const { selection } = editor.state;
      const fromCoords = editor.view.coordsAtPos(selection.from);
      const toCoords = editor.view.coordsAtPos(selection.to);

      const left = (fromCoords.left + toCoords.left) / 2;
      const top = Math.max(fromCoords.bottom, toCoords.bottom) + 14;

      const popoverWidth = 340;
      const viewportWidth = window.innerWidth;
      const adjustedLeft = Math.max(12, Math.min(left - popoverWidth / 2, viewportWidth - popoverWidth - 12));

      setLinkPopoverCoords({
        top,
        left: adjustedLeft
      });
    } catch (e) {
      try {
        const domRect = editor.view.dom.getBoundingClientRect();
        setLinkPopoverCoords({
          top: domRect.top + 80,
          left: domRect.left + (domRect.width - 340) / 2
        });
      } catch (err) { }
    }
  };

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      updateLinkPopoverCoords();
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor, isLinkPopoverOpen]);

  const saveLink = (url: string) => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      let formattedUrl = trimmed;
      if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl) && !/^tel:/i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor.chain().focus().setLink({ href: formattedUrl }).run();
    }
    closeLinkPopover();
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
    const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });

    // Task list items
    td.addRule("task", {
      filter: (n: Element) => n.nodeName === "LI" && n.getAttribute("data-type") === "taskItem",
      replacement: (content: string, node: Element) =>
        `- [${node.getAttribute("data-checked") === "true" ? "x" : " "}] ${content.replace(/^\n+/, "").trimEnd()}\n`,
    });

    // Code blocks — TipTap wraps in NodeViewWrapper div > pre > code
    // We target the <pre> element and wrap the inner text in fenced code blocks
    td.addRule("codeBlock", {
      filter: (n: Element) => n.nodeName === "PRE",
      replacement: (_content: string, node: Element) => {
        const code = node.querySelector("code");
        const text = code ? code.textContent || "" : node.textContent || "";
        return `\n\n\`\`\`\n${text.trimEnd()}\n\`\`\`\n\n`;
      },
    });

    // Inline highlight → backtick code if inside regular text
    td.addRule("highlight", {
      filter: ["mark"],
      replacement: (content: string) => content,
    });

    // Tables — Turndown doesn't handle tables by default;
    // fall back to preserving the raw HTML table for readability
    td.addRule("table", {
      filter: ["table"],
      replacement: (_content: string, node: Element) => `\n\n${node.outerHTML}\n\n`,
    });

    // Images — strip base64 srcs to keep file size manageable, write as [alt](image)
    td.addRule("image", {
      filter: ["img"],
      replacement: (_content: string, node: Element) => {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "image";
        // Skip embedding 100KB+ base64 blobs — write a placeholder instead
        if (src.startsWith("data:")) return `\n\n![${alt}](embedded-image)\n\n`;
        return `\n\n![${alt}](${src})\n\n`;
      },
    });

    dl(td.turndown(html), `${activeDoc.title}.md`, "text/markdown");
  };

  const exportPdf = () => {
    setShowExportMenu(false);
    const html = editor?.getHTML() ?? "";
    const title = activeDoc?.title || "Note";

    // Build a clean standalone print document.
    // This approach (used by Notion, Google Docs, Confluence) produces:
    //   • Real selectable/searchable text PDF (not a screenshot)
    //   • White background — no theme colours bleed through
    //   • Proper font rendering and page breaks
    //   • Tiny file size (typically 50-300KB vs 28MB for html2canvas bitmap)
    const printDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.75;
      color: #1a1a1a;
      background: #ffffff;
      max-width: 720px;
      margin: 0 auto;
      padding: 20px 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Headings ── */
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Sora', 'Inter', sans-serif;
      font-weight: 700;
      color: #0d1117;
      margin-top: 1.6em;
      margin-bottom: 0.5em;
      line-height: 1.3;
      page-break-after: avoid;
    }
    h1 { font-size: 22pt; }
    h2 { font-size: 17pt; }
    h3 { font-size: 13pt; }

    /* ── Paragraphs & spacing ── */
    p { margin-bottom: 0.75em; }
    p:last-child { margin-bottom: 0; }

    /* ── Bold / Italic / Underline / Strike ── */
    strong, b { font-weight: 600; color: #0d1117; }
    em, i { font-style: italic; }
    u { text-decoration: underline; text-underline-offset: 2px; }
    s, del { text-decoration: line-through; color: #6b7280; }

    /* ── Inline code ── */
    code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 0.88em;
      background: #f0f0f0;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      padding: 0.1em 0.35em;
      color: #c7254e;
    }

    /* ── Code blocks ── */
    pre {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.6;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 14px 18px;
      overflow-x: auto;
      margin: 1em 0;
      page-break-inside: avoid;
      white-space: pre-wrap;
      word-break: break-word;
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
      color: #24292f;
      font-size: inherit;
    }

    /* ── Blockquote ── */
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 1.2em 0;
      padding: 10px 16px;
      background: #f8f7ff;
      border-radius: 0 6px 6px 0;
      color: #374151;
      font-style: italic;
      page-break-inside: avoid;
    }
    blockquote p { margin-bottom: 0; }

    /* ── Lists ── */
    ul, ol {
      margin: 0.5em 0 0.75em 1.5em;
      padding: 0;
    }
    li {
      margin-bottom: 0.3em;
      line-height: 1.7;
    }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    ul ul { list-style-type: circle; }
    ul ul ul { list-style-type: square; }

    /* ── Task list ── */
    ul[data-type="taskList"] {
      list-style: none;
      margin-left: 0.5em;
    }
    li[data-type="taskItem"] {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    li[data-type="taskItem"] > label { flex-shrink: 0; margin-top: 2px; }
    li[data-type="taskItem"][data-checked="true"] > div { 
      text-decoration: line-through; 
      color: #9ca3af; 
    }

    /* ── Highlight ── */
    mark {
      background: #fef08a;
      color: #713f12;
      border-radius: 2px;
      padding: 0 2px;
    }

    /* ── Links ── */
    a {
      color: #1d4ed8;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    /* Print full URLs after links */
    @media print {
      a[href^="http"]::after {
        content: " (" attr(href) ")";
        font-size: 8pt;
        color: #6b7280;
        word-break: break-all;
      }
    }

    /* ── Horizontal rule ── */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }

    /* ── Images ── */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      margin: 1em auto;
      page-break-inside: avoid;
    }

    /* ── Tables ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.2em 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #111827;
    }
    tr:nth-child(even) td { background: #f9fafb; }

    /* ── Print page setup ── */
    @page {
      size: A4 portrait;
      margin: 20mm 18mm;
    }
    @media print {
      body { padding: 0; max-width: 100%; }
      h1, h2, h3 { page-break-after: avoid; }
      pre, blockquote, table, img { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    // Auto-trigger print dialog after fonts load
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      toast.error("Print blocked", { description: "Please allow pop-ups for this site, then try again." });
      return;
    }
    printWin.document.write(printDoc);
    printWin.document.close();
    toast.success("Print dialog opening…", { description: "Choose 'Save as PDF' to download." });
  };

  const exportHtml = () => {
    const title = activeDoc?.title || "Note";
    const content = editor?.getHTML() ?? "";
    // Full-featured standalone HTML — same quality stylesheet as the PDF print export
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 17px; line-height: 1.75; color: #1a1a1a; background: #fff; max-width: 760px; margin: 48px auto; padding: 0 28px; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Sora', 'Inter', sans-serif; font-weight: 700; color: #0d1117; margin-top: 1.6em; margin-bottom: 0.45em; line-height: 1.3; }
    h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.2em; }
    p { margin-bottom: 0.75em; }
    strong, b { font-weight: 600; color: #0d1117; }
    em, i { font-style: italic; }
    u { text-decoration: underline; text-underline-offset: 2px; }
    s, del { text-decoration: line-through; color: #6b7280; }
    code { font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; font-size: 0.87em; background: #f0f0f0; border: 1px solid #e0e0e0; border-radius: 3px; padding: 0.1em 0.35em; color: #c7254e; }
    pre { font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; font-size: 0.87em; line-height: 1.65; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 8px; padding: 14px 18px; overflow-x: auto; margin: 1.2em 0; white-space: pre-wrap; word-break: break-word; }
    pre code { background: none; border: none; padding: 0; color: #24292f; font-size: inherit; }
    blockquote { border-left: 4px solid #6366f1; margin: 1.2em 0; padding: 10px 16px; background: #f8f7ff; border-radius: 0 6px 6px 0; color: #374151; font-style: italic; }
    blockquote p { margin: 0; }
    ul, ol { margin: 0.5em 0 0.75em 1.6em; padding: 0; }
    li { margin-bottom: 0.3em; line-height: 1.7; }
    ul { list-style-type: disc; } ol { list-style-type: decimal; }
    ul[data-type="taskList"] { list-style: none; margin-left: 0.5em; }
    li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; }
    li[data-type="taskItem"][data-checked="true"] > div { text-decoration: line-through; color: #9ca3af; }
    mark { background: #fef08a; color: #713f12; border-radius: 2px; padding: 0 2px; }
    a { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
    img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1.2em auto; }
    table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 0.95em; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; color: #111827; }
    tr:nth-child(even) td { background: #f9fafb; }
  </style>
</head>
<body>${content}</body>
</html>`;
    dl(html, `${title}.html`, "text/html");
    setShowExportMenu(false);
  };

  const handleRawChange = (val: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === activeId ? { ...d, content: val, updatedAt: Date.now(), isUnsaved: true } : d);
      saveDocs(next);
      return next;
    });
    setSaveStatus("unsaved");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setDocs((prev) => {
        const next = prev.map((d) => d.id === activeId ? { ...d, isUnsaved: false } : d);
        saveDocs(next);
        return next;
      });
      setSaveStatus("saved");
      setLastSaved(new Date());
    }, 1200);
  };

  const inlineMarkdownToHtml = (text: string): string => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    html = html.replace(/==(.*?)==/g, "<mark>$1</mark>");
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');
    return html;
  };

  const parseMarkdownToHtml = (md: string): string => {
    if (!md) return "";
    const lines = md.split("\n");
    let htmlResult = [];
    let inList = false;
    let listType: "ul" | "ol" | "taskList" | null = null;
    let inCodeBlock = false;
    let codeBlockLines = [];

    for (let line of lines) {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          htmlResult.push(`<pre><code>${codeBlockLines.join("\n")}</code></pre>`);
          codeBlockLines = [];
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      const checklistMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);

      if (checklistMatch) {
        if (!inList || listType !== "taskList") {
          if (inList) htmlResult.push(listType === "ol" ? "</ol>" : "</ul>");
          htmlResult.push('<ul data-type="taskList">');
          inList = true;
          listType = "taskList";
        }
        const checked = checklistMatch[1].toLowerCase() === "x";
        const content = inlineMarkdownToHtml(checklistMatch[2]);
        htmlResult.push(`<li data-type="taskItem" data-checked="${checked}">${content}</li>`);
        continue;
      }

      if (bulletMatch) {
        if (!inList || listType !== "ul") {
          if (inList) htmlResult.push(listType === "ol" ? "</ol>" : "</ul>");
          htmlResult.push("<ul>");
          inList = true;
          listType = "ul";
        }
        const content = inlineMarkdownToHtml(bulletMatch[1]);
        htmlResult.push(`<li>${content}</li>`);
        continue;
      }

      if (numberMatch) {
        if (!inList || listType !== "ol") {
          if (inList) htmlResult.push(listType === "ol" ? "</ol>" : "</ul>");
          htmlResult.push("<ol>");
          inList = true;
          listType = "ol";
        }
        const content = inlineMarkdownToHtml(numberMatch[2]);
        htmlResult.push(`<li>${content}</li>`);
        continue;
      }

      if (inList) {
        htmlResult.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }

      const h3Match = line.match(/^###\s+(.*)$/);
      const h2Match = line.match(/^##\s+(.*)$/);
      const h1Match = line.match(/^#\s+(.*)$/);

      if (h3Match) {
        htmlResult.push(`<h3>${inlineMarkdownToHtml(h3Match[1])}</h3>`);
      } else if (h2Match) {
        htmlResult.push(`<h2>${inlineMarkdownToHtml(h2Match[1])}</h2>`);
      } else if (h1Match) {
        htmlResult.push(`<h1>${inlineMarkdownToHtml(h1Match[1])}</h1>`);
      } else if (line.trim() === "") {
        htmlResult.push("<p></p>");
      } else {
        htmlResult.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
      }
    }

    if (inList) {
      htmlResult.push(listType === "ol" ? "</ol>" : "</ul>");
    }
    if (inCodeBlock && codeBlockLines.length > 0) {
      htmlResult.push(`<pre><code>${codeBlockLines.join("\n")}</code></pre>`);
    }

    return htmlResult.join("");
  };

  const restoreEmbeddedImages = (html: string, originalHtml: string): string => {
    if (!originalHtml) return html;
    const originalImages: string[] = [];
    const imgRegex = /<img[^>]+src=["'](data:[^"']+)["']/g;
    let match;
    while ((match = imgRegex.exec(originalHtml)) !== null) {
      originalImages.push(match[1]);
    }
    if (originalImages.length === 0) return html;
    
    let imgIndex = 0;
    return html.replace(/src=["']embedded-image["']/g, () => {
      if (imgIndex < originalImages.length) {
        return `src="${originalImages[imgIndex++]}"`;
      }
      return 'src="embedded-image"';
    });
  };

  const isMeaningfulHtml = (html: string): boolean => {
    const compact = (html || "").replace(/\s+/g, "").toLowerCase();
    if (!compact || compact === "<p></p>" || compact === "<p><br></p>") return false;
    const div = document.createElement("div");
    div.innerHTML = html || "";
    if (div.querySelector("img,table,pre,blockquote,ul,ol,hr,h1,h2,h3,h4,h5,h6")) return true;
    return (div.textContent || "").trim().length > 0;
  };

  const getCanonicalRichHtml = (): string => {
    if (!activeDoc) return "";

    if (!activeDoc.mode || activeDoc.mode === "rich") {
      const editorHtml = editor && !editor.isDestroyed ? editor.getHTML() : "";
      if (isMeaningfulHtml(editorHtml)) return editorHtml;
    }

    if (isMeaningfulHtml(activeDoc.content || "")) return activeDoc.content || "";
    if (isMeaningfulHtml(activeDoc.lastRichContent || "")) return activeDoc.lastRichContent || "";

    return activeDoc.content || activeDoc.lastRichContent || "";
  };

  const getHtmlBodyForSource = (): string => {
    if (!activeDoc) return "";
    if (activeDoc.mode === "raw") {
      return restoreEmbeddedImages(parseMarkdownToHtml(activeDoc.content || ""), activeDoc.lastRichContent || "");
    }
    return getCanonicalRichHtml();
  };

  const assertSafeSourceInput = (html: string) => {
    if (!activeDoc) throw new Error("No active note selected.");
    const savedHasContent = isMeaningfulHtml(activeDoc.content || "") || isMeaningfulHtml(activeDoc.lastRichContent || "");
    if (savedHasContent && !isMeaningfulHtml(html)) {
      throw new Error("The editor returned empty source while the saved note has content.");
    }
  };

  const openSourcePreview = async (format: "rich" | "html" | "markdown") => {
    if (!activeDoc) return;
    try {
      const htmlBody = getHtmlBodyForSource();
      assertSafeSourceInput(htmlBody);

      let value = "";
      let warning: string | undefined;
      if (format === "rich") {
        const raw = generateFullHtml(activeDoc.title || "Note", htmlBody);
        value = beautifyHtml(raw);
      } else if (format === "html") {
        const raw = generateFullHtml(activeDoc.title || "Note", htmlBody);
        value = beautifyHtml(raw);
      } else if (activeDoc.mode === "raw") {
        value = activeDoc.content || "";
      } else {
        const rawMarkdown = await htmlToMarkdown(htmlBody);
        value = beautifyMarkdown(rawMarkdown);
        if (/<img[^>]+src=["']data:/i.test(htmlBody)) {
          warning = "Embedded images are represented as placeholders in Markdown. Use HTML export to preserve images inline.";
        }
      }

      if ((activeDoc.content || activeDoc.lastRichContent) && !value.trim()) {
        throw new Error("Generated source was empty.");
      }

      setSourcePreview({ format, title: activeDoc.title || "Note", value, htmlBody, warning });
      setShowExportMenu(false);
      setShowSettings(false);
      toast.success(`${format === "rich" ? "Rich Text" : format === "html" ? "HTML" : "Markdown"} preview ready`);
    } catch (err: any) {
      console.error(err);
      toast.error("Source generation stopped", {
        description: err?.message || "Your note was not changed.",
      });
    }
  };

  const copySourcePreview = async () => {
    if (!sourcePreview) return;
    try {
      if (sourcePreview.format === "rich") {
        const html = sourcePreview.htmlBody || sourcePreview.value;
        const div = document.createElement("div");
        div.innerHTML = html;
        const text = div.textContent || "";
        const NavClipboard = navigator.clipboard as Clipboard | undefined;
        const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
        if (NavClipboard && typeof NavClipboard.write === "function" && CI) {
          await NavClipboard.write([
            new CI({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(text);
        }
      } else {
        await navigator.clipboard.writeText(sourcePreview.value);
      }
      setSourcePreview((prev) => prev ? { ...prev, copied: true } : prev);
      setTimeout(() => setSourcePreview((prev) => prev ? { ...prev, copied: false } : prev), 1600);
      toast.success(`${sourcePreview.format === "rich" ? "Rich Text" : sourcePreview.format === "html" ? "HTML" : "Markdown"} copied`);
    } catch {
      toast.error("Failed to copy source");
    }
  };

  const downloadSourcePreview = () => {
    if (!sourcePreview) return;
    const ext = sourcePreview.format === "markdown" ? "md" : "html";
    const mime = sourcePreview.format === "markdown" ? "text/markdown" : "text/html";
    dl(sourcePreview.value, `${sourcePreview.title}.${ext}`, mime);
  };



  // Copy the entire active note to the clipboard. Writes BOTH text/html
  // (with embedded base64 images preserved) AND text/plain at once via the
  // modern Clipboard API, so pasting into Notion / Word / Gmail keeps the
  // formatting and images, while pasting into a plain text field gets the
  // text only. Falls back to writeText for older browsers.
  const handleCopy = useCallback(async () => {
    if (activeDoc?.mode === "raw") {
      const text = activeDoc.content || "";
      if (!text) {
        toast.message("Nothing to copy", { description: "This note is empty." });
        return false;
      }
      try {
        await navigator.clipboard.writeText(text);
        setCopyState("copied");
        toast.success("Copied to clipboard");
        if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
        copyResetTimer.current = setTimeout(() => setCopyState("idle"), 1600);
        return true;
      } catch (err) {
        setCopyState("error");
        toast.error("Failed to copy");
        if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
        copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
        return false;
      }
    }
    if (!editor) return false;
    const html = editor.getHTML() ?? "";
    const text = editor.getText() ?? "";
    if (!html && !text) {
      toast.message("Nothing to copy", { description: "This note is empty." });
      return false;
    }
    try {
      const NavClipboard = navigator.clipboard as Clipboard | undefined;
      const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (NavClipboard && typeof NavClipboard.write === "function" && CI) {
        await NavClipboard.write([
          new CI({
            "text/html": new Blob([html], { type: "text/html" }),
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
      return true;
    } catch (err) {
      setCopyState("error");
      toast.error("Couldn't copy", {
        description: "Your browser blocked clipboard access. Try Cmd/Ctrl + A then Cmd/Ctrl + C.",
      });
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
      return false;
    }
  }, [activeDoc, editor]);

  // Clean up the copy reset timer on unmount to avoid setting state on an
  // unmounted component.
  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  const handleSmartExport = useCallback(() => {
    const html = editor?.getHTML() ?? "";
    const ext = getSmartSaveExtension(html);
    if (ext === "html") {
      exportHtml();
      toast.success("Automatically exported as HTML to preserve formatting, highlights, and images.");
    } else {
      exportTxt();
      toast.success("Automatically exported as Plain Text.");
    }
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

  const surfBg = settings.bgColor || (settings.lightSurface ? "#FAF8F2" : "#161615");
  const surfTxt = settings.textColor || (settings.lightSurface ? "#1F1B16" : "#F0EDE8");
  // Derive light/dark for marker colors etc. based on effective bg
  const effectiveDark = settings.bgColor ? !isLightHex(settings.bgColor) : !settings.lightSurface;

  // Look up code block styles dynamically for theme compatibility
  const codeBlockStyles = (() => {
    const isSlate = surfBg === "#161615";
    const isMidnight = surfBg === "#0F0F0E";
    const isPaper = surfBg === "#FAF8F2";
    const isSepia = surfBg === "#F4ECD8";
    const isMist = surfBg === "#EAE6DF";

    if (isSlate) {
      return {
        bg: "#0d0d0c",
        border: "rgba(255,255,255,0.06)",
        btnBg: "rgba(22,22,21,0.8)",
        btnBorder: "rgba(255,255,255,0.08)",
      };
    } else if (isMidnight) {
      return {
        bg: "#060606",
        border: "rgba(255,255,255,0.05)",
        btnBg: "rgba(15,15,14,0.8)",
        btnBorder: "rgba(255,255,255,0.08)",
      };
    } else if (isPaper) {
      return {
        bg: "#f2eedf",
        border: "rgba(0,0,0,0.06)",
        btnBg: "rgba(250,248,242,0.9)",
        btnBorder: "rgba(0,0,0,0.08)",
      };
    } else if (isSepia) {
      return {
        bg: "#eadcb8",
        border: "rgba(0,0,0,0.06)",
        btnBg: "rgba(244,236,216,0.9)",
        btnBorder: "rgba(0,0,0,0.08)",
      };
    } else if (isMist) {
      return {
        bg: "#ded8cc",
        border: "rgba(0,0,0,0.06)",
        btnBg: "rgba(234,230,223,0.9)",
        btnBorder: "rgba(0,0,0,0.08)",
      };
    } else {
      if (effectiveDark) {
        return {
          bg: `color-mix(in srgb, ${surfBg} 60%, #000 40%)`,
          border: "rgba(255,255,255,0.06)",
          btnBg: "rgba(0,0,0,0.45)",
          btnBorder: "rgba(255,255,255,0.08)",
        };
      } else {
        return {
          bg: `color-mix(in srgb, ${surfBg} 92%, #000 8%)`,
          border: "rgba(0,0,0,0.06)",
          btnBg: "rgba(255,255,255,0.8)",
          btnBorder: "rgba(0,0,0,0.08)",
        };
      }
    }
  })();

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

  const ddBtnStyle = (isErr?: boolean): React.CSSProperties => {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
      padding: "6px 10px",
      fontSize: 11.5,
      fontFamily: "Inter, sans-serif",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: "transparent",
      color: isErr
        ? "var(--err)"
        : (effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.72)"),
      transition: "background 0.12s, color 0.12s",
    };
  };

  const MarkdownIcon = ({ size = 14 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M14 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM2 2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
      <path d="M3.5 11V5H5l1.25 1.875L7.5 5h1.5v6H7.75V7.75L6.5 9.625l-1.25-1.875V11H3.5zm7.25 0L9.5 8h1.25V5h2v3h1.25L12.75 11h-2z"/>
    </svg>
  );

  const exportMenuRowStyle = (accent = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "7px 14px",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s",
    color: accent ? surfAccent : (effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)"),
    fontSize: 13,
    fontWeight: accent ? 650 : 450,
    fontFamily: "Inter,sans-serif",
  });

  const exportMenuSectionStyle: React.CSSProperties = {
    padding: "5px 14px 3px",
    color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.42)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: "Inter,sans-serif",
  };

  const sepColor = effectiveDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
  const sep = <div style={{ width: 1, height: 22, background: sepColor, margin: "0 8px", flexShrink: 0, alignSelf: "center" }} />;
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
  const justUnlockedRef = useRef(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY === 0) {
        setIsSeoUnlocked(false);
        justUnlockedRef.current = false;
      } else if (window.scrollY > 15) {
        justUnlockedRef.current = false;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Trigger Lenis resize when the SEO guide is expanded/collapsed to prevent scroll lock
  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (!lenis) return;

    if (typeof lenis.resize === "function") {
      lenis.resize();
    }

    const timers = [
      setTimeout(() => { if (typeof lenis.resize === "function") lenis.resize(); }, 150),
      setTimeout(() => { if (typeof lenis.resize === "function") lenis.resize(); }, 300),
      setTimeout(() => { if (typeof lenis.resize === "function") lenis.resize(); }, 600),
    ];

    return () => {
      timers.forEach(clearTimeout);
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

  const wordCountStatus = useMemo(() => {
    if (activeDoc?.mode === "raw") {
      const total = countWords(activeDoc.content || "");
      return `${total} ${total === 1 ? "word" : "words"}`;
    }
    if (!editor) return "0 words";
    const totalText = editor.state.doc.textContent || "";
    const total = countWords(totalText);

    const { from, to, empty } = editor.state.selection;
    if (!empty && from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      const selected = countWords(selectedText);
      if (selected > 0) {
        return `${selected} of ${total} words selected`;
      }
    }

    return `${total} ${total === 1 ? "word" : "words"}`;
  }, [editor, activeId, editorVersion, activeDoc?.content, activeDoc?.mode]);

  const cursorPosition = useMemo(() => {
    if (activeDoc?.mode === "raw") return "Ln 1, Col 1";
    if (!editor || editor.isDestroyed) return "Ln 1, Col 1";
    const { selection } = editor.state;
    const { $from } = selection;
    try {
      const textBefore = editor.state.doc.textBetween(0, $from.pos, "\n");
      const lines = textBefore.split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      return `Ln ${line}, Col ${col}`;
    } catch (e) {
      return "Ln 1, Col 1";
    }
  }, [editor, activeId, editorVersion]);

  const savedAgo = (() => {
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    if (s < 5) return "Just saved";
    if (s < 60) return `Saved ${s}s ago`;
    return `Saved ${Math.round(s / 60)}m ago`;
  })();

  // ── Editor container layout based on width setting ─────────────────────────
  const editorInnerStyle: React.CSSProperties = (() => {
    const rulerOpacityVal = settings.rulerOpacity === "less" ? 0.03 : (settings.rulerOpacity === "more" ? 0.15 : 0.07);
    const rulerOpacityLightVal = settings.rulerOpacity === "less" ? 0.04 : (settings.rulerOpacity === "more" ? 0.18 : 0.08);
    const base: React.CSSProperties = {
      color: surfTxt,
      // Set line-height as a real CSS property so it reliably propagates to the
      // TipTap contenteditable and its <p> children via normal CSS inheritance.
      // Using a CSS variable for this was fragile — React passes the number as-is
      // to setProperty() and the browser may ignore non-string custom property values,
      // silently falling back to the var() default (1.78) for every option.
      lineHeight: settings.lineHeight,
      zoom: settings.zoom || 1.0,
      // Keep --np-lh as a properly-quoted string so the task-list checkbox CSS
      // (which uses calc(var(--np-lh) * var(--np-fs))) still works.
      ["--np-lh" as string]: String(settings.lineHeight),
      ["--np-fs" as string]: `${settings.fontSize}px`,
      ["--np-ruler-opacity" as string]: String(rulerOpacityVal),
      ["--np-ruler-opacity-light" as string]: String(rulerOpacityLightVal),
    };
    if (settings.writingWidth === "wide") return { ...base, padding: "44px 7% 96px" };
    if (settings.writingWidth === "focused") return { ...base, maxWidth: 760, margin: "0 auto", padding: "44px 40px 96px" };
    return { ...base, maxWidth: 580, margin: "0 auto", padding: "44px 40px 96px" };
  })();

  // ── Pill button for settings popup ────────────────────────────────────────
  const pill = (active: boolean, onClick: () => void, label: string, padding: string = "0 12px") => (
    <button
      key={label}
      onClick={onClick}
      style={{
        // inline-flex + line-height:1 removes the font's leading so the visible
        // glyphs (not the empty line-box) sit at the optical centre. Without
        // this, Inter's cap-heavy text reads as "stuck to the top" inside an
        // equally-padded pill.
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        height: 26, padding,
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
        favicon="/icons/ilovenotepad_logo_premium.png"
      />

      {largeFilePrompt && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(10, 10, 10, 0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20
        }} onClick={() => setLargeFilePrompt(null)}>
          <div style={{
            background: effectiveDark ? "#161615" : "#FAF8F2",
            border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            width: 480,
            maxWidth: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontFamily: "Inter, sans-serif"
          }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "'Sora', sans-serif",
                color: effectiveDark ? "#FFF" : "#1A1A1A",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6
              }}>
                <Shield size={18} style={{ color: surfAccent }} /> Performance Guard
              </h3>
              <p style={{
                fontSize: 12.5,
                color: effectiveDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                lineHeight: 1.5
              }}>
                The file <strong>{largeFilePrompt.fileName}</strong> is quite large (<strong>{formatBytes(largeFilePrompt.fileSize)}</strong>). 
                Loading it in formatting mode might lag your browser. Choose how to proceed:
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Option 1: Raw Plain Text */}
              <button
                onClick={() => {
                  const text = largeFilePrompt.fileText;
                  const title = largeFilePrompt.fileName.replace(/\.[^/.]+$/, "");
                  const newDoc: NotepadDoc = {
                    id: Math.random().toString(36).substring(2, 11),
                    title: title,
                    content: text, // Raw text
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    mode: "raw"
                  };
                  if (largeFilePrompt.handle) {
                    fileHandlesRef.current[newDoc.id] = largeFilePrompt.handle;
                  }
                  setDocs(prev => [newDoc, ...prev]);
                  setActiveId(newDoc.id);
                  setSaveStatus("saved");
                  toast.success(`Opened ${largeFilePrompt.fileName} in Plain Text Mode`);
                  setLargeFilePrompt(null);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  background: effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = surfAccent; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"; e.currentTarget.style.borderColor = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "#FFF" : "#1A1A1A" }}>⚡ Plain-Text Mode (Recommended)</span>
                <span style={{ fontSize: 11, color: effectiveDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: 2 }}>Ultra-fast load, zero scroll-lag, disables formatting toolbars.</span>
              </button>

              {/* Option 2: Rich Text */}
              <button
                onClick={() => {
                  const text = largeFilePrompt.fileText;
                  const title = largeFilePrompt.fileName.replace(/\.[^/.]+$/, "");
                  const newDoc: NotepadDoc = {
                    id: Math.random().toString(36).substring(2, 11),
                    title: title,
                    content: text.includes("<p>") || text.includes("</div>") ? text : text.split("\n").map((l: string) => `<p>${l}</p>`).join(""),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    mode: "rich"
                  };
                  if (largeFilePrompt.handle) {
                    fileHandlesRef.current[newDoc.id] = largeFilePrompt.handle;
                  }
                  setDocs(prev => [newDoc, ...prev]);
                  setActiveId(newDoc.id);
                  setSaveStatus("saved");
                  toast.success(`Opened ${largeFilePrompt.fileName} in Rich Text Mode`);
                  setLargeFilePrompt(null);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  background: effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = surfAccent; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"; e.currentTarget.style.borderColor = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "#FFF" : "#1A1A1A" }}>📝 Rich Text Mode</span>
                <span style={{ fontSize: 11, color: effectiveDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: 2 }}>Keep rich layouts, bullet points, headers, and code highlights.</span>
              </button>

              {/* Option 3: First 150KB */}
              <button
                onClick={() => {
                  const title = largeFilePrompt.fileName.replace(/\.[^/.]+$/, "");
                  const subsetText = largeFilePrompt.fileText.slice(0, 150 * 1024) + "\n\n... [Content truncated by Performance Guard]";
                  const newDoc: NotepadDoc = {
                    id: Math.random().toString(36).substring(2, 11),
                    title: `${title} (Subset)`,
                    content: subsetText.includes("<p>") || subsetText.includes("</div>") ? subsetText : subsetText.split("\n").map((l: string) => `<p>${l}</p>`).join(""),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    mode: "rich"
                  };
                  setDocs(prev => [newDoc, ...prev]);
                  setActiveId(newDoc.id);
                  setSaveStatus("saved");
                  toast.success(`Imported first 150KB of ${largeFilePrompt.fileName}`);
                  setLargeFilePrompt(null);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  background: effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"; e.currentTarget.style.borderColor = surfAccent; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"; e.currentTarget.style.borderColor = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "#FFF" : "#1A1A1A" }}>✂️ Load First 150KB Only</span>
                <span style={{ fontSize: 11, color: effectiveDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: 2 }}>Instantly view the top section of the document in formatting mode.</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => setLargeFilePrompt(null)}
                style={{
                  background: "transparent",
                  border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: effectiveDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                  cursor: "pointer",
                }}
              >
                Cancel Import
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 42, borderBottom: `1px solid ${sepColor}`, padding: "0 10px", width: "100%", boxSizing: "border-box", background: tabStripBg }}>

          {/* Left Zone: Back and Tabs */}
          <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 2, flex: 1, minWidth: 0, position: "relative" }}>
            {/* Back Button — same height (34px) and bottom offset (1) as tab items
                so the arrow icon always sits on the same optical baseline as tab text. */}
            <Link
              href="/tools"
              className="notepad-back-link"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 36,
                borderRadius: "6px 6px 0 0",
                color: effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)",
                textDecoration: "none",
                alignSelf: "flex-end",
                marginBottom: 1,
                flexShrink: 0,
              }}
              title="Back to Tools"
            >
              <ArrowLeft size={15} />
            </Link>
            {/* Separator — aligned to the optical center of the back button and tabs */}
            <div
              style={{
                width: 1,
                height: 23,
                background: sepColor,
                margin: "0 8px",
                flexShrink: 0,
                alignSelf: "center",
                marginBottom: 0,
              }}
            />
            {/* File Menu Trigger Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setFileMenuLeft(r.left);
                setShowFileMenu(!showFileMenu);
                setShowDocMenu(false);
                setShowExportMenu(false);
                setShowSettings(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 36,
                borderRadius: "6px 6px 0 0",
                background: showFileMenu ? (effectiveDark ? "#202020" : surfBg) : "transparent",
                color: effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)",
                border: "none",
                cursor: "pointer",
                alignSelf: "flex-end",
                marginBottom: 1,
                flexShrink: 0,
                transition: "background 140ms ease, color 140ms ease",
              }}
              title="File Menu"
            >
              <FileText size={15} />
            </button>
            <div
              style={{
                width: 1,
                height: 23,
                background: sepColor,
                margin: "0 8px",
                flexShrink: 0,
                alignSelf: "center",
                marginBottom: 0,
              }}
            />

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
              {sortedDocs.map((doc, idx) => {
                const isActive = doc.id === activeId;
                const isArmed = confirmDeleteId === doc.id;
                const showDivider = false;
                const activeTabSurface = effectiveDark ? "#202020" : surfBg;
                const tabColorObj = doc.color ? TAB_COLORS.find(c => c.id === doc.color) : null;
                const activeTabStroke = tabColorObj
                  ? (effectiveDark ? tabColorObj.darkValue : tabColorObj.lightValue)
                  : (effectiveDark
                    ? blendColors("dark", "#202020", 0.78)
                    : blendColors("light", activeTabSurface, 0.42));
                const activeTabShadow = effectiveDark
                  ? "0 -1px 0 rgba(255,255,255,0.20) inset, 0 8px 18px rgba(0,0,0,0.34)"
                  : "0 -1px 0 rgba(255,255,255,0.72) inset, 0 8px 18px rgba(13,17,23,0.12)";
                const isPrevActive = idx > 0 && sortedDocs[idx - 1].id === activeId;

                return (
                  <Fragment key={doc.id}>
                    <div
                      className={`notepad-tab-item ${isActive ? "active" : ""}`}
                      draggable={editingTabId !== doc.id}
                      onDragStart={(e) => {
                        dragSourceIdxRef.current = idx;
                        setDraggingTabId(doc.id);
                        draggedWidthRef.current = e.currentTarget.getBoundingClientRect().width;
                        draggedIsPinnedRef.current = !!doc.isPinned;
                        setDragOverIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragSourceIdxRef.current === null) return;
                        if (!!sortedDocs[dragSourceIdxRef.current].isPinned !== !!doc.isPinned) return;
                        if (dragOverIdx !== idx) {
                          setDragOverIdx(idx);
                        }
                      }}
                      onDragEnd={() => {
                        if (dragSourceIdxRef.current !== null && dragOverIdx !== null && dragSourceIdxRef.current !== dragOverIdx) {
                          const nextSorted = [...sortedDocs];
                          const [removed] = nextSorted.splice(dragSourceIdxRef.current, 1);
                          nextSorted.splice(dragOverIdx, 0, removed);
                          setDocs(nextSorted);
                          saveDocs(nextSorted);
                        }
                        dragSourceIdxRef.current = null;
                        setDraggingTabId(null);
                        setDragOverIdx(null);
                      }}
                      onClick={() => {
                        if (!isActive) {
                          setActiveId(doc.id);
                          cancelConfirm();
                        }
                      }}
                      onMouseEnter={() => setHoveredTabId(doc.id)}
                      onMouseLeave={() => setHoveredTabId(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        contextMenuOpenTimeRef.current = Date.now();
                        setContextMenu({
                          tabId: doc.id,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      title={doc.isPinned ? (doc.title || "Untitled Note") : undefined}
                      style={{
                        opacity: doc.id === draggingTabId ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: doc.isPinned ? "center" : "flex-start",
                        gap: doc.isPinned ? 0 : 6,
                        height: 36,
                        padding: isActive ? (doc.isPinned ? "0" : "0 14px") : "0 2px",
                        borderRadius: "12px 12px 0 0",
                        border: "none",
                        background: isActive ? activeTabSurface : "transparent",
                        color: isActive ? surfTxt : (effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)"),
                        cursor: "pointer",
                        position: "relative",
                        flex: doc.isPinned ? "0 0 64px" : "1 1 150px",
                        width: doc.isPinned ? 64 : undefined,
                        minWidth: doc.isPinned ? 64 : (isActive ? 64 : 44),
                        maxWidth: doc.isPinned ? 64 : 150,
                        marginBottom: isActive ? -2 : 0,
                        marginLeft: isActive ? (idx > 0 ? (sortedDocs[idx - 1].isPinned ? 4 : 7) : 0) : (isPrevActive ? (doc.isPinned ? 4 : 7) : 0),
                        zIndex: isActive ? 3 : (hoveredTabId === doc.id ? 2 : 1),
                        boxShadow: isActive ? activeTabShadow : "none",
                        ["--active-tab-bg" as any]: activeTabSurface,
                        ["--active-border-color" as any]: activeTabStroke,
                        transition: "background 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        transform: (() => {
                          if (dragSourceIdxRef.current === null || dragOverIdx === null) return "none";
                          if (idx === dragSourceIdxRef.current) return "none";
                          if (!!sortedDocs[dragSourceIdxRef.current].isPinned !== !!doc.isPinned) return "none";

                          const S = dragSourceIdxRef.current;
                          const T = dragOverIdx;
                          const w = draggedWidthRef.current;

                          if (S < T) {
                            if (idx > S && idx <= T) {
                              return `translateX(-${w}px)`;
                            }
                          } else if (S > T) {
                            if (idx >= T && idx < S) {
                              return `translateX(${w}px)`;
                            }
                          }
                          return "none";
                        })(),
                      }}
                    >
                      {/* SVG Vector Background & Outline with Chrome-like flaring tails */}
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 0,
                          }}
                        >
                          {/* Left Curve SVG */}
                          <svg
                            width="30"
                            height="38"
                            viewBox="-1 -1 30 38"
                            fill="none"
                            style={{ position: "absolute", left: -17, top: -1, overflow: "visible" }}
                          >
                            <path
                              d="M 28 36 L 0 36 L 8 36 A 8 8 0 0 0 16 28 L 16 12 A 12 12 0 0 1 28 0 Z"
                              fill={activeTabSurface}
                            />
                            <path
                              d="M 0 36 L 8 36 A 8 8 0 0 0 16 28 L 16 12 A 12 12 0 0 1 28 0 L 30 0"
                              stroke={activeTabStroke}
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>

                          {/* Middle Top Border */}
                          <div
                            style={{
                              position: "absolute",
                              left: 11,
                              right: 11,
                              top: -1,
                              height: 2,
                              background: activeTabStroke,
                            }}
                          />

                          {/* Right Curve SVG */}
                          <svg
                            width="30"
                            height="38"
                            viewBox="-1 -1 30 38"
                            fill="none"
                            style={{ position: "absolute", right: -17, top: -1, overflow: "visible" }}
                          >
                            <path
                              d="M 2 0 A 12 12 0 0 1 14 12 L 14 28 A 8 8 0 0 0 22 36 L 30 36 L 2 36 Z"
                              fill={activeTabSurface}
                            />
                            <path
                              d="M 0 0 L 2 0 A 12 12 0 0 1 14 12 L 14 28 A 8 8 0 0 0 22 36 L 30 36"
                              stroke={activeTabStroke}
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>
                        </div>
                      )}

                      {doc.isPinned ? (
                        <div
                          onMouseEnter={() => setHoveredTabId(doc.id)}
                          onMouseLeave={() => setHoveredTabId(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 4,
                            width: 58,
                            height: 26,
                            borderRadius: 6,
                            background: effectiveDark ? "#202020" : "#e6e2d8",
                            border: "none",
                            boxSizing: "border-box",
                            paddingLeft: 6,
                            paddingRight: 4,
                            transition: "background 140ms ease",
                          }}
                        >
                          {/* Pin Icon */}
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={doc.color
                              ? (TAB_COLORS.find(c => c.id === doc.color)?.[effectiveDark ? 'darkValue' : 'lightValue'])
                              : (effectiveDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.55)")}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ transform: "rotate(45deg)", flexShrink: 0 }}
                          >
                            <line x1="12" y1="17" x2="12" y2="22" />
                            <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24Z" />
                          </svg>

                          {/* Title text with right-side fading mask to show truncation/hiding */}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              fontFamily: "'Sora', sans-serif",
                              color: doc.color
                                ? (TAB_COLORS.find(c => c.id === doc.color)?.[effectiveDark ? 'darkValue' : 'lightValue'])
                                : (effectiveDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.7)"),
                              lineHeight: 1,
                              textTransform: "uppercase",
                              marginTop: 1.5,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              flex: 1,
                              WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 95%)",
                              maskImage: "linear-gradient(to right, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 95%)",
                            }}
                          >
                            {doc.title || "UNT"}
                          </span>
                        </div>
                      ) : (
                        // Non-pinned tab
                        isActive ? (
                          <>
                            {doc.color && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: TAB_COLORS.find(c => c.id === doc.color)?.[effectiveDark ? 'darkValue' : 'lightValue'],
                                  marginRight: 2,
                                  flexShrink: 0,
                                  position: "relative",
                                  zIndex: 1
                                }}
                                title={`${TAB_COLORS.find(c => c.id === doc.color)?.name} Category`}
                              />
                            )}
                            {editingTabId === doc.id ? (
                              <input
                                ref={titleInputRef}
                                value={doc.title}
                                onChange={(e) => updateTitle(e.target.value)}
                                onBlur={() => setEditingTabId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    setEditingTabId(null);
                                  }
                                }}
                                autoFocus
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
                                  position: "relative",
                                  zIndex: 1,
                                }}
                                spellCheck={false}
                                title="Rename note"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => {
                                  if (!doc.isPinned) {
                                    setActiveId(doc.id);
                                    setEditingTabId(doc.id);
                                    setTimeout(() => titleInputRef.current?.select(), 80);
                                  }
                                }}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: "'Sora', sans-serif",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  flex: 1,
                                  WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 98%)",
                                  maskImage: "linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 98%)",
                                  marginRight: 0
                                }}
                              >
                                {doc.title || "Untitled"}
                              </span>
                            )}

                            {docs.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDoc(doc.id);
                                }}
                                style={{
                                  border: "none",
                                  background: activeTabSurface,
                                  color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  transition: "opacity 0.12s ease-in-out",
                                  position: "absolute",
                                  right: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  zIndex: 2,
                                  opacity: hoveredTabId === doc.id ? 1 : 0,
                                  pointerEvents: hoveredTabId === doc.id ? "auto" : "none",
                                  flexShrink: 0,
                                }}
                                title="Delete note"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </>
                        ) : (
                          // Inactive Non-pinned tab rendered as a capsule
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 3,
                              width: "100%",
                              height: 26,
                              borderRadius: 6,
                              background: effectiveDark ? "#202020" : "#e6e2d8",
                              border: "none",
                              boxSizing: "border-box",
                              paddingLeft: 8,
                              paddingRight: 4,
                              transition: "background 140ms ease",
                              position: "relative",
                            }}
                          >
                            {doc.color && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: TAB_COLORS.find(c => c.id === doc.color)?.[effectiveDark ? 'darkValue' : 'lightValue'],
                                  marginRight: 2,
                                  flexShrink: 0,
                                  position: "relative",
                                  zIndex: 1
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "'Sora', sans-serif",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                flex: 1,
                                WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 98%)",
                                maskImage: "linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 98%)",
                                marginRight: 0,
                                marginTop: 1.5,
                                color: effectiveDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.7)",
                              }}
                            >
                              {doc.title || "Untitled"}
                            </span>

                            {docs.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDoc(doc.id);
                                }}
                                style={{
                                  border: "none",
                                  background: effectiveDark ? "#202020" : "#e6e2d8",
                                  color: effectiveDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  transition: "opacity 0.12s ease-in-out",
                                  position: "absolute",
                                  right: 4,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  zIndex: 2,
                                  opacity: hoveredTabId === doc.id ? 1 : 0,
                                  pointerEvents: hoveredTabId === doc.id ? "auto" : "none",
                                  flexShrink: 0,
                                }}
                                title="Delete note"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        )
                      )}

                      {/* Vertical tab divider lines (Chrome aesthetic) */}
                      {showDivider && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 10,
                            width: 1,
                            height: 14,
                            background: effectiveDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>

                  </Fragment>
                );
              })}
              {/* Plus Button inside scrollable container */}
              <button
                onClick={createDoc}
                style={{
                  ...tb(),
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  alignSelf: "flex-end",
                  marginBottom: 6,
                  marginLeft: 8,
                  marginRight: 8,
                  flexShrink: 0,
                  zIndex: 4,
                }}
                title="New note"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Gradient fade overlay for smooth tab overflow */}
            <div 
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 32,
                height: 38,
                background: `linear-gradient(to right, transparent, ${tabStripBg})`,
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
          </div>

          {/* Right Zone: Status, Cloud, Settings, Feedback */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingBottom: 6 }}>
            {GCID && sep}

            {GCID && (
              <button style={tb(driveConnected)} onClick={driveConnected ? () => syncToDrive() : connectDrive} title={driveConnected ? "Sync to Drive now" : "Connect Google Drive"}>
                {driveSaving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : driveConnected ? <Cloud size={13} /> : <CloudOff size={13} />}
              </button>
            )}

            {sep}

            {/* Note switcher menu trigger */}
            <button
              style={tb(showDocMenu)}
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setDocMenuLeft(r.left - 200);
                setShowDocMenu(!showDocMenu);
                setShowFileMenu(false);
                setShowExportMenu(false);
                setShowSettings(false);
              }}
              title="All Notes"
              className="notepad-shortcuts-btn"
            >
              <Files size={16} />
            </button>
          </div>

        </div>

        {/* ── ROW 2: Rich-text formatting tools and view/export options ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 38, padding: "0 10px", boxSizing: "border-box", width: "100%", background: surfBg, borderBottom: `1px solid ${sepColor}`, transition: "background 0.3s" }}>

          {/* Row 2 Left Zone: Formatting buttons (scrollable) */}
          <div className="notepad-toolbar" style={{ display: "flex", alignItems: "center", height: "100%", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            {/* Table of Contents / Outline Sidebar Toggle */}
            <button
              title={getTooltip("Table of Contents", "Ctrl+\\")}
              style={tb(showOutline)}
              onClick={() => {
                setShowOutline(!showOutline);
                setShowSettings(false);
              }}
            >
              <PanelLeft size={14} />
            </button>

            {sep}

            {/* FORMAT */}
            <button title={getTooltip("Bold", "Ctrl+B")} style={tb(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon size={14} /></button>
            <button title={getTooltip("Italic", "Ctrl+I")} style={tb(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon size={14} /></button>
            <button title={getTooltip("Underline", "Ctrl+U")} style={tb(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></button>
            <button title={getTooltip("Strikethrough", "Ctrl+Shift+X")} style={tb(editor?.isActive("strike"))} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></button>
            <button title={getTooltip("Highlight", "Ctrl+H")} style={tb(editor?.isActive("highlight"))} onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter size={13} /></button>
            <button
              title={getTooltip("Clear Formatting")}
              style={tb()}
              onClick={() => {
                if (editor) {
                  editor.chain().focus().unsetAllMarks().clearNodes().run();
                  toast.success("Formatting cleared");
                }
              }}
            >
              <Eraser size={14} />
            </button>

            {/* Text Color Dropdown */}
            <div className="notepad-color-picker-trigger" style={{ position: "relative", display: "inline-block" }}>
              <button
                ref={colorBtnRef}
                title={getTooltip("Text Color")}
                style={{
                  ...tb(showColorPicker),
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  width: 26,
                  height: 26,
                  position: "relative"
                }}
                onClick={() => {
                  const r = colorBtnRef.current?.getBoundingClientRect();
                  if (r) setColorMenuLeft(r.left);
                  setShowColorPicker(!showColorPicker);
                  setShowTableMenu(false);
                  setShowTableGrid(false);
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: "12px", fontFamily: "serif" }}>A</span>
                <div style={{ width: 14, height: 3, background: editor?.getAttributes("textStyle").color || (effectiveDark ? "#FFFFFF" : "#111318"), borderRadius: 1, marginTop: 1 }} />
              </button>
              {showColorPicker && (
                <div
                  style={{
                    position: "fixed",
                    top: 80,
                    left: colorMenuLeft,
                    marginTop: 4,
                    background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
                    border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
                    borderRadius: "var(--r)",
                    padding: "8px",
                    zIndex: 200,
                    boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {/* Clear Color / Reset */}
                  <button
                    title="Clear text color"
                    onClick={() => {
                      editor?.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: effectiveDark ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,0,0,0.25)",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: "100%",
                      height: 1.5,
                      background: "#D93838",
                      transform: "rotate(-45deg)",
                    }} />
                  </button>

                  <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 1px" }} />

                  {/* Swatches */}
                  {(effectiveDark
                    ? ["#FFFFFF", "#FF6B6B", "#FF9F43", "#FEE08B", "#52C47A", "#54A0FF", "#D6A2E8"]
                    : ["#111318", "#D93838", "#D97706", "#B45309", "#047857", "#1D4ED8", "#7C3AED"]
                  ).map((color) => {
                    const isActive = editor?.isActive("textStyle", { color });
                    return (
                      <button
                        key={color}
                        title={color === "#FFFFFF" || color === "#111318" ? "Default text color" : color}
                        onClick={() => {
                          if (isActive) {
                            editor?.chain().focus().unsetColor().run();
                          } else {
                            editor?.chain().focus().setColor(color).run();
                          }
                          setShowColorPicker(false);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: effectiveDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                          cursor: "pointer",
                          background: color,
                          flexShrink: 0,
                          outline: isActive ? (effectiveDark ? "2px solid white" : "2px solid black") : "2px solid transparent",
                          outlineOffset: 2,
                          transition: "outline 0.1s",
                        }}
                      />
                    );
                  })}

                  <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 1px" }} />

                  {/* Custom color picker */}
                  <button
                    title="Custom color"
                    onClick={() => colorInputRef.current?.click()}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      width: 20,
                      height: 20,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      background: "none",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      border: effectiveDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.15)",
                    }}>
                      <Pencil size={8} style={{ color: "#FFFFFF", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }} />
                    </div>
                    <input
                      ref={colorInputRef}
                      type="color"
                      style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      onChange={(e) => {
                        editor?.chain().focus().setColor(e.target.value).run();
                        setShowColorPicker(false);
                      }}
                    />
                  </button>
                </div>
              )}
            </div>
            {sep}

            {/* ALIGNMENT */}
            {(() => {
              const alignVal = editor?.isActive({ textAlign: "center" }) ? "center" : editor?.isActive({ textAlign: "right" }) ? "right" : editor?.isActive({ textAlign: "justify" }) ? "justify" : "left";
              const AlignIconComponent = alignVal === "center" ? AlignCenter : alignVal === "right" ? AlignRight : alignVal === "justify" ? AlignJustify : AlignLeft;
              return (
                <button
                  title={getTooltip("Align text (Click to cycle)", "Ctrl+Shift+L/E/R/J")}
                  style={tb(alignVal !== "left")}
                  onClick={() => {
                    if (!editor) return;
                    if (alignVal === "left") editor.chain().focus().setTextAlign("center").run();
                    else if (alignVal === "center") editor.chain().focus().setTextAlign("right").run();
                    else if (alignVal === "right") editor.chain().focus().setTextAlign("justify").run();
                    else editor.chain().focus().unsetTextAlign().run();
                  }}
                >
                  <AlignIconComponent size={14} />
                </button>
              );
            })()}
            {sep}

            {/* HEADINGS */}
            <button title={getTooltip("Heading 1", "Ctrl+Alt+1")} style={tb(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></button>
            <button title={getTooltip("Heading 2", "Ctrl+Alt+2")} style={tb(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></button>
            <button title={getTooltip("Heading 3", "Ctrl+Alt+3")} style={tb(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></button>
            <button title={getTooltip("Blockquote", "Ctrl+Shift+B")} style={tb(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={13} /></button>
            <button title={getTooltip("Code Block", "Ctrl+Alt+C")} style={tb(editor?.isActive("codeBlock"))} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code2 size={14} /></button>
            {sep}

            {/* LISTS */}
            <button title={getTooltip("Bullet List", "Ctrl+Shift+8")} style={tb(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={14} /></button>
            <button title={getTooltip("Numbered List", "Ctrl+Shift+7")} style={tb(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
            <button title={getTooltip("Checklist", "Ctrl+Shift+9")} style={tb(editor?.isActive("taskList"))} onClick={() => editor?.chain().focus().toggleTaskList().run()}><CheckSquare size={13} /></button>
            {sep}

            {/* INSERT SHORTCUTS */}
            <button title={getTooltip("Insert Link", "Ctrl+K")} style={tb(editor?.isActive("link"))} onClick={insertLink}><LinkIcon size={13} /></button>
            <button title={getTooltip("Insert Image")} style={tb()} onClick={insertImage}><ImageIcon size={13} /></button>
            <button
              ref={tableBtnRef}
              title={getTooltip("Insert Table")}
              style={tb(showTableGrid || editor?.isActive("table"))}
              onClick={() => {
                const r = tableBtnRef.current?.getBoundingClientRect();
                if (r) setTableMenuLeft(r.left);
                setShowTableGrid(!showTableGrid);
                setShowDocMenu(false);
                setShowSettings(false);
                cancelConfirm();
              }}
              aria-label="Insert table"
            >
              <Table2 size={14} />
            </button>
            <button title={getTooltip("Insert Divider")} style={tb()} onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={13} /></button>

            {/* CONTEXTUAL TABLE ACTIONS */}
            {editor?.isActive("table") && (
              <>
                {sep}
                <div className="notepad-table-menu-trigger" style={{ position: "relative", display: "inline-block" }}>
                  <button
                    ref={tableActionsBtnRef}
                    style={{ ...tb(showTableMenu), width: "auto", padding: "0 8px", gap: 4, height: 26, fontSize: 11.5 }}
                    onClick={() => {
                      const r = tableActionsBtnRef.current?.getBoundingClientRect();
                      if (r) setTableActionsMenuLeft(r.left);
                      setShowTableMenu(!showTableMenu);
                      setShowColorPicker(false);
                      setShowTableGrid(false);
                    }}
                    title="Table Actions"
                  >
                    <Table2 size={13} />
                    <span>Table Actions</span>
                    <ChevronDown size={10} />
                  </button>
                  {showTableMenu && (
                    <div
                      style={{
                        position: "fixed",
                        top: 80,
                        left: tableActionsMenuLeft,
                        marginTop: 4,
                        background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
                        border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
                        borderRadius: "var(--r)",
                        padding: "6px",
                        zIndex: 200,
                        boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 140,
                        gap: 2,
                      }}
                    >
                      <button
                        style={ddBtnStyle()}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}
                      >
                        Row Above
                      </button>
                      <button
                        style={ddBtnStyle()}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                      >
                        Row Below
                      </button>
                      <button
                        style={ddBtnStyle(true)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "rgba(196,72,62,0.1)" : "rgba(196,72,62,0.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                      >
                        Delete Row
                      </button>

                      <div style={{ borderTop: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

                      <button
                        style={ddBtnStyle()}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}
                      >
                        Column Left
                      </button>
                      <button
                        style={ddBtnStyle()}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                      >
                        Column Right
                      </button>
                      <button
                        style={ddBtnStyle(true)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "rgba(196,72,62,0.1)" : "rgba(196,72,62,0.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                      >
                        Delete Column
                      </button>

                      <div style={{ borderTop: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

                      <button
                        style={{ ...ddBtnStyle(true), fontWeight: 600 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "rgba(196,72,62,0.15)" : "rgba(196,72,62,0.12)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                      >
                        Delete Table
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {sep}

            {/* HISTORY */}
            <button title={getTooltip("Undo", "Ctrl+Z")} style={{ ...tb(), opacity: editor?.can().undo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={13} /></button>
            <button title={getTooltip("Redo", "Ctrl+Y")} style={{ ...tb(), opacity: editor?.can().redo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={13} /></button>
          </div>

          {/* Row 2 Right Zone: Fixed layout and export options */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingLeft: 6 }}>
            {/* FIND */}
            <button
              title={getTooltip("Find / Replace", "Ctrl+F")}
              style={tb(showFind)}
              onClick={() => {
                if (showFind) {
                  closeFind();
                } else {
                  setShowFind(true);
                  setShowReplace(false);
                  setTimeout(() => {
                    findInputRef.current?.focus();
                    findInputRef.current?.select();
                  }, 50);
                }
              }}
            >
              <Search size={14} />
            </button>

            {/* FOCUS / FULLSCREEN */}
            <button title={getTooltip("Focus Mode", "Ctrl+Shift+\\")} style={tb(focusMode)} onClick={toggleFocus}>{focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>

            {sep}

            {/* SETTINGS */}
            <button title={getTooltip("Settings")} style={tb(showSettings)} onClick={() => { setShowSettings(!showSettings); setShowExportMenu(false); }} aria-label="Editor settings">
              <Settings size={14} />
            </button>

            {/* EXPORT SPLIT BUTTON */}
            <div style={{ display: "flex", alignItems: "stretch", height: 28, flexShrink: 0 }}>
              <button
                className="notepad-export-btn"
                title={getTooltip("Smart Export (Auto-selects best format)", "Ctrl+D")}
                style={{
                  ...tb(),
                  width: "auto",
                  padding: "0 10px",
                  gap: 5,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: effectiveDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)",
                  background: effectiveDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                }}
                onClick={handleSmartExport}
              >
                <Download size={12} />
                <span className="notepad-export-label" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.01em" }}>Export</span>
              </button>
              <button
                className="notepad-export-dropdown-btn"
                title={getTooltip("Choose export format")}
                style={{
                  ...tb(),
                  width: "auto",
                  padding: "0 6px",
                  color: effectiveDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)",
                  background: effectiveDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                  borderLeft: "none",
                  borderTopRightRadius: 6,
                  borderBottomRightRadius: 6,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => { setShowExportMenu(!showExportMenu); setShowSettings(false); }}
              >
                <ChevronDown size={10} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ── MORE MENU PANEL — position: fixed, escapes all overflow contexts ── */}


      {/* ── DOC MENU PANEL — position: fixed so it escapes the overflow context ── */}
      {showDocMenu && (
        <div style={{
          position: "fixed",
          top: 82,
          left: docMenuLeft,
          background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
          border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
          borderRadius: "var(--r)",
          minWidth: 240,
          padding: "6px 0",
          zIndex: 200,
          boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)",
        }}>
          {sortedDocs.map((d) => {
            return (
              <div
                key={d.id}
                style={{
                  display: "flex", alignItems: "center", padding: "7px 12px",
                  cursor: "pointer",
                  background: d.id === activeId
                    ? (effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.06)")
                    : "transparent",
                  transition: "background 140ms ease",
                }}
                onMouseEnter={(e) => {
                  if (d.id !== activeId) {
                    e.currentTarget.style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (d.id !== activeId) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span
                  style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}
                  onClick={() => { setActiveId(d.id); setShowDocMenu(false); }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, flex: 1 }}>
                    {d.title || "Untitled"}
                  </span>
                  {d.isPinned && (
                    <Pin size={10} style={{ transform: "rotate(30deg)", marginLeft: 6, opacity: 0.6, flexShrink: 0, color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)" }} />
                  )}
                </span>
                {d.id === activeId && (
                  <Check size={12} style={{ marginLeft: 8, color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)", flexShrink: 0 }} />
                )}
                {docs.length > 1 && (
                  <button
                    style={{ ...tb(), width: 20, height: 20, marginLeft: 4, opacity: 0.55, color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (d.isPinned) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDeleteConfirm({
                          docId: d.id,
                          source: "switcher",
                          x: rect.left,
                          y: rect.top + rect.height / 2,
                        });
                      } else {
                        deleteDoc(d.id);
                      }
                    }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "1"; el.style.color = "var(--err)"; el.style.background = "color-mix(in srgb, var(--err) 12%, transparent)"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = "0.55"; el.style.color = effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)"; el.style.background = "transparent"; }}
                    title="Delete note"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
          <button
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)", fontSize: 12, transition: "background 0.12s, color 0.12s" }}
            onClick={createDoc}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.color = effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)"; }}
          >
            <Plus size={12} /> New note
          </button>
          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
          {confirmClearAll ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "color-mix(in srgb, var(--err) 8%, transparent)" }}>
              <span style={{ fontSize: 11.5, color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontFamily: "Inter,sans-serif", flex: 1 }}>
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
                  background: "transparent", color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)",
                  border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.15)", cursor: "pointer",
                }}
                title="Cancel"
              >No</button>
            </div>
          ) : (
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)", fontSize: 11.5, fontFamily: "Inter,sans-serif", transition: "background 0.12s, color 0.12s" }}
              onClick={() => armConfirm(null, true)}
              title={docs.length === 1 ? "Clear this note" : "Clear all notes"}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--err)"; (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
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
            background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
            border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "var(--r)",
            padding: 12,
            zIndex: 200,
            boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, paddingBottom: 4 }}>
            <span>Insert Table</span>
            <span style={{ color: hoveredCols > 0 ? surfAccent : (effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)") }}>
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
                        : (effectiveDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"),
                      border: isHighlighted
                        ? `1px solid ${surfAccent}`
                        : (effectiveDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)"),
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

      {/* ── SETTINGS PANEL — position: fixed centered modal ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              inset: 0,
              background: effectiveDark ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.15)",
              backdropFilter: "blur(6px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="notepad-settings-panel"
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
              style={{
                background: "var(--bg1)",
                border: "1px solid var(--b0)",
                borderRadius: "16px",
                width: 440,
                padding: "20px",
                boxShadow: effectiveDark ? "0 24px 64px rgba(0,0,0,0.65)" : "0 24px 64px rgba(0,0,0,0.15)",
                maxHeight: "85vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                scrollbarWidth: "none",
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
                  {[{ v: 1.65, l: "Compact" }, { v: 2.15, l: "Normal" }, { v: 2.65, l: "Relaxed" }].map(({ v, l }) => pill(settings.lineHeight === v, () => updateSetting("lineHeight", v), l))}
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
                {settings.ruledLines ? (
                  <div>
                    <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>Line Intensity</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {pill(settings.rulerOpacity === "less", () => updateSetting("rulerOpacity", "less"), "Faint", "0 8px")}
                      {pill(settings.rulerOpacity === "normal" || !settings.rulerOpacity, () => updateSetting("rulerOpacity", "normal"), "Normal", "0 8px")}
                      {pill(settings.rulerOpacity === "more", () => updateSetting("rulerOpacity", "more"), "Distinct", "0 8px")}
                    </div>
                  </div>
                ) : (
                  <div />
                )}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FILE MENU PANEL — position: fixed anchored top-left ── */}
      {showFileMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: 80,
            left: fileMenuLeft,
            background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
            border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "var(--r)",
            minWidth: 220,
            padding: "6px",
            zIndex: 200,
            boxShadow: effectiveDark
              ? "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)"
              : "0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          <button
            onClick={() => { createDoc(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <Plus size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>New Tab</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+N</span>
          </button>

          <button
            onClick={() => { handleOpenFileAccess(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <FileText size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Open File...</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+O</span>
          </button>

          <button
            onClick={() => { setShowSettings(true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <Settings size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Editor Settings...</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+,</span>
          </button>

          {/* Interface Zoom Control */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", width: "100%", boxSizing: "border-box" }}>
            <Maximize2 size={13} style={{ opacity: 0.7, color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)" }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif", fontSize: 13, color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)" }}>Interface Zoom</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderRadius: 6, padding: "2px 4px" }}>
              <button
                disabled={(settings.zoom || 1.0) <= 0.8}
                onClick={(e) => {
                  e.stopPropagation();
                  const current = settings.zoom || 1.0;
                  const next = Math.max(0.8, parseFloat((current - 0.1).toFixed(1)));
                  updateSetting("zoom", next);
                }}
                style={{
                  background: "none", border: "none", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)",
                  cursor: "pointer", fontSize: 13, fontWeight: 700, width: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center", opacity: (settings.zoom || 1.0) <= 0.8 ? 0.3 : 1
                }}
                title="Zoom Out (Ctrl+-)"
              >
                −
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 32, textAlign: "center", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontFamily: "Inter,sans-serif" }}>
                {Math.round((settings.zoom || 1.0) * 100)}%
              </span>
              <button
                disabled={(settings.zoom || 1.0) >= 1.5}
                onClick={(e) => {
                  e.stopPropagation();
                  const current = settings.zoom || 1.0;
                  const next = Math.min(1.5, parseFloat((current + 0.1).toFixed(1)));
                  updateSetting("zoom", next);
                }}
                style={{
                  background: "none", border: "none", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)",
                  cursor: "pointer", fontSize: 13, fontWeight: 700, width: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center", opacity: (settings.zoom || 1.0) >= 1.5 ? 0.3 : 1
                }}
                title="Zoom In (Ctrl++)"
              >
                +
              </button>
            </div>
          </div>

          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => { handleSaveFileAccess(false); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <Save size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Save</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+S</span>
          </button>

          <button
            onClick={() => { handleSaveFileAccess(true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <Save size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Save As...</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+Shift+S</span>
          </button>

          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => {
              const activeDoc = docs.find((d) => d.id === activeId);
              if (activeDoc?.isPinned) {
                setDeleteConfirm({ docId: activeId, source: "menu", x: fileMenuLeft + 20, y: 320 });
              } else {
                deleteDoc(activeId);
              }
              setShowFileMenu(false);
            }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <X size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Close Tab</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+W</span>
          </button>
          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => { setShowShortcuts(true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" /></svg>
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Keyboard Shortcuts</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+/</span>
          </button>

          <button
            onClick={() => { openFeedback(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <MessageSquarePlus size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Send Feedback</span>
          </button>
        </div>
      )}

      {/* ── EXPORT PANEL — position: fixed anchored top-right ── */}
      {showExportMenu && (
        <div style={{
          position: "fixed",
          top: 84,
          right: 10,
          background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
          border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
          borderRadius: "var(--r)",
          minWidth: 216,
          padding: "6px 0",
          zIndex: 200,
          boxShadow: effectiveDark
            ? "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)"
            : "0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)",
        }}>
          <button
            style={exportMenuRowStyle(true)}
            onClick={handleSmartExport}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <Sparkles size={13} />
            <span>Smart Export</span>
          </button>

          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
          <div style={exportMenuSectionStyle}>Download</div>

          {[
            { label: "PDF", fn: exportPdf },
            { label: "HTML", fn: exportHtml },
            { label: "Markdown", fn: exportMd },
            { label: "Plain Text", fn: exportTxt },
          ].map((item) => (
            <button
              key={item.label}
              style={exportMenuRowStyle()}
              onClick={item.fn}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span>{item.label}</span>
            </button>
          ))}


          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
          <div style={exportMenuSectionStyle}>Preview Source</div>

          {[
            { key: "rich", label: "Rich Text", fn: () => openSourcePreview("rich") },
            { key: "html", label: "HTML", fn: () => openSourcePreview("html") },
            { key: "markdown", label: "Markdown", fn: () => openSourcePreview("markdown") },
          ].map((item) => {
            return (
              <button
                key={item.key}
                style={exportMenuRowStyle()}
                onClick={item.fn}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <Eye size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}



          {false && [
            { label: "Smart Export", sub: "Ctrl+D · auto-detect format", fn: handleSmartExport, accent: true },
            null,
            { label: "Plain Text (.txt)", sub: "No formatting preserved", fn: exportTxt, accent: false },
            { label: "Markdown (.md)", sub: "Headings, lists, bold, links", fn: exportMd, accent: false },
            { label: "PDF (.pdf)", sub: "Includes images & layout", fn: exportPdf, accent: false },
            { label: "HTML (.html)", sub: "Full web-ready format", fn: exportHtml, accent: false },
          ].map((item, i) =>
            item === null ? (
              <div key={i} style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
            ) : (
              <button
                key={item.label}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                onClick={item.fn}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <span style={{ color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, fontWeight: item.accent ? 600 : 400, fontFamily: "Inter,sans-serif" }}>{item.label}</span>
                <span style={{ color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)", fontSize: 11, marginTop: 1, fontFamily: "Inter,sans-serif" }}>{item.sub}</span>
              </button>
            )
          )}
        </div>
      )}

      <AnimatePresence>
        {sourcePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              inset: 0,
              background: effectiveDark ? "rgba(0, 0, 0, 0.54)" : "rgba(0, 0, 0, 0.2)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
            }}
            onClick={() => setSourcePreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
              style={{
                width: "min(880px, 100%)",
                maxHeight: "84vh",
                background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
                border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                boxShadow: effectiveDark ? "0 24px 70px rgba(0,0,0,0.7)" : "0 24px 70px rgba(0,0,0,0.16)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{
                minHeight: 48,
                padding: "0 14px 0 16px",
                borderBottom: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  {sourcePreview.format === "rich" ? <Type size={15} /> : sourcePreview.format === "html" ? <Code size={15} /> : <MarkdownIcon size={15} />}
                  <span style={{
                    color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.86)",
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 13,
                    fontWeight: 650,
                    whiteSpace: "nowrap",
                  }}>
                    {sourcePreview.format === "rich" ? "Rich Text Preview" : sourcePreview.format === "html" ? "HTML Preview" : "Markdown Preview"}
                  </span>
                  <span style={{
                    color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.48)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {sourcePreview.title}
                  </span>
                </div>
                <button title="Copy source" onClick={copySourcePreview} style={{ ...tb(), width: "auto", padding: "0 10px", gap: 5 }}>
                  {sourcePreview.copied ? <Check size={13} /> : <CopyIcon size={13} />}
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{sourcePreview.copied ? "Copied" : "Copy"}</span>
                </button>
                <button title="Download source" onClick={downloadSourcePreview} style={{ ...tb(), width: "auto", padding: "0 10px", gap: 5 }}>
                  <Download size={13} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Download</span>
                </button>
                <button title="Close" onClick={() => setSourcePreview(null)} style={tb()}>
                  <X size={14} />
                </button>
              </div>

              {sourcePreview.warning && (
                <div style={{
                  padding: "9px 16px",
                  borderBottom: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)",
                  background: effectiveDark ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.12)",
                  color: effectiveDark ? "rgba(255, 226, 170, 0.94)" : "#7A4D08",
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.45,
                }}>
                  {sourcePreview.warning}
                </div>
              )}

              {sourcePreview.format === "rich" ? (
                <div
                  className="notepad-editor"
                  style={{
                    width: "100%",
                    minHeight: 360,
                    maxHeight: "calc(84vh - 54px)",
                    flex: 1,
                    overflow: "auto",
                    padding: "22px 26px",
                    background: effectiveDark ? "rgba(0,0,0,0.22)" : "#F8F8F6",
                    color: effectiveDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.84)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 15,
                    lineHeight: 1.75,
                  }}
                  dangerouslySetInnerHTML={{ __html: sourcePreview.htmlBody || "" }}
                />
              ) : (
                <textarea
                  readOnly
                  value={sourcePreview.value}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    minHeight: 360,
                    maxHeight: "calc(84vh - 54px)",
                    flex: 1,
                    resize: "none",
                    border: "none",
                    outline: "none",
                    padding: "16px 18px",
                    background: effectiveDark ? "rgba(0,0,0,0.22)" : "#F8F8F6",
                    color: effectiveDark ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.82)",
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    whiteSpace: "pre",
                    overflow: "auto",
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFind && (
        <div
          className="notepad-find-panel"
          style={{
            position: "fixed",
            top: 88,
            right: 20,
            width: 340,
            background: effectiveDark ? "rgba(30, 30, 30, 0.88)" : "rgba(255, 255, 255, 0.94)",
            border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 12,
            boxShadow: effectiveDark
              ? "0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)"
              : "0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 250,
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transition: "all 0.2s ease-in-out",
          }}
        >
          {/* Find Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Toggle replace */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)",
                cursor: "pointer",
                padding: 0,
                transition: "background 0.15s, color 0.15s",
              }}
              onClick={() => {
                setShowReplace(!showReplace);
                if (!showReplace) setTimeout(() => replaceInputRef.current?.focus(), 50);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                e.currentTarget.style.color = effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)";
              }}
              title={showReplace ? "Collapse replace" : "Expand replace"}
            >
              <ChevronRight size={14} style={{ transform: showReplace ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {/* Input Wrapper */}
            <div style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              background: effectiveDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)",
              border: isFindFocused
                ? `1px solid ${surfAccent}`
                : (effectiveDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)"),
              borderRadius: 6,
              padding: "0 8px",
              height: 28,
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxShadow: isFindFocused ? `0 0 0 2px ${surfAccent}25` : "none",
            }}>
              <Search size={12} style={{ color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.4)", marginRight: 6, flexShrink: 0 }} />
              <input
                ref={findInputRef}
                value={findText}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setIsFindFocused(true)}
                onBlur={() => setIsFindFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                  if (e.key === "Escape") {
                    closeFind();
                  }
                }}
                placeholder="Find..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: effectiveDark ? "var(--t1)" : "rgba(0, 0, 0, 0.85)",
                  fontSize: 12,
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "Inter,sans-serif",
                  padding: 0,
                }}
              />
              {findText && (
                <span style={{
                  fontSize: 10,
                  color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)",
                  fontFamily: "Inter,sans-serif",
                  marginLeft: 4,
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  fontWeight: 500
                }}>
                  {findResultsCount > 0 ? `${findActiveIndex + 1}/${findResultsCount}` : "0/0"}
                </span>
              )}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                disabled={findResultsCount === 0}
                onClick={handlePrevMatch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: findResultsCount === 0
                    ? (effectiveDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")
                    : (effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)"),
                  cursor: findResultsCount === 0 ? "not-allowed" : "pointer",
                  padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (findResultsCount > 0) {
                    e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                    e.currentTarget.style.color = effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.9)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (findResultsCount > 0) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)";
                  }
                }}
                title="Previous Match (Shift+Enter)"
              >
                <ChevronRight size={14} style={{ transform: "rotate(-90deg)" }} />
              </button>
              <button
                disabled={findResultsCount === 0}
                onClick={handleNextMatch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: findResultsCount === 0
                    ? (effectiveDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")
                    : (effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)"),
                  cursor: findResultsCount === 0 ? "not-allowed" : "pointer",
                  padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (findResultsCount > 0) {
                    e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                    e.currentTarget.style.color = effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.9)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (findResultsCount > 0) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)";
                  }
                }}
                title="Next Match (Enter)"
              >
                <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
              </button>
              <button
                onClick={closeFind}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)",
                  cursor: "pointer",
                  padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = effectiveDark ? "rgba(255,99,99,0.15)" : "rgba(255,0,0,0.08)";
                  e.currentTarget.style.color = effectiveDark ? "#FF5555" : "#CC0000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)";
                }}
                title="Close (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Replace Row */}
          {showReplace && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{ width: 26, flexShrink: 0 }} />
              <div style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
                background: effectiveDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)",
                border: isReplaceFocused
                  ? `1px solid ${surfAccent}`
                  : (effectiveDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)"),
                borderRadius: 6,
                padding: "0 8px",
                height: 28,
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isReplaceFocused ? `0 0 0 2px ${surfAccent}25` : "none",
              }}>
                <input
                  ref={replaceInputRef}
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onFocus={() => setIsReplaceFocused(true)}
                  onBlur={() => setIsReplaceFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleReplace();
                    }
                    if (e.key === "Escape") {
                      closeFind();
                    }
                  }}
                  placeholder="Replace with..."
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: effectiveDark ? "var(--t1)" : "rgba(0, 0, 0, 0.85)",
                    fontSize: 12,
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "Inter,sans-serif",
                    padding: 0,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={handleReplace}
                  disabled={findResultsCount === 0}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "Inter,sans-serif",
                    border: effectiveDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 6,
                    height: 28,
                    padding: "0 10px",
                    cursor: findResultsCount === 0 ? "not-allowed" : "pointer",
                    background: findResultsCount === 0
                      ? (effectiveDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")
                      : (effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
                    color: findResultsCount === 0
                      ? (effectiveDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)")
                      : (effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)"),
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (findResultsCount > 0) {
                      e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.09)";
                      e.currentTarget.style.borderColor = surfAccent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (findResultsCount > 0) {
                      e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                      e.currentTarget.style.borderColor = effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
                    }
                  }}
                  title="Replace next"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={findResultsCount === 0}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "Inter,sans-serif",
                    border: effectiveDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 6,
                    height: 28,
                    padding: "0 10px",
                    cursor: findResultsCount === 0 ? "not-allowed" : "pointer",
                    background: findResultsCount === 0
                      ? (effectiveDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")
                      : (effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
                    color: findResultsCount === 0
                      ? (effectiveDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)")
                      : (effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)"),
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (findResultsCount > 0) {
                      e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.09)";
                      e.currentTarget.style.borderColor = surfAccent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (findResultsCount > 0) {
                      e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                      e.currentTarget.style.borderColor = effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
                    }
                  }}
                  title="Replace all"
                >
                  All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EDITOR SPLIT-VIEW ROW ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minWidth: 0, position: "relative" }} onClick={() => setShowFileMenu(false)}>
        {/* ── Collapsible Outline / Table of Contents Sidebar ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`notepad-outline-sidebar ${showOutline ? 'is-open' : ''}`}
          style={{
            borderRight: showOutline ? (effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.1)") : "none",
            borderRadius: "0 12px 12px 0",
            background: effectiveDark ? "var(--bg1)" : "#FAFAFA",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            height: "calc(100vh - 78px)",
            position: "sticky",
            top: 78,
            zIndex: 10
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PanelLeft size={14} style={{ color: "var(--t2)", opacity: 0.8 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontFamily: "Inter,sans-serif" }}>Outline</span>
              {headings.length > 0 && (
                <span style={{ fontSize: 10, background: effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.06)", color: "var(--t2)", padding: "2px 6px", borderRadius: 10, fontWeight: 500, fontFamily: "Inter,sans-serif" }}>
                  {headings.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowOutline(false)}
              style={{ background: "transparent", border: "none", outline: "none", cursor: "pointer", color: "var(--t2)", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Close Outline"
            >
              <X size={12} />
            </button>
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, scrollbarWidth: "thin" }}>
            {headings.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--t3)", fontSize: 12.5, lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
                Add headings (H1, H2, H3) to see the table of contents.
              </div>
            ) : (
              headings.map((h, i) => {
                const isActive = activeHeadingIndex === i;
                const indent = (h.level - 1) * 12;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const headingElements = editor?.view.dom.querySelectorAll("h1, h2, h3");
                      if (headingElements && headingElements[h.index]) {
                        headingElements[h.index].scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px 6px 8px",
                      marginLeft: indent,
                      width: `calc(100% - ${indent}px)`,
                      background: isActive ? (effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                      border: "none",
                      borderLeft: `3px solid ${isActive ? surfAccent : "transparent"}`,
                      borderRadius: "0 8px 8px 0",
                      cursor: "pointer",
                      textAlign: "left",
                      color: isActive ? (effectiveDark ? "var(--t1)" : "rgba(0, 0, 0, 0.85)") : (effectiveDark ? "rgba(240, 237, 232, 0.6)" : "rgba(0, 0, 0, 0.6)"),
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 12.5,
                      fontFamily: "Inter,sans-serif",
                      transition: "all 0.12s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 9.5, opacity: 0.5, fontWeight: 700, textTransform: "uppercase", background: effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, flexShrink: 0, fontFamily: "monospace" }}>
                      H{h.level}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {h.text}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── EDITOR AREA ─────────────────────────────────────────────────────── */}
        <div
          ref={editorWrapRef}
          className={[
            effectiveDark ? "surface-dark" : "surface-light",
            settings.paperGrain ? "notepad-grain" : "",
          ].filter(Boolean).join(" ")}
          style={{
            flex: 1,
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
            ["--code-bg" as string]: codeBlockStyles.bg,
            ["--code-border" as string]: codeBlockStyles.border,
            ["--code-btn-bg" as string]: codeBlockStyles.btnBg,
            ["--code-btn-border" as string]: codeBlockStyles.btnBorder,
          } as React.CSSProperties}
          onClick={(e) => {
            if (e.target === editorWrapRef.current) editor?.commands.focus("end");
            setShowDocMenu(false); setShowExportMenu(false); setShowSettings(false); setShowShortcuts(false); cancelConfirm();
          }}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".ProseMirror")) {
              e.preventDefault();
              const anchor = target.closest("a");
              const url = anchor ? anchor.getAttribute("href") : undefined;
              setEditorContextMenu({
                x: e.clientX,
                y: e.clientY,
                visible: true,
                targetUrl: url || undefined
              });
            }
          }}
        >
          <div style={editorInnerStyle} className={[settings.ruledLines ? "notepad-ruled" : "", settings.imageBorder ? "notepad-img-border" : ""].filter(Boolean).join(" ")}>
            {activeDoc?.mode === "raw" ? (
              <textarea
                value={activeDoc.content}
                onChange={(e) => handleRawChange(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "calc(100vh - 180px)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "inherit",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: 0,
                  margin: 0,
                }}
                placeholder="Type plain text here..."
              />
            ) : (
              <NotepadErrorBoundary activeDoc={activeDoc} setDocs={setDocs} setActiveId={setActiveId} setSaveStatus={setSaveStatus} effectiveDark={effectiveDark} surfAccent={surfAccent}>
                <EditorContent editor={editor} />
              </NotepadErrorBoundary>
            )}
          </div>
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
        onUpdate={() => {
          const lenis = (window as any).__lenis;
          if (lenis && typeof lenis.resize === "function") lenis.resize();
        }}
        onAnimationComplete={() => {
          const lenis = (window as any).__lenis;
          if (lenis && typeof lenis.resize === "function") lenis.resize();
        }}
      >
        <NotepadSeoContent seo={seo} onScrolledPastEditor={setScrolledPastEditor} />
      </motion.div>

      {/* ── Click-to-Expand Guide Trigger Zone ── */}
      {!isSeoUnlocked && (
        <div
          style={{
            height: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: surfBg,
            gap: 8,
            cursor: "pointer",
            userSelect: "none"
          }}
          onClick={() => {
            justUnlockedRef.current = true;
            setIsSeoUnlocked(true);
            setTimeout(() => {
              window.scrollBy({ top: 120, behavior: "smooth" });
            }, 80);
          }}
        >
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              fontFamily: "'Sora', sans-serif",
              color: effectiveDark ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "color 0.2s"
            }}
            className="notepad-guide-trigger-text"
          >
            Explore Notepad Guide
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${effectiveDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
              background: effectiveDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
              color: effectiveDark ? "rgba(255, 255, 255, 0.38)" : "rgba(0, 0, 0, 0.4)",
              transition: "all 0.2s ease",
            }}
            className="notepad-guide-trigger-icon"
          >
            <ChevronDown size={14} />
          </div>
        </div>
      )}

      {contextMenu && (() => {
        const targetDoc = docs.find((d) => d.id === contextMenu.tabId);
        if (!targetDoc) return null;
        const isPinned = !!targetDoc.isPinned;

        return (
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: Math.min(contextMenu.x, window.innerWidth - 180),
              background: "var(--bg1)",
              border: "1px solid var(--b0)",
              borderRadius: "var(--r)",
              padding: "4px",
              minWidth: 160,
              zIndex: 300,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: "4px",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--t1)",
                fontSize: 12.5,
                fontFamily: "Inter, sans-serif",
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              onClick={() => {
                togglePin(targetDoc.id);
                setContextMenu(null);
              }}
            >
              <Pin size={11} style={{ transform: "rotate(30deg)", opacity: 0.8 }} />
              {isPinned ? "Unpin note" : "Pin note"}
            </button>

            {!isPinned && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: "4px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t1)",
                  fontSize: 12.5,
                  fontFamily: "Inter, sans-serif",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                onClick={() => {
                  setContextMenu(null);
                  setActiveId(targetDoc.id);
                  setEditingTabId(targetDoc.id);
                  setTimeout(() => titleInputRef.current?.select(), 80);
                }}
              >
                <Pencil size={11} style={{ opacity: 0.8 }} />
                Rename note
              </button>
            )}

            <div style={{ borderTop: "1px solid var(--b0)", margin: "2px 0" }} />

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: "4px",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: docs.length > 1 ? "var(--err)" : "var(--t4)",
                fontSize: 12.5,
                fontFamily: "Inter, sans-serif",
                textAlign: "left",
                transition: "background 0.12s",
                opacity: docs.length > 1 ? 1 : 0.5,
              }}
              disabled={docs.length <= 1}
              onMouseEnter={(e) => { if (docs.length > 1) { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--err) 8%, transparent)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              onClick={() => {
                setDeleteConfirm({
                  docId: targetDoc.id,
                  source: "menu",
                  x: contextMenu.x,
                  y: contextMenu.y,
                });
                setContextMenu(null);
              }}
            >
              <Trash2 size={11} style={{ opacity: 0.8 }} />
              Delete note
            </button>
          </div>
        );
      })()}

      <AnimatePresence>
        {deleteConfirm && (
          <>
            {/* Overlay to catch clicks outside the popover */}
            <div
              onClick={cancelConfirm}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 290,
                background: "transparent",
                cursor: "default",
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: deleteConfirm.source === "tab" ? -8 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "fixed",
                zIndex: 300,
                width: 220,
                background: effectiveDark ? "rgba(26, 29, 36, 0.96)" : "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: 12,
                padding: "12px 14px",
                boxShadow: effectiveDark ? "0 10px 40px rgba(0, 0, 0, 0.5)" : "0 10px 40px rgba(0, 0, 0, 0.12)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontFamily: "Inter, sans-serif",
                // Positioning logic based on trigger source
                ...(() => {
                  if (deleteConfirm.source === "tab") {
                    return {
                      left: deleteConfirm.x,
                      top: deleteConfirm.y + 6,
                      transform: "translateX(-50%)",
                    };
                  } else if (deleteConfirm.source === "switcher") {
                    return {
                      left: deleteConfirm.x - 228,
                      top: deleteConfirm.y,
                      transform: "translateY(-50%)",
                    };
                  } else {
                    // context menu source
                    return {
                      left: Math.min(deleteConfirm.x, window.innerWidth - 230),
                      top: Math.min(deleteConfirm.y, window.innerHeight - 130),
                    };
                  }
                })(),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: effectiveDark ? "#FFFFFF" : "#1A1A1A", fontFamily: "'Sora', sans-serif" }}>
                  {docs.find((d) => d.id === deleteConfirm.docId)?.isPinned ? "Delete pinned note?" : "Delete this note?"}
                </span>
                <span style={{ fontSize: 11, color: effectiveDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)", lineHeight: "1.4" }}>
                  You can restore closed notes anytime using Ctrl + Shift + T or Ctrl + Alt + T.
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
                <button
                  ref={deleteConfirmCancelBtnRef}
                  onClick={cancelConfirm}
                  style={{
                    background: "transparent",
                    border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: effectiveDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = surfAccent; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = effectiveDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteDoc(deleteConfirm.docId);
                    setDeleteConfirm(null);
                  }}
                  style={{
                    background: "var(--err)",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    cursor: "pointer",
                    outline: "none",
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${surfAccent}`; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Link Bubble Menu & Popover ── */}
      {editor && isLinkPopoverOpen && linkPopoverCoords && (
        <div
          style={{
            position: "fixed",
            top: linkPopoverCoords.top,
            left: linkPopoverCoords.left,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              background: effectiveDark ? "rgba(22, 22, 21, 0.96)" : "rgba(250, 248, 242, 0.96)",
              border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "12px",
              boxShadow: effectiveDark
                ? "0 12px 32px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                : "0 12px 32px -4px rgba(0, 0, 0, 0.12)",
              backdropFilter: "blur(12px)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {isEditingLink ? (
              <>
                <input
                  type="text"
                  placeholder="Paste or type URL..."
                  value={linkInputUrl}
                  onChange={(e) => setLinkInputUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveLink(linkInputUrl);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      closeLinkPopover();
                    }
                  }}
                  autoFocus
                  style={{
                    height: "32px",
                    background: effectiveDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                    border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: "6px",
                    padding: "0 10px",
                    color: effectiveDark ? "#F0EDE8" : "#1F1B16",
                    fontSize: "12.5px",
                    outline: "none",
                    width: "190px",
                    transition: "all 0.15s ease-out"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = surfAccent;
                    e.target.style.boxShadow = `0 0 0 3px ${surfAccent}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = effectiveDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  onClick={() => saveLink(linkInputUrl)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    background: surfAccent,
                    border: "none",
                    borderRadius: "6px",
                    color: isLightHex(surfAccent) ? "#000000" : "#FFFFFF",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
                  title="Save Link"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={closeLinkPopover}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    background: effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    borderRadius: "6px",
                    color: effectiveDark ? "#A5A29B" : "rgba(0, 0, 0, 0.54)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}
                  title="Cancel"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <a
                  href={editor.getAttributes("link").href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: surfAccent,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12.5px",
                    textDecoration: "underline",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  title="Open link in new tab"
                >
                  <LinkIcon size={13} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {editor.getAttributes("link").href}
                  </span>
                  <ExternalLink size={11} style={{ flexShrink: 0 }} />
                </a>

                <div style={{ width: "1px", height: "16px", background: effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", margin: "0 6px" }} />

                <button
                  onClick={() => {
                    setLinkInputUrl(editor.getAttributes("link").href ?? "");
                    setIsEditingLink(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    color: effectiveDark ? "#A5A29B" : "rgba(0, 0, 0, 0.54)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  title="Edit Link"
                >
                  <Edit size={14} style={{ opacity: 0.8 }} />
                </button>

                <button
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    closeLinkPopover();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    color: effectiveDark ? "#EC7063" : "#C0392B",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(236, 112, 99, 0.15)" : "rgba(192, 57, 43, 0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  title="Remove Link"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Custom Context Menu ── */}
      {editorContextMenu?.visible && (
        <div
          style={{
            position: "fixed",
            top: editorContextMenu.y,
            left: editorContextMenu.x,
            zIndex: 9999,
            background: effectiveDark ? "rgba(30, 30, 30, 0.98)" : "rgba(255, 255, 255, 0.98)",
            border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
            padding: "4px",
            minWidth: "170px",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {editorContextMenu.targetUrl && (
            <>
              <a
                href={editorContextMenu.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  color: surfAccent,
                  textDecoration: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  fontFamily: "Inter, sans-serif"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <ExternalLink size={12} />
                <span>Open Link</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(editorContextMenu.targetUrl || "");
                  setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
                  toast.success("Link copied to clipboard");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  color: effectiveDark ? "#F0EDE8" : "#0D1117",
                  background: "none",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "background 0.12s",
                  fontFamily: "Inter, sans-serif"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <CopyIcon size={12} />
                <span>Copy Link</span>
              </button>
              <div style={{ height: "1px", background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "4px 0" }} />
            </>
          )}

          <button
            onClick={() => {
              editor?.commands.undo();
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
            }}
            disabled={!editor?.can().undo()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: !editor?.can().undo() ? (effectiveDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : (effectiveDark ? "#F0EDE8" : "#0D1117"),
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: !editor?.can().undo() ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => {
              if (editor?.can().undo()) {
                e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
              }
            }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Undo2 size={12} />
              <span>Undo</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+Z</span>
          </button>

          <button
            onClick={() => {
              editor?.commands.redo();
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
            }}
            disabled={!editor?.can().redo()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: !editor?.can().redo() ? (effectiveDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : (effectiveDark ? "#F0EDE8" : "#0D1117"),
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: !editor?.can().redo() ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => {
              if (editor?.can().redo()) {
                e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
              }
            }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Redo2 size={12} />
              <span>Redo</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+Y</span>
          </button>

          <div style={{ height: "1px", background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => {
              const { state } = editor!;
              const { from, to } = state.selection;
              const text = state.doc.textBetween(from, to, " ");
              navigator.clipboard.writeText(text);
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
              toast.success("Text copied");
            }}
            disabled={editor?.state.selection.empty}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: editor?.state.selection.empty ? (effectiveDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : (effectiveDark ? "#F0EDE8" : "#0D1117"),
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: editor?.state.selection.empty ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => {
              if (!editor?.state.selection.empty) {
                e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
              }
            }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CopyIcon size={12} />
              <span>Copy</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+C</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.readText().then(text => {
                editor?.commands.insertContent(text);
              }).catch(() => {
                toast.error("Clipboard access blocked by browser. Use Ctrl+V.");
              });
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: effectiveDark ? "#F0EDE8" : "#0D1117",
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Plus size={12} />
              <span>Paste</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+V</span>
          </button>

          <div style={{ height: "1px", background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => {
              insertLink();
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: effectiveDark ? "#F0EDE8" : "#0D1117",
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <LinkIcon size={12} />
              <span>Link</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+K</span>
          </button>

          <button
            onClick={() => {
              editor?.commands.toggleHighlight();
              setEditorContextMenu(prev => prev ? { ...prev, visible: false } : null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "12.5px",
              color: effectiveDark ? "#F0EDE8" : "#0D1117",
              background: "none",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              transition: "background 0.12s",
              fontFamily: "Inter, sans-serif"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Highlighter size={12} />
              <span>Highlight</span>
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>Ctrl+H</span>
          </button>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ── */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShowShortcuts(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: effectiveDark ? "rgba(5, 7, 10, 0.65)" : "rgba(0, 0, 0, 0.15)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
              style={{
                width: "100%",
                maxWidth: 680,
                maxHeight: "85vh",
                background: "var(--bg1)",
                border: "1px solid var(--b0)",
                borderRadius: 16,
                boxShadow: effectiveDark ? "0 24px 64px rgba(0,0,0,0.65)" : "0 24px 64px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--b0)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Keyboard size={18} style={{ color: surfAccent }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", fontFamily: "Inter, sans-serif" }}>Keyboard Shortcuts</span>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--t3)",
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg3)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, fontFamily: "Inter, sans-serif" }}>
                {/* Column 1: File & Application */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: surfAccent, marginBottom: 10 }}>File & App</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { keys: isElectron ? ["Ctrl", "N"] : ["Ctrl", "Alt", "N"], desc: "New Note" },
                        { keys: ["Ctrl", "O"], desc: "Open Text File" },
                        { keys: ["Ctrl", "S"], desc: "Save Text File" },
                        { keys: ["Ctrl", "P"], desc: "Export PDF" },
                        { keys: isElectron ? ["Ctrl", "W"] : ["Ctrl", "Alt", "W"], desc: "Close Current Note" },
                        { keys: ["Ctrl", "Shift", "T", "or", "Ctrl", "Alt", "T"], desc: "Restore Closed Note" },
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--t2)" }}>{item.desc}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {item.keys.map((k, kIdx) => (
                              <kbd key={kIdx} style={{ background: "var(--bg2)", border: "1px solid var(--b0)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: "var(--t1)", fontFamily: "monospace" }}>{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: surfAccent, marginBottom: 10 }}>Tab Navigation</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { keys: isElectron ? ["Ctrl", "Tab"] : ["Ctrl", "Alt", "→"], desc: "Next Tab" },
                        { keys: isElectron ? ["Ctrl", "Shift", "Tab"] : ["Ctrl", "Alt", "←"], desc: "Previous Tab" },
                        { keys: isElectron ? ["Ctrl", "1-8"] : ["Alt", "1-8"], desc: "Switch to Tab 1-8" },
                        { keys: isElectron ? ["Ctrl", "9"] : ["Alt", "9"], desc: "Switch to Last Tab" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--t2)" }}>{item.desc}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {item.keys.map((k, kIdx) => (
                              <kbd key={kIdx} style={{ background: "var(--bg2)", border: "1px solid var(--b0)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: "var(--t1)", fontFamily: "monospace" }}>{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2: Formatting & Tools */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: surfAccent, marginBottom: 10 }}>Text Formatting</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { keys: ["Ctrl", "B"], desc: "Bold Text" },
                        { keys: ["Ctrl", "I"], desc: "Italic Text" },
                        { keys: ["Ctrl", "U"], desc: "Underline Text" },
                        { keys: ["Ctrl", "H"], desc: "Highlight Text" },
                        { keys: ["Ctrl", "Shift", "X"], desc: "Strikethrough" },
                        { keys: ["Ctrl", "Shift", "C"], desc: "Toggle Code Block" },
                        { keys: isElectron ? ["Ctrl", "Shift", "B"] : ["Ctrl", "Shift", "Q"], desc: "Toggle Blockquote" },
                        { keys: ["Ctrl", "Shift", "U"], desc: "Bullet List" },
                        { keys: ["Ctrl", "Shift", "L"], desc: "Numbered List" },
                        { keys: ["Ctrl", "Shift", "K"], desc: "Checklist" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--t2)" }}>{item.desc}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {item.keys.map((k, kIdx) => (
                              <kbd key={kIdx} style={{ background: "var(--bg2)", border: "1px solid var(--b0)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: "var(--t1)", fontFamily: "monospace" }}>{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: surfAccent, marginBottom: 10 }}>Editor Controls</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { keys: ["Ctrl", "F"], desc: "Find & Replace" },
                        { keys: ["Ctrl", "Z"], desc: "Undo last edit" },
                        { keys: ["Ctrl", "Y"], desc: "Redo last edit" },
                        { keys: ["Ctrl", "/"], desc: "Toggle Help Dialog" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--t2)" }}>{item.desc}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {item.keys.map((k, kIdx) => (
                              <kbd key={kIdx} style={{ background: "var(--bg2)", border: "1px solid var(--b0)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: "var(--t1)", fontFamily: "monospace" }}>{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (() => {
          const targetDoc = docs.find((d) => d.id === contextMenu.tabId);
          if (!targetDoc) return null;

          return (
            <>
              {/* Invisible click catcher overlay */}
              <div
                onClick={() => setContextMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu(null);
                }}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9990,
                  background: "transparent",
                  cursor: "default",
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: "fixed",
                  top: contextMenu.y,
                  left: Math.min(contextMenu.x, window.innerWidth - 190),
                  zIndex: 9999,
                  background: effectiveDark ? "rgba(26, 29, 36, 0.96)" : "rgba(255, 255, 255, 0.96)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "10px",
                  padding: "4px 0",
                  boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
                  minWidth: 170,
                  fontFamily: "Inter, sans-serif"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    togglePin(targetDoc.id);
                    setContextMenu(null);
                  }}
                >
                  <Pin size={13} style={{ opacity: 0.7, transform: targetDoc.isPinned ? "none" : "rotate(30deg)" }} />
                  <span>{targetDoc.isPinned ? "Unpin Tab" : "Pin Tab"}</span>
                </button>

                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    duplicateDoc(targetDoc.id);
                    setContextMenu(null);
                  }}
                >
                  <CopyIcon size={13} style={{ opacity: 0.7 }} />
                  <span>Duplicate Tab</span>
                </button>

                <div style={{ height: 1, background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "4px 0" }} />

                <div style={{ padding: "6px 14px 4px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 9.5, textTransform: "uppercase", fontWeight: 700, color: "var(--t3)", letterSpacing: "0.5px" }}>Tab Highlight Color</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                    <button
                      onClick={() => {
                        setTabColor(targetDoc.id, undefined);
                        setContextMenu(null);
                      }}
                      style={{
                        width: 16, height: 16, borderRadius: "50%", border: effectiveDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.25)",
                        background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative"
                      }}
                      title="Clear Color"
                    >
                      <div style={{ width: 1, height: 10, background: effectiveDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", transform: "rotate(45deg)" }} />
                    </button>

                    {TAB_COLORS.map((color) => {
                      const isSelected = targetDoc.color === color.id;
                      const displayColor = effectiveDark ? color.darkValue : color.lightValue;
                      return (
                        <button
                          key={color.id}
                          onClick={() => {
                            setTabColor(targetDoc.id, color.id);
                            setContextMenu(null);
                          }}
                          style={{
                            width: 16, height: 16, borderRadius: "50%", border: "none", background: displayColor,
                            cursor: "pointer",
                            outline: isSelected ? (effectiveDark ? "2px solid #FFFFFF" : "2px solid #000000") : "none",
                            outlineOffset: 1,
                            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                            transition: "transform 0.1s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "4px 0" }} />

                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    if (targetDoc.isPinned) {
                      setDeleteConfirm({
                        docId: targetDoc.id,
                        source: "menu",
                        x: contextMenu.x,
                        y: contextMenu.y,
                      });
                    } else {
                      deleteDoc(targetDoc.id);
                    }
                    setContextMenu(null);
                  }}
                  disabled={docs.length <= 1}
                >
                  <X size={13} style={{ opacity: 0.7 }} />
                  <span>Close Tab</span>
                </button>

                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    closeOtherDocs(targetDoc.id);
                    setContextMenu(null);
                  }}
                  disabled={docs.length <= 1}
                >
                  <Trash2 size={13} style={{ opacity: 0.7 }} />
                  <span>Close Other Tabs</span>
                </button>

                {(() => {
                  const tabIndex = sortedDocs.findIndex((d) => d.id === targetDoc.id);
                  const hasTabsToRight = tabIndex !== -1 && tabIndex < sortedDocs.length - 1;
                  return (
                    <button
                      className="tab-context-menu-item"
                      onClick={() => {
                        closeDocsToTheRight(targetDoc.id);
                        setContextMenu(null);
                      }}
                      disabled={!hasTabsToRight}
                    >
                      <Trash2 size={13} style={{ opacity: 0.7 }} />
                      <span>Close Tabs to Right</span>
                    </button>
                  );
                })()}
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {imageContextMenu && (() => {
          // Get current size:
          const node = editor?.state.doc.nodeAt(imageContextMenu.pos);
          const currentSize = (node?.attrs.size || "medium") as ImgSize;

          return (
            <>
              {/* Invisible click catcher overlay */}
              <div
                onClick={() => setImageContextMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setImageContextMenu(null);
                }}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9990,
                  background: "transparent",
                  cursor: "default",
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: "fixed",
                  top: imageContextMenu.y,
                  left: Math.min(imageContextMenu.x, window.innerWidth - 180),
                  zIndex: 9999,
                  background: effectiveDark ? "rgba(26, 29, 36, 0.96)" : "rgba(255, 255, 255, 0.96)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: effectiveDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "10px",
                  padding: "4px 0",
                  boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
                  minWidth: 160,
                  fontFamily: "Inter, sans-serif"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    copyImageToClipboard(imageContextMenu.src);
                    setImageContextMenu(null);
                  }}
                >
                  <CopyIcon size={13} style={{ opacity: 0.7 }} />
                  <span>Copy Image</span>
                </button>

                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    downloadImage(imageContextMenu.src);
                    setImageContextMenu(null);
                  }}
                >
                  <Download size={13} style={{ opacity: 0.7 }} />
                  <span>Download Image</span>
                </button>

                <div style={{ height: 1, background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "4px 0" }} />

                <div style={{ padding: "6px 14px 4px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 9.5, textTransform: "uppercase", fontWeight: 700, color: "var(--t3)", letterSpacing: "0.5px" }}>Image Size</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["small", "medium", "large", "full"] as ImgSize[]).map((s) => {
                      const isSelected = currentSize === s;
                      const sizeLabels: Record<ImgSize, string> = { small: "S", medium: "M", large: "L", full: "Full" };
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setImageSizeAtPos(imageContextMenu.pos, s);
                            setImageContextMenu(null);
                          }}
                          style={{
                            flex: 1,
                            background: isSelected ? "var(--np-accent)" : (effectiveDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                            color: isSelected ? "#FFFFFF" : "var(--t2)",
                            border: "none",
                            borderRadius: 4,
                            padding: "3px 0",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "background 0.1s"
                          }}
                        >
                          {sizeLabels[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "4px 0" }} />

                <button
                  className="tab-context-menu-item"
                  onClick={() => {
                    deleteImageAtPos(imageContextMenu.pos);
                    setImageContextMenu(null);
                  }}
                  style={{ color: "var(--err)" }}
                >
                  <Trash2 size={13} style={{ opacity: 0.7, color: "var(--err)" }} />
                  <span>Delete Image</span>
                </button>
              </motion.div>
            </>
          );
        })()}
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
                      const isNo = ci > 0 && /^No(\b|$)/.test(cell);
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
