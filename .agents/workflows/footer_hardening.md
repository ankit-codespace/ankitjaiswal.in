---
description: Redesign the main site footer with brand CTAs, a live clock widget, and radial lighting; polish workspace footers, build/verify, and deploy.
---

# Workflow: Footer Redesign & Alignment

## Trigger
User types: `/footer_hardening`

This workflow runs completely autonomously to overhaul the main website footer inside `layout.tsx` to match top-1% technology products (clean layout, solid dark surface, static timezone indicators, and direct tool directory columns), verifies correct build compilation, and deploys it.

---

## What This Resolves
- **Legibility Failure**: Removes any blinding white/purple gradient backdrops that wash out footer text, ensuring absolute WCAG legibility compliance.
- **Desperation CTAs**: Removes loud "Work with Me" cards and dynamic status badges to present an understated, premium, creator-first image.
- **Performance Drain**: Removes any ticking background clock intervals/seconds counters to allow browser threads to idle, preventing CPU cycles and battery waste.
- **Sitemap Organization**: Standardizes a 4-column layout linking core developer portfolio pages and high-value tools.

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

### Step 3 — Phase 1: Brand Footer Structure & Colors
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Replace the main footer container in `layout.tsx` with a premium, understated `#0B0C10` surface and simple border.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.

### Step 4 — Phase 2: Static Timezone Metadata
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Eliminate ticking intervals or clocks.
- Add static locale string: `Punjab, IN (GMT+5:30)`.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.

### Step 5 — Phase 3: Link Styling & Hover Transitions
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Apply `#8F9092` to footer link text with smooth transition curves (`transition: color 150ms ease`).
- Apply `#F9FAFB` hover highlights.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.

### Step 6 — Phase 4: Compile & Deploy
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Compile web assets: `npm run build` under web root.
- Update `build_log.md` status to `SUCCESS`.
- Update changelog files under `_changelog/`.
- Push to GitHub:
  ```powershell
  git add .
  git commit -m "design(layout): redesign footer to be understated, high-contrast, and high-performance"
  git push origin main
  ```

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Footer Redesign & Alignment — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Footer Redesigned to Understated, High-Performance Standard
Files modified:
  - artifacts/website/src/components/layout.tsx

Checklist:
  ✅ Created pre-flight backup branch for safety
  ✅ Set background to pure dark surface with thin border
  ✅ Removed washing gradients to restore perfect text contrast
  ✅ Removed ticking seconds clock to optimize CPU performance
  ✅ Added static location & timezone metadata
  ✅ Configured clean sitemap directory columns
  ✅ Compiled production website bundle
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
