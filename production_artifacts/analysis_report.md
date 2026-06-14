# ILoveNotepad — Pre-Work Analysis Report
Generated: 2026-06-14T13:11:30Z

## 1. Project Structure
The repository is structured as a pnpm-managed monorepo with the following configuration:
- **Root Directory**: Contains workspace configuration (`pnpm-workspace.yaml`, `package.json`, and lockfile).
- **Web App**: Located at `artifacts/website/` (React, Vite, wouter routing).
- **Electron App**: Located at `notepad-win/` (Electron main process, with a React renderer workspace inside `notepad-win/src/renderer`).

## 2. Navbar Overlap — Root Cause
- **File**: [layout.tsx](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/artifacts/website/src/components/layout.tsx) (line 150-168)
- **Issue**: The layout check for hiding the site navigation uses:
  `if (location.startsWith("/tools/") || TOP_LEVEL_TOOL_ALIASES.has(location))`
  This check fails when the route location has a trailing slash (e.g. `/online-notepad/` or `/notepad/`) or query/hash parameters. Additionally, `/pomodoro` is not listed in `TOP_LEVEL_TOOL_ALIASES`, causing the global site navbar and footer to overlap on the Pomodoro focus timer tool.
- **Fix Needed**:
  1. Normalize the location string by stripping trailing slashes and query parameters before matching.
  2. Include `/pomodoro` in the `TOP_LEVEL_TOOL_ALIASES` list.

## 3. Web Load Speed — Issues Ranked by Impact
1. **Unoptimized Assets & Code Splitting**: Heavy editor packages (TipTap and its extensive extensions) are loaded within the main notepad bundle.
2. **SSR / Hydration Checks**: Dynamic theme attributes are calculated on load, causing potential repaint blocks.
3. **Suspense Boundaries**: The fallback loading visual is minimal and can be optimized.

## 4. Electron Icon — What's Missing
- **Current Window Icon Config**: [main.js](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/notepad-win/src/main/main.js#L49) loads `favicon.ico` from the renderer public folder.
- **Electron Builder Config**: [package.json](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/notepad-win/package.json#L23) points to `icon.ico` in the package root.
- **Missing**: We need to generate a high-res custom multi-resolution `.ico` icon from `C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png` and update both `notepad-win/icon.ico` and `notepad-win/src/renderer/public/favicon.ico`.

## 5. Electron Size — Bloat Sources
- **Package Exclusions**: The `package.json` "files" array packages everything in `src/main/` and `src/renderer/dist/`, but doesn't explicitly exclude source maps (`.map` files), development assets, or unused configuration files.
- **Dependency Classification**: Dev dependencies such as `electron` and `electron-builder` are correctly separated, but the renderer package has some dependencies that could be better tree-shaken.
- **White Screen Cause**: The `main.js` creates the BrowserWindow and immediately shows it, instead of deferring the show call until the `'ready-to-show'` event, or loading a background color matching the app.

## 6. Favicon — Current State and Scope
- **Current Favicon Method**: Set per-route via `Seo.tsx` metadata and dynamically rewritten in static builds via `create-route-html.mjs`.
- **Files to Update**:
  - `notepad.tsx`
  - `create-route-html.mjs`
- **Scope**: Localized to Notepad route and its static build template.

## 7. Proactive Findings
- In `notepad-win/src/renderer/package.json`, `@tailwindcss/vite` is a devDependency but `@tailwindcss/postcss` and tailwind-merge are in dependencies. We will verify compile outputs.

## 8. Assumptions
- None. All paths, package references, and layout structures have been verified directly via filesystem inspection.
