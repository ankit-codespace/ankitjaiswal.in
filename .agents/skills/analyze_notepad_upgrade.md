# Skill: Analyze Notepad Upgrade

## Purpose

Deep-read both versions of the Notepad project before touching a single file. Produce a full picture of what exists, what differs, and what is safe to port. Save all findings to `production_artifacts/analysis/`.

---

## Step 1 — Locate Both Versions

1.1 List all files and folders in the project root. Identify:
   - The website version folder (likely `web/`, `site/`, `notepad-web/`, or similar)
   - The Windows app version folder (likely `windows/`, `desktop/`, `electron/`, `app/`, or similar)
   - Any shared folders (common utilities, shared styles, shared JS)

1.2 Log the full directory trees of both versions to:
   `production_artifacts/analysis/web_file_tree.md`
   `production_artifacts/analysis/windows_file_tree.md`

**Self-audit 1:** Confirm you have found both versions. If the folder names are ambiguous, read `package.json`, `manifest.json`, or README files to determine which is which before proceeding.

---

## Step 2 — Deep-Read the Windows App Version

2.1 Read every source file in the Windows app version. For each file, note:
   - What features it implements
   - Any feature that is clearly desktop-only (OS file dialogs, system tray, window chrome, Electron IPC calls)
   - Any feature that could work in a browser (UI logic, formatting, tab management, context menus)

2.2 Specifically document:
   - The right-click context menu implementation: what options exist, how they are triggered
   - The File menu: what options exist
   - Checkbox implementation: what it looks like and how it behaves
   - Notebook lines CSS/canvas rendering
   - Image right-click behavior
   - Keyboard shortcut bindings: list every shortcut with its handler
   - Any other UI improvements not in the user's list

2.3 Save findings to `production_artifacts/analysis/windows_app_analysis.md`

**Self-audit 2:** Re-read your own analysis. Did you miss any files? Did you mark anything as "desktop-only" that could actually work in a browser? Correct before moving on.

---

## Step 3 — Deep-Read the Website Version

3.1 Read every source file in the website version. For each file, note:
   - What features it currently has
   - Known limitations or missing features
   - Current keyboard shortcut bindings
   - Current right-click menu options
   - Current File menu options
   - Current checkbox implementation
   - Current notebook lines rendering

3.2 Save findings to `production_artifacts/analysis/web_version_analysis.md`

**Self-audit 3:** Re-read your analysis. Is it accurate? Did you capture the current state correctly? This is your baseline — it must be precise.

---

## Step 4 — Produce the Diff Report

4.1 Compare Windows app analysis vs Web version analysis.

For each difference found, classify it as:
   - `PORT` — Safe to bring into web. Works in browser. No desktop dependency.
   - `ADAPT` — Valuable feature but needs modification to work in browser (e.g., different API, different event model).
   - `SKIP` — Desktop-only. Would break in browser or relies on OS/Electron APIs.
   - `INVESTIGATE` — Unclear. Needs a closer look before deciding.

4.2 Apply these rules to shortcuts:
   - Highlight: both `Ctrl+H` and `Ctrl+Shift+H` must work → PORT with dual-binding
   - Find: `Ctrl+F` must open app's find dialog → ADAPT (intercept carefully, do not clash with browser Find)
   - All other Windows app shortcuts that clash with Chrome built-ins → SKIP
   - Shortcuts that are neutral (no browser conflict) → PORT

4.3 Format the diff report as a table:

| Feature | Windows App Behavior | Web Current Behavior | Classification | Notes |
|---------|---------------------|---------------------|----------------|-------|
| Right-click tab menu | ... | ... | PORT/ADAPT/SKIP | ... |
| File menu options | ... | ... | ... | ... |
| Checkbox style | ... | ... | ... | ... |
| Notebook lines | ... | ... | ... | ... |
| Image right-click | ... | ... | ... | ... |
| Ctrl+H (highlight) | ... | ... | PORT | Dual-bind Ctrl+H + Ctrl+Shift+H |
| Ctrl+F (find) | ... | ... | ADAPT | Intercept browser Find safely |
| ... | ... | ... | ... | ... |

4.4 Save to `production_artifacts/diff_report.md`

**Self-audit 4:** Review the diff report. Is every item classified? Are any SKIP items being snuck into PORT? Is the shortcut logic consistent with the rules? Fix anything wrong before declaring analysis complete.

---

## Step 5 — Analysis Summary

5.1 Write a plain-English summary:
   - Total differences found
   - Count of PORT / ADAPT / SKIP / INVESTIGATE items
   - Highest-risk items and why
   - Recommended execution order (low-risk CSS/visual changes first, behavioral changes last)

5.2 Save to `production_artifacts/analysis/analysis_summary.md`

5.3 Log to `build_log.md`:
```
[ANALYZE COMPLETE] <timestamp>
- Web file tree documented
- Windows app analyzed: X files read
- Web version analyzed: X files read
- Diff report produced: X PORT, X ADAPT, X SKIP, X INVESTIGATE items
- Ready for planning phase
```

**Final self-audit:** Is the analysis complete enough to write a confident plan? If anything is INVESTIGATE, resolve it now before moving to planning.
