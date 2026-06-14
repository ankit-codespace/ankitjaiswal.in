# Skill: Analyze ILoveNotepad Project

## Purpose

Do a complete audit of the ILoveNotepad project before touching a single file.
This is your source of truth. Everything downstream depends on the accuracy of this analysis.

---

## Step 1: Map the Full Project Structure

```
Read the root directory tree:
- List all folders and files at root level
- Identify: is this a monorepo or single project?
- Identify: where does the web app live vs the Electron app?
- Note the package.json(s) — how many are there?
```

Document in `production_artifacts/analysis_report.md`:
```
## Project Structure
[full tree]

## Web App Location: [path]
## Electron App Location: [path]
## Shared Code: [path or "none"]
```

---

## Step 2: Audit the Web Notepad Tool — Navbar Overlap

```
1. Find the Notepad tool component file (search for "notepad", "notebook", "tool" in component names)
2. Find the global navbar/header component
3. Read both files completely
4. Find all CSS files that apply to either component
5. Look for:
   - position: fixed or position: sticky on the navbar
   - z-index values on navbar vs notepad container
   - Any overflow: hidden that might affect stacking
   - Missing isolation: isolate on tool containers
   - Any CSS custom properties setting z-index globally
6. Find the root layout file — check if navbar is rendered inside or outside the tool route
```

Document:
```
## Navbar Overlap Root Cause
File: [file]
Line: [line number]
Issue: [exact CSS property and value causing it]
Fix needed: [what needs to change]
```

---

## Step 3: Audit Web Notepad Load Speed

```
1. Find the Notepad tool's main component
2. Check: is it lazy-loaded or eagerly imported?
3. Find all imports in the notepad component — list heavy ones
4. Check if there's a bundle analyzer config (webpack-bundle-analyzer, vite bundle viz)
5. Check next.config.js / vite.config.js for optimization settings
6. Look for:
   - Images not using next/image or lazy loading
   - No code splitting on the route
   - Fonts blocking render
   - No suspense boundaries
   - Third party scripts loaded synchronously
   - Large editor libraries loaded all at once
7. Check if the notepad has an SSR issue (client-only components not wrapped properly)
```

Document:
```
## Load Speed Issues Found
1. [issue] — [file] — [severity: HIGH/MED/LOW]
2. ...

## Estimated Load Impact
[what is likely causing the most delay]
```

---

## Step 4: Audit Electron App — Icon and Branding

```
1. Find package.json in the Electron project
2. Find the electron-builder config (could be in package.json, electron-builder.yml, or electron-builder.json)
3. Check the "build" section for:
   - icon path currently set
   - productName
   - appId
   - Any reference to default Electron icon
4. Find the actual icon files in the project (search for .ico, .icns, .png in build/assets)
5. Find the main Electron process file (main.js or main.ts)
   - Check BrowserWindow creation
   - Look for icon property on BrowserWindow
   - Check if tray icon is set separately
6. Check the taskbar/dock icon setup
7. Locate the Downloads folder path: C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\
   - Confirm icon filename: ilovenotepad_logo_premium.png (or .ico)
```

Document:
```
## Electron Icon Audit
Current icon config: [path]
BrowserWindow icon: [set/not set]
Tray icon: [set/not set]
electron-builder icon: [path]
Missing: [what's not set that should be]
```

---

## Step 5: Audit Electron App — Size and Startup Performance

```
1. Find the built output folder (dist/, out/, build/)
2. Check the total size of the installer/unpacked folder
3. Read package.json dependencies vs devDependencies
   - Flag anything in "dependencies" that should be in "devDependencies"
   - Flag unused packages if identifiable
4. Check electron-builder config for:
   - What files are being packaged (files array)
   - Whether node_modules is fully included
   - ASAR packaging — is it enabled?
   - Compression level set?
5. Check main process (main.js):
   - Is the window shown before content loads? (white screen cause #1)
   - Is ready-to-show event used?
   - Is backgroundColor set on BrowserWindow?
   - Is there a loading screen?
6. Check preload script size
7. Check renderer bundle size if accessible
```

Document:
```
## Size Audit
Built output size: [MB]
Likely bloat sources:
1. [source] — [estimated size]
2. ...

## White Screen Cause
[root cause found]
Fix: [what to implement]
```

---

## Step 6: Audit Web Notepad Favicon

```
1. Find where favicons are defined in the web project
   - Check public/ folder for favicon files
   - Check _document.js or layout.tsx for <link rel="favicon"> tags
   - Check next.config.js for metadata
   - Check manifest.json / site.webmanifest
2. Find the Notepad tool's specific route layout if it has one
3. Note the current favicon URL: https://ankitjaiswal.in/icons/ilovenotepad_logo_premium.png?v=3
4. Note the local replacement: C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png
5. Determine: is favicon set globally or per-route?
   - If global: need to scope it to notepad route only
   - If per-route: straightforward swap
```

Document:
```
## Favicon Audit
Current favicon method: [global link tag / per-route metadata / manifest]
File(s) to update: [paths]
Notepad route: [path]
Scope needed: [notepad-only or can update globally]
```

---

## Step 7: Self-Audit the Analysis

Before writing the final report, verify:

```
Checklist:
[ ] Did I read at least one actual CSS file, not just guess?
[ ] Did I find the actual electron-builder config, not assume its location?
[ ] Did I confirm the Notepad tool route path exists?
[ ] Did I check both the web app AND Electron app package.json?
[ ] Did I document specific file paths and line numbers where possible?
[ ] Is anything in my analysis an assumption rather than a confirmed finding?
    → If yes, label it clearly as ASSUMPTION in the report
```

If any item is unchecked, go back and read the relevant files before continuing.

---

## Step 8: Write Final Analysis Report

Save complete findings to `production_artifacts/analysis_report.md`

Structure:
```markdown
# ILoveNotepad — Pre-Work Analysis Report
Generated: [timestamp]

## 1. Project Structure
## 2. Navbar Overlap — Root Cause
## 3. Web Load Speed — Issues Ranked by Impact
## 4. Electron Icon — What's Missing
## 5. Electron Size — Bloat Sources
## 6. Favicon — Current State and Scope
## 7. Proactive Findings (things noticed beyond scope)
## 8. Assumptions (anything not confirmed by reading actual files)
```

Log to `build_log.md`:
```
[ANALYSIS COMPLETE] — [timestamp]
Report saved to production_artifacts/analysis_report.md
Ready to generate plan.
```
