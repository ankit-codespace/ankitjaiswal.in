---
description: Resolve the plain generic text annotation visibility issue, implement yellow highlighter and solid-colored background boxes, and build/deploy.
---

# Workflow: Image Annotation Layout & Alignment Hardening

## Trigger
User types: `/image_annotation_highlighting`

This workflow runs autonomously to resolve the toolbar layout shift (CLS), remove text shadows, implement contrast-aware text formatting, resolve text coordinate shifts, and correct the text highlight padding alignment on the canvas in `paste-to-image.tsx`.

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

### Step 3 — Phase 1: Text Coordinate-Shifting Bug Fix
- Edit `handleMouseDown` to check if `activeTextPos` is open. If it is, call `commitTextAnnotation()` and return early.

### Step 4 — Phase 2: Text Settings Dropdown (Popover) implementation
- Remove the inline text options from the horizontal toolbar flow to keep it completely static.
- Implement a floating absolute-positioned settings popover card under the "T" button inside the tools mapping. Include the size stepper and segmented style buttons. Add a click-outside handler to close the popover.

### Step 5 — Phase 3: Contrast-Aware Text & Shadow Removal
- Remove drop shadows from plain text rendering.
- Sample the canvas pixel color under the text coordinate. If the background brightness is too close to the text color, automatically invert/toggle it between black and white to maintain high contrast. Apply this to both HTML text overlays and Canvas outputs.

### Step 6 — Phase 4: Canvas Display and Export Text Centering
- Modify the display canvas text drawing loop to shift text downward by `halfLeading = (lineHeight - displayFontSize) / 2`.
- Modify the download export canvas text drawing loop to shift text downward by `halfLeading = (lineHeight - fs) / 2`.

### Step 7 — Phase 5: Dev Verification & Packaging
- Run `npm run build` in the workspace root to check for type safety and compilation success.
- Commit all changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Image Annotation Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Toolbar CLS Fixed, Text Shifting Solved, Contrast Auto-Adapted, and Padding Centered
Files modified:
  - artifacts/website/src/pages/tools/paste-to-image.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Fixed text-shifting bug by early-committing text on canvas clicks
  ✅ Moved text options into a premium popover card under the 'T' button (0px CLS)
  ✅ Removed plain text shadows and added dynamic background color contrast-checking
  ✅ Applied half-leading vertical offset to canvas display and export text drawing
  ✅ Compiled web client bundle successfully
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
