---
description: Resolve the plain generic text annotation visibility issue, implement yellow highlighter and solid-colored background boxes, and build/deploy.
---

# Workflow: Image Annotation Layout & Alignment Hardening

## Trigger
User types: `/image_annotation_highlighting`

This workflow runs autonomously to resolve the toolbar layout shift (CLS) and correct the text highlight padding alignment on the canvas in `paste-to-image.tsx`.

---

## Pre-Flight Setup & Backup
1. Initialize/clean `build_log.md` and directories:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Backup Protocol**:
   Create a safety backup branch:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_annotation_fixes_$timestamp"
   ```
   Log backup details to `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_image_annotation.md`
- Audits the toolbar markup structure and the canvas text drawing coordinates in `paste-to-image.tsx`.
- Creates a status overview and writes it to `production_artifacts/image_annotation_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_image_annotation.md`
- Creates a detailed step-by-step implementation plan.
- Saves it to `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Toolbar Layout CLS Stabilization
- Wrap the conditional text / stroke width tool selector block in a fixed-width container:
  `className="w-[270px] flex items-center justify-center shrink-0"`
- Make the sub-elements stretch centered inside it to prevent horizontal shifting when switching tools.

### Step 4 — Phase 2: Canvas Display Text Centering
- Modify the display canvas text drawing loop to shift text downward by `halfLeading = (lineHeight - displayFontSize) / 2` to distribute font leading symmetrically.

### Step 5 — Phase 3: Canvas Download Export Text Centering
- Modify the download export canvas text drawing loop to shift text downward by `halfLeading = (lineHeight - fs) / 2`.

### Step 6 — Phase 4: Dev Verification & Packaging
- Run `npm run build` in the workspace root to check for type safety and compilation success.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Image Annotation Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Toolbar Layout Stabilized and Text Highlight Padding Symmetrically Centered
Files modified:
  - artifacts/website/src/pages/tools/paste-to-image.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Wrapped toolbar tool options in a fixed-width 270px container to eliminate CLS
  ✅ Applied half-leading vertical offset to canvas display text drawing
  ✅ Applied half-leading vertical offset to canvas export text drawing
  ✅ Compiled web client bundle successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
