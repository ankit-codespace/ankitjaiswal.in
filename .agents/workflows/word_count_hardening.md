---
description: Resolve the 0 words header count mismatch and add selected-text word count stats to both Web and Desktop platforms.
---

# Workflow: Word Count Hardening & Selection Stats

## Trigger
User types: `/word_count_hardening`

This workflow runs completely autonomously to replace the buggy `CharacterCount` extension storage calculations with an absolute, robust selection-aware regex word counter across both desktop and web versions.

---

## What This Resolves
- **Initial Load Mismatch**: Resolves the bug where notes contain text but show `0 words` in the top right.
- **Selection Stats**: Automatically updates the word count status to show `${selected} of ${total} words selected` in real-time when the user highlights text.
- **Web Feature Parity**: Adds the complete word count header status (fully theme-aware) to the website portfolio tool, ensuring it matches the Electron desktop app.
- **Auto-compilations & Packaging**: Bundles the code, validates build logs, builds MS Store AppX/NSIS installers, and pushes to remote.

---

## Pre-Flight Setup & Backup
1. **Directory Setup**:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Git Backup**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_word_count_$timestamp"
   ```
3. **Log Initialization**:
   Write starting details into `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_word_count.md`
- Inspects target files: `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- Create report at `production_artifacts/word_count_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_word_count.md`
- Scaffolds `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Desktop Implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- In `App.tsx`, calculate total and selected words using custom regex methods.
- Update header to render the dual status.
- Write `production_artifacts/phase_audits/phase1_audit.md`.

### Step 4 — Phase 2: Web Implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Add `onSelectionUpdate` and `editorUpdateTrigger` in `notepad.tsx`.
- Write the exact stats calculator and update the header.
- Write `production_artifacts/phase_audits/phase2_audit.md`.

### Step 5 — Phase 3: Build & Deployment
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile desktop renderer: `npm run build:renderer` under `notepad-win/src/renderer/`.
- Compile website bundle: `npm run build` under website root.
- Re-generate installers: `npm run build` under `notepad-win/` root.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Push to GitHub:
  ```powershell
  git add .
  git commit -m "feat(notepad): resolve 0 words count bug and add selection word count stats"
  git push origin main
  ```

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Word Count Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Word Counts Fixed, Selection Stats Added & Pushed to GitHub
Files modified:
  - notepad-win/src/renderer/src/App.tsx
  - artifacts/website/src/pages/tools/notepad.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Fixed startup "0 words" mismatch via custom robust regex counter
  ✅ Implemented live selection word count ("X of Y words selected")
  ✅ Brought web portfolio notepad to complete feature parity
  ✅ Compiled local setup installers (NSIS setup .exe and AppX)
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
