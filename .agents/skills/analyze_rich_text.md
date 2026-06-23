# Skill: Analyze Format Switching & Editor States

Investigate state mutations during editor mode toggles and locate premium UI options for formatting labels.

## Analysis Points

1. **Destructive Toggling**:
   - Location: `toggleEditorMode` in both clients.
   - Current: Replaces `content` with stripped plain text, clearing formatting completely.
   - Solution: Save the raw HTML in a document attribute `lastRichContent`. If the user returns to rich mode and the plain text is unchanged, restore the exact HTML.

2. **Markdown Conversion**:
   - We need a reliable Markdown-to-HTML parser to convert markdown syntax (like `# Heading`, `**bold**`, `- [ ] checklist`) back into HTML elements that TipTap understands when switching raw text back to rich text.

3. **Toolbar Icon Optimization**:
   - Location: Format Mode Toggle button.
   - Current: Renders emojis `⚡ Plain` or `📝 Rich`.
   - Solution: Replace with premium Lucide icons. Verify Lucide imports for `Type`, `FileText`, `Sliders` or similar icons in both `App.tsx` and `notepad.tsx`.
