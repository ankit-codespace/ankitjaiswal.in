# Build Plan: Safe HTML and Markdown Conversion for Notepad

## Goal

Replace the current destructive Rich/Plain/MD/HTML mode-switching behavior with safe, explicit HTML and Markdown conversion actions for both notepad surfaces:

- Web: `artifacts/website/src/pages/tools/notepad.tsx`
- Desktop: `notepad-win/src/renderer/src/App.tsx`

The editor must never wipe a note when the user clicks a formatting/export/source button. A note with headings, bullets, links, tables, code blocks, and pasted images should remain intact in the rich editor while HTML or Markdown is generated from the current rich content.

## Current Problem

The current UI mixes two separate ideas:

1. Editing mode: rich TipTap editor versus raw textarea.
2. Conversion/export: produce HTML source or Markdown source from the current note.

That coupling is dangerous. In the web version, clicking `MD` or `HTML` runs `setEditorMode()`, rewrites `activeDoc.content`, and changes the active document into a textarea-backed source mode. In the desktop version, the single Rich/Plain button runs `toggleEditorMode()` and rewrites the document into Markdown/plain text.

The observed failure matches this architecture: if the rich editor is empty, stale, or has just been cleared during a mode switch, the conversion reads `editor.getHTML()` as `<p></p>` and then stores that as the document content. Once autosave persists it, the original 300-400 words are effectively overwritten.

## Research Notes

- TipTap's editor instance exposes `getHTML()` for current document HTML and `getText()` for plain text. It also accepts HTML/JSON as editor content. This means HTML generation should read from the editor, but not use source-view state changes as the persistence mechanism. Source: https://tiptap.dev/docs/editor/api/editor
- Turndown is the existing project dependency for HTML-to-Markdown conversion and supports custom rules via `addRule()`. This matches the current custom handling for task items, code blocks, highlights, tables, and images. Source: https://github.com/mixmark-io/turndown
- DOMPurify is a mature client-side sanitizer for HTML/SVG/MathML and should be used before rendering imported or user-edited raw HTML back into the rich editor. Source: https://github.com/cure53/DOMPurify

## Root Causes Found Locally

### Web

- `NotepadDoc.mode` currently includes only `"rich" | "raw"` in the interface, but the code uses `"markdown"` and `"html"` as runtime values. This is a TypeScript and state-model mismatch.
- `setEditorMode("markdown" | "html")` converts and persists document content instead of generating a preview/export artifact.
- While in `markdown`, `html`, or `raw`, the TipTap editor is intentionally emptied via `editor.commands.setContent("")`.
- Returning from source modes relies on handwritten Markdown parsing plus `restoreEmbeddedImages()`. That is fragile and not round-trip safe.
- `htmlToMarkdown()` intentionally replaces base64 images with `embedded-image`, which is okay for Markdown export size, but dangerous if source mode is treated as the canonical note.

### Desktop

- `toggleEditorMode()` rewrites rich HTML into Markdown and stores it as `mode: "raw"`.
- The raw textarea is labelled Plain Text, but it actually often contains Markdown.
- Switching back to rich mode uses a handwritten Markdown parser, so many TipTap constructs can be lost.
- Desktop does not yet have the web version's explicit `Rich`, `MD`, and `HTML` buttons.

## Product Decision

Use this model:

- **Rich** remains the canonical editing mode for normal notes.
- **HTML** means "generate/copy/download HTML source from the current rich note."
- **MD** means "generate/copy/download Markdown from the current rich note."
- **Plain/Raw** remains only a performance/recovery mode for very large files or render failures.

Do not make a casual toolbar click rewrite the saved note into HTML or Markdown.

## Proposed UX

### Toolbar

Replace the current mode cluster with:

- Rich editor indicator: `Rich` or a text-format icon. This is not a destructive toggle.
- HTML button: icon based on `< >`, tooltip `Copy HTML source` or `View HTML source`.
- MD button: `MD`, tooltip `Copy Markdown source` or `View Markdown source`.

Preferred first implementation:

- Clicking HTML opens a small source modal/panel with generated HTML.
- Clicking MD opens the same source modal/panel with generated Markdown.
- The panel has `Copy`, `Download`, and `Close`.
- The panel must not update `activeDoc.content` while opening.

Optional later:

- Add an `Edit source` affordance inside the modal, but require explicit `Apply to note`.
- Applying source should create a backup snapshot first and validate that parsed output is non-empty when original content was non-empty.

## Conversion Architecture

Create shared helper functions in both apps first, then optionally extract later:

```ts
type SourceFormat = "html" | "markdown";

function getCanonicalRichHtml(doc: NotepadDoc, editor?: Editor | null): string {
  if (doc.mode === "rich" && editor && !editor.isDestroyed) {
    const html = editor.getHTML();
    if (isMeaningfulHtml(html)) return html;
  }
  return doc.lastRichContent || doc.content || "";
}

async function createHtmlSource(doc: NotepadDoc, editor?: Editor | null): Promise<string> {
  const html = getCanonicalRichHtml(doc, editor);
  assertSafeConversionInput(doc, html);
  return generateFullHtml(doc.title || "Note", html);
}

async function createMarkdownSource(doc: NotepadDoc, editor?: Editor | null): Promise<string> {
  const html = getCanonicalRichHtml(doc, editor);
  assertSafeConversionInput(doc, html);
  return htmlToMarkdown(html, { preserveDataImages: false });
}
```

Important: `getCanonicalRichHtml()` must never prefer an empty editor result over a non-empty saved document.

## Data Safety Rules

1. Before any conversion action, capture a snapshot:
   - `doc.id`
   - `doc.title`
   - `doc.content`
   - `doc.mode`
   - `doc.lastRichContent`
   - timestamp
2. Conversion preview must not call `setDocs()` except for harmless UI state.
3. Conversion preview must not call `editor.commands.setContent("")`.
4. If original content is meaningful and converted output is empty or `<p></p>`, abort and show an error.
5. Keep `lastRichContent` only as recovery metadata, not as a normal round-trip engine.
6. The source modal should copy/download generated output from temporary component state.
7. Any future source-to-rich apply flow must sanitize HTML before `setContent()`.

## Image Handling

Current image behavior should be split by output type:

- HTML source/export: preserve embedded base64 image `src` values so the file remains self-contained.
- Markdown source/export: use the current placeholder strategy for data images by default to avoid huge `.md` files.
- Markdown source modal should warn when embedded images are represented as placeholders.
- Future enhancement: optional "Export images as separate files" for desktop where filesystem access is available.

## Error Handling

Add guards:

- `isMeaningfulHtml(html)` returns false for empty strings, `<p></p>`, `<p><br></p>`, and whitespace-only text.
- `assertSafeConversionInput(doc, html)` blocks conversion if the editor returns empty content while `doc.content` or `doc.lastRichContent` is meaningful.
- Wrap conversion in `try/catch`; show a toast with a non-destructive failure message.
- Keep a one-click `Restore previous note state` toast/action if an apply flow is introduced later.

## Implementation Steps

### Phase 1: Stop Destructive UI

1. Web: remove `setEditorMode("markdown")` and `setEditorMode("html")` from toolbar buttons.
2. Web: keep Rich as the editor state; wire HTML/MD buttons to source preview actions.
3. Desktop: replace the single Rich/Plain conversion toggle with non-destructive HTML/MD source buttons.
4. Keep raw/plain mode only for large-file prompts and crash recovery.

### Phase 2: Centralize Conversion

1. Rename current `htmlToMarkdown()` to `richHtmlToMarkdown()`.
2. Deduplicate export Markdown and source Markdown conversion.
3. Use the same HTML generator for source preview and `.html` export.
4. Preserve current Turndown custom rules for task lists, code blocks, highlights, tables, and images.

### Phase 3: Add Source Modal

1. Add state:
   - `sourcePreview: { format: "html" | "markdown"; value: string; warning?: string } | null`
2. Add buttons:
   - Copy
   - Download `.html` / `.md`
   - Close
3. Use a readonly textarea or code-style panel.
4. Do not write preview text into `NotepadDoc.content`.

### Phase 4: Safety Tests

Manual test matrix:

- Rich note with 400 words, headings, bullets, numbered list, checklist, links.
- Rich note with pasted base64 image.
- Rich note with table and code block.
- Empty note.
- Existing raw/plain large file.
- Click HTML repeatedly; note content must remain unchanged.
- Click MD repeatedly; note content must remain unchanged.
- Copy/export generated output; rich editor must remain intact.
- Switch tabs during source preview; no note should be overwritten.

Automated tests if practical:

- Unit test `isMeaningfulHtml()`.
- Unit test HTML-to-Markdown image placeholder behavior.
- Unit test source generation does not call `setDocs()`.

## Acceptance Criteria

- Clicking HTML never changes the saved note content.
- Clicking MD never changes the saved note content.
- Rich content with headings, lists, links, tables, code blocks, and images remains visible after conversion actions.
- HTML output preserves embedded images.
- Markdown output keeps readable structure and clearly handles embedded images.
- Existing export menu still works.
- Web and desktop behavior match.

