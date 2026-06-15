# Skill: Plan ILoveNotepad Hardening — Build the Phased Plan

## Purpose

Read the analysis report. Build a precise, numbered execution plan.
Every sub-step must be specific enough that it has exactly one thing to do.
Save to `production_artifacts/build_plan.md`.

The plan is built FROM real analysis findings — not from assumptions.
If the analysis says ASAR is already enabled, Phase 3 skips enabling it.
If the analysis says ready-to-show is already implemented, Phase 4 skips it.
The plan adapts to what was actually found.

---

## Before Writing the Plan

```
Read these files completely:
  production_artifacts/analysis_report.md
  production_artifacts/size_report_before.md
  production_artifacts/branding_audit.md
  production_artifacts/crash_hardening_report.md

Only then start writing the plan.
```

---

## Phase 1: Fix App Name and All Branding Text

```
Goal: Zero occurrences of "Our Notepad" anywhere in the app.
      The app name is "ILoveNotepad" — everywhere, no exceptions.

Why it matters: "Our Notepad" shows in Windows Apps list, taskbar tooltip,
installer title, Programs and Features, title bar, About dialog.
Every one of these is a user-facing embarrassment for a Store submission.

Sub-steps built from branding_audit.md findings:

1.1  Read package.json completely (even if read during analysis — read again before writing)
1.2  Fix "name" field if it's wrong → "ilovenotepad"
1.3  Fix "productName" at root level → "ILoveNotepad"
1.4  Fix "description" if it's a default Electron description
1.5  Fix "build.productName" → "ILoveNotepad"
1.6  Fix "build.appId" → "in.ankitjaiswal.ilovenotepad" (or confirm if already correct)
1.7  Fix "build.win.artifactName" if it exists → "${productName}-Setup-${version}.exe"
1.8  Read main.js completely
1.9  Add or fix app.setName("ILoveNotepad") — must be called before app.whenReady()
1.10 Add or fix app.setAppUserModelId("in.ankitjaiswal.ilovenotepad")
     ← This is CRITICAL for Windows taskbar grouping and icon association
1.11 Fix window title property in BrowserWindow config → "ILoveNotepad"
1.12 If default Electron menu exists and has "About Electron" → replace with custom About
     OR remove app menu entirely: Menu.setApplicationMenu(null)
1.13 Search for any remaining "Our Notepad" strings with grep — fix every one found
1.14 Search for "Electron" in window titles, menu items, dialog text — fix visible ones
1.15 Re-read every file touched in this phase
1.16 Self-audit: run the grep search again — confirm zero "Our Notepad" occurrences remain
1.17 Log Phase 1 complete
1.18 Write production_artifacts/phase_audits/phase1_audit.md
```

---

## Phase 2: Fix the Icon — Taskbar, Window, Installer, Tray

```
Goal: The correct ILoveNotepad icon appears on the taskbar, in ALT+TAB,
      on the title bar, in the installer, and in Windows Apps list.
      The Electron blue atom never appears again.

The source icon:
  C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png

Why the taskbar shows the wrong icon:
  - BrowserWindow "icon" property not set or pointing to wrong file
  - electron-builder "win.icon" not set or pointing to default
  - app.setAppUserModelId() not called (Windows can't associate icon with app ID)
  - The .ico file is a renamed PNG, not a real multi-resolution ICO (Windows ignores it)

Sub-steps:

2.1  Create the icons folder: mkdir -p build/icons/
2.2  Copy source PNG to project:
     cp [source icon path] build/icons/ilovenotepad_logo_premium.png
2.3  Generate the multi-resolution .ico file (THIS IS CRITICAL — a renamed .png does not work):
     
     Method A — if sharp is available:
     ```javascript
     // scripts/generate-ico.js
     const sharp = require('sharp');
     // Generate each size, then combine with png-to-ico
     const sizes = [16, 32, 48, 64, 128, 256];
     // ... generate each size as PNG, then use png-to-ico to combine
     ```
     
     Method B — if png-to-ico is available (install if not):
     npm install --save-dev png-to-ico
     node -e "
       const pngToIco = require('png-to-ico');
       pngToIco(['build/icons/ilovenotepad_logo_premium.png'])
         .then(buf => require('fs').writeFileSync('build/icons/icon.ico', buf))
     "
     
     Method C — if ImageMagick is available:
     convert build/icons/ilovenotepad_logo_premium.png \
       -define icon:auto-resize=256,128,64,48,32,16 \
       build/icons/icon.ico
     
     Use whichever tool is confirmed available from the analysis.
     If none available: npm install --save-dev png-to-ico (it's tiny, 2KB)

2.4  Verify the .ico was created correctly:
     ls -lh build/icons/icon.ico  ← should be >10KB (proper multi-res ICO is never tiny)
     file build/icons/icon.ico    ← should say "MS Windows icon resource"

2.5  Read main.js — find BrowserWindow creation
2.6  Add icon to BrowserWindow:
     ```javascript
     const { BrowserWindow, nativeImage } = require('electron')
     const path = require('path')
     
     const iconPath = path.join(__dirname, 'build/icons/icon.ico')
     const appIcon = nativeImage.createFromPath(iconPath)
     
     const win = new BrowserWindow({
       icon: appIcon,  // or just: icon: iconPath
       // ... rest of config
     })
     ```
2.7  Verify app.setAppUserModelId is called with the correct appId (from Phase 1.10)
     ← Without this, Windows taskbar will NOT respect the custom icon on grouped windows

2.8  Update electron-builder config — set icon correctly:
     In package.json "build" section:
     ```json
     {
       "build": {
         "icon": "build/icons/ilovenotepad_logo_premium.png",
         "win": {
           "icon": "build/icons/icon.ico"
         },
         "nsis": {
           "installerIcon": "build/icons/icon.ico",
           "uninstallerIcon": "build/icons/icon.ico",
           "installerHeaderIcon": "build/icons/icon.ico"
         }
       }
     }
     ```
     Note: electron-builder can accept PNG for the root "icon" — it generates ICO itself.
     The "win.icon" explicitly needs the .ico for the exe resource icon.

2.9  If tray icon exists in the app:
     Read tray setup code → update icon path to build/icons/ilovenotepad_logo_premium.png
     Also set tray.setToolTip("ILoveNotepad")

2.10 [BONUS] Create a 32x32 tray-specific PNG optimized for small sizes if source is 512px+
     Taskbar notification area icons need to look good at 16px and 32px

2.11 Re-read main.js and electron-builder config — verify icon paths are correct and exist
2.12 Self-audit: does the icon file actually exist at the path specified? Check with ls.
2.13 Log Phase 2 complete
2.14 Write production_artifacts/phase_audits/phase2_audit.md
```

---

## Phase 3: Shrink the App — 259MB → Target Under 60MB

```
Goal: Maximum size reduction without losing any features.
      Target: under 60MB. Stretch goal: under 40MB.
      The Windows Notepad is 4.83MB. We can't match that (Electron has overhead),
      but 259MB is embarrassing and fixable.

Every change gets a BEFORE and AFTER size measurement.

Sub-steps:

3.1  Take a fresh size measurement and save to size_report_before.md (if not done in analysis)
     du -sh dist/ 2>/dev/null && du -sh node_modules/

3.2  Read package.json "dependencies" section completely
3.3  Identify every package that is a build tool, not a runtime dep:
     Common offenders: webpack, babel, eslint, jest, typescript, electron-builder,
     @types/*, ts-node, ts-jest, prettier, husky, lint-staged
3.4  Move ALL build tools from "dependencies" to "devDependencies"
     (This alone can save 40-80MB because electron-builder prunes devDeps before packing)

3.5  Confirm "electron" itself is in "devDependencies" NOT "dependencies"
     If it's in dependencies: move it immediately.
     Electron in dependencies = it gets bundled INSIDE the app = massive duplication.

3.6  Read the electron-builder config "files" array
3.7  Add comprehensive exclusions (add ONLY what's not already there):
     ```json
     "files": [
       "**/*",
       "!node_modules/**/*.map",
       "!node_modules/**/*.ts",
       "!node_modules/**/*.d.ts",
       "!node_modules/**/test/**",
       "!node_modules/**/tests/**",
       "!node_modules/**/__tests__/**",
       "!node_modules/**/docs/**",
       "!node_modules/**/doc/**",
       "!node_modules/**/example/**",
       "!node_modules/**/examples/**",
       "!node_modules/**/*.md",
       "!node_modules/**/*.markdown",
       "!node_modules/**/*.txt",
       "!node_modules/**/.eslintrc*",
       "!node_modules/**/.prettierrc*",
       "!node_modules/**/Makefile",
       "!node_modules/**/Gruntfile*",
       "!node_modules/**/CHANGELOG*",
       "!node_modules/**/HISTORY*",
       "!node_modules/**/AUTHORS*",
       "!node_modules/**/CONTRIBUTORS*",
       "!node_modules/**/LICENSE*",
       "!node_modules/**/LICENCE*",
       "!**/*.log",
       "!**/.git/**",
       "!**/node_modules/.cache/**"
     ]
     ```
     NOTE: Keep "LICENSE" files if legally required for open source packages.
     The above excludes them by default — add back specific ones if legally needed.

3.8  Enable ASAR packaging (if not enabled):
     In electron-builder config: "asar": true
     ASAR packages all app files into a single archive — reduces file overhead significantly.

3.9  Set maximum compression:
     In electron-builder config: "compression": "maximum"
     This uses 7-zip LZMA2 compression — takes longer to build but produces smallest output.

3.10 Check if the renderer has source maps being bundled in production:
     If using webpack: check webpack.config.js for "devtool" setting
       → Should be: devtool: false (for production) or devtool: 'hidden-source-map'
       → NOT: 'source-map' or 'eval-source-map' (these embed huge source map data)
     If using Vite: check vite.config.js "build.sourcemap"
       → Should be: false (for production)
     Fix it if wrong.

3.11 Check if renderer is built in production mode:
     webpack: mode: 'production' → enables tree shaking and minification
     Vite: automatically in production mode when running vite build
     If not in production mode: fix it. This alone can reduce renderer bundle by 60-70%.

3.12 Add electron-builder "npmRebuild": false if it's safe to do so
     (Prevents rebuilding native modules — safe if no native modules are used)

3.13 Add "removePackageScripts": true to electron-builder if available in the version used
     (Removes npm scripts from packaged node_modules — small win but free)

3.14 Audit large assets in the project (from analysis findings):
     → Any image over 200KB that's a UI asset: convert to WebP or compress
     → Any font file: check if it's actually used; if subsetting is possible, subset it
     → Any video or animation: evaluate if it can be removed or reduced

3.15 [BONUS] Check if any large package in dependencies has a lighter alternative:
     Common swaps: moment.js → day.js (70KB → 2KB), lodash → lodash-es with tree shaking
     Do NOT swap if it risks breaking features. Document the finding and skip if risky.

3.16 [BONUS] If the app uses a heavy PDF or office library that's not core to a notepad —
     flag it. User may not realize it's adding massive size.

3.17 Run a build to see the new size:
     npm run build 2>/dev/null || npm run dist 2>/dev/null || electron-builder build 2>/dev/null

3.18 Measure the new size:
     du -sh dist/ 2>/dev/null && echo "Previous: 259MB"

3.19 Document to production_artifacts/size_report_after.md:
     Before: 259MB
     After: [X MB]
     Reduction: [Y MB] ([Z%])
     Changes that contributed most: [ranked list]

3.20 Self-audit: did we remove anything that could break app functionality?
     List every package that was moved to devDependencies — are any actually needed at runtime?
3.21 Log Phase 3 complete
3.22 Write production_artifacts/phase_audits/phase3_audit.md
```

---

## Phase 4: Instant Launch + Crash-Proof

```
Goal: App opens instantly (no white screen flash).
      App never hard-crashes (graceful recovery on all failure modes).
      
The white screen issue:
  When show: true (default) + slow content load → white window appears before content
  Fix: show: false → load content → on 'ready-to-show' → win.show()
  Combined with backgroundColor matching app background → zero flash

Sub-steps:

4.1  Read main.js completely (one more time — before any write)
4.2  Find BrowserWindow instantiation
4.3  Implement the correct show pattern:
     ```javascript
     const win = new BrowserWindow({
       show: false,                    // CRITICAL: don't show until painted
       backgroundColor: '#1a1a1a',    // match your app's dark background color
                                      // (prevents white flash even before ready-to-show)
       // ... rest of existing options unchanged
     })

     win.once('ready-to-show', () => {
       win.show()
       win.focus()
     })
     ```
     ← If backgroundColor is wrong, set it to the actual app background color.
     ← Look at the app screenshot (dark theme) — use a dark hex color.

4.4  Check if autoUpdater.checkForUpdates() is called before window is shown:
     If yes: move it to AFTER win.show() to not delay launch

4.5  Check if there are any synchronous file reads (fs.readFileSync) on startup:
     Find them: grep -n "readFileSync\|readSync\|execSync" main.js
     If found in startup path: convert to async (fs.promises.readFile)

4.6  Check if there are heavy operations before window creation:
     If yes: defer them to after win.show()

4.7  Add all missing crash handlers (from crash_hardening_report.md):

     ```javascript
     // === CRASH HARDENING — add near top of main.js ===

     // Catch main process uncaught exceptions
     process.on('uncaughtException', (error) => {
       console.error('[ILoveNotepad] Uncaught exception:', error)
       // Log to file for debugging
       const logPath = path.join(app.getPath('userData'), 'crash.log')
       fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] CRASH: ${error.stack}\n`)
       // Don't crash the app — show a dialog instead
       if (app.isReady()) {
         dialog.showErrorBox('ILoveNotepad Error', 
           'Something went wrong, but ILoveNotepad is still running.\n' +
           'If this keeps happening, please restart the app.')
       }
     })

     // Catch unhandled promise rejections
     process.on('unhandledRejection', (reason, promise) => {
       console.error('[ILoveNotepad] Unhandled rejection:', reason)
       const logPath = path.join(app.getPath('userData'), 'crash.log')
       fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] REJECTION: ${reason}\n`)
     })

     // Handle renderer crash — auto-restart it
     app.on('render-process-gone', (event, webContents, details) => {
       console.error('[ILoveNotepad] Renderer process gone:', details.reason)
       if (details.reason !== 'clean-exit') {
         // Reload the renderer instead of leaving user with a blank window
         setTimeout(() => {
           if (!win.isDestroyed()) {
             win.reload()
           }
         }, 1000)
       }
     })

     // Handle unresponsive window — offer to restart
     win.on('unresponsive', () => {
       const choice = dialog.showMessageBoxSync(win, {
         type: 'question',
         buttons: ['Wait', 'Reload', 'Close'],
         title: 'ILoveNotepad is not responding',
         message: 'ILoveNotepad has stopped responding. What would you like to do?'
       })
       if (choice === 1) win.reload()
       if (choice === 2) win.close()
     })
     ```

4.8  Verify dialog and fs are imported at the top of main.js:
     const { app, BrowserWindow, dialog } = require('electron')
     const fs = require('fs')
     const path = require('path')
     Add any that are missing.

4.9  [BONUS] Disable devTools in production to remove inspector overhead:
     ```javascript
     if (!isDev) {
       win.webContents.on('devtools-opened', () => {
         win.webContents.closeDevTools()
       })
     }
     ```
     Or in BrowserWindow: webPreferences: { devTools: isDev }

4.10 [BONUS] Add a simple isDev check if not already present:
     const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

4.11 [BONUS] If autoUpdater is present and throws errors silently — add error handler:
     autoUpdater.on('error', (err) => { console.error('AutoUpdater error:', err) })

4.12 Re-read main.js completely — verify every change landed correctly
4.13 Self-audit: are all required imports present? Did we introduce any syntax errors?
4.14 Log Phase 4 complete
4.15 Write production_artifacts/phase_audits/phase4_audit.md
```

---

## Phase 5: Build, Install, and Verify

```
Goal: Actually build the app and confirm every fix works.
      Install it. Open it. Check taskbar. Check name. Check size.
      This is not done until it's visually confirmed.

Sub-steps:

5.1  Run a clean build:
     npm run build 2>/dev/null || npm run dist 2>/dev/null || \
     npx electron-builder --win 2>/dev/null
     Capture the full build output — any errors must be fixed before continuing.

5.2  If build fails: read the error, fix the root cause, retry.
     Do not skip this step. A failed build means nothing is shipped.

5.3  Measure the new installer/output size:
     ls -lh dist/*.exe 2>/dev/null || ls -lh out/*.exe 2>/dev/null
     Document in size_report_after.md

5.4  Uninstall the current "Our Notepad" installation:
     Option A (terminal): 
     powershell "Get-WmiObject Win32_Product | Where-Object { $_.Name -like '*Notepad*' } | ForEach-Object { $_.Uninstall() }"
     Option B: Run the uninstaller from Programs and Features

5.5  Install the new build:
     Start-Process "dist\ILoveNotepad-Setup-1.0.0.exe" -Wait 2>/dev/null || \
     Start the installer exe from the dist folder

5.6  Verify after install (check each item, log result):
     □ App opens without white screen flash
     □ Taskbar shows ILoveNotepad icon (not Electron atom)
     □ ALT+TAB thumbnail shows ILoveNotepad icon
     □ Window title bar shows "ILoveNotepad" or correct title
     □ Windows Apps list shows "ILoveNotepad" not "Our Notepad"
     □ App size in Windows Apps list is under 60MB
     □ All notepad features still work (basic smoke test: type, format, save)

5.7  Compare against the live installer URL for reference:
     The user can download https://ankitjaiswal.in/ilovenotepad-setup-1.0.0.exe
     to compare old vs new side by side if needed.

5.8  Write final size comparison:
     production_artifacts/size_report_after.md

5.9  [BONUS] Test crash recovery:
     Open devtools console (if enabled in dev mode), run: process.crash()
     Verify the unresponsive handler fires and offers reload option.

5.10 Write the complete shipping checklist to production_artifacts/build_plan.md (append):
     
     ## SHIPPING CHECKLIST
     [ ] App name: "ILoveNotepad" everywhere ✅/❌
     [ ] Taskbar icon: custom icon ✅/❌
     [ ] ALT+TAB icon: custom icon ✅/❌
     [ ] Window title: correct ✅/❌
     [ ] App size: [X MB] (target: <60MB) ✅/❌
     [ ] White screen on launch: fixed ✅/❌
     [ ] Crash handlers: all present ✅/❌
     [ ] Dev tools disabled in production ✅/❌
     [ ] All features working: ✅/❌
     Ready for Microsoft Store: YES/NOT YET — [reason if not]

5.11 Log ALL PHASES COMPLETE
5.12 Write production_artifacts/phase_audits/phase5_audit.md
```

---

## Save the Plan

Write the complete plan to `production_artifacts/build_plan.md`

Log:
```
[PLAN COMPLETE] [timestamp]
5 phases planned. Total sub-steps: [count]
Proceeding to execution loop.
```
