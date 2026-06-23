# Skill: Plan Default Note Content Setup

Produce the build plan for injecting default onboarding notes when the app is initialized.

## Target Modifications

### Web & Desktop Sync

1. Create a shared array of `DEFAULT_DOCS` containing 3 notes:
   - **Note 1: 🚀 Quick Start Guide** (Pinned, rich text)
     - Content covers headings, tasks lists (`<ul data-type="taskList">`), custom highlights, and keyboard shortcuts.
   - **Note 2: 🎨 Formatting Playground** (Rich text, tables, highlights, custom styles, link, and working logo image).
   - **Note 3: 📝 Raw Markdown Sandbox** (Raw mode, showing raw markdown text structure).

2. Modify `loadDocs()` in both `notepad.tsx` and `App.tsx`:
   - If local storage does not contain any saved documents:
     - Generate unique IDs for the three default documents using `genId()`.
     - Save this array to local storage and return it.
     - Ensure the active document defaults to the first quick start guide.
