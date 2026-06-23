# Skill: Execute Default Content Setup

Step-by-step code application in both React web pages and Electron renderer pages.

## Execution Procedure

### Phase 1: Create Default Notes Templates
- Build standard HTML strings for:
  - Note 1 (Quick Start): Task lists, bullet items, bold formatting, highlights, shortcut explanations.
  - Note 2 (Playground): Table comparing Markdown vs Rendered, and working logo image `/images/ankitjaiswal-logo.png`.
  - Note 3 (Raw Sandbox): Text detailing Raw text usage in standard markdown format.

### Phase 2: Modify Web Initialization (`notepad.tsx`)
- Inject templates as `INITIAL_DOCS_TEMPLATES` constant.
- Modify `loadDocs()` to dynamically construct and save `DEFAULT_DOCS` when local storage is empty.

### Phase 3: Modify Desktop Initialization (`App.tsx`)
- Inject identical templates and update the `loadDocs()` method in `App.tsx`.

### Phase 4: Verification
- Execute `pnpm run build` from the workspace root to ensure code builds successfully.
