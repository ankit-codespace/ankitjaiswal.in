---
description: Run the full hardening autonomous workflow for ILoveNotepad desktop app
---

# Workflow: ILoveNotepad — Full Hardening

## Trigger

User types: `/ilovenotepad_harden`

The entire pipeline runs from this single command.
No stopping. No user input mid-loop. No asking for permission.
The agent reads, plans, executes, verifies, and delivers a summary.

---

## What This Fixes (Confirmed Problems)

| Problem | Current State | Target |
|---------|--------------|--------|
| App size | 259 MB | Under 60MB (stretch: <40MB) |
| App name | "Our Notepad" | "ILoveNotepad" everywhere |
| Taskbar icon | Electron blue atom | Custom ILoveNotepad icon |
| ALT+TAB icon | Electron atom | Custom icon |
| Installer name | Wrong | "ILoveNotepad" |
| White screen on launch | Present | Fixed |
| Crash handlers | Missing | All present |

---

## Pre-Flight

```bash
# Create output structure
mkdir -p production_artifacts/phase_audits

# Initialize the build log
cat > production_artifacts/build_log.md << 'EOF'
# ILoveNotepad Hardening — Build Log
Workflow: /ilovenotepad_harden
Started: [timestamp]
Agent: Electron Production Hardening Engineer

Known problems entering this session:
- App size: 259MB (target: <60MB)
- App name: "Our Notepad" (must be: ILoveNotepad)
- Taskbar icon: Electron atom (must be: custom icon)
- White screen on launch
- Crash handlers likely missing

## Log Entries
[WORKFLOW STARTED] [timestamp]
EOF
```

---

## Execution Sequence

### Phase 0: Pre-Flight Check

Before running analysis, do a 60-second orientation:

```bash
# Confirm we're in the right project directory
ls package.json && echo "✅ In project root" || echo "❌ NOT in project root — navigate first"

# Quick check: is this an Electron project?
cat package.json | grep -i "electron" | head -5

# Quick check: what's the current app name?
cat package.json | grep '"name"\|"productName"'

# Quick check: is there a build output to measure?
du -sh dist/ 2>/dev/null || du -sh out/ 2>/dev/null || echo "No build output found — will build fresh"

# Confirm the source icon is accessible
ls "C:/Users/LENOVO-PC/Downloads/ilovenotepad_store_assets_backup/ilovenotepad_logo_premium.png" 2>/dev/null \
  && echo "✅ Source icon found" \
  || echo "⚠️  Source icon not auto-found — will search for it during Phase 2"
```

Log pre-flight results. If critical issue found (not an Electron project at all): stop and report.
Otherwise: proceed.

---

### Phase 1: Analysis

Execute skill: `.agents/skills/analyze_electron_hardening.md`

Run ALL steps in order:
- Step 1: Map project
- Step 2: Size forensics (get actual numbers)
- Step 3: Branding forensics (find every "Our Notepad")
- Step 4: Launch speed forensics
- Step 5: Crash resistance audit
- Step 6: Build/distribution audit
- Step 7: Self-audit
- Step 8: Write final report

Log: `[ANALYSIS COMPLETE] [timestamp]`
Confirm: `production_artifacts/analysis_report.md` exists and has content.

---

### Phase 2: Planning

Execute skill: `.agents/skills/plan_electron_hardening.md`

Read the analysis first. Build the plan from actual findings.
Adapt the sub-steps if the analysis revealed something unexpected.

Example adaptations:
- If ASAR was already enabled → skip the "enable ASAR" step, log it as already done
- If ready-to-show was already implemented → skip it, log it
- If "Our Notepad" appeared in 12 files → add sub-steps for each file
- If electron is already in devDependencies → skip that step

The plan must reflect reality, not the template.

Save to `production_artifacts/build_plan.md`
Log: `[PLAN SAVED] [timestamp] — [N] sub-steps across 5 phases`

---

### Phase 3: Execute — App Name Fix

Execute Phase 1 from the plan using `.agents/skills/execute_phase.md`

Priority files to fix (confirmed from analysis):
- `package.json` → name, productName, build.productName, build.appId
- `main.js` → app.setName(), app.setAppUserModelId(), window title
- Any other file found by grep with "Our Notepad" text

Do NOT move on until:
```bash
grep -r "Our Notepad" . --include="*.js" --include="*.json" --include="*.html" | wc -l
# Must output: 0
```

Log: `[PHASE 1 COMPLETE] [timestamp]`
Write: `production_artifacts/phase_audits/phase1_audit.md`

---

### Phase 4: Execute — Custom Icon

Execute Phase 2 from the plan.

Priority: Generate a REAL multi-resolution .ico file. Not a renamed PNG.
Verify with: `file build/icons/icon.ico` — must say "MS Windows icon resource"

Do NOT call this phase done if the .ico is actually a PNG in disguise.

Log: `[PHASE 2 COMPLETE] [timestamp]`
Write: `production_artifacts/phase_audits/phase2_audit.md`

---

### Phase 5: Execute — Shrink to Under 60MB

Execute Phase 3 from the plan.

This is the highest-impact phase. Work methodically:
1. Fix dependencies first (move build tools to devDependencies)
2. Then fix electron-builder exclusions
3. Then fix ASAR and compression
4. Then fix renderer source maps
5. Then do a build and measure

Each change gets measured:
```
Before: X MB
After: Y MB  
Delta: -Z MB
```

The agent uses its own judgment on BONUS optimizations:
- If it spots a 50MB library being bundled for a feature that could use a 2KB alternative → flag it
- If it spots the renderer including all of moment.js when only one function is used → flag it
- If it spots font files that are 20MB each → flag them

Log: `[PHASE 3 COMPLETE] [timestamp] — Size reduced from 259MB to [X MB]`
Write: `production_artifacts/phase_audits/phase3_audit.md`

---

### Phase 6: Execute — Instant Launch + Crash-Proof

Execute Phase 4 from the plan.

For the ready-to-show fix — find the exact background color of the app:
```bash
# Look in the renderer CSS for the background color
grep -r "background\|background-color\|bg-" src/ --include="*.css" --include="*.scss" | grep "#" | head -5
```
Use the actual color in backgroundColor on BrowserWindow. Don't guess #ffffff for a dark app.

Log: `[PHASE 4 COMPLETE] [timestamp]`
Write: `production_artifacts/phase_audits/phase4_audit.md`

---

### Phase 7: Execute — Build and Install Verification

Execute Phase 5 from the plan.

This phase does not complete until:
1. The build runs without errors
2. The installer is created and measured
3. The new installer is actually installed
4. All 7 verification items in Phase 5.6 are checked

If build fails: fix it. No marking done on a failed build.
If install fails: fix it. No moving on.

Log: `[PHASE 5 COMPLETE] [timestamp]`
Write: `production_artifacts/phase_audits/phase5_audit.md`

---

## Final Summary to User

After all phases complete, deliver:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ILoveNotepad — Hardening Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT WAS FIXED:

🏷️  App Name
    Before: "Our Notepad"
    After:  "ILoveNotepad" — fixed in [N] locations

🎯 Icon
    Before: Electron blue atom
    After:  Custom ILoveNotepad icon
    Set in: taskbar, ALT+TAB, title bar, installer, Apps list
    ICO format: ✅ Real multi-resolution ICO ([N] sizes embedded)

📦 App Size
    Before: 259 MB
    After:  [X] MB
    Saved:  [Y] MB ([Z]% reduction)
    
    What reduced it:
    • Moved [N] packages to devDependencies → saved ~[X]MB
    • Added [N] electron-builder exclusions → saved ~[X]MB
    • Enabled ASAR + maximum compression → saved ~[X]MB
    • Disabled source maps in production → saved ~[X]MB
    [list actual savings]

⚡ Launch Speed
    White screen: FIXED (ready-to-show + backgroundColor)
    Background color used: [#hexcode]
    Blocking startup operations removed: [N]

🛡️  Crash Hardening
    Handlers added: [N]
    • uncaughtException → logs to userData/crash.log
    • unhandledRejection → logs to userData/crash.log
    • render-process-gone → auto-reloads renderer
    • unresponsive → user dialog with Wait/Reload/Close

🔧 Bonus Fixes Applied:
    [list each one with one-line description]

⚠️  Deferred Items (not breaking, but worth reviewing):
    [list or "None — all clear"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MICROSOFT STORE READINESS:
[READY / NOT YET — reason]

Next step: Test the installed app manually, then submit to Store.
Build logs: production_artifacts/build_log.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Loop Safety Rules

The agent adapts, never halts:

- **File not found?** Search the project, adapt the path, log the change.
- **Build error?** Fix root cause, don't bypass with --force.
- **Icon conversion fails?** Install png-to-ico, retry.
- **Grep finds unexpected occurrences?** Add them to the plan, fix them.
- **Size target not reached in first pass?** Run a second pass of Phase 3 focusing on the remaining heavy packages.
- **App functionality broken after change?** Revert THAT specific change only, log it, skip it, continue with others.

The loop runs until the summary is delivered.
The user sits back. The agent does the work.
