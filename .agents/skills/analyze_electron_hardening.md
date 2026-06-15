# Skill: Analyze ILoveNotepad — Forensic Audit

## Purpose

Do a forensic audit of the project before touching anything.
The goal is to understand exactly WHY the app is 259MB,
exactly WHERE "Our Notepad" and the Electron icon appear,
and exactly what is blocking instant launch.

This analysis produces numbers. Not guesses. Not "likely". Numbers.

---

## Setup

```bash
mkdir -p production_artifacts/phase_audits
```

Initialize log:
```
# ILoveNotepad Electron Hardening — Build Log
Started: [timestamp]

[ANALYSIS STARTED] [timestamp] — Beginning forensic audit
```

---

## Step 1: Map the Full Project

```bash
# Get the full project tree (2 levels deep to start)
find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' | sort

# Then go deeper on key folders
ls -la src/ 2>/dev/null
ls -la build/ 2>/dev/null
ls -la assets/ 2>/dev/null
ls -la resources/ 2>/dev/null
ls -la dist/ 2>/dev/null
ls -la out/ 2>/dev/null
ls -la release/ 2>/dev/null
```

Document to `production_artifacts/analysis_report.md`:
```markdown
## Project Structure
[paste full tree]

### Key Files Located:
- Main process entry: [path]
- Renderer entry: [path]
- Preload script: [path]
- electron-builder config: [path — package.json "build" section OR .yml file]
- Bundler config: [webpack.config.js / vite.config.js / none]
- Built output: [path]
```

---

## Step 2: Size Forensics — The 259MB Breakdown

This is the most important step. We need to know EXACTLY what is eating the 259MB.

### 2a. Measure the built output

```bash
# Total built size
du -sh dist/ 2>/dev/null || du -sh out/ 2>/dev/null || du -sh release/ 2>/dev/null

# Find the unpacked app folder (this is what ships to users)
find dist/ out/ release/ -name "*.asar" 2>/dev/null
find dist/ out/ release/ -name "app.asar" 2>/dev/null
find dist/ out/ release/ -maxdepth 4 -name "*.exe" 2>/dev/null

# If there's an unpacked folder, measure it
du -sh dist/win-unpacked/ 2>/dev/null || du -sh out/ILoveNotepad-win32-x64/ 2>/dev/null
```

### 2b. Measure node_modules — the #1 suspect

```bash
# Total node_modules size
du -sh node_modules/

# The 20 largest packages (these are your optimization targets)
du -sh node_modules/* 2>/dev/null | sort -rh | head -20

# Source maps in node_modules (often 20-40MB of waste)
find node_modules/ -name "*.map" | wc -l
find node_modules/ -name "*.map" | xargs du -ch 2>/dev/null | tail -1

# TypeScript source files in node_modules (not needed at runtime)
find node_modules/ -name "*.ts" -not -name "*.d.ts" | wc -l
find node_modules/ -name "*.ts" -not -name "*.d.ts" | xargs du -ch 2>/dev/null | tail -1

# Test and docs folders in node_modules
find node_modules/ -type d -name "test" | wc -l
find node_modules/ -type d -name "tests" | wc -l
find node_modules/ -type d -name "__tests__" | wc -l
find node_modules/ -type d -name "docs" | wc -l

# Estimate test folder waste
find node_modules/ \( -type d -name "test" -o -type d -name "tests" -o -type d -name "__tests__" \) \
  -exec du -sh {} \; 2>/dev/null | sort -rh | head -10
```

### 2c. Renderer bundle size

```bash
# Find the renderer bundle
find . -name "*.bundle.js" -not -path "*/node_modules/*" 2>/dev/null | xargs du -sh 2>/dev/null
find dist/ -name "*.js" 2>/dev/null | xargs du -sh 2>/dev/null | sort -rh | head -10
find . -name "renderer.js" -not -path "*/node_modules/*" | xargs du -sh 2>/dev/null
find . -name "index.js" -path "*/dist/*" | xargs du -sh 2>/dev/null

# Check for source maps in renderer
find . -name "*.js.map" -not -path "*/node_modules/*" | xargs du -ch 2>/dev/null | tail -1
```

### 2d. Assets audit

```bash
# Find all assets being shipped
find . -path "*/node_modules" -prune -o \( -name "*.png" -o -name "*.jpg" -o -name "*.gif" -o -name "*.mp4" -o -name "*.ttf" -o -name "*.woff" -o -name "*.woff2" \) -print | xargs du -sh 2>/dev/null | sort -rh | head -20
```

Document to `production_artifacts/size_report_before.md`:
```markdown
# ILoveNotepad — Size Report (BEFORE Optimization)
Date: [timestamp]

## Current Total App Size: [X MB]

## Breakdown of What's Eating the Space:
| Component | Size | Fixable? |
|-----------|------|----------|
| node_modules (total) | X MB | YES — exclusions + prune |
| Source maps in node_modules | X MB | YES — exclude *.map |
| TS source in node_modules | X MB | YES — exclude *.ts |
| Test folders in node_modules | X MB | YES — exclude test/ |
| Renderer bundle | X MB | CHECK — should be <5MB minified |
| Renderer source maps | X MB | YES — disable in production |
| Assets (images/fonts) | X MB | CHECK — optimize large ones |
| Other | X MB | investigate |

## Top 20 Heaviest node_modules Packages:
[list with sizes]

## Estimated recoverable space: [X MB]
## Realistic target size: [X MB]
```

---

## Step 3: Branding Forensics — Find Every "Our Notepad" and Electron Icon

### 3a. Read package.json completely

```bash
cat package.json
```

Check and document:
- `"name"` field — what is it?
- `"productName"` — set? correct?
- `"description"` — what does it say?
- `"author"` — set?
- `"build"` section:
  - `"appId"` — set?
  - `"productName"` — set? correct?
  - `"icon"` — what path?
  - `"win"` → `"icon"` — what .ico path?
  - `"nsis"` section — installer icons set?
- Is `"electron"` in `"dependencies"` (wrong) vs `"devDependencies"` (correct)?

### 3b. Find every visible "Our Notepad" string

```bash
# Search for the wrong app name everywhere
grep -r "Our Notepad" . \
  --include="*.js" --include="*.ts" --include="*.json" \
  --include="*.html" --include="*.jsx" --include="*.tsx" \
  --include="*.vue" --include="*.svelte" \
  -n --color=never

# Also check for just "notepad" (case insensitive) to catch variations
grep -ri "notepad" . \
  --include="*.json" \
  --include="*.html" \
  -n --color=never | grep -v "node_modules" | grep -v ".git"

# Check for app.setName
grep -r "setName\|setTitle\|title:" . \
  --include="*.js" --include="*.ts" \
  -n --color=never | grep -v "node_modules"
```

### 3c. Read main.js completely

```bash
cat main.js 2>/dev/null || cat src/main.js 2>/dev/null || cat electron/main.js 2>/dev/null || \
  find . -name "main.js" -not -path "*/node_modules/*" -exec cat {} \;
```

While reading, document specifically:
- Line where BrowserWindow is created
- `icon` property — set? what path?
- `title` property — set? what value?
- `show` property — false? (required for ready-to-show)
- `backgroundColor` — set? what color?
- `ready-to-show` event — implemented?
- `devTools` — enabled in production?
- `app.setName()` — called? with what value?
- `app.setAppUserModelId()` — called? (required for Windows taskbar icon to work correctly)
- `Menu.setApplicationMenu()` — called? default Electron menu removed?
- Window title from `loadURL` or `loadFile` — any "Electron" reference?
- Any About panel or dialog — what does it say?

### 3d. Find all existing icon files

```bash
find . -not -path "*/node_modules/*" -not -path "*/.git/*" \
  \( -name "*.ico" -o -name "*.icns" -o -name "icon.png" -o -name "tray*.png" \) \
  -exec ls -lh {} \;
```

### 3e. Check the source icon file

```bash
# Check if the source icon is accessible from the project
ls -lh "C:/Users/LENOVO-PC/Downloads/ilovenotepad_store_assets_backup/ilovenotepad_logo_premium.png" 2>/dev/null \
  || echo "CHECK MANUALLY: source icon at C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png"

# Check what icon conversion tools are available
which convert 2>/dev/null && echo "ImageMagick: available" || echo "ImageMagick: NOT available"
node -e "require('sharp')" 2>/dev/null && echo "sharp: available" || echo "sharp: NOT available"
node -e "require('jimp')" 2>/dev/null && echo "jimp: available" || echo "jimp: NOT available"
node -e "require('png-to-ico')" 2>/dev/null && echo "png-to-ico: available" || echo "png-to-ico: NOT available"
```

Document to `production_artifacts/branding_audit.md`:
```markdown
# ILoveNotepad — Branding Audit
Date: [timestamp]

## Wrong Name Occurrences ("Our Notepad")
| File | Line | Context | Fix needed |
|------|------|---------|------------|
[list every one]

## Icon Status
| Location | Current | Should Be |
|----------|---------|-----------|
| electron-builder config "icon" | [path] | build/icons/icon.ico |
| electron-builder "win.icon" | [path] | build/icons/icon.ico |
| BrowserWindow icon property | [set/missing] | path.join(__dirname, 'build/icons/icon.ico') |
| app.setAppUserModelId() | [called/missing] | in.ankitjaiswal.ilovenotepad |
| Tray icon | [path/missing] | build/icons/tray.png |

## Source Icon
Path: C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png
Accessible: [yes/no]
Tool for ICO conversion: [sharp/jimp/png-to-ico/ImageMagick]
```

---

## Step 4: Launch Speed Forensics

### 4a. Trace the startup sequence in main.js

Read main.js again, this time tracing every operation that runs before `win.show()`:

```
Document in order:
1. What happens immediately on app load (top-level synchronous code)?
2. What happens inside app.whenReady() or app.on('ready')?
3. What is the first operation before BrowserWindow is created?
4. Is BrowserWindow created immediately or after async operations?
5. What does loadURL / loadFile load? Local file or remote URL?
6. What operations happen between window creation and window show?
7. Is autoUpdater.checkForUpdates() called before window is shown?
8. Are IPC handlers registered synchronously? How many?
9. Is there a preload script? What does it do on startup?
10. Does the renderer have heavy synchronous operations on DOMContentLoaded?
```

### 4b. Check electron-builder config for ASAR and compression

```bash
# Read the build config
cat package.json | grep -A 100 '"build"'
cat electron-builder.yml 2>/dev/null || echo "No electron-builder.yml found"
cat electron-builder.json 2>/dev/null || echo "No electron-builder.json found"
```

Check:
- `"asar"` — true or false or not set?
- `"compression"` — what level?
- `"files"` array — what exclusions are there?
- `"npmRebuild"` — set?
- `"electronVersion"` — what version? (newer = smaller sometimes)

---

## Step 5: Crash Resistance Audit

Read main.js one more time looking specifically for error handlers:

```bash
grep -n "uncaughtException\|unhandledRejection\|render-process-gone\|child-process-gone\|crashed\|unresponsive\|certificate-error" main.js 2>/dev/null \
  || find . -name "main.js" -not -path "*/node_modules/*" -exec grep -n "uncaughtException\|unhandledRejection\|render-process-gone\|crashed\|unresponsive" {} \;
```

Document to `production_artifacts/crash_hardening_report.md`:
```markdown
# ILoveNotepad — Crash Hardening Audit
Date: [timestamp]

## Missing Crash Handlers
| Handler | Present | Risk if Missing |
|---------|---------|-----------------|
| process.on('uncaughtException') | YES/NO | Main process crash → app dies silently |
| process.on('unhandledRejection') | YES/NO | Async errors crash main process |
| app.on('render-process-gone') | YES/NO | Renderer crash → blank window with no recovery |
| win.webContents.on('crashed') | YES/NO | Same as above, older Electron API |
| win.on('unresponsive') | YES/NO | Frozen UI with no way out for user |
| app.on('child-process-gone') | YES/NO | GPU/utility process crash not caught |

## Error Logging
- Crash log to file: YES/NO
- User-visible error dialog on crash: YES/NO
```

---

## Step 6: Self-Audit the Analysis

Before writing the final report, verify:

```
Must be confirmed (not assumed):
  □ I have the actual size of node_modules from running du
  □ I have the actual list of top 20 heaviest packages
  □ I have read main.js completely (not partially)
  □ I found every occurrence of "Our Notepad" by running grep
  □ I checked both package.json AND any separate electron-builder config file
  □ I confirmed whether ASAR is enabled or disabled
  □ I confirmed whether ready-to-show is implemented
  □ I confirmed whether app.setAppUserModelId() is called
  □ I documented the source icon path and whether icon conversion tools exist

Items I labeled [ASSUMPTION] because I could not confirm:
  [list them]
```

---

## Step 7: Final Analysis Report

Append summary to `production_artifacts/analysis_report.md`:

```markdown
## EXECUTIVE SUMMARY

### Why the App is 259MB
[ordered list with actual sizes from step 2]

### Branding Problems Found
[count] occurrences of wrong name, [count] icon locations not set

### Launch Speed Problems
[list what's blocking fast launch]

### Missing Crash Handlers
[count] missing — [severity]

### Estimated Post-Optimization Size
Conservative: [X MB] | Stretch goal: [X MB]
```

Log:
```
[ANALYSIS COMPLETE] [timestamp]
Bloat sources confirmed: [count]
Branding issues found: [count]
Crash handlers missing: [count]
Report saved. Proceeding to planning.
```
