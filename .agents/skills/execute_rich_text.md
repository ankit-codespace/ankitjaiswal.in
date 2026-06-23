# Skill: Execute Format Switching & Editor States Update

Execution guidelines for implementing format toggle updates.

## Execution Steps

### Phase 1: Modify interfaces
- In both `App.tsx` and `notepad.tsx`, add `lastRichContent?: string;` to `NotepadDoc`.

### Phase 2: Refactor `toggleEditorMode` in `App.tsx` and `notepad.tsx`
- Inject a simple Markdown-to-HTML parser function:
  ```typescript
  const parseMarkdownToHtml = (md: string): string => {
    // Simple conversions for headers, bold, italics, checklists, bullet points, tables
    let html = md;
    // ... conversion logic ...
    return html;
  };
  ```
- Update `toggleEditorMode` to save `lastRichContent` before converting to raw, and check or parse when toggling back to rich.

### Phase 3: Replace Emojis with SVGs
- Find formatting toggle buttons.
- Replace label contents with `FileText` and `Type` Lucide icons.
- Adjust button widths, titles, and tooltips.

### Phase 4: Verify Compilation
- Execute `pnpm run build` from root directory.
