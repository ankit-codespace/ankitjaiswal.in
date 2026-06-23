# Build Plan: Notepad Export and Source UX Cleanup

## Product Position

The notepad should behave like a serious writing tool first, and a developer-friendly converter second. The editor toolbar should stay focused on editing actions. Export, copy-as, and source-generation actions belong in the Export menu because they are output actions, not writing-format actions.

The current HTML/MD/Rich cluster in the top toolbar creates ambiguity:

- Users may think MD/HTML changes the editing mode.
- Developers may expect source output.
- Non-technical users may click it accidentally.
- It consumes prime toolbar space beside frequent controls.

The strongest product direction is:

**Keep the editor toolbar for editing. Move HTML and Markdown source actions into the Export dropdown.**

## Recommendation

### 1. Remove MD and HTML from the toolbar

The toolbar should keep only rich editing controls and high-frequency utilities:

- Bold, italic, underline, lists, headings, links, images, tables.
- Search, focus, settings, copy, export.

Do not expose MD/HTML as mode-looking buttons beside Rich. The editor is rich text. Source/output belongs under Export.

### 2. Keep Markdown standards conservative

Remove the `==highlight==` Markdown output.

Reason:

- `==highlight==` is supported by apps like Obsidian and some Markdown extensions, but it is not standard CommonMark Markdown.
- GitHub, many CMS editors, many documentation tools, and plain Markdown renderers may show it literally.
- The screenshot shows the exact failure: highlighted terms become ugly `==Class==` text.

Preferred Markdown conversion:

- Highlighted text should export as plain text in Markdown.
- Bold/italic/links/headings/lists/code blocks should remain.
- Tables can remain as HTML blocks if table conversion is not reliable.
- Images should remain placeholders or links depending on source.

Optional future enhancement:

- Add an advanced export preference: `Markdown flavor: Standard / Obsidian`.
- Do not add this now. It adds choice debt for most users.

### 3. Redesign the Export dropdown

Use a clean, compact action list:

Primary actions:

- Smart Export
- PDF
- HTML
- Markdown
- Plain Text

Secondary copy actions:

- Copy Rich Text
- Copy HTML
- Copy Markdown

Recommended final menu structure:

```text
Export
Smart Export
PDF
HTML
Markdown
Plain Text

Copy
Rich Text
HTML
Markdown
```

Use separators and short labels. Remove the long explanations below each option.

Why remove descriptions:

- The menu is already in a dense toolbar.
- Repeated descriptions slow scanning.
- Expert users know file extensions.
- New users learn enough from labels like `PDF`, `HTML`, and `Markdown`.
- A premium product would not explain every obvious option every time.

If any clarification is needed, use native `title` tooltips or concise hover-only hints, not permanent secondary text.

### 4. Replace the current source popup purpose

The popup should become a source preview only when the user chooses:

- Export -> HTML -> Preview
- Export -> Markdown -> Preview
- Copy -> HTML
- Copy -> Markdown

However, the cleanest first implementation is:

- Export `HTML` downloads directly.
- Export `Markdown` downloads directly.
- Copy `HTML` copies HTML source and shows feedback.
- Copy `Markdown` copies Markdown source and shows feedback.

Avoid a modal unless the user explicitly chooses `Preview Source`.

Why:

- Export menus should complete actions quickly.
- A modal adds a second decision point.
- Most users want the file or clipboard, not to inspect generated code.
- Developers who need inspection can use a later `Preview Source` item.

Recommended phase 1:

- Remove the source modal from default HTML/MD actions.
- Keep source generation logic internally.
- Add `Copy HTML` and `Copy Markdown` to the export dropdown.
- Keep downloadable `HTML` and `Markdown` actions.

Recommended phase 2:

- Add `Preview Source` only if users ask for it.

### 5. Copy button feedback

Every copy action must have direct feedback:

- Button label changes to `Copied` for 1.4-1.8 seconds.
- Icon changes from copy icon to check icon.
- Toast can still appear, but the button itself must reflect success.
- On failure, show `Failed` briefly and keep the toast.

For dropdown copy actions:

- The menu can close after copy.
- The toolbar Copy button should show `Copied`.
- If copying from a source preview modal remains, its modal button should also show `Copied`.

This is important because clipboard actions are invisible. Premium software always confirms invisible state changes at the control where the user acted.

### 6. Naming

Use output-oriented labels:

- `HTML` not `HTML Source` in the export list.
- `Copy HTML` if it goes to clipboard.
- `Markdown` not `MD` in menus.
- `Plain Text` not `TXT`.

Keep `MD` only if used as a tiny icon, not as a primary label.

### 7. Performance

Do not generate HTML/Markdown until the user clicks the action.

Implementation rules:

- Turndown stays dynamically imported.
- No conversion runs on every keystroke.
- No source preview state stores large output unless preview is explicitly opened.
- Export dropdown itself should not compute output.
- Clipboard/download actions compute output once, execute, then discard it.

This keeps editor typing performance unaffected.

### 8. Safety

Keep the safety work from the previous implementation:

- HTML/Markdown generation must never call `setDocs()`.
- Export/copy actions must never mutate `activeDoc.content`.
- Empty editor HTML must never override saved rich content.
- Source conversion uses canonical rich HTML, with fallback to saved content.

Add one more rule:

- If conversion fails, leave the note untouched and show a clear error.

### 9. Best Final UX

Final recommended toolbar:

```text
[editing controls...] [undo/search/focus] [settings] [Copy] [Export v]
```

Final recommended export dropdown:

```text
Smart Export

Download
PDF
HTML
Markdown
Plain Text

Copy As
Rich Text
HTML
Markdown
```

No permanent descriptions. No source mode buttons in the toolbar. No accidental conversion surface.

## Implementation Plan

### Phase 1: Markdown correctness

1. Update `htmlToMarkdown()` / source conversion rules.
2. Remove the highlight rule that outputs `==content==`.
3. Let highlighted text export as regular text.
4. Verify Markdown output no longer contains `==`.

### Phase 2: Export menu restructure

1. Remove MD/HTML segmented control buttons from the toolbar.
2. Keep Rich editor behavior unchanged.
3. Redesign export dropdown into grouped sections:
   - Smart Export
   - Download
   - Copy As
4. Remove secondary descriptive text from dropdown rows.

### Phase 3: Copy actions

1. Add `copyMarkdownSource()`.
2. Add `copyHtmlSource()`.
3. Reuse existing rich copy for `Copy Rich Text`.
4. Add local feedback state:
   - `"idle" | "copied-rich" | "copied-html" | "copied-markdown" | "error"`
5. Display `Copied` on the clicked row or toolbar button.

### Phase 4: Source preview decision

Preferred: remove the modal from default flow.

If preview is retained:

1. Move preview actions into Export -> Preview Source.
2. Add copied-state feedback to modal copy button.
3. Do not open preview from toolbar.

### Phase 5: Verification

Manual tests:

- Create note with headings, bold, highlighted terms, bullets, links, image.
- Export Markdown: no `==highlight==` text appears.
- Copy Markdown: clipboard contains clean Markdown.
- Export HTML: preserves highlight as HTML/CSS/mark.
- Copy HTML: clipboard contains HTML source.
- Toolbar has no ambiguous MD/HTML source controls.
- Export dropdown remains compact and scannable.
- No action mutates the visible rich note.

Automated checks:

- `npm run typecheck`
- `npm run build`
- Browser smoke test for dropdown actions.

## Final Product Call

Do it.

The best version is not more controls. It is fewer, clearer controls:

- Writing tools in the toolbar.
- Output tools in Export.
- Standard Markdown by default.
- Copy actions with visible success feedback.
- No accidental mode conversion.

