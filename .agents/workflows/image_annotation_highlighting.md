---
description: Resolve the plain generic text annotation visibility issue, implement yellow highlighter and solid-colored background boxes, and build/deploy.
---

# Workflow: Image Annotation Highlighting & Upgrades

## Trigger
User types: `/image_annotation_highlighting`

This workflow runs completely autonomously to implement yellow highlight backgrounds and solid color fills for text annotations in the browser-based clipboard tool, performs safety backups, and deploys changes to the live site.

---

## What This Resolves
- **Poor Text Contrast**: Text written directly over images is often unreadable. This adds text shadow support for plain text and background fills for highlights.
- **Yellow Highlights**: Adds a one-click yellow highlight box behind text annotations, matching the Tiptap highlight style.
- **Solid Box Styles**: Adds solid fills matching the active draw color with auto-contrasting text.
- **Live Preview & Export Parity**: Ensures the editor text input overlay, the canvas editor view, and the exported download/copy file look identical.

---

## Pre-Flight Setup & Backup
1. **Directory Setup**:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Git Backup**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_image_annotation_$timestamp"
   ```
3. **Log Initialization**:
   Write starting details into `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_image_annotation.md`
- Inspects target file: `artifacts/website/src/pages/tools/paste-to-image.tsx`.
- Create report at `production_artifacts/image_annotation_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_image_annotation.md`
- Scaffolds `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: State & Helper Implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Scaffolds types, state toggles, and helper functions (`isLightHex` & `drawRoundedRect`).
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.

### Step 4 — Phase 2: Toolbar & Live Editing Overlay
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Render the text style buttons inside the text tool options bar.
- Update the live editing `textOverlayRef` styling.
- Modify `commitTextAnnotation()` to persist `textStyle`.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.

### Step 5 — Phase 3: Canvas Rendering & Export Compile
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Update `redrawCanvas` to draw background rounded rectangles for `highlight` and `solid` text annotations. Add a text shadow to plain text.
- Update `buildExportCanvas` to mirror the layout rendering on export.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.

### Step 6 — Phase 4: Compile & Deploy
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile web assets: `npm run build` under web root.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Push to GitHub:
  ```powershell
  git add .
  git commit -m "feat(paste-to-image): implement yellow text highlights and solid backgrounds for text annotations"
  git push origin main
  ```

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Image Annotation Highlighting — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Text Background Styles & Highlighter Implemented
Files modified:
  - artifacts/website/src/pages/tools/paste-to-image.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added state toggles and rounded rect helper functions
  ✅ Implemented Text Style selector (Plain, Yellow Highlight, Solid Box) in the toolbar
  ✅ Synced styling of contentEditable live input overlays to match backgrounds
  ✅ Updated canvas drawing loops to draw rounded bounding boxes behind text
  ✅ Compiled production website bundle
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
