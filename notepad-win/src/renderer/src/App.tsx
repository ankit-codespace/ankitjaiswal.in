import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { Editor, useEditor, EditorContent, BubbleMenu, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, Extension } from "@tiptap/react";

// Global Error Overlay for Debugging
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.right = "0";
    div.style.background = "#FF4444";
    div.style.color = "white";
    div.style.zIndex = "999999";
    div.style.padding = "20px";
    div.style.fontSize = "14px";
    div.style.fontFamily = "monospace";
    div.style.whiteSpace = "pre-wrap";
    div.innerText = "Runtime Error: " + event.message + "\nSource: " + event.filename + ":" + event.lineno + "\nStack:\n" + (event.error ? event.error.stack : "No stack trace");
    document.body.appendChild(div);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.right = "0";
    div.style.background = "#FF8800";
    div.style.color = "white";
    div.style.zIndex = "999999";
    div.style.padding = "20px";
    div.style.fontSize = "14px";
    div.style.fontFamily = "monospace";
    div.style.whiteSpace = "pre-wrap";
    div.innerText = "Unhandled Rejection: " + event.reason;
    document.body.appendChild(div);
  });
}
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TipTapImage from "@tiptap/extension-image";
import CodeBlock from "@tiptap/extension-code-block";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TipTapLink from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { toast, Toaster } from "sonner";
import Turndown from "turndown";
import { TrailingNode } from "./extensions/trailing-node";

import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  ImageIcon, Link as LinkIcon, Minus, Undo2, Redo2, Search, X, Maximize2,
  Minimize2, Download, ChevronDown, ChevronRight, Plus, FileText, PanelLeft,
  Check, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, Clock, Quote, Settings, Eraser,
  Trash2, Save, Pin, Table2, Code2, Copy, Keyboard
} from "lucide-react";

// ── ElectronAPI Types ─────────────────────────────────────────────────────────
interface ElectronAPI {
  openFile: () => Promise<{ path: string; name: string; content: string } | null>;
  showSaveDialog: (defaultName: string) => Promise<string | null>;
  saveFile: (filePath: string | null | undefined, content: string) => Promise<{ path: string; name: string } | null>;
  getDesktopPath: () => Promise<string>;
  closeApp: () => Promise<void>;
  minimizeApp: () => Promise<void>;
  maximizeApp: () => Promise<void>;
  onOpenFile: (callback: (data: { path: string; name: string; content: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ── Markdown and TXT Parsers ──────────────────────────────────────────────────
function txtToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<p>${escaped || ''}</p>`;
    })
    .join('');
}

function parseInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/==(.*?)==/g, '<mark>$1</mark>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeContent = '';

  for (let line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${codeContent.trim()}</code></pre>`;
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Check lists
    const bulletMatch = line.match(/^[\-\*]\s+(.*)/);
    const numberMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
        html += '<ul>';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${parseInlineMarkdown(bulletMatch[1])}</li>`;
      continue;
    }

    if (numberMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
        html += '<ol>';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${parseInlineMarkdown(numberMatch[1])}</li>`;
      continue;
    }

    if (inList) {
      html += listType === 'ul' ? '</ul>' : '</ol>';
      inList = false;
      listType = null;
    }

    // Headings
    const h3Match = line.match(/^###\s+(.*)/);
    const h2Match = line.match(/^##\s+(.*)/);
    const h1Match = line.match(/^#\s+(.*)/);

    if (h3Match) {
      html += `<h3>${parseInlineMarkdown(h3Match[1])}</h3>`;
    } else if (h2Match) {
      html += `<h2>${parseInlineMarkdown(h2Match[1])}</h2>`;
    } else if (h1Match) {
      html += `<h1>${parseInlineMarkdown(h1Match[1])}</h1>`;
    } else if (line.trim() === '') {
      html += '<p></p>';
    } else {
      html += `<p>${parseInlineMarkdown(line)}</p>`;
    }
  }

  if (inList) {
    html += listType === 'ul' ? '</ul>' : '</ol>';
  }

  return html;
}

function fileContentToHtml(filename: string, content: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'md') return markdownToHtml(content);
  if (ext === 'html' || ext === 'htm') {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : content;
  }
  return txtToHtml(content);
}

function generateFullHtml(title: string, bodyContent: string, theme?: { bg: string; text: string; isDark: boolean }): string {
  const isDark = theme ? theme.isDark : false;
  const bg = theme ? theme.bg : "#FAF8F2";
  const text = theme ? theme.text : "#1F1B16";

  const border = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.15)";
  const borderHr = isDark ? "rgba(255, 255, 255, 0.58)" : "rgba(0, 0, 0, 0.58)";
  const headerBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
  const zebraBg = isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.01)";
  const blockquoteBg = isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)";
  const codeBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: ${bg};
      --text: ${text};
      --accent: #10B981;
      --border: ${border};
      --border-hr: ${borderHr};
      --header-bg: ${headerBg};
      --zebra-bg: ${zebraBg};
      --mark-bg: #FDE047;
      --mark-text: #111318;
      --blockquote-bg: ${blockquoteBg};
      --code-bg: ${codeBg};
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      line-height: 1.65;
      color: var(--text);
      background-color: var(--bg);
      transition: background-color 0.3s, color 0.3s;
    }
    p { margin: 0 0 1em; }
    p:last-child { margin-bottom: 0; }
    h1 { font-family: 'Sora', sans-serif; font-size: 2em; font-weight: 700; line-height: 1.2; letter-spacing: -0.025em; margin: 1.4em 0 0.4em; color: var(--text); }
    h2 { font-family: 'Sora', sans-serif; font-size: 1.45em; font-weight: 600; line-height: 1.3; letter-spacing: -0.015em; margin: 1.2em 0 0.35em; color: var(--text); }
    h3 { font-family: 'Sora', sans-serif; font-size: 1.18em; font-weight: 600; line-height: 1.4; margin: 1em 0 0.3em; color: var(--text); }
    h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
    
    strong { font-weight: 700; }
    em { font-style: italic; }
    u { text-decoration: underline; text-underline-offset: 3px; }
    s { text-decoration: line-through; }
    
    mark {
      background: var(--mark-bg);
      color: var(--mark-text);
      padding: 0.12em 0.16em;
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    
    hr {
      border: none;
      border-top: 2px dashed var(--border-hr);
      margin: 1.8em 0;
    }
    
    a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
    
    ul { list-style-type: disc; padding-left: 1.6em; margin: 0.5em 0 1em; }
    ol { list-style-type: decimal; padding-left: 1.6em; margin: 0.5em 0 1em; }
    ul ul { list-style-type: circle; }
    ul ul ul { list-style-type: square; }
    li { margin: 0.3em 0; }
    li p { margin: 0; }
    
    ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    ul[data-type="taskList"] > li { display: flex; align-items: flex-start; gap: 8px; margin: 0.4em 0; }
    ul[data-type="taskList"] > li > label { display: flex; align-items: center; flex-shrink: 0; margin-top: 4px; }
    ul[data-type="taskList"] > li > label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
    ul[data-type="taskList"] > li[data-checked="true"] > div { opacity: 0.5; text-decoration: line-through; }
    ul[data-type="taskList"] > li > div { flex: 1; }
    
    blockquote {
      position: relative;
      border-left: 4px solid var(--accent);
      margin: 1.6em 0;
      padding: 1.2em 1.5em 1.2em 2.2em;
      background: var(--blockquote-bg);
      border-radius: 0 12px 12px 0;
      color: var(--text);
      opacity: 0.85;
      font-size: 1.05em;
      line-height: 1.65;
      font-style: italic;
    }
    blockquote::before {
      content: "“";
      position: absolute;
      left: 10px;
      top: -12px;
      font-size: 4em;
      font-family: Georgia, serif;
      color: var(--accent);
      opacity: 0.15;
      line-height: 1;
      pointer-events: none;
      user-select: none;
    }
    
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 1.8em 0;
      overflow: hidden;
      border-radius: 8px;
      border-style: hidden;
      box-shadow: 0 0 0 1px var(--border);
    }
    th, td {
      min-width: 1em;
      border: 1px solid var(--border);
      padding: 8px 12px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;
      text-align: left;
    }
    th {
      font-weight: 600;
      background-color: var(--header-bg);
    }
    tr:nth-child(even) {
      background-color: var(--zebra-bg);
    }
    
    code {
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    pre {
      background: var(--code-bg);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5em 0;
    }
    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.95em;
    }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 1.5em auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function htmlToMarkdown(html: string): string {
  const td = new Turndown({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  
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

  td.addRule("highlight", {
    filter: ["mark"],
    replacement: (content: string) => `==${content}==`,
  });

  td.addRule("table", {
    filter: ["table"],
    replacement: (_content: string, node: Element) => `\n\n${node.outerHTML}\n\n`,
  });

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
}

// ── TipTap Extensions ──────────────────────────────────────────────────────────
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
        {copied ? <Check size={14} /> : <Copy size={14} />}
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

        const isActive = this.editor.isActive("codeBlock");
        if (isActive) {
          return commands.toggleNode("codeBlock", "paragraph");
        }

        if (empty) {
          return commands.toggleNode("codeBlock", "paragraph");
        }

        const selectedText = state.doc.textBetween(from, to, "\n", (node: any) => {
          if (node.type.name === "hardBreak") return "\n";
          return "";
        });
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface NotepadDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  filePath?: string;
  isPinned?: boolean;
  isUnsaved?: boolean;
  isTitleAutoGenerated?: boolean;
  color?: string;
}

interface NotepadSettings {
  fontSize: number;
  lineHeight: number;
  writingWidth: "wide" | "focused" | "narrow";
  lightSurface: boolean;
  spellCheck: boolean;
  bgColor: string;
  textColor: string;
  ruledLines: boolean;
  paperGrain: boolean;
  imageBorder: boolean;
  zoom?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────
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
};

const THEMES = [
  { label: "Slate",    bg: "#161615", tabStripBg: "#0C0C0C", text: "#F0EDE8", accent: "#52C47A", dark: true },
  { label: "Paper",    bg: "#FAF8F2", tabStripBg: "#EAE6DF", text: "#1F1B16", accent: "#C8863A", dark: false },
  { label: "Midnight", bg: "#0F0F0E", tabStripBg: "#000000", text: "#D4D0C8", accent: "#EDE8DF", dark: true },
  { label: "Sepia",    bg: "#F4ECD8", tabStripBg: "#E3DAC2", text: "#3D2B1F", accent: "#C8863A", dark: false },
  { label: "Mist",     bg: "#EAE6DF", tabStripBg: "#DAD6CE", text: "#1F1B16", accent: "#7A7874", dark: false },
] as const;

const TAB_COLORS = [
  { id: "red", name: "Coral Red", value: "#EC7063" },
  { id: "orange", name: "Amber Orange", value: "#E59866" },
  { id: "yellow", name: "Warm Yellow", value: "#F4D03F" },
  { id: "green", name: "Sage Green", value: "#58D68D" },
  { id: "blue", name: "Slate Blue", value: "#5DADE2" },
  { id: "purple", name: "Lavender", value: "#AF7AC5" },
];

function isLightHex(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return r * 0.299 + g * 0.587 + b * 0.114 > 128;
}

function genId() { return `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function getAutoTitleFromText(text: string): string {
  const clean = text.trim();
  if (!clean) return "Untitled";
  
  const lines = clean.split('\n');
  let firstLine = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 0) {
      firstLine = trimmed;
      break;
    }
  }
  
  if (!firstLine) return "Untitled";

  if (firstLine.length > 25) {
    return firstLine.substring(0, 22).trim() + "...";
  }
  return firstLine;
}

function newDoc(title = "Untitled"): NotepadDoc {
  return {
    id: genId(),
    title,
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isTitleAutoGenerated: title === "Untitled"
  };
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.zoom === undefined) parsed.zoom = 1.1;
      if (parsed.lineHeight === 2.1) parsed.lineHeight = 2.15;
      if (parsed.lineHeight === 2.6 || parsed.lineHeight === 1.95) parsed.lineHeight = 2.65;
      if (parsed.lineHeight === 1.5 || parsed.lineHeight === 1.45) parsed.lineHeight = 1.65;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return {
    ...DEFAULT_SETTINGS,
    bgColor: THEMES[0].bg,
    textColor: THEMES[0].text,
    lightSurface: !THEMES[0].dark,
    zoom: 1.1,
  };
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

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
function getTooltip(name: string, shortcut?: string) {
  if (!shortcut) return name;
  const key = isMac ? shortcut.replace(/Ctrl\+/g, "⌘").replace(/Alt\+/g, "⌥").replace(/Shift\+/g, "⇧") : shortcut;
  return `${name} (${key})`;
}

const toggleMarkOnTrimmedSelection = (editor: any, markTypeName: string, attrs?: any) => {
  if (!editor) return;
  const { state, view } = editor;
  const { selection } = state;
  const { $from, $to, empty } = selection;
  
  if (empty) {
    // Cursor only — toggle the mark so it applies/removes from next typed characters
    const methodName = `toggle${markTypeName.charAt(0).toUpperCase() + markTypeName.slice(1)}`;
    const chain = editor.chain().focus();
    if (typeof chain[methodName] === 'function') {
      chain[methodName](attrs || {}).run();
    } else {
      editor.chain().focus().toggleMark(markTypeName, attrs).run();
    }
    return;
  }

  const from = $from.pos;
  const to = $to.pos;
  const text = state.doc.textBetween(from, to, ' ');

  let trailingSpaces = 0;
  while (trailingSpaces < text.length && text[text.length - 1 - trailingSpaces] === ' ') {
    trailingSpaces++;
  }

  let leadingSpaces = 0;
  while (leadingSpaces < text.length && text[leadingSpaces] === ' ') {
    leadingSpaces++;
  }

  const newFrom = from + leadingSpaces;
  const newTo = to - trailingSpaces;
  if (newFrom >= newTo) return;

  const markType = state.schema.marks[markTypeName];
  if (!markType) return;

  const tr = state.tr;
  tr.setSelection(
    (state.selection.constructor as any).create(state.doc, newFrom, newTo)
  );

  const hasMark = state.doc.rangeHasMark(newFrom, newTo, markType);
  if (hasMark) {
    tr.removeMark(newFrom, newTo, markType);
  } else {
    tr.addMark(newFrom, newTo, markType.create(attrs));
  }

  view.dispatch(tr);
  editor.commands.focus();
};

const setColorOnTrimmedSelection = (editor: any, color: string | null) => {
  if (!editor) return;
  const { state, view } = editor;
  const { selection } = state;
  const { $from, $to, empty } = selection;

  if (empty) {
    if (!color) {
      (editor.chain().focus() as any).unsetColor().run();
    } else {
      (editor.chain().focus() as any).setColor(color).run();
    }
    return;
  }

  const from = $from.pos;
  const to = $to.pos;
  const text = state.doc.textBetween(from, to, ' ');

  let trailingSpaces = 0;
  while (trailingSpaces < text.length && text[text.length - 1 - trailingSpaces] === ' ') {
    trailingSpaces++;
  }

  let leadingSpaces = 0;
  while (leadingSpaces < text.length && text[leadingSpaces] === ' ') {
    leadingSpaces++;
  }

  const newFrom = from + leadingSpaces;
  const newTo = to - trailingSpaces;
  if (newFrom >= newTo) return;

  const markType = state.schema.marks['textStyle'];
  if (!markType) return;

  const tr = state.tr;
  tr.setSelection(
    (state.selection.constructor as any).create(state.doc, newFrom, newTo)
  );

  if (!color) {
    tr.removeMark(newFrom, newTo, markType);
  } else {
    tr.addMark(newFrom, newTo, markType.create({ color }));
  }

  view.dispatch(tr);
  editor.commands.focus();
};

interface NotepadEditorProps {
  doc: NotepadDoc;
  settings: NotepadSettings;
  onCreated: (docId: string, editor: Editor) => void;
  onDestroyed: (docId: string) => void;
  onUpdate: (editor: Editor) => void;
  onSelectionUpdate: () => void;
  onImageContextMenu: (x: number, y: number, src: string) => void;
}

const NotepadEditor = ({
  doc,
  settings,
  onCreated,
  onDestroyed,
  onUpdate,
  onSelectionUpdate,
  onImageContextMenu
}: NotepadEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      CustomCodeBlock,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ inline: true }),
      Placeholder.configure({
        placeholder: "Start writing, paste images, use shortcuts..."
      }),
      CharacterCount,
      TextStyle,
      Color,
      TipTapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SearchAndReplace,
      TrailingNode,
    ],
    editorProps: {
      attributes: {
        class: "notepad-editor focus:outline-none"
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          const isNotScrollbar = event.clientX < window.innerWidth - 18;
          
          if (target.classList.contains("ProseMirror") && isNotScrollbar) {
            const editorDom = view.dom;
            const lastChild = editorDom.lastElementChild;
            const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : editorDom.getBoundingClientRect();
            const lastBottomY = lastChildRect.bottom;
            const clickY = event.clientY;
            
            if (clickY > lastBottomY) {
              const deltaY = clickY - lastBottomY;
              const currentSettings = settings;
              const zoomedLineHeight = currentSettings.fontSize * currentSettings.lineHeight * (currentSettings.zoom || 1.0);
              const newLinesCount = Math.max(1, Math.round(deltaY / zoomedLineHeight));
              
              const { state } = view;
              const nodes: any[] = [];
              for (let i = 0; i < newLinesCount; i++) {
                nodes.push(state.schema.nodes.paragraph.createAndFill());
              }
              const tr = state.tr.insert(state.doc.content.size, nodes);
              const newSelection = (state.selection.constructor as any).create(tr.doc, tr.doc.content.size);
              tr.setSelection(newSelection);
              view.dispatch(tr);
              
              // Force editor focus immediately and prevent default cursor jump
              setTimeout(() => {
                view.focus();
              }, 0);
              
              event.preventDefault();
              return true;
            }
          }
          return false;
        },
        click: (view, event) => {
          const target = event.target as HTMLElement;
          const isNotScrollbar = event.clientX < window.innerWidth - 18;
          
          if (target.classList.contains("ProseMirror") && isNotScrollbar) {
            const editorDom = view.dom;
            const lastChild = editorDom.lastElementChild;
            const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : editorDom.getBoundingClientRect();
            const lastBottomY = lastChildRect.bottom;
            const clickY = event.clientY;
            
            if (clickY > lastBottomY) {
              event.preventDefault();
              return true;
            }
          }
          return false;
        },
        contextmenu: (_view, event) => {
          const target = event.target as HTMLElement;
          if (target.nodeName === "IMG") {
            event.preventDefault();
            onImageContextMenu(event.clientX, event.clientY, target.getAttribute("src") || "");
            return true;
          }
          return false;
        }
      },
      handleDoubleClick(view, _pos, _event) {
        setTimeout(() => {
          const { state } = view;
          const { selection } = state;
          const { $from, $to, empty } = selection;
          if (empty) return;
          const from = $from.pos;
          const to = $to.pos;
          const text = state.doc.textBetween(from, to, ' ');
          let trailingSpaces = 0;
          while (trailingSpaces < text.length && text[text.length - 1 - trailingSpaces] === ' ') {
            trailingSpaces++;
          }
          if (trailingSpaces > 0 && from < to - trailingSpaces) {
            const tr = state.tr.setSelection(
              (state.selection.constructor as any).create(state.doc, from, to - trailingSpaces)
            );
            view.dispatch(tr);
          }
        }, 0);
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf("image") === 0) {
            hasImage = true;
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                const node = view.state.schema.nodes.image.create({ src: base64 });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              };
              reader.readAsDataURL(file);
            }
          }
        }
        return hasImage;
      }
    },
    content: doc.content || "",
    onUpdate({ editor }) {
      onUpdate(editor);
    },
    onSelectionUpdate() {
      onSelectionUpdate();
    }
  }, []);

  // Register editor instance with parent
  useEffect(() => {
    if (editor) {
      onCreated(doc.id, editor);
      return () => {
        onDestroyed(doc.id);
      };
    }
    return undefined;
  }, [doc.id, editor, onCreated, onDestroyed]);

  // Keep spellCheck updated dynamically
  useEffect(() => {
    if (editor) {
      editor.view.dom.setAttribute("spellcheck", String(settings.spellCheck));
    }
  }, [editor, settings.spellCheck]);

  // Sync content if it changes externally
  useEffect(() => {
    if (editor && doc.content !== editor.getHTML()) {
      editor.commands.setContent(doc.content);
    }
  }, [editor, doc.content]);

  // Ruled lines baseline alignment
  useEffect(() => {
    if (!editor || editor.isDestroyed) return undefined;

    const alignBlocksToGrid = () => {
      if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return;
      const editorEl = editor.view.dom;

      const blocks = editorEl.querySelectorAll(".notepad-code-block-wrapper, table, blockquote, hr, img, .image-node");

      if (!settings.ruledLines) {
        blocks.forEach((el: any) => {
          if (el.style.paddingBottom) el.style.paddingBottom = "";
          if (el.style.marginTop) el.style.marginTop = "";
          if (el.style.marginBottom) el.style.marginBottom = "";
        });
        return;
      }

      const G = settings.fontSize * settings.lineHeight;

      blocks.forEach((el: any) => {
        if (el.style.paddingBottom) el.style.paddingBottom = "";
        if (el.style.marginTop) el.style.marginTop = "";

        const naturalHeight = el.offsetHeight;
        if (naturalHeight === 0) return;

        const minGap = G / 2;
        const targetHeight = Math.ceil((naturalHeight + minGap) / G) * G;
        const needed = targetHeight - naturalHeight;
        const neededStr = needed > 0 ? `${needed}px` : "";

        if (el.style.marginBottom !== neededStr) {
          el.style.marginBottom = neededStr;
        }
      });

      const images = editorEl.querySelectorAll("img");
      images.forEach((img: any) => {
        if (!img.onload) {
          img.onload = () => {
            alignBlocksToGrid();
          };
        }
      });
    };

    alignBlocksToGrid();
    editor.on("update", alignBlocksToGrid);
    window.addEventListener("resize", alignBlocksToGrid);

    return () => {
      if (!editor.isDestroyed) {
        editor.off("update", alignBlocksToGrid);
      }
      window.removeEventListener("resize", alignBlocksToGrid);
    };
  }, [editor, settings.ruledLines, settings.fontSize, settings.lineHeight]);

  const effectiveDark = settings.bgColor ? !isLightHex(settings.bgColor) : !settings.lightSurface;
  const tb = (): React.CSSProperties => {
    const fg = effectiveDark ? "var(--t2)" : "rgba(0, 0, 0, 0.54)";
    return {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
      background: "transparent", color: fg, transition: "background 0.14s, color 0.14s", flexShrink: 0,
    };
  };

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, zIndex: 1000 }}
          shouldShow={({ editor }) => editor.isFocused && editor.isActive("table")}
        >
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "4px",
              background: effectiveDark ? "rgba(30, 30, 30, 0.98)" : "rgba(255, 255, 255, 0.98)",
              border: effectiveDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.18)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              backdropFilter: "blur(8px)"
            }}
          >
            <button
              title="Row Above"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0 }}
            >
              <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button
              title="Row Below"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0 }}
            >
              <ChevronDown size={14} />
            </button>
            <button
              title="Delete Row"
              onClick={() => editor.chain().focus().deleteRow().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0, color: "var(--err)" }}
            >
              <Minus size={14} />
            </button>

            <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", margin: "0 4px" }} />

            <button
              title="Column Left"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0 }}
            >
              <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button
              title="Column Right"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0 }}
            >
              <ChevronRight size={14} />
            </button>
            <button
              title="Delete Column"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              style={{ ...tb(), width: 28, height: 28, padding: 0, color: "var(--err)" }}
            >
              <Minus size={14} style={{ transform: "rotate(90deg)" }} />
            </button>

            <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", margin: "0 4px" }} />

            <button
              title="Delete Table"
              onClick={() => editor.chain().focus().deleteTable().run()}
              style={{
                ...tb(),
                width: "auto",
                padding: "0 8px",
                height: 28,
                color: "#FFFFFF",
                background: "var(--err)",
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 5
              }}
            >
              <Trash2 size={12} />
              <span>Delete Table</span>
            </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </>
  );
};

// ── App Component ─────────────────────────────────────────────────────────────
export default function App() {
  const [docs, setDocs] = useState<NotepadDoc[]>(() => loadDocs());
  const [activeId, setActiveId] = useState<string>(() => loadActiveId(loadDocs()));
  const [settings, setSettings] = useState<NotepadSettings>(() => loadSettings());

  const scrollPositionsRef = useRef<{ [id: string]: number }>({});
  const isRestoringScrollRef = useRef<boolean>(false);

  const changeTab = useCallback((id: string) => {
    if (activeId) {
      scrollPositionsRef.current[activeId] = window.scrollY;
    }
    setActiveId(id);
  }, [activeId]);

  // Track and save scroll position per tab
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoringScrollRef.current && activeId) {
        scrollPositionsRef.current[activeId] = window.scrollY;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeId]);

  const [focusMode, setFocusMode] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [findResultsCount, setFindResultsCount] = useState(0);
  const [findActiveIndex, setFindActiveIndex] = useState(0);
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [closedDocsHistory, setClosedDocsHistory] = useState<NotepadDoc[]>([]);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<{ x: number; y: number; src: string } | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [fileMenuLeft, setFileMenuLeft] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [headings, setHeadings] = useState<{ text: string; level: number; index: number }[]>([]);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number | null>(null);

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  // Increments on every editor update or selection change — forces toolbar to re-render
  // so editor.isActive() always reflects the current cursor/mark state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editorVersion, setEditorVersion] = useState(0);
  
  // Element Refs
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const tableBtnRef = useRef<HTMLButtonElement>(null);
  const tableActionsBtnRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Position metrics for menus
  const [colorMenuLeft, setColorMenuLeft] = useState(0);
  const [tableMenuLeft, setTableMenuLeft] = useState(0);
  const [tableActionsMenuLeft, setTableActionsMenuLeft] = useState(0);
  const [docMenuLeft, setDocMenuLeft] = useState(0);
  
  // Floating color swatch
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Floating Table Builder grid (hover size)
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Keyboard Shortcuts Modal reference state
  const copyResetTimer = useRef<any>(null);

  // Lightbox for inline images
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Inline Image alignment/size popup overlay coordinates
  const [imgToolbar, setImgToolbar] = useState<{ top: number; left: number; size: ImgSize; pos: number } | null>(null);

  // ── Document Selection ───────────────────────────────────────────────────────
  const activeDoc = useMemo(() => {
    return docs.find((d) => d.id === activeId) || docs[0];
  }, [docs, activeId]);

  // Save current active id to localStorage
  useEffect(() => {
    if (activeId) {
      localStorage.setItem(LS_ACTIVE, activeId);
    }
  }, [activeId]);

  // ── Multi-Editor Registry ───────────────────────────────────────────────────
  const editorsRef = useRef<{ [id: string]: Editor }>({});
  const [editors, setEditors] = useState<{ [id: string]: Editor }>({});
  const editor = editors[activeId] || null;
  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  const handleEditorCreated = useCallback((id: string, instance: Editor) => {
    editorsRef.current[id] = instance;
    setEditors((prev) => ({ ...prev, [id]: instance }));
  }, []);

  const handleEditorDestroyed = useCallback((id: string) => {
    delete editorsRef.current[id];
    setEditors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Sync editor content when switching documents & restore scroll position
  useLayoutEffect(() => {
    if (activeDoc) {
      const savedScroll = scrollPositionsRef.current[activeId];
      isRestoringScrollRef.current = true;

      // Close find/replace on doc switch
      closeFind();

      // Synchronously force layout reflow so browser registers display changes
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      document.body.offsetHeight;

      // Restore scroll position synchronously to align the paint frame
      if (savedScroll !== undefined) {
        window.scrollTo({ top: savedScroll, behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }

      // Auto focus the active editor & restore scroll position on switch
      const activeEditor = editorsRef.current[activeId];
      if (activeEditor && !activeEditor.isDestroyed) {
        // Focus using native preventScroll to block browser caret scroll hijack
        activeEditor.view.dom.focus({ preventScroll: true });
        
        // Re-enforce scroll recovery to override any native browser focus scroll-into-view triggers
        if (savedScroll !== undefined) {
          window.scrollTo({ top: savedScroll, behavior: "auto" });
        } else {
          window.scrollTo({ top: 0, behavior: "auto" });
        }
      }

      // Clear scroll lock once layout and focus are fully established
      const timer = setTimeout(() => {
        isRestoringScrollRef.current = false;
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [activeId, editors]);





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

  // ── Native File Interactions & Autosave ──────────────────────────────────────
  
  // debounced autosave to native path
  useEffect(() => {
    if (!activeDoc || !activeDoc.filePath || !activeDoc.isUnsaved) return;

    const timer = setTimeout(async () => {
      await saveFileNative(activeDoc, false, true);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [activeDoc?.content, activeDoc?.filePath, activeDoc?.isUnsaved]);

  const getSmartSaveExtension = (html: string): string => {
    const hasImages = html.includes("<img");
    const hasTables = html.includes("<table") || html.includes("<tr") || html.includes("<td");
    const hasHighlight = html.includes("<mark");
    
    if (hasImages || hasTables || hasHighlight) {
      return "html";
    }
    
    const hasRichFormatting = html.includes("<strong") || html.includes("<em") || html.includes("<u") || html.includes("<s") || html.includes("<h1") || html.includes("<h2") || html.includes("<h3") || html.includes("<ul") || html.includes("<ol");
    
    if (hasRichFormatting) {
      return "md";
    }
    
    return "txt";
  };

  const saveFileNative = async (docToSave: NotepadDoc, saveAs = false, isSilent = false) => {
    if (!editor) return;

    try {
      let path = saveAs ? null : docToSave.filePath;
      const html = docToSave.content;

      // Ask for save path if we don't have one
      if (!path) {
        const ext = getSmartSaveExtension(html);
        let defaultName = docToSave.title || "Untitled";
        
        // Strip any existing txt/md/html extension to avoid double extension
        defaultName = defaultName.replace(/\.(txt|md|html|htm)$/i, "");
        defaultName = `${defaultName}.${ext}`;

        const chosenPath = await window.electronAPI.showSaveDialog(defaultName);
        if (!chosenPath) return; // User canceled
        path = chosenPath;
      }

      const fileExt = path.split('.').pop()?.toLowerCase();
      let contentToWrite = "";
      
      if (fileExt === 'md') {
        contentToWrite = htmlToMarkdown(html);
      } else if (fileExt === 'html' || fileExt === 'htm') {
        contentToWrite = generateFullHtml(docToSave.title, html, { bg: surfBg, text: surfTxt, isDark: effectiveDark });
      } else {
        contentToWrite = editor.getText();
      }

      const res = await window.electronAPI.saveFile(path, contentToWrite);
      if (res) {
        setDocs((prev) => {
          const next = prev.map((d) => 
            d.id === docToSave.id 
              ? { ...d, filePath: res.path, title: res.name, isUnsaved: false } 
              : d
          );
          saveDocs(next);
          return next;
        });
        setLastSaved(new Date());
        if (!isSilent) {
          toast.success(`Saved to ${res.name}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!isSilent) {
        toast.error(`Save failed: ${err.message}`);
      }
    }
  };

  const handleOpenNativeFile = async () => {
    try {
      const res = await window.electronAPI.openFile();
      if (res) {
        // Check if file is already open
        const existing = docs.find((d) => d.filePath === res.path);
        if (existing) {
          changeTab(existing.id);
          toast.success(`Switched to already open note: ${res.name}`);
          return;
        }

        // Create new tab
        const htmlContent = fileContentToHtml(res.name, res.content);
        const fresh: NotepadDoc = {
          id: genId(),
          title: res.name,
          content: htmlContent,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          filePath: res.path,
          isUnsaved: false,
          isTitleAutoGenerated: false
        };

        setDocs((prev) => {
          const next = [...prev, fresh];
          saveDocs(next);
          return next;
        });
        changeTab(fresh.id);
        toast.success(`Opened ${res.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Could not open file: ${err.message}`);
    }
  };

  // Listen for open file associated arguments (double-clicked files from outside the app)
  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenFile((data) => {
      // Check if file is already open
      const existing = docs.find((d) => d.filePath === data.path);
      if (existing) {
        changeTab(existing.id);
        return;
      }

      const htmlContent = fileContentToHtml(data.name, data.content);
      const fresh: NotepadDoc = {
        id: genId(),
        title: data.name,
        content: htmlContent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        filePath: data.path,
        isUnsaved: false,
        isTitleAutoGenerated: false
      };

      setDocs((prev) => {
        const next = [...prev, fresh];
        saveDocs(next);
        return next;
      });
      changeTab(fresh.id);
      toast.success(`Loaded ${data.name}`);
    });

    return () => unsubscribe();
  }, [docs]);

  // ── Document Tab Management ──────────────────────────────────────────────────
  const sortedDocs = useMemo(() => {
    const pinned = docs.filter((d) => d.isPinned);
    const unpinned = docs.filter((d) => !d.isPinned);
    return [...pinned, ...unpinned];
  }, [docs]);

  const createDoc = () => {
    const fresh = newDoc();
    setDocs((prev) => { const next = [...prev, fresh]; saveDocs(next); return next; });
    changeTab(fresh.id);
    toast.success("New note created");
  };

  const deleteDoc = (idToDelete: string) => {
    if (docs.length <= 1) return;
    
    const index = docs.findIndex((d) => d.id === idToDelete);
    const targetDoc = docs[index];

    // Push the closed document to history for restore
    setClosedDocsHistory((prev) => [...prev, targetDoc]);

    const nextDocs = docs.filter((d) => d.id !== idToDelete);
    setDocs(nextDocs);
    saveDocs(nextDocs);

    if (idToDelete === activeId) {
      const fallbackIndex = index === 0 ? 0 : index - 1;
      changeTab(nextDocs[fallbackIndex].id);
    }
    toast.success(`Note "${targetDoc.title}" closed`);
  };

  const restoreLastClosedDoc = () => {
    if (closedDocsHistory.length === 0) {
      toast.error("No closed tabs to restore");
      return;
    }
    const restored = closedDocsHistory[closedDocsHistory.length - 1];
    setClosedDocsHistory((prev) => prev.slice(0, -1));
    
    setDocs((prev) => {
      if (prev.some((d) => d.id === restored.id)) return prev;
      const next = [...prev, restored];
      saveDocs(next);
      return next;
    });
    changeTab(restored.id);
    toast.success(`Restored "${restored.title}"`);
  };

  const duplicateDoc = (id: string) => {
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    const fresh: NotepadDoc = {
      ...target,
      id: Math.random().toString(36).substring(2, 9),
      title: `${target.title} (Copy)`,
      filePath: undefined,
      isUnsaved: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
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
    changeTab(fresh.id);
    toast.success(`Duplicated "${target.title}"`);
  };

  const closeOtherDocs = (idToKeep: string) => {
    const target = docs.find((d) => d.id === idToKeep);
    if (!target) return;
    const closedDocs = docs.filter((d) => d.id !== idToKeep);
    setClosedDocsHistory((prev) => [...prev, ...closedDocs]);
    setDocs([target]);
    saveDocs([target]);
    changeTab(target.id);
    toast.success("Other tabs closed");
  };

  const closeDocsToTheRight = (id: string) => {
    const idx = sortedDocs.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const idsToKeep = new Set(sortedDocs.slice(0, idx + 1).map((d) => d.id));
    if (!idsToKeep.has(activeId)) {
      changeTab(id);
    }
    const nextDocs = docs.filter((d) => idsToKeep.has(d.id));
    const closedDocs = docs.filter((d) => !idsToKeep.has(d.id));
    setClosedDocsHistory((prev) => [...prev, ...closedDocs]);
    setDocs(nextDocs);
    saveDocs(nextDocs);
    toast.success("Tabs to the right closed");
  };

  // Close context menus and dropdowns on any global click
  useEffect(() => {
    const handleCloseMenu = () => {
      setTabContextMenu(null);
      setImageContextMenu(null);
      setShowFileMenu(false);
      setShowDocMenu(false);
    };
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Debounced Table of Contents (Outline) generator
  useEffect(() => {
    if (!editor || editor.isDestroyed || !showOutline) return undefined;

    const timer = setTimeout(() => {
      if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return;
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
    if (!showOutline || !editor || editor.isDestroyed) return undefined;

    const handleScroll = () => {
      if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return;
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
      if (!editor.isDestroyed) {
        editor.off("selectionUpdate", handleScroll);
      }
    };
  }, [editor, showOutline, headings]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + = or Ctrl + + (Zoom In)
      if (isCtrl && (e.key === "=" || e.key === "+")) {
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

      // Ctrl + - (Zoom Out)
      if (isCtrl && e.key === "-") {
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

      // Ctrl + 0 (Reset Zoom)
      if (isCtrl && e.key === "0" && !e.shiftKey) {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, zoom: 1.1 };
          localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
          return next;
        });
        return;
      }

      // Ctrl + , (Settings)
      if (isCtrl && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
        setShowFileMenu(false);
        setShowExportMenu(false);
        return;
      }

      // Ctrl + / (Keyboard Shortcuts dialog)
      if (isCtrl && e.key === "/") {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Ctrl + Shift + S (Save As)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveFileNative(activeDoc, true);
        return;
      }

      // Ctrl + \ (Toggle Outline sidebar)
      if (isCtrl && !e.shiftKey && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        setShowOutline(prev => !prev);
        return;
      }

      // Ctrl + Shift + \ (Focus Mode)
      if (isCtrl && e.shiftKey && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        setFocusMode(prev => !prev);
        return;
      }

      // Ctrl + S (Save)
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveFileNative(activeDoc);
        return;
      }

      // Ctrl + P (Export PDF)
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        exportPdf();
        return;
      }

      // Ctrl + O (Open)
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpenNativeFile();
        return;
      }

      // Ctrl + N or Ctrl + T (New Note)
      if (isCtrl && !e.shiftKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "t")) {
        e.preventDefault();
        createDoc();
        return;
      }

      // Ctrl + Shift + W (Close Entire Application)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        window.electronAPI.closeApp();
        return;
      }

      // Ctrl + W (Close Active Note)
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        deleteDoc(activeId);
        return;
      }

      // Ctrl + Shift + T (Restore Closed Note)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        restoreLastClosedDoc();
        return;
      }

      // Ctrl + Tab (Next Tab)
      if (isCtrl && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        if (sortedDocs.length > 1) {
          const currentIndex = sortedDocs.findIndex((d) => d.id === activeId);
          const nextIndex = (currentIndex + 1) % sortedDocs.length;
          changeTab(sortedDocs[nextIndex].id);
        }
        return;
      }

      // Ctrl + Shift + Tab (Prev Tab)
      if (isCtrl && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        if (sortedDocs.length > 1) {
          const currentIndex = sortedDocs.findIndex((d) => d.id === activeId);
          const prevIndex = (currentIndex - 1 + sortedDocs.length) % sortedDocs.length;
          changeTab(sortedDocs[prevIndex].id);
        }
        return;
      }

      // Editor-level shortcuts (require editor focus)
      if (!editor) return;

      // Ctrl + H (Highlight)
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        editor.chain().focus().toggleHighlight().run();
        return;
      }

      // Ctrl + Shift + 1/2/3 (Headings) — use e.code to bypass Shift symbol mapping
      if (isCtrl && e.shiftKey && e.code === "Digit1") {
        e.preventDefault();
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        return;
      }
      if (isCtrl && e.shiftKey && e.code === "Digit2") {
        e.preventDefault();
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        return;
      }
      if (isCtrl && e.shiftKey && e.code === "Digit3") {
        e.preventDefault();
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        return;
      }

      // Ctrl + Shift + U (Bullet / Unordered list)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        editor.chain().focus().toggleBulletList().run();
        return;
      }

      // Ctrl + Shift + L (Numbered / ordered List)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        editor.chain().focus().toggleOrderedList().run();
        return;
      }

      // Ctrl + Shift + K (checKlist)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        editor.chain().focus().toggleTaskList().run();
        return;
      }

      // Ctrl + Shift + C (Code block)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        editor.chain().focus().toggleCodeBlock().run();
        return;
      }

      // Ctrl + Shift + B (Blockquote)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
        return;
      }

      // Ctrl + [1-9] (Switch to tab index) — only without Shift & Alt
      if (isCtrl && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const tabNumber = parseInt(e.key, 10);
        if (tabNumber === 9) {
          if (sortedDocs.length > 0) {
            changeTab(sortedDocs[sortedDocs.length - 1].id);
          }
        } else {
          const targetIndex = tabNumber - 1;
          if (targetIndex < sortedDocs.length) {
            changeTab(sortedDocs[targetIndex].id);
          }
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDoc, activeId, docs, sortedDocs, closedDocsHistory, editor, changeTab]);

  // Ctrl + Mouse Wheel Zoom Listener
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setSettings((prev) => {
          const current = prev.zoom || 1.0;
          let nextVal = current;
          if (e.deltaY < 0) {
            // Scroll Up -> Zoom In
            nextVal = Math.min(1.5, parseFloat((current + 0.1).toFixed(1)));
          } else {
            // Scroll Down -> Zoom Out
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

  const pinDoc = (id: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, isPinned: !d.isPinned } : d);
      saveDocs(next);
      return next;
    });
  };

  const setTabColor = (id: string, color?: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, color } : d);
      saveDocs(next);
      return next;
    });
  };

  const clearAllDocs = () => {
    const fresh = newDoc();
    setDocs([fresh]);
    saveDocs([fresh]);
    changeTab(fresh.id);
    toast.success("All documents cleared");
  };

  const updateTitle = (title: string) => {
    setDocs((prev) => {
      const next = prev.map((d) => d.id === activeId ? { ...d, title, isTitleAutoGenerated: title.trim() === "", isUnsaved: d.filePath ? true : undefined } : d);
      saveDocs(next);
      return next;
    });
  };

  // ── Settings Stepper ────────────────────────────────────────────────────────
  const updateSetting = <K extends keyof NotepadSettings>(key: K, value: NotepadSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  const applyTheme = (bg: string, text: string) => {
    setSettings((prev) => {
      const next = { ...prev, bgColor: bg, textColor: text, lightSurface: isLightHex(bg) };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  // ── Formatting ─────────────────────────────────────────────────────────────
  const insertImage = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && editor) {
          editor.chain().focus().setImage({ src: ev.target.result as string }).run();
        }
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const copyImageToClipboard = async (src: string) => {
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
  };

  const insertLink = () => {
    const existing = editor?.getAttributes("link").href ?? "";
    const url = window.prompt("URL:", existing);
    if (url === null) return;
    if (url === "") { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url }).run();
  };

  // ── Search & Replace ─────────────────────────────────────────────────────────
  const handleSearchChange = (term: string) => {
    setFindText(term);
    if (!editor) return;
    (editor.commands as any).setSearchTerm(term);
    updateSearchMatchCount();
  };

  const updateSearchMatchCount = () => {
    if (!editor) return;
    const results = editor.storage.searchAndReplace.results;
    setFindResultsCount(results.length);
    setFindActiveIndex(0);
    (editor.commands as any).setSearchActiveIndex(0);
  };

  const handleNextMatch = () => {
    if (!editor || findResultsCount === 0) return;
    const nextIdx = (findActiveIndex + 1) % findResultsCount;
    setFindActiveIndex(nextIdx);
    (editor.commands as any).setSearchActiveIndex(nextIdx);
    scrollToMatch();
  };

  const handlePrevMatch = () => {
    if (!editor || findResultsCount === 0) return;
    const prevIdx = (findActiveIndex - 1 + findResultsCount) % findResultsCount;
    setFindActiveIndex(prevIdx);
    (editor.commands as any).setSearchActiveIndex(prevIdx);
    scrollToMatch();
  };

  const handleReplace = () => {
    if (!editor || findResultsCount === 0) return;
    (editor.commands as any).replace(replaceText);
    // Refresh search results
    (editor.commands as any).setSearchTerm(findText);
    updateSearchMatchCount();
  };

  const handleReplaceAll = () => {
    if (!editor || findResultsCount === 0) return;
    (editor.commands as any).replaceAll(replaceText);
    (editor.commands as any).setSearchTerm(findText);
    updateSearchMatchCount();
  };

  const closeFind = () => {
    setShowFind(false);
    setFindText("");
    if (editor) {
      (editor.commands as any).setSearchTerm("");
    }
    setFindResultsCount(0);
    setFindActiveIndex(0);
  };

  const scrollToMatch = () => {
    if (!editor) return;
    setTimeout(() => {
      const matches = document.querySelectorAll(".notepad-search-match-active");
      if (matches.length > 0) {
        matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 20);
  };

  // ── Image Manipulation ───────────────────────────────────────────────────────
  const getSelectedImageNode = useCallback(() => {
    if (!editor) return null;
    const { selection } = editor.state;
    if (selection && (selection as any).node && (selection as any).node.type.name === "image") {
      return {
        pos: selection.from,
        node: (selection as any).node,
      };
    }
    return null;
  }, [editor]);

  const updateImgToolbar = useCallback(() => {
    const sel = getSelectedImageNode();
    if (!sel) {
      setImgToolbar(null);
      return;
    }
    const dom = editor?.view.nodeDOM(sel.pos) as HTMLElement | null;
    if (!dom) {
      setImgToolbar(null);
      return;
    }
    const rect = dom.getBoundingClientRect();
    setImgToolbar({
      top: rect.top - 48,
      left: rect.left + rect.width / 2 - 80,
      size: sel.node.attrs.size || "medium",
      pos: sel.pos,
    });
  }, [editor, getSelectedImageNode]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", updateImgToolbar);
    return () => {
      editor.off("selectionUpdate", updateImgToolbar);
    };
  }, [editor, updateImgToolbar]);

  const setImgSize = (size: ImgSize) => {
    if (!editor || !imgToolbar) return;
    editor.chain().focus().updateAttributes("image", { size }).run();
    setImgToolbar((prev) => prev ? { ...prev, size } : null);
  };

  // ── Clipboard Copy ───────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML() ?? "";
    const text = editor.getText() ?? "";
    if (!html && !text) {
      toast("Nothing to copy", { description: "This note is empty." });
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html":  new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setCopyState("copied");
      toast.success("Note copied to clipboard");
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 1600);
    } catch (err) {
      setCopyState("error");
      toast.error("Couldn't copy note");
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [editor]);

  // ── Export Menu (Client-side Fallbacks & Native Triggers) ──────────────────────
  const exportTxt = () => {
    const content = editor?.getText() ?? "";
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([content], { type: "text/plain" })),
      download: `${activeDoc.title}.txt`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    setShowExportMenu(false);
  };

  const exportMd = () => {
    const html = editor?.getHTML() ?? "";
    const content = htmlToMarkdown(html);
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([content], { type: "text/markdown" })),
      download: `${activeDoc.title}.md`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    setShowExportMenu(false);
  };

  const exportHtml = () => {
    const html = editor?.getHTML() ?? "";
    const fullHtml = generateFullHtml(activeDoc.title, html, { bg: surfBg, text: surfTxt, isDark: effectiveDark });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([fullHtml], { type: "text/html" })),
      download: `${activeDoc.title}.html`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    setShowExportMenu(false);
  };

  const exportPdf = () => {
    setShowExportMenu(false);
    window.print();
  };

  const exportSmart = () => {
    if (!editor) return;
    const html = editor.getHTML() ?? "";
    const ext = getSmartSaveExtension(html);
    if (ext === "html") {
      exportHtml();
      toast.success("Automatically exported as HTML to preserve all formatting, highlights, and tables.");
    } else if (ext === "md") {
      exportMd();
      toast.success("Automatically exported as Markdown.");
    } else {
      exportTxt();
      toast.success("Automatically exported as Plain Text.");
    }
  };

  // ── Render States & Theme Colors ──────────────────────────────────────────────
  const surfBg  = settings.bgColor   || (settings.lightSurface ? "#FAF8F2" : "#161615");
  const surfTxt = settings.textColor || (settings.lightSurface ? "#1F1B16" : "#F0EDE8");
  const effectiveDark = settings.bgColor ? !isLightHex(settings.bgColor) : !settings.lightSurface;

  const codeBlockStyles = (() => {
    if (surfBg === "#161615") return { bg: "#0d0d0c", border: "rgba(255,255,255,0.06)", btnBg: "rgba(22,22,21,0.8)", btnBorder: "rgba(255,255,255,0.08)" };
    if (surfBg === "#0F0F0E") return { bg: "#060606", border: "rgba(255,255,255,0.05)", btnBg: "rgba(15,15,14,0.8)", btnBorder: "rgba(255,255,255,0.08)" };
    if (surfBg === "#FAF8F2") return { bg: "#f2eedf", border: "rgba(0,0,0,0.06)", btnBg: "rgba(250,248,242,0.9)", btnBorder: "rgba(0,0,0,0.08)" };
    if (surfBg === "#F4ECD8") return { bg: "#eadcb8", border: "rgba(0,0,0,0.06)", btnBg: "rgba(244,236,216,0.9)", btnBorder: "rgba(0,0,0,0.08)" };
    if (surfBg === "#EAE6DF") return { bg: "#ded8cc", border: "rgba(0,0,0,0.06)", btnBg: "rgba(234,230,223,0.9)", btnBorder: "rgba(0,0,0,0.08)" };
    return effectiveDark
      ? { bg: `color-mix(in srgb, ${surfBg} 60%, #000 40%)`, border: "rgba(255,255,255,0.06)", btnBg: "rgba(0,0,0,0.45)", btnBorder: "rgba(255,255,255,0.08)" }
      : { bg: `color-mix(in srgb, ${surfBg} 92%, #000 8%)`, border: "rgba(0,0,0,0.06)", btnBg: "rgba(255,255,255,0.8)", btnBorder: "rgba(0,0,0,0.08)" };
  })();

  const tb = (active?: boolean): React.CSSProperties => {
    const fg = effectiveDark ? (active ? "var(--t1)" : "var(--t2)") : (active ? "#111111" : "rgba(0, 0, 0, 0.54)");
    const bg = active ? (effectiveDark ? "var(--bg2)" : "rgba(0, 0, 0, 0.08)") : "transparent";
    return {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
      background: bg, color: fg, transition: "background 0.14s, color 0.14s", flexShrink: 0,
    };
  };

  const ddBtnStyle = (isErr?: boolean): React.CSSProperties => {
    return {
      display: "flex", alignItems: "center", justifyContent: "flex-start",
      width: "100%", padding: "6px 10px", fontSize: 11.5, fontFamily: "Inter, sans-serif",
      borderRadius: 6, border: "none", cursor: "pointer", background: "transparent",
      color: isErr ? "var(--err)" : (effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.72)"),
      transition: "background 0.12s, color 0.12s",
    };
  };

  const pill = (active: boolean, onClick: () => void, label: string, padding: string = "0 12px") => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        height: 26, padding, borderRadius: 6, border: "1px solid",
        borderColor: active ? "var(--b2)" : "var(--b0)",
        background: active ? "var(--bg3)" : "transparent",
        color: active ? "var(--t1)" : "var(--t2)",
        fontSize: 12, lineHeight: 1, cursor: "pointer", fontFamily: "Inter, sans-serif",
        transition: "all 0.12s", whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );

  const sepColor = effectiveDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
  const sep = <div style={{ width: 1, height: 20, background: sepColor, margin: "0 8px", flexShrink: 0, alignSelf: "center" }} />;
  const surfAccent = THEMES.find((t) => t.bg === settings.bgColor && t.text === settings.textColor)?.accent || (effectiveDark ? "#52C47A" : "#C8863A");
  const tabStripBg = THEMES.find((t) => t.bg === settings.bgColor && t.text === settings.textColor)?.tabStripBg || (effectiveDark ? "#0C0C0C" : "#EAE6DF");

  const editorInnerStyle: React.CSSProperties = (() => {
    const ruledSize = settings.fontSize * settings.lineHeight;
    const pt = settings.ruledLines ? `${ruledSize}px` : "44px";
    const base: React.CSSProperties = {
      color: surfTxt,
      lineHeight: settings.lineHeight,
      zoom: settings.zoom || 1.0,
      ["--np-lh" as string]: String(settings.lineHeight),
      ["--np-fs" as string]: `${settings.fontSize}px`,
    };
    if (settings.writingWidth === "wide") return { ...base, padding: `${pt} 7% 96px` };
    if (settings.writingWidth === "focused") return { ...base, maxWidth: 760, margin: "0 auto", padding: `${pt} 40px 96px` };
    return { ...base, maxWidth: 580, margin: "0 auto", padding: `${pt} 40px 96px` };
  })();

  const savedAgoText = (() => {
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    if (s < 5) return "Saved";
    if (s < 60) return `Saved ${s}s ago`;
    return `Saved ${Math.round(s / 60)}m ago`;
  })();

  return (
    <div className={effectiveDark ? "surface-dark" : "surface-light"} style={{ background: surfBg, minHeight: "100vh" }}>
      <Toaster position="bottom-right" theme={effectiveDark ? "dark" : "light"} />

      {/* ── ROW 1: Tabs & File Dialogs ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", flexDirection: "column" }}>

        {/* ── Tab strip row — also acts as drag region ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 40, borderBottom: `1px solid ${sepColor}`, padding: "0 0 0 10px", width: "100%", boxSizing: "border-box", background: tabStripBg, WebkitAppRegion: "drag", userSelect: "none" } as any}>
          
          {/* Left Zone: Tabs */}
          <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 2, flex: 1, minWidth: 0 }}>
            
            {/* Open File / File Menu Button */}
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
                ...tb(showFileMenu), width: 30, height: 30, borderRadius: 6,
                color: effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)",
                alignSelf: "flex-end", marginBottom: 3, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                WebkitAppRegion: "no-drag"
              } as any}
              title="File Menu"
            >
              <FileText size={16} />
            </button>

            <div style={{ width: 1, height: 20, background: sepColor, margin: "0 8px", flexShrink: 0, alignSelf: "flex-end", marginBottom: 8 }} />

            <div className="notepad-tabs-container" role="tablist" style={{ display: "flex", alignItems: "flex-end", gap: 0, overflowX: "auto", height: "calc(100% + 4px)", marginBottom: -4, paddingBottom: 4, boxSizing: "border-box", flex: 1, paddingLeft: 18, paddingRight: 24, scrollbarWidth: "none" }}>
              {sortedDocs.map((doc, idx) => {
                const isActive = doc.id === activeId;
                const isNextActive = idx + 1 < sortedDocs.length && sortedDocs[idx + 1].id === activeId;
                const showDivider = !isActive && !isNextActive && idx < sortedDocs.length - 1;
                const activeTabSurface = effectiveDark ? "#202124" : surfBg;
                const tabColorObj = doc.color ? TAB_COLORS.find(c => c.id === doc.color) : null;
                const activeTabStroke = tabColorObj ? tabColorObj.value : (effectiveDark ? blendColors("dark", "#202124", 0.78) : blendColors("light", activeTabSurface, 0.42));
                const activeTabShadow = effectiveDark ? "0 8px 18px rgba(0,0,0,0.34)" : "0 8px 18px rgba(13,17,23,0.12)";

                return (
                  <div
                    key={doc.id}
                    className={`notepad-tab-item ${isActive ? "active" : ""}`}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      if (!isActive) {
                        changeTab(doc.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageContextMenu(null);
                      setTabContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        docId: doc.id
                      });
                    }}
                    title={doc.filePath || (doc.isPinned ? `${doc.title} (Pinned)` : doc.title)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: doc.isPinned ? "center" : "flex-start",
                      gap: doc.isPinned ? 0 : 6, height: 34, padding: doc.isPinned ? "0" : (isActive ? "0 10px 0 16px" : "0 10px"),
                      borderRadius: "12px 12px 0 0", border: "none",
                      background: isActive ? activeTabSurface : (effectiveDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)"),
                      color: isActive ? surfTxt : (effectiveDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.48)"),
                      cursor: "pointer", position: "relative",
                      flex: doc.isPinned ? "0 0 44px" : "0 1 150px",
                      width: doc.isPinned ? 44 : undefined,
                      minWidth: doc.isPinned ? 44 : (isActive ? 80 : 36),
                      maxWidth: doc.isPinned ? 44 : 150,
                      marginBottom: isActive ? -1 : -2, zIndex: isActive ? 3 : 1,
                      boxShadow: isActive ? activeTabShadow : "none",
                      transition: "background 140ms ease, color 140ms ease, box-shadow 140ms ease",
                      WebkitAppRegion: "no-drag"
                    } as any}
                  >
                    {/* SVG Chrome tab borders */}
                    {isActive && (
                      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
                        <svg width="30" height="36" viewBox="-1 -1 30 36" fill="none" style={{ position: "absolute", left: -17, top: -1, overflow: "visible", pointerEvents: "none" }}>
                          <path d="M 28 34 L 0 34 L 8 34 A 8 8 0 0 0 16 26 L 16 12 A 12 12 0 0 1 28 0 Z" fill={activeTabSurface} />
                          <path d="M 0 34 L 8 34 A 8 8 0 0 0 16 26 L 16 12 A 12 12 0 0 1 28 0 L 30 0" stroke={activeTabStroke} strokeWidth="2" fill="none" />
                        </svg>
                        <svg width="30" height="36" viewBox="-1 -1 30 36" fill="none" style={{ position: "absolute", right: -17, top: -1, overflow: "visible", pointerEvents: "none" }}>
                          <path d="M 2 0 A 12 12 0 0 1 14 12 L 14 26 A 8 8 0 0 0 22 34 L 30 34 L 2 34 Z" fill={activeTabSurface} />
                          <path d="M 0 0 L 2 0 A 12 12 0 0 1 14 12 L 14 26 A 8 8 0 0 0 22 34 L 30 34" stroke={activeTabStroke} strokeWidth="2" fill="none" />
                        </svg>
                        {/* Connecting top border line to bridge the middle gap */}
                        <svg viewBox="0 -1 100 36" preserveAspectRatio="none" style={{ position: "absolute", left: 13, width: "calc(100% - 24px)", top: -1, height: 36, pointerEvents: "none" }}>
                          <line x1="0" y1="0" x2="100" y2="0" stroke={activeTabStroke} strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                    
                    {doc.isPinned ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
                        {doc.color && (
                          <div 
                            style={{ 
                              position: "absolute",
                              top: 4,
                              right: 4,
                              width: 5, 
                              height: 5, 
                              borderRadius: "50%", 
                              background: TAB_COLORS.find(c => c.id === doc.color)?.value
                            }} 
                            title={`${TAB_COLORS.find(c => c.id === doc.color)?.name} Category`}
                          />
                        )}
                        <Pin size={10} style={{ transform: "rotate(30deg)", opacity: 0.8 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                          {doc.title ? doc.title.charAt(0).toUpperCase() : "U"}
                        </span>
                      </div>
                    ) : (
                      <>
                        {doc.color && (
                          <div 
                            style={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: "50%", 
                              background: TAB_COLORS.find(c => c.id === doc.color)?.value, 
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
                              if (e.key === "Enter" || e.key === "Escape") setEditingTabId(null);
                            }}
                            autoFocus
                            style={{
                              background: "transparent", border: "none", outline: "none", color: surfTxt,
                              fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 600, width: "100%",
                              padding: 0, margin: 0, position: "relative", zIndex: 1,
                            }}
                            spellCheck={false}
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              if (!doc.isPinned) {
                                changeTab(doc.id);
                                setEditingTabId(doc.id);
                                setTimeout(() => titleInputRef.current?.select(), 80);
                              }
                            }}
                            style={{
                              fontSize: 12, fontWeight: isActive ? 600 : 500,
                              fontFamily: "'Sora', sans-serif",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                            }}
                          >
                            {doc.title || "Untitled"}
                            {doc.isUnsaved && <span style={{ color: surfAccent, marginLeft: 3 }}>*</span>}
                          </span>
                        )}

                        {docs.length > 1 && (
                          <button
                            className="tab-close-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDoc(doc.id);
                            }}
                            style={{
                              border: "none", background: "transparent",
                              color: isActive ? (effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)") : (effectiveDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)"),
                              display: "flex", alignItems: "center", justifyContent: "center", padding: 2, borderRadius: 4, cursor: "pointer",
                              transition: "all 0.12s", position: "relative", zIndex: 1,
                              opacity: isActive ? 1 : 0,
                              flexShrink: 0,
                            }}
                            title="Close tab"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </>
                    )}

                    {showDivider && (
                      <div style={{ position: "absolute", right: 0, top: 9, width: 1, height: 14, background: effectiveDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)", pointerEvents: "none" }} />
                    )}
                  </div>
                );
              })}
              
              {/* Plus Button inside tab bar row */}
              <button
                onClick={createDoc}
                style={{
                  ...tb(), width: 30, height: 30, borderRadius: 6,
                  alignSelf: "flex-end", marginBottom: 3, marginLeft: 8, flexShrink: 0, zIndex: 1,
                  WebkitAppRegion: "no-drag"
                } as any}
                title="New note"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Right Zone: Saved status, Note lists & Window Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0, height: "100%", WebkitAppRegion: "no-drag" } as any}>
            <div style={{ display: "flex", alignItems: "center", height: "100%", transform: "translateY(2.5px)" }}>
              <span className="saved-ago-status" style={{ fontSize: 11, color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)", fontFamily: "Inter, sans-serif", paddingBottom: 0, marginRight: 6 }}>
                {wordCount} {wordCount === 1 ? "word" : "words"} · {savedAgoText}
              </span>

              <div style={{ width: 1, height: 20, background: sepColor, margin: "0 6px", flexShrink: 0, alignSelf: "center", paddingBottom: 0 }} />

              {/* Note switcher menu trigger */}
              <button
                style={{ ...tb(showDocMenu), alignSelf: "center", marginRight: 8 }}
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
              >
                <Clock size={13} />
              </button>

              <div style={{ width: 1, height: 20, background: sepColor, margin: "0 6px", flexShrink: 0, alignSelf: "center" }} />
            </div>

            {/* ── Window Controls (merged into tab strip like Windows Notepad) ── */}
            <button
              onClick={() => window.electronAPI.minimizeApp()}
              className="win-control-btn"
              title="Minimize"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: "100%", background: "transparent", border: "none",
                color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)", cursor: "pointer",
                transition: "background 0.12s, color 0.12s", flexShrink: 0
              }}
            >
              <svg width="9" height="1" viewBox="0 0 9 1"><rect width="9" height="1" fill="currentColor"/></svg>
            </button>

            <button
              onClick={() => window.electronAPI.maximizeApp()}
              className="win-control-btn"
              title="Maximize"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: "100%", background: "transparent", border: "none",
                color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)", cursor: "pointer",
                transition: "background 0.12s, color 0.12s", flexShrink: 0
              }}
            >
              <svg width="8" height="8" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.1"/></svg>
            </button>

            <button
              onClick={() => window.electronAPI.closeApp()}
              className="win-control-btn close-btn"
              title="Close"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: "100%", background: "transparent", border: "none",
                color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.55)", cursor: "pointer",
                transition: "background 0.12s, color 0.12s", flexShrink: 0
              }}
            >
              <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
            </button>
          </div>

        </div>

        {/* ── ROW 2: Formatter & Actions ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 38, padding: "0 10px", boxSizing: "border-box", width: "100%", background: surfBg, borderBottom: `1px solid ${sepColor}`, transition: "background 0.3s" }}>
          
          {/* Formatting buttons */}
          <div className="notepad-toolbar" style={{ display: "flex", alignItems: "center", height: "100%", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            <button title={getTooltip("Table of Contents", "Ctrl+\\")}
              style={tb(showOutline)}
              onClick={() => {
                setShowOutline(!showOutline);
                setShowSettings(false);
              }}
            >
              <PanelLeft size={14} />
            </button>

            {sep}

            <button title={getTooltip("Bold", "Ctrl+B")} style={tb(editor?.isActive("bold"))} onClick={() => toggleMarkOnTrimmedSelection(editor, "bold")}><BoldIcon size={14} /></button>
            <button title={getTooltip("Italic", "Ctrl+I")} style={tb(editor?.isActive("italic"))} onClick={() => toggleMarkOnTrimmedSelection(editor, "italic")}><ItalicIcon size={14} /></button>
            <button title={getTooltip("Underline", "Ctrl+U")} style={tb(editor?.isActive("underline"))} onClick={() => toggleMarkOnTrimmedSelection(editor, "underline")}><UnderlineIcon size={14} /></button>
            <button title={getTooltip("Strikethrough", "Ctrl+Shift+X")} style={tb(editor?.isActive("strike"))} onClick={() => toggleMarkOnTrimmedSelection(editor, "strike")}><Strikethrough size={14} /></button>
            <button title={getTooltip("Highlight")} style={tb(editor?.isActive("highlight"))} onClick={() => toggleMarkOnTrimmedSelection(editor, "highlight")}><Highlighter size={13} /></button>
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
            
            {/* Color Swatch Picker */}
            <div className="notepad-color-picker-trigger" style={{ position: "relative", display: "inline-block" }}>
              <button
                ref={colorBtnRef}
                title={getTooltip("Text Color")}
                style={{ ...tb(showColorPicker), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 0, width: 26, height: 26, position: "relative" }}
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
                <div style={{ position: "fixed", top: 80, left: colorMenuLeft, marginTop: 4, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", padding: "8px", zIndex: 200, boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)", display: "flex", gap: 6, alignItems: "center" }}>
                  <button title="Clear color" onClick={() => { setColorOnTrimmedSelection(editor, null); setShowColorPicker(false); }} style={{ width: 18, height: 18, borderRadius: "50%", border: effectiveDark ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,0,0,0.25)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: 0, flexShrink: 0 }}>
                    <div style={{ width: "100%", height: 1.5, background: "#D93838", transform: "rotate(-45deg)" }} />
                  </button>
                  <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 1px" }} />
                  {(effectiveDark ? ["#FFFFFF", "#FF6B6B", "#FF9F43", "#FEE08B", "#52C47A", "#54A0FF", "#D6A2E8"] : ["#111318", "#D93838", "#D97706", "#B45309", "#047857", "#1D4ED8", "#7C3AED"]).map((color) => {
                    const isActive = editor?.isActive("textStyle", { color });
                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setColorOnTrimmedSelection(editor, isActive ? null : color);
                          setShowColorPicker(false);
                        }}
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: effectiveDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                          cursor: "pointer", background: color, flexShrink: 0,
                          outline: isActive ? (effectiveDark ? "2px solid white" : "2px solid black") : "2px solid transparent",
                          outlineOffset: 2, transition: "outline 0.1s",
                        }}
                      />
                    );
                  })}
                  <div style={{ width: 1, height: 16, background: effectiveDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 1px" }} />
                  <button title="Custom color" onClick={() => colorInputRef.current?.click()} style={{ cursor: "pointer", position: "relative", width: 20, height: 20, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} />
                  </button>
                </div>
              )}
            </div>

            {sep}

            {(() => {
              const alignVal = editor?.getAttributes("textAlign").textAlign || "left";
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

            {/* Structural Blocks */}
            <button title={getTooltip("Heading 1", "Ctrl+Alt+1")} style={tb(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></button>
            <button title={getTooltip("Heading 2", "Ctrl+Alt+2")} style={tb(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></button>
            <button title={getTooltip("Heading 3", "Ctrl+Alt+3")} style={tb(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></button>
            <button title={getTooltip("Blockquote", "Ctrl+Shift+B")} style={tb(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={13} /></button>
            <button title={getTooltip("Code Block", "Ctrl+Alt+C")} style={tb(editor?.isActive("codeBlock"))} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code2 size={14} /></button>
            
            {sep}

            <button title={getTooltip("Bullet List", "Ctrl+Shift+8")} style={tb(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={14} /></button>
            <button title={getTooltip("Numbered List", "Ctrl+Shift+7")} style={tb(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
            <button title={getTooltip("Checklist", "Ctrl+Shift+9")} style={tb(editor?.isActive("taskList"))} onClick={() => editor?.chain().focus().toggleTaskList().run()}><CheckSquare size={13} /></button>
            
            {sep}

            {/* Media Insert */}
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
                setShowSettings(false);
              }}
            >
              <Table2 size={14} />
            </button>
            <button title={getTooltip("Insert Divider")} style={tb()} onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={13} /></button>
            
            {/* Table context dropdown actions */}
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
                  >
                    <Table2 size={13} />
                    <span>Table</span>
                    <ChevronDown size={10} />
                  </button>
                  {showTableMenu && (
                    <div style={{ position: "fixed", top: 80, left: tableActionsMenuLeft, marginTop: 4, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", padding: "6px", zIndex: 200, boxShadow: effectiveDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", minWidth: 140, gap: 2 }}>
                      <button style={ddBtnStyle()} onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}>Row Above</button>
                      <button style={ddBtnStyle()} onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>Row Below</button>
                      <button style={ddBtnStyle(true)} onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}>Delete Row</button>
                      <div style={{ borderTop: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
                      <button style={ddBtnStyle()} onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}>Column Left</button>
                      <button style={ddBtnStyle()} onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>Column Right</button>
                      <button style={ddBtnStyle(true)} onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}>Delete Column</button>
                      <div style={{ borderTop: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
                      <button style={{ ...ddBtnStyle(true), fontWeight: 600 }} onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}>Delete Table</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {sep}

            {/* History */}
            <button title={getTooltip("Undo", "Ctrl+Z")} style={{ ...tb(), opacity: editor?.can().undo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={13} /></button>
            <button title={getTooltip("Redo", "Ctrl+Y")} style={{ ...tb(), opacity: editor?.can().redo() ? 1 : 0.3 }} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={13} /></button>
          </div>

          {/* Right side actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingLeft: 6 }}>
            {/* Search trigger */}
            <button
              title={getTooltip("Find / Replace", "Ctrl+F")}
              style={tb(showFind)}
              onClick={() => {
                if (showFind) {
                  closeFind();
                } else {
                  setShowFind(true);
                  setShowReplace(false);
                  setTimeout(() => findInputRef.current?.focus(), 50);
                }
              }}
            >
              <Search size={14} />
            </button>

            {/* Focus mode */}
            <button title={getTooltip("Focus Mode", "Ctrl+Shift+\\")} style={tb(focusMode)} onClick={() => setFocusMode(!focusMode)}>{focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>





            {/* Copy button */}
            <button
              style={{
                ...tb(), width: "auto", padding: "0 10px", gap: 5, fontSize: 12.5, fontWeight: 600,
                color: copyState === "copied" ? (effectiveDark ? "rgba(140, 230, 170, 0.95)" : "#0E7A3E") : (effectiveDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)"),
                background: effectiveDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                borderRadius: 6,
              }}
              onClick={handleCopy}
            >
              {copyState === "copied" ? <Check size={12} /> : <Copy size={12} />}
              <span className="toolbar-btn-text">{copyState === "copied" ? "Copied" : "Copy"}</span>
            </button>

            {/* Export trigger (Split Button) */}
            <div style={{ display: "flex", alignItems: "stretch", height: 28 }}>
              <button
                style={{
                  ...tb(), width: "auto", padding: "0 10px", gap: 5, fontSize: 12.5, fontWeight: 600,
                  color: effectiveDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)",
                  background: effectiveDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  cursor: "pointer",
                }}
                onClick={exportSmart}
                title="Smart Export (Auto-selects best format)"
              >
                <Download size={12} />
                <span className="toolbar-btn-text">Export</span>
              </button>
              <button
                style={{
                  ...tb(), width: "auto", padding: "0 6px",
                  color: effectiveDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)",
                  background: effectiveDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
                  borderLeft: "none",
                  borderTopRightRadius: 6,
                  borderBottomRightRadius: 6,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  cursor: "pointer",
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

      {/* ── File Menu dropdown panel ── */}
      {showFileMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: 38, left: fileMenuLeft, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", minWidth: 220, padding: "6px", zIndex: 200, boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 2 }}
        >
          <button
            onClick={() => { createDoc(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <Plus size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>New Tab</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+N</span>
          </button>
          
          <button
            onClick={() => { handleOpenNativeFile(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <FileText size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Open File...</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+O</span>
          </button>

          <button
            onClick={() => { setShowSettings(true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
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
            onClick={() => { saveFileNative(activeDoc); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <Save size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Save</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+S</span>
          </button>

          <button
            onClick={() => { saveFileNative(activeDoc, true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <Save size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Save As...</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+Shift+S</span>
          </button>

          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => { deleteDoc(activeId); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <X size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Close Tab</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+W</span>
          </button>

          <button
            onClick={() => { window.electronAPI.closeApp(); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--err)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <X size={13} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Exit Notepad</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+Shift+W</span>
          </button>
          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />

          <button
            onClick={() => { setShowShortcuts(true); setShowFileMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
            className="notepad-file-menu-item"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
            <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Keyboard Shortcuts</span>
            <span style={{ fontSize: 11, color: "var(--t3)", opacity: 0.7, fontFamily: "Inter,sans-serif" }}>Ctrl+/</span>
          </button>
        </div>
      )}

      {/* ── All Notes dropdown panel ── */}
      {showDocMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: 80, left: docMenuLeft, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", minWidth: 240, padding: "6px 0", zIndex: 200, boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)" }}
        >
          {sortedDocs.map((d) => (
            <div
              key={d.id}
              onClick={() => { changeTab(d.id); setShowDocMenu(false); }}
              style={{
                display: "flex", alignItems: "center", padding: "7px 12px", cursor: "pointer",
                background: d.id === activeId ? (effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.06)") : "transparent",
              }}
            >
              <span style={{ flex: 1, color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.title || "Untitled"}
                {d.isPinned && <Pin size={10} style={{ transform: "rotate(30deg)", marginLeft: 6, opacity: 0.6 }} />}
              </span>
              {d.id === activeId && <Check size={12} />}
              {docs.length > 1 && (
                <button
                  style={{ ...tb(), width: 20, height: 20, marginLeft: 4, opacity: 0.55 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDoc(d.id);
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <div style={{ borderTop: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.08)", margin: "4px 0" }} />
          <button
            onClick={createDoc}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t2)" : "rgba(0,0,0,0.65)", fontSize: 12 }}
          >
            <Plus size={12} /> New note
          </button>
          <button
            onClick={() => { setShowConfirmClear(true); setShowDocMenu(false); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--err)", fontSize: 12 }}
          >
            <Trash2 size={12} /> Clear all notes
          </button>
        </div>
      )}

      {/* ── Table builder grid ── */}
      {showTableGrid && (
        <div style={{ position: "fixed", top: 80, left: tableMenuLeft, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", padding: 12, zIndex: 200, boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 8, userSelect: "none" }} onMouseLeave={() => { setHoveredRows(0); setHoveredCols(0); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, paddingBottom: 4 }}>
            <span>Insert Table</span>
            <span style={{ color: hoveredCols > 0 ? surfAccent : "inherit" }}>
              {hoveredCols > 0 ? `${hoveredCols} × ${hoveredRows}` : "0 × 0"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 16px)", gap: 3 }}>
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((_, c) => {
                const isHighlighted = (r < hoveredRows) && (c < hoveredCols);
                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseEnter={() => { setHoveredRows(r + 1); setHoveredCols(c + 1); }}
                    onClick={() => {
                      editor?.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run();
                      setShowTableGrid(false);
                      setHoveredRows(0); setHoveredCols(0);
                    }}
                    style={{
                      width: 16, height: 16, borderRadius: 3,
                      background: isHighlighted ? surfAccent : (effectiveDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"),
                      border: isHighlighted ? `1px solid ${surfAccent}` : (effectiveDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)"),
                      cursor: "pointer"
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Editor Settings Panel ── */}
      {showSettings && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: effectiveDark ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="notepad-settings-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: "var(--bg1)", 
              border: "1px solid var(--b0)", 
              borderRadius: "16px", 
              width: 460, 
              padding: "20px", 
              boxShadow: effectiveDark ? "0 24px 64px rgba(0,0,0,0.65)" : "0 24px 64px rgba(0,0,0,0.15)", 
              maxHeight: "85vh", 
              overflowY: "auto",
              scrollbarWidth: "none",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "var(--t1)", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>Editor Settings</span>
              <button style={{ ...tb(), width: 28, height: 28 }} onClick={() => setShowSettings(false)}><X size={14} /></button>
            </div>

            {/* Stepper font size */}
            <div style={{ paddingTop: 14, marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Font size</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-start" }}>
                  {[12, 14, 16, 18, 22].map((s) => (
                    <button key={s} onClick={() => updateSetting("fontSize", s)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 26, minWidth: 30, padding: "0 6px", borderRadius: 6, border: "1px solid", borderColor: settings.fontSize === s ? "var(--b1)" : "var(--b0)", background: settings.fontSize === s ? "var(--bg3)" : "transparent", color: settings.fontSize === s ? "var(--t1)" : "var(--t2)", fontSize: 12, cursor: "pointer" }}>{s}</button>
                  ))}
                </div>
                <div style={{ width: 1, height: 18, background: "var(--b0)" }} />
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--b0)", borderRadius: 6, overflow: "hidden", height: 26 }}>
                  <button onClick={() => updateSetting("fontSize", Math.max(10, settings.fontSize - 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 14 }}>−</button>
                  <input type="number" min={10} max={72} value={settings.fontSize} onChange={(e) => updateSetting("fontSize", Math.min(72, Math.max(10, parseInt(e.target.value) || 10)))} style={{ width: 32, height: "100%", background: "transparent", border: "none", textAlign: "center", color: "var(--t1)", fontSize: 12 }} />
                  <button onClick={() => updateSetting("fontSize", Math.min(72, settings.fontSize + 1))} style={{ width: 22, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--t2)", fontSize: 14 }}>+</button>
                </div>
              </div>
            </div>

            {/* Layout Column Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 16, marginTop: 14, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Writing width</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["wide", "focused", "narrow"] as const).map((w) => pill(settings.writingWidth === w, () => updateSetting("writingWidth", w), w.charAt(0).toUpperCase() + w.slice(1), "0 8px"))}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Line height</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ v: 1.65, l: "Compact" }, { v: 2.15, l: "Normal" }, { v: 2.65, l: "Relaxed" }].map(({ v, l }) => pill(settings.lineHeight === v, () => updateSetting("lineHeight", v), l, "0 8px"))}
                </div>
              </div>
            </div>

            {/* Theme list */}
            <div style={{ paddingTop: 16, marginTop: 14, borderTop: "1px solid var(--b0)", marginBottom: 4 }}>
              <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Themes</div>
              <div style={{ display: "flex", gap: 5 }}>
                {THEMES.map((t) => {
                  const isActive = settings.bgColor === t.bg && settings.textColor === t.text;
                  return (
                    <button key={t.label} title={t.label} onClick={() => applyTheme(t.bg, t.text)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: t.bg, cursor: "pointer", position: "relative", outline: isActive ? "2px solid var(--t1)" : "2px solid var(--b0)", outlineOffset: 1 }}>
                      <span style={{ position: "absolute", bottom: 3, right: 3, width: 7, height: 7, borderRadius: "50%", background: t.text }} />
                      {isActive && <Check size={9} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--t1)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle buttons grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 14, paddingTop: 16, marginTop: 14, borderTop: "1px solid var(--b0)" }}>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Lines</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.ruledLines, () => updateSetting("ruledLines", false), "None")}
                  {pill(settings.ruledLines, () => updateSetting("ruledLines", true), "Ruled")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Spell check</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(settings.spellCheck, () => updateSetting("spellCheck", true), "On")}
                  {pill(!settings.spellCheck, () => updateSetting("spellCheck", false), "Off")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Paper grain</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(!settings.paperGrain, () => updateSetting("paperGrain", false), "Off")}
                  {pill(settings.paperGrain, () => updateSetting("paperGrain", true), "On")}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Image border</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pill(settings.imageBorder, () => updateSetting("imageBorder", true), "On")}
                  {pill(!settings.imageBorder, () => updateSetting("imageBorder", false), "Off")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Export popup ── */}
      {showExportMenu && (
        <div style={{ position: "fixed", top: 82, right: 10, background: effectiveDark ? "var(--bg1)" : "#FFFFFF", border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "var(--r)", minWidth: 216, padding: "6px 0", zIndex: 200, boxShadow: effectiveDark ? "0 16px 48px rgba(0,0,0,0.65)" : "0 16px 48px rgba(0,0,0,0.1)" }}>
          {[
            { label: "Plain Text (.txt)", sub: "No formatting preserved", fn: exportTxt },
            { label: "Markdown (.md)", sub: "Headings, lists, bold, links", fn: exportMd },
            { label: "PDF (.pdf)", sub: "Prints current document layout", fn: exportPdf },
            { label: "HTML (.html)", sub: "Raw HTML format", fn: exportHtml },
          ].map((item) => (
            <button
              key={item.label}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 14px", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              onClick={item.fn}
              onMouseEnter={(e) => (e.currentTarget.style.background = effectiveDark ? "var(--bg2)" : "rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span style={{ color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, fontFamily: "Inter,sans-serif" }}>{item.label}</span>
              <span style={{ color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.45)", fontSize: 11, marginTop: 1, fontFamily: "Inter,sans-serif" }}>{item.sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Find / Replace Panel ── */}
      {showFind && (
        <div className="notepad-find-panel" style={{ position: "fixed", top: 88, right: 20, width: 320, background: effectiveDark ? "rgba(30, 30, 30, 0.88)" : "rgba(255, 255, 255, 0.94)", border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", zIndex: 250, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, border: "none", background: "transparent", color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)", cursor: "pointer" }}
              onClick={() => {
                setShowReplace(!showReplace);
                if (!showReplace) setTimeout(() => replaceInputRef.current?.focus(), 50);
              }}
            >
              <ChevronRight size={14} style={{ transform: showReplace ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", flex: 1, background: effectiveDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.04)", border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 6, padding: "0 6px", height: 26 }}>
              <Search size={12} style={{ color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.4)", marginRight: 4 }} />
              <input
                ref={findInputRef}
                value={findText}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  }
                  if (e.key === "Escape") closeFind();
                }}
                placeholder="Find..."
                style={{ background: "transparent", border: "none", outline: "none", color: effectiveDark ? "var(--t1)" : "rgba(0, 0, 0, 0.85)", fontSize: 12, flex: 1 }}
              />
              {findText && (
                <span style={{ fontSize: 10, color: effectiveDark ? "var(--t3)" : "rgba(0, 0, 0, 0.45)" }}>
                  {findResultsCount > 0 ? `${findActiveIndex + 1}/${findResultsCount}` : "0/0"}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button disabled={findResultsCount === 0} onClick={handlePrevMatch} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, border: "none", background: "transparent", color: findResultsCount === 0 ? "rgba(128,128,128,0.3)" : "inherit", cursor: "pointer" }}><ChevronRight size={14} style={{ transform: "rotate(-90deg)" }} /></button>
              <button disabled={findResultsCount === 0} onClick={handleNextMatch} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, border: "none", background: "transparent", color: findResultsCount === 0 ? "rgba(128,128,128,0.3)" : "inherit", cursor: "pointer" }}><ChevronRight size={14} style={{ transform: "rotate(90deg)" }} /></button>
              <button onClick={closeFind} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer" }}><X size={14} /></button>
            </div>
          </div>
          {showReplace && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{ width: 24 }} />
              <div style={{ display: "flex", alignItems: "center", flex: 1, background: effectiveDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.04)", border: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 6, padding: "0 6px", height: 26 }}>
                <input
                  ref={replaceInputRef}
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleReplace(); }
                    if (e.key === "Escape") closeFind();
                  }}
                  placeholder="Replace with..."
                  style={{ background: "transparent", border: "none", outline: "none", color: effectiveDark ? "var(--t1)" : "rgba(0, 0, 0, 0.85)", fontSize: 12, flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                <button onClick={handleReplace} disabled={findResultsCount === 0} style={{ fontSize: 11, border: "none", borderRadius: 4, height: 24, padding: "0 8px", cursor: "pointer" }}>Replace</button>
                <button onClick={handleReplaceAll} disabled={findResultsCount === 0} style={{ fontSize: 11, border: "none", borderRadius: 4, height: 24, padding: "0 8px", cursor: "pointer" }}>All</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Editor Split-View Row ── */}
      <div style={{ display: "flex", flex: 1, minWidth: 0, position: "relative" }}>
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
              style={{ ...tb(), width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
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

        {/* ── Editor Canvas Area ── */}
        <div
          ref={editorWrapRef}
          className={[effectiveDark ? "surface-dark" : "surface-light", settings.paperGrain ? "notepad-grain" : ""].filter(Boolean).join(" ")}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: surfBg, color: surfTxt, minHeight: "calc(100vh - 78px)", cursor: "text", overflowX: "clip",
            ["--np-accent" as string]: surfAccent,
            ["--code-bg" as string]: codeBlockStyles.bg,
            ["--code-border" as string]: codeBlockStyles.border,
            ["--code-btn-bg" as string]: codeBlockStyles.btnBg,
            ["--code-btn-border" as string]: codeBlockStyles.btnBorder,
          } as React.CSSProperties}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const isCanvasBackground = 
              target === editorWrapRef.current || 
              target.classList.contains("notepad-editor-inner") || 
              target.classList.contains("notepad-editor") ||
              target.classList.contains("ProseMirror");

            // Avoid scrollbar clicks
            const isNotScrollbar = e.clientX < window.innerWidth - 18;

            if (isCanvasBackground && isNotScrollbar && editor) {
              const editorDom = document.querySelector('.notepad-editor .ProseMirror');
              if (editorDom) {
                const lastChild = editorDom.lastElementChild;
                const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : editorDom.getBoundingClientRect();
                const lastBottomY = lastChildRect.bottom;
                const clickY = e.clientY;
                
                if (clickY > lastBottomY) {
                  // Clicked below the last element!
                  const deltaY = clickY - lastBottomY;
                  const currentSettings = settingsRef.current;
                  const zoomedLineHeight = currentSettings.fontSize * currentSettings.lineHeight * (currentSettings.zoom || 1.0);
                  const newLinesCount = Math.max(1, Math.round(deltaY / zoomedLineHeight));
                  
                  // Insert the computed number of empty paragraphs
                  const nodes = Array.from({ length: newLinesCount }, () => ({ type: "paragraph" }));
                  editor.chain().focus("end").insertContent(nodes).run();
                } else {
                  editor.commands.focus("end");
                }
              } else {
                editor.commands.focus("end");
              }
            }
            setShowDocMenu(false); setShowExportMenu(false); setShowSettings(false);
          }}
        >
          <div style={editorInnerStyle} className={[settings.ruledLines ? "notepad-ruled" : "", settings.imageBorder ? "notepad-img-border" : "", "notepad-editor-inner"].filter(Boolean).join(" ")}>
            {focusMode && (
              <div style={{ position: "fixed", top: 12, left: 12, zIndex: 100 }}>
                <button onClick={() => setFocusMode(false)} style={{ ...tb(), width: 28, height: 28, background: "rgba(0,0,0,0.5)", color: "#fff", borderRadius: "50%" }}>
                  <Minimize2 size={14} />
                </button>
              </div>
            )}

            {docs.map((doc) => {
              const isActive = doc.id === activeId;
              return (
                <div key={doc.id} style={{ display: isActive ? "block" : "none" }}>
                  <NotepadEditor
                    doc={doc}
                    settings={settings}
                    onCreated={handleEditorCreated}
                    onDestroyed={handleEditorDestroyed}
                    onUpdate={(inst) => {
                      const html = inst.getHTML();
                      const text = inst.getText();
                      const docId = doc.id;
                      setEditorVersion((v) => v + 1);
                      setDocs((prev) => {
                        const next = prev.map((d) => {
                          if (d.id === docId) {
                            let title = d.title;
                            if (d.isTitleAutoGenerated !== false) {
                              title = getAutoTitleFromText(text);
                            }
                            return {
                              ...d,
                              content: html,
                              title,
                              updatedAt: Date.now(),
                              isUnsaved: d.filePath ? true : undefined
                            };
                          }
                          return d;
                        });
                        saveDocs(next);
                        return next;
                      });
                    }}
                    onSelectionUpdate={() => {
                      setEditorVersion((v) => v + 1);
                    }}
                    onImageContextMenu={(x, y, src) => {
                      setTabContextMenu(null);
                      setImageContextMenu({ x, y, src });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Image Float Toolbar ── */}
      {imgToolbar && (
        <div style={{ position: "fixed", top: Math.max(8, imgToolbar.top), left: imgToolbar.left, zIndex: 60, display: "flex", alignItems: "center", gap: 2, background: "#1A1D24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
          {(["small", "medium", "large", "full"] as ImgSize[]).map((s) => (
            <button key={s} onClick={() => setImgSize(s)} style={{ background: imgToolbar.size === s ? "#FFFFFF" : "transparent", color: imgToolbar.size === s ? "#0D0F14" : "rgba(255,255,255,0.72)", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {s.charAt(0).toUpperCase()}
            </button>
          ))}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
          <button onClick={() => { const dom = editor?.view.nodeDOM(imgToolbar.pos) as HTMLImageElement | null; if (dom?.src) setLightboxSrc(dom.src); }} style={{ background: "transparent", color: "rgba(255,255,255,0.72)", border: "none", borderRadius: 5, padding: "5px 8px", cursor: "pointer" }}>
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* ── Lightbox for Images ── */}
      {lightboxSrc && (
        <div onClick={() => setLightboxSrc(null)} style={{ position: "fixed", inset: 0, background: "rgba(5,7,10,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, cursor: "zoom-out", padding: 32 }}>
          <img src={lightboxSrc} style={{ maxWidth: "min(95vw, 1600px)", maxHeight: "92vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setLightboxSrc(null)} style={{ position: "fixed", top: 18, right: 18, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} /></button>
        </div>
      )}

      {/* ── Custom Tab Context Menu ── */}
      {tabContextMenu && (() => {
        const targetDoc = docs.find((d) => d.id === tabContextMenu.docId);
        if (!targetDoc) return null;

        return (
          <div
            style={{
              position: "fixed",
              top: tabContextMenu.y,
              left: tabContextMenu.x,
              zIndex: 9999,
              background: "var(--bg1)",
              border: "1px solid var(--b0)",
              borderRadius: "8px",
              padding: "4px 0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              minWidth: 170,
              fontFamily: "Inter, sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="tab-context-menu-item"
              onClick={() => {
                pinDoc(targetDoc.id);
                setTabContextMenu(null);
              }}
            >
              <Pin size={13} style={{ opacity: 0.7 }} />
              <span>{targetDoc.isPinned ? "Unpin Tab" : "Pin Tab"}</span>
            </button>

            <button
              className="tab-context-menu-item"
              onClick={() => {
                duplicateDoc(targetDoc.id);
                setTabContextMenu(null);
              }}
            >
              <Copy size={13} style={{ opacity: 0.7 }} />
              <span>Duplicate Tab</span>
            </button>

            <div style={{ height: 1, background: effectiveDark ? "var(--b0)" : "rgba(0,0,0,0.08)", margin: "4px 0" }} />
            
            <div style={{ padding: "6px 14px 4px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", fontWeight: 700, color: "var(--t3)", letterSpacing: "0.5px", fontFamily: "Inter, sans-serif" }}>Tab Highlight Color</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                <button
                  onClick={() => {
                    setTabColor(targetDoc.id, undefined);
                    setTabContextMenu(null);
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
                  return (
                    <button
                      key={color.id}
                      onClick={() => {
                        setTabColor(targetDoc.id, color.id);
                        setTabContextMenu(null);
                      }}
                      style={{
                        width: 16, height: 16, borderRadius: "50%", border: "none", background: color.value,
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

            <div style={{ height: 1, background: "var(--b0)", margin: "4px 0" }} />

            <button
              className="tab-context-menu-item"
              onClick={() => {
                deleteDoc(targetDoc.id);
                setTabContextMenu(null);
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
                setTabContextMenu(null);
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
                    setTabContextMenu(null);
                  }}
                  disabled={!hasTabsToRight}
                >
                  <Trash2 size={13} style={{ opacity: 0.7 }} />
                  <span>Close Tabs to Right</span>
                </button>
              );
            })()}
          </div>
        );
      })()}

      {/* ── Custom Image Context Menu ── */}
      {imageContextMenu && (
        <div
          style={{
            position: "fixed",
            top: imageContextMenu.y,
            left: imageContextMenu.x,
            zIndex: 9999,
            background: "var(--bg1)",
            border: "1px solid var(--b0)",
            borderRadius: "8px",
            padding: "4px 0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            minWidth: 150,
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
            <Copy size={13} style={{ opacity: 0.7 }} />
            <span>Copy Image</span>
          </button>
        </div>
      )}
      {/* ── Custom Confirm: Clear All Notes ── */}
      {showConfirmClear && (
        <div
          onClick={() => setShowConfirmClear(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: effectiveDark ? "var(--bg1)" : "#FFFFFF",
              border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.1)",
              borderRadius: 14,
              padding: "28px 28px 22px",
              width: 340,
              boxShadow: effectiveDark
                ? "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
                : "0 24px 64px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "column", gap: 16,
              fontFamily: "Inter, sans-serif"
            }}
          >
            {/* Icon + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(214,50,50,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Trash2 size={18} style={{ color: "var(--err)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "#111", marginBottom: 2 }}>
                  Clear all notes?
                </div>
                <div style={{ fontSize: 12, color: effectiveDark ? "var(--t3)" : "rgba(0,0,0,0.5)" }}>
                  This will permanently delete all {docs.length} note{docs.length !== 1 ? "s" : ""}.
                </div>
              </div>
            </div>

            {/* Warning detail */}
            <div style={{
              background: "rgba(214,50,50,0.07)",
              border: "1px solid rgba(214,50,50,0.15)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12,
              color: effectiveDark ? "rgba(255,100,100,0.85)" : "rgba(160,40,40,0.85)",
              lineHeight: 1.5
            }}>
              ⚠ This action cannot be undone. All tab contents will be lost.
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirmClear(false)}
                style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 500, fontFamily: "Inter, sans-serif",
                  borderRadius: 8, border: effectiveDark ? "1px solid var(--b0)" : "1px solid rgba(0,0,0,0.12)",
                  background: "transparent",
                  color: effectiveDark ? "var(--t1)" : "#111",
                  cursor: "pointer", transition: "background 0.12s"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { clearAllDocs(); setShowConfirmClear(false); }}
                style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                  borderRadius: 8, border: "none",
                  background: "var(--err)",
                  color: "#FFFFFF",
                  cursor: "pointer", transition: "opacity 0.12s"
                }}
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ── */}
      {showShortcuts && (
        <div 
          onClick={() => setShowShortcuts(false)} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(5,7,10,0.72)", 
            backdropFilter: "blur(8px)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 300, 
            padding: 24 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "100%", 
              maxWidth: 680, 
              maxHeight: "85vh", 
              background: effectiveDark ? "#161920" : "#FFFFFF", 
              border: effectiveDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", 
              borderRadius: 16, 
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)", 
              display: "flex", 
              flexDirection: "column", 
              overflow: "hidden" 
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: effectiveDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Keyboard size={18} style={{ color: "var(--np-accent, #10B981)" }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: effectiveDark ? "var(--t1)" : "#111", fontFamily: "Inter, sans-serif" }}>Keyboard Shortcuts</span>
              </div>
              <button 
                onClick={() => setShowShortcuts(false)} 
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  cursor: "pointer", 
                  color: effectiveDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", 
                  width: 32, 
                  height: 32, 
                  borderRadius: 6, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  transition: "background 0.1s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = effectiveDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
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
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--np-accent, #10B981)", marginBottom: 10 }}>File & App</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { keys: ["Ctrl", "N"], desc: "New Note" },
                      { keys: ["Ctrl", "O"], desc: "Open Text File" },
                      { keys: ["Ctrl", "S"], desc: "Save Text File" },
                      { keys: ["Ctrl", "P"], desc: "Export PDF" },
                      { keys: ["Ctrl", "W"], desc: "Close Current Note" },
                      { keys: ["Ctrl", "Shift", "T"], desc: "Restore Closed Note" },
                      { keys: ["Ctrl", "Shift", "W"], desc: "Close Application" }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: effectiveDark ? "var(--t2)" : "#555" }}>{item.desc}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          {item.keys.map((k, kIdx) => (
                            <kbd key={kIdx} style={{ background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", border: effectiveDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "#333", fontFamily: "monospace" }}>{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--np-accent, #10B981)", marginBottom: 10 }}>Tab Navigation</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { keys: ["Ctrl", "Tab"], desc: "Next Tab" },
                      { keys: ["Ctrl", "Shift", "Tab"], desc: "Previous Tab" },
                      { keys: ["Ctrl", "1-8"], desc: "Switch to Tab 1-8" },
                      { keys: ["Ctrl", "9"], desc: "Switch to Last Tab" }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: effectiveDark ? "var(--t2)" : "#555" }}>{item.desc}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          {item.keys.map((k, kIdx) => (
                            <kbd key={kIdx} style={{ background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", border: effectiveDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "#333", fontFamily: "monospace" }}>{k}</kbd>
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
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--np-accent, #10B981)", marginBottom: 10 }}>Text Formatting</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { keys: ["Ctrl", "B"], desc: "Bold Text" },
                      { keys: ["Ctrl", "I"], desc: "Italic Text" },
                      { keys: ["Ctrl", "U"], desc: "Underline Text" },
                      { keys: ["Ctrl", "H"], desc: "Highlight Text" },
                      { keys: ["Ctrl", "Shift", "X"], desc: "Strikethrough" },
                      { keys: ["Ctrl", "Shift", "C"], desc: "Toggle Code Block" },
                      { keys: ["Ctrl", "Shift", "B"], desc: "Toggle Blockquote" },
                      { keys: ["Ctrl", "Shift", "U"], desc: "Bullet List" },
                      { keys: ["Ctrl", "Shift", "L"], desc: "Numbered List" },
                      { keys: ["Ctrl", "Shift", "K"], desc: "Checklist" }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: effectiveDark ? "var(--t2)" : "#555" }}>{item.desc}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          {item.keys.map((k, kIdx) => (
                            <kbd key={kIdx} style={{ background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", border: effectiveDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "#333", fontFamily: "monospace" }}>{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--np-accent, #10B981)", marginBottom: 10 }}>Editor Controls</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { keys: ["Ctrl", "F"], desc: "Find & Replace" },
                      { keys: ["Ctrl", "Z"], desc: "Undo last edit" },
                      { keys: ["Ctrl", "Y"], desc: "Redo last edit" },
                      { keys: ["Ctrl", "/"], desc: "Toggle Help Dialog" }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: effectiveDark ? "var(--t2)" : "#555" }}>{item.desc}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          {item.keys.map((k, kIdx) => (
                            <kbd key={kIdx} style={{ background: effectiveDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", border: effectiveDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: effectiveDark ? "var(--t1)" : "#333", fontFamily: "monospace" }}>{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
