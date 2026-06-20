---
description: Harden the styling of the Free Engineering Tools stage by removing chromatic noise, toy-colored inputs, and refining the primary CTA download button.
---

# Workflow: Free Engineering Tools Hardening

## Trigger
User types: `/engineering_tools_hardening`

This workflow runs autonomously to refactor the interactive sandbox components in `OpenSourceAssets.tsx` to match top-1% technology products (zinc backgrounds, clean outline CTAs, desaturated console logs, and subtle metadata displays).

---

## What This Resolves
- **Chromatic Clutter**: Removes competing neon red, green, and blue blocks from the mock panels.
- **Over-Exposed CTA**: Redesigns the heavy cream "Download Production Bundle" button to be a sleek developer-centric outline button.
- **Toy Window Styling**: Replaces colored macOS-style title dots with clean, low-opacity gray dots.

---

## Pre-Flight Setup & Backup
1. **Safe Git Backup**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   git branch "backup_tools_$timestamp"
   ```
2. **Log Initialization**:
   Write details into `build_log.md`.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_engineering_tools.md`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_engineering_tools.md`

### Step 3 — Phase 1: Window & Tab Refactoring
- Modify mock OS dots to be desaturated gray elements in all three simulation canvas subcomponents (`GoneManagerCanvas`, `RecapYtCanvas`, `CloudflarePurgerCanvas`).
- Refactor the red/green slider tab buttons to standard slate toggle buttons.

### Step 4 — Phase 2: Action Buttons & Metrics
- Replace neon blue "Crawl Page" and other interactive run buttons with clean outline configurations (`bg-white/[0.04]` and `border-white/[0.08]`).
- Desaturate log texts and metrics. Conveystatus through layout and layout elements rather than full-text high-contrast colors.

### Step 5 — Phase 3: Download Button Styling
- Refactor the main download button in `OpenSourceAssets.tsx` to be a sleek outline developer button (`bg-white/[0.04]`, `border-white/[0.08]`, transitioning to solid white on hover).

### Step 6 — Compile & Push
- Run `npm run build` to verify zero typecheck errors.
- Commit changes and push to GitHub.

---

## Final Output to User
Upon successful execution, present a summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Free Engineering Tools Hardening — Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Interactive Stage Redesigned to 1% Developer Standard
Files modified:
  - artifacts/website/src/components/OpenSourceAssets.tsx

Checklist:
  ✅ Muted Mock OS window decoration dots to low-opacity gray
  ✅ Redesigned tab selectors into clean slate sliding tabs
  ✅ Converted neon simulator buttons into sleek developer outline actions
  ✅ Desaturated console logs to ensure code readability
  ✅ Upgraded massive cream Download button to outline layout
  ✅ Compiled production website bundle
  ✅ Committed and pushed changes to GitHub main branch

🚀 ACTION REQUIRED: To deploy to your live website, SSH into CyberPanel and run:
cd /var/www/ankitjaiswal.in && bash deploy/cyberpanel-deploy.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
