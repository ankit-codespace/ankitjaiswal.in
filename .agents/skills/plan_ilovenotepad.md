# Skill: Plan ILoveNotepad Fixes

## Purpose

Read the analysis report. Build a precise, phased execution plan.
Save it to `production_artifacts/build_plan.md`.
This plan is what the execute loop follows — it must be specific enough
that each sub-step has exactly one thing to do.

---

## Input

Read `production_artifacts/analysis_report.md` before writing a single line of the plan.
The plan is built FROM the analysis, not from assumptions.

---

## Plan Structure

Each phase has:
- A clear goal
- Numbered sub-steps (1.1, 1.2, 1.3...)
- A self-audit step at the end
- A log checkpoint

---

## Phase 1: Fix Web Notepad — Navbar Overlap + Load Speed

```
Goal: The home page navigation must never appear inside the Notepad tool.
      The Notepad tool must load noticeably faster.

Sub-steps:
1.1  Read the current navbar component CSS/styles completely
1.2  Read the Notepad tool container CSS/styles completely
1.3  Identify the stacking context conflict (z-index, position, isolation)
1.4  Fix the root cause — do not use z-index hacks on top of broken structure
     → If navbar is position:fixed with high z-index leaking into tool routes,
       add contain: layout or isolation: isolate to the tool wrapper
     → If it's a rendering order issue in the layout tree, restructure the layout
     → Fix the actual cause, not the symptom
1.5  Verify fix by mentally tracing the CSS cascade — does navbar stay outside?
1.6  Audit: re-read every file touched. Any regressions possible? Fix them.
1.7  Diagnose load speed — read the findings from analysis
1.8  Implement the highest-impact fix first:
     → If no lazy loading: add React.lazy + Suspense to the Notepad route
     → If heavy imports at top level: move to dynamic imports
     → If no code splitting: configure it in next.config.js / vite.config.js
     → If fonts are blocking: add font-display: swap or preload hints
     → If SSR issue: wrap client-only components in dynamic({ ssr: false })
1.9  Implement second highest-impact fix
1.10 Audit all load changes — re-read every modified file
1.11 Check for any regressions in other routes caused by splitting changes
1.12 [BONUS if found] Fix any other CSS issues spotted in the notepad component
1.13 Log Phase 1 complete to build_log.md
1.14 Save phase audit to production_artifacts/phase_audits/phase1_audit.md
```

---

## Phase 2: Windows App — Strip Electron Branding + Inject Custom Icon

```
Goal: Zero Electron branding visible anywhere. Custom icon on taskbar,
      ALT+TAB, title bar, system tray, installer, and Windows Store listing.

Sub-steps:
2.1  Read electron-builder config completely (package.json build section or .yml)
2.2  Read main.js / main.ts completely
2.3  Copy the icon from Downloads to project:
     Source: C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png
     Destination: [project]/build/icons/ (create folder if missing)
     Also create: [project]/build/icon.ico (convert or use if .ico exists)
2.4  Generate required icon sizes for Windows:
     → 256x256 minimum for taskbar (high DPI)
     → 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 for ICO format
     → Use sharp or electron-icon-builder if available, else use jimp
     → The .ico file must be a multi-resolution ICO, not just a renamed PNG
2.5  Update BrowserWindow in main.js:
     → Add icon property pointing to the new icon file
     → Use path.join(__dirname, 'build/icons/icon.ico') for Windows
     → Use nativeImage.createFromPath() for cross-platform safety
2.6  Update electron-builder config:
     → Set "icon": "build/icons/icon.ico" (or "build/icon" for auto-resolution)
     → Set "productName": "ILoveNotepad" (not "Electron" or default)
     → Set "appId": to your actual app ID (e.g., "in.ankitjaiswal.ilovenotepad")
     → Verify "win" section has correct icon path
2.7  If tray icon exists in code — update it to use the same icon
2.8  Search entire codebase for string "Electron" in visible contexts:
     → Window title: "Electron" → "ILoveNotepad"
     → Any hardcoded "electron" in productName, appId, or title
     → package.json "name" if it says "electron-app" or similar
2.9  Check if app has a splash screen — if yes, verify it's not showing Electron branding
2.10 Audit: re-read main.js and electron-builder config end to end
     Confirm: no reference to default Electron icon path
     Confirm: productName is set and correct everywhere
2.11 [BONUS] Check if Windows Store manifest (if MSIX) has correct publisher info
2.12 [BONUS] If app supports system tray, ensure tray tooltip also says "ILoveNotepad"
2.13 Log Phase 2 complete to build_log.md
2.14 Save phase audit to production_artifacts/phase_audits/phase2_audit.md
```

---

## Phase 3: Windows App — Reduce Size + Fix White Screen

```
Goal: Get the app as lean as possible. Fix the white screen flash on launch.
      Target: noticeable size reduction. Launch: instant, like native Notepad.

Sub-steps:
3.1  Read package.json dependencies — audit every single one
     → Move build tools to devDependencies if in dependencies
     → Flag packages that have lighter alternatives
3.2  Read electron-builder config — audit the "files" array
     → Is node_modules fully packed? Add exclusions:
       "!node_modules/**/*.md"
       "!node_modules/**/*.ts" (source files)
       "!node_modules/**/test/**"
       "!node_modules/**/tests/**"
       "!node_modules/**/__tests__/**"
       "!node_modules/**/docs/**"
       "!node_modules/**/*.map" (source maps)
3.3  Enable ASAR packaging if not enabled (reduces file count overhead)
3.4  Set compression to "maximum" in electron-builder if not already
3.5  Read main.js — find the BrowserWindow creation code
     Fix white screen: implement the correct show pattern:
     ```javascript
     const win = new BrowserWindow({
       show: false,              // don't show until ready
       backgroundColor: '#ffffff', // or your app's bg color — prevents flash
       ...
     })
     win.once('ready-to-show', () => {
       win.show()               // show only when content is painted
     })
     ```
3.6  Add a fast loading skeleton/splash approach if ready-to-show is slow:
     → Show window immediately with backgroundColor matching app bg
     → OR implement a minimal HTML loading screen in the preload
3.7  Check if the renderer uses heavy synchronous operations on startup
     → Look for large data loads, sync file reads, or blocking API calls on init
     → Defer anything not needed for first render
3.8  Check if the app uses webpack for the renderer:
     → If yes: verify production mode is set (mode: 'production')
     → Check if source maps are being bundled in production (they shouldn't be)
     → Verify tree shaking is active
3.9  Check if electron is in "dependencies" instead of "devDependencies"
     → If yes: move it — this alone can prevent bundling Electron twice
3.10 Look for any large static assets (images, fonts) bundled unnecessarily
     → Check if fonts can be loaded from system or subset
3.11 [BONUS] Check if electron-builder prune is set — it removes dev deps before packing
     Add to config: "npmRebuild": false if applicable
3.12 [BONUS] If app has devTools enabled in production — disable it
     → Find openDevTools() calls and wrap in isDev check
     → This adds overhead to every launch
3.13 [BONUS] Check if contextIsolation and nodeIntegration are set optimally
     → contextIsolation: true + nodeIntegration: false is correct for modern Electron
     → Old setups can add overhead and security holes
3.14 Audit: re-read main.js, electron-builder config, and package.json
     Verify no production-breaking changes made
3.15 Write a size reduction summary:
     → What was changed
     → Estimated MB saved per change
     → Expected launch time improvement
3.16 Log Phase 3 complete to build_log.md
3.17 Save phase audit to production_artifacts/phase_audits/phase3_audit.md
```

---

## Phase 4: Web Notepad — Replace Favicon

```
Goal: Replace the external favicon URL with the local project file,
      scoped to the Notepad tool only.

Sub-steps:
4.1  Read the current favicon implementation (found in analysis)
4.2  Copy the icon to the web project's public folder:
     Source: C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png
     Destination: [web_project]/public/icons/ilovenotepad_logo_premium.png
4.3  If the favicon is set globally in _document.js or layout.tsx:
     → The Notepad route needs its own layout or metadata override
     → In Next.js App Router: add metadata export to the notepad route's page.tsx/layout.tsx
     → In Next.js Pages Router: add <Head> with the favicon override in the notepad page
     → In other frameworks: scope it to the notepad component's mount
4.4  Update the favicon reference:
     FROM: https://ankitjaiswal.in/icons/ilovenotepad_logo_premium.png?v=3
     TO:   /icons/ilovenotepad_logo_premium.png
     (relative path served from the project's own public folder)
4.5  [BONUS] Check if web app manifest (manifest.json / site.webmanifest) references
     the old external URL — update it to the local path too
4.6  [BONUS] Add multiple icon sizes to the manifest if only one exists:
     → 192x192 and 512x512 are minimum for PWA compliance
     → If the source PNG is large enough, generate both sizes
4.7  Audit: verify the notepad route serves the correct favicon
     Verify: no other tool or page is accidentally affected
     Verify: the local file path is correct and the file will be served
4.8  Log Phase 4 complete to build_log.md
4.9  Save phase audit to production_artifacts/phase_audits/phase4_audit.md
```

---

## Phase 5: Final Review and Shipping Checklist

```
Goal: Confirm everything works together. Nothing regressed. Nothing left half-done.

Sub-steps:
5.1  Re-read build_log.md — confirm all 4 phases completed with no open issues
5.2  Re-read all 4 phase audits — look for any flagged items not resolved
5.3  Cross-check: do the web and Electron changes conflict anywhere? (shared assets, paths)
5.4  Verify the icon file exists in both destinations:
     → Web public folder
     → Electron build/icons folder
5.5  Verify electron-builder config is valid JSON/YAML — no syntax errors
5.6  Verify main.js BrowserWindow config — complete and correct
5.7  Verify web routes — notepad loads with correct favicon, navbar stays out
5.8  Write final shipping checklist to production_artifacts/build_plan.md (append):
     [ ] Web navbar overlap: FIXED
     [ ] Web notepad load speed: IMPROVED (list what was done)
     [ ] Electron icon: REPLACED with custom icon
     [ ] Electron branding: REMOVED
     [ ] Electron app size: REDUCED (list MB saved)
     [ ] White screen flash: FIXED
     [ ] Web favicon: REPLACED with local file
     [ ] No regressions in other tools/pages
5.9  Log Phase 5 complete — FULL BUILD DONE
```

---

## Save the Plan

Write the complete plan to `production_artifacts/build_plan.md`

Log to `build_log.md`:
```
[PLAN COMPLETE] — [timestamp]
5 phases defined. Sub-steps: [count]
Proceeding to execution.
```
