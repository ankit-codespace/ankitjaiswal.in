---
description: Run the portfolio homepage link fixes and premium drawer redesign workflow
---

# Workflow: Portfolio Links and Asset Refinement

## Trigger
User types: `/portfolio_links_fix`

This workflow runs completely autonomously from trigger to final summary.
No user input required. No permission requests. No stopping mid-loop.

---

## What This Resolves
This workflow repairs and refines the open-source engineering assets segment on the portfolio website:
- Copies the latest versions of WordPress plugin assets (`cloudflare-cache.zip` and `410-gone-manager.zip`) from local shared directories into public assets.
- Removes dead placeholders (`#`) and mock GitHub URLs (`https://github.com/your-github/...`).
- Links RecapYT card buttons directly to their official landing page and the portfolio interactive showcase route.
- Redesigns the "Learn More" drawer into an exceptionally premium dark-mode glassmorphism drawer featuring micro-animations, custom SVG indicators, and glowing backdrops.

---

## Pre-Flight Setup
Create the audit directories and clean/initialize `production_artifacts/build_log.md`:

```powershell
New-Item -ItemType Directory -Force -Path production_artifacts/phase_audits/
```

Initialize `production_artifacts/build_log.md`:
```markdown
# Portfolio Links Refinement — Build Log
Triggered: [timestamp]
Status: RUNNING

Known issues to address:
- Broken and placeholder download links for all three tools on the homepage
- Simple/basic slide-out drawer that lacks premium branding
- Copying and integrating the latest plugin packages to the public folder

## Log Entries
[WORKFLOW STARTED] [timestamp]
```

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_portfolio_links_fix.md`
- Inspect `OpenSourceAssets.tsx` and `index.tsx` for placeholder links.
- Write findings to `production_artifacts/ux_analysis_report.md`.
- Log: `[ANALYSIS COMPLETE] [timestamp]`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_portfolio_links_fix.md`
- Create a phased asset deployment and UI code alteration plan.
- Save the plan to `production_artifacts/build_plan.md`.
- Log: `[PLAN COMPLETE] [timestamp]`

### Step 3 — Phase 1: Asset Integration
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 1 sub-steps in `build_plan.md` to transfer the latest plugin zip files.
- Wrote `production_artifacts/phase_audits/phase1_audit.md`.
- Log: `[PHASE 1 COMPLETE] [timestamp]`

### Step 4 — Phase 2: Link Alignments & Routing
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 2 sub-steps in `build_plan.md` to patch buttons and direct routes.
- Wrote `production_artifacts/phase_audits/phase2_audit.md`.
- Log: `[PHASE 2 COMPLETE] [timestamp]`

### Step 5 — Phase 3: Premium Drawer UX Redesign
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 3 sub-steps in `build_plan.md` to implement glassmorphism, glowing theme colors, custom SVG lists, and dynamic actions in the slide-out drawer.
- Wrote `production_artifacts/phase_audits/phase3_audit.md`.
- Log: `[PHASE 3 COMPLETE] [timestamp]`

### Step 6 — Phase 4: Build Verification
Follow the execute loop from `.agents/skills/execute_phase.md`.
- Run all Phase 4 sub-steps in `build_plan.md`.
- Compile the portfolio website using the Vite production build (`npm run build` or equivalent in `artifacts/website/`).
- Wrote `production_artifacts/phase_audits/phase4_audit.md`.
- Update `build_log.md` status to `SUCCESS`.
- Log: `[PHASE 4 COMPLETE] [timestamp]`
- Log: `[WORKFLOW COMPLETE] [timestamp]`

---

## Final Output to User
Upon successful execution, present a clean summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Links & Assets Refinement — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Portfolio Homepage Assets Restored & Refined
Files modified:
  - artifacts/website/src/components/OpenSourceAssets.tsx (Buttons, Drawer redesign)
  - artifacts/website/src/pages/tools/index.tsx (Flagship links)
Files added:
  - artifacts/website/public/cloudflare-cache.zip (Latest WordPress plugin)
  - artifacts/website/public/410-gone-manager.zip (Latest WordPress plugin)

Checklist:
  ✅ Copied and integrated the latest plugin packages to the public folder
  ✅ Replaced placeholder download links with real, functional links
  ✅ Configured RecapYT to direct to recapyt.in and the interactive demo page
  ✅ Upgraded basic drawer UX to a premium glassmorphism visual experience
  ✅ Verified clean Vite production build compilations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
