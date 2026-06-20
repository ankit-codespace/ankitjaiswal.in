---
description: Redesign the main site footer with brand CTAs, a live clock widget, and radial lighting; polish workspace footers, build/verify, and deploy.
---

# Workflow: Footer Redesign & Alignment

## Trigger
User types: `/footer_hardening`

This workflow runs completely autonomously to overhaul the main website footer inside `layout.tsx` to match top-1% portfolio designs (using glowing gradients, a brand CTA, dynamic timezone clock, and tool directory navigation), verifies correct build compilation, and deploys it.

---

## What This Resolves
- **Cheap Static Footer**: Replaces the plain `#0D1117` layout container with a premium dark container featuring a bottom radial glow.
- **No Client Hook**: Adds a major conversion headline directing prospective clients to "Work with Me".
- **Dynamic Live Clock**: Integrates a live-updating clock showing Ankit's local timezone (Punjab, IN), creating a premium, personalized touch.
- **Link Hierarchy**: Interconnects the portfolio layout footer with top-tier utility tools to drive cross-engagement.

---

## Pre-Flight Setup & Backup
1. **Directory Setup**:
   ```powershell
   New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
   ```
2. **Safe Git Backup**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_footer_$timestamp"
   ```
3. **Log Initialization**:
   Write starting details into `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_footer.md`
- Inspects target files: `artifacts/website/src/components/layout.tsx` and `artifacts/website/src/components/tool/ToolFooter.tsx`.
- Create report at `production_artifacts/footer_analysis_report.md`.

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_footer.md`
- Scaffolds `production_artifacts/build_plan.md`.

### Step 3 — Phase 1: Brand Footer Structure & Styles
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Replace the main footer container in `layout.tsx` with a premium glowing grid structure.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.

### Step 4 — Phase 2: Live Clock Widget Implementation
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Add stateful time hook inside the layout footer, running on a 1-second interval.
- Render local clock in `"Asia/Kolkata"` timezone.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.

### Step 5 — Phase 3: Visual Polish & Micro-Animations
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Add clean hover and transition utilities for links and social cards.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.

### Step 6 — Phase 4: Compile & Deploy
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile web assets: `npm run build` under web root.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Push to GitHub:
  ```powershell
  git add .
  git commit -m "design(layout): overhaul footer with premium radial glow, brand CTA, top tools directory, and dynamic timezone clock"
  git push origin main
  ```

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Footer Redesign & Alignment — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Main Footer Overhauled to Top-1% Portfolio Standard
Files modified:
  - artifacts/website/src/components/layout.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Added glowing radial background and brand CTA container
  ✅ Implemented live dynamic timezone clock (IST)
  ✅ Interlinked top core tools directory with portfolio pages
  ✅ Added micro-interaction transitions on link elements
  ✅ Compiled production website bundle
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
