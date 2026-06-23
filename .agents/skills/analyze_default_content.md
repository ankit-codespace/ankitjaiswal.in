# Skill: Analyze Default Note Initialization

Investigate initial load routines, JSON representation schemas, and media asset paths for onboarding.

## Analysis Points

1. **Initialization Flow**:
   - Location: `loadDocs()` in both `notepad.tsx` and `App.tsx`.
   - Current implementation: When `localStorage.getItem(LS_DOCS)` is null or empty, it calls `newDoc()` once, returning a single empty "Untitled" document.
   - Target modification: Replace the single blank tab with an array of three default documents representing clean showcases.

2. **TipTap HTML Compatibility**:
   - The editor uses HTML syntax for rich text.
   - We must design standard HTML templates for each showcase note:
     - Welcoming layout using headers (`<h1>`, `<h2>`), task lists (`<ul data-type="taskList">`), custom highlights (`<mark>`), and dividers (`<hr>`).
     - Creative Sandbox with embedded tables (`<table>`, `<tr>`, `<td>`), code fragments (`<code>`), and local working image paths (such as `/images/ankitjaiswal-logo.png`).

3. **No-Lag Loading**:
   - Large or poorly parsed default HTML strings can delay initial mount. Ensure default HTML is pre-minified/escaped and matches TipTap syntax specifications.
