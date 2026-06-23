# Build Plan: Format Switching & Editor States

Implement non-destructive format mode switching, Markdown-to-HTML parsing, and replace cheap toolbar emojis with premium SVG icons.

## Proposed Changes

### 1. Document Interface Update (`NotepadDoc`)
Add `lastRichContent?: string` field to prevent irreversible loss of format styling when switching to raw mode.

### 2. Format Switcher Logic Refactor (`toggleEditorMode`)
- When toggling from **Rich** to **Raw**:
  - Save current raw HTML into `d.lastRichContent`.
  - Convert `d.content` to Markdown/Plain Text.
- When toggling from **Raw** to **Rich**:
  - If current plain text matches the stripped text of `d.lastRichContent`, restore the original HTML formatting directly.
  - If edits were made, run `parseMarkdownToHtml()` to reconstruct the formatting tags (headers, bold, italics, checklists, lists) into HTML.

### 3. Toolbar Icon Redesign
- Replace `⚡ Plain` and `📝 Rich` toggle labels with Lucide's `Type` (for Rich) and `Code` or `AlignLeft` (for Plain) icons.
- Ensure tooltips clearly state the current formatting mode.
