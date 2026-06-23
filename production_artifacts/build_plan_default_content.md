# Build Plan: Default Onboarding Notes Content

Implement 3 default showcase documents to display on initial app startup.

## Proposed Changes

### 1. Document Schema Definitions

We will create a list of templates in both `notepad.tsx` and `App.tsx`:

- **Note 1: "🚀 Quick Start Guide"** (Pinned = true, Mode = "rich")
  - Introduces features like Chrome-like tab reordering, pin status, and key shortcuts.
  - Formatted using headings, bullet items, checklists, and bold elements.

- **Note 2: "🎨 Formatting Playground"** (Pinned = false, Mode = "rich")
  - Details custom typography styles (bold, italic, underline, highlight, alignment).
  - Integrates an illustrative tables block showing Markdown-to-HTML conversion rules.
  - References a local logo asset: `<img src="/images/ankitjaiswal-logo.png" width="120" />`.

- **Note 3: "📝 Raw Markdown Sandbox"** (Pinned = false, Mode = "raw")
  - Demonstrates the raw editor canvas with clean plain text list formatting.

### 2. Loading Flow Modification
- In both `notepad.tsx` and `App.tsx`, update `loadDocs()`:
  ```typescript
  // If localStorage.getItem(LS_DOCS) is empty:
  const docs = [
    { id: genId(), title: "🚀 Quick Start Guide", content: QUICK_START_HTML, isPinned: true, createdAt, updatedAt },
    { id: genId(), title: "🎨 Formatting Playground", content: FORMATTING_PLAYGROUND_HTML, createdAt, updatedAt },
    { id: genId(), title: "📝 Raw Markdown Sandbox", content: RAW_SANDBOX_TEXT, mode: "raw", createdAt, updatedAt }
  ];
  saveDocs(docs);
  return docs;
  ```
