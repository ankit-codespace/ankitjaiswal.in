# Skill: Phased Build Planning for Portfolio Links & Drawer Refinement

## Goal
Generate a structured, phased implementation plan saved to `production_artifacts/build_plan.md` that guarantees a premium, bug-free delivery of all portfolio assets and link modifications.

## Planning Guidelines
The generated `production_artifacts/build_plan.md` must adhere to this exact sequence and numbering scheme:

### Phase 1: Asset Preparation & Integration
- **Step 1.1:** Copy the latest `cloudflare-cache.zip` from `E:\IMPs\Blog\Plugins\Automation Plugin\PLUGINS (WITH UPDATES)\cloudflare-cache.zip` to the website public assets directory at `artifacts/website/public/cloudflare-cache.zip`.
- **Step 1.2:** Copy the latest `410-gone-manager.zip` from `E:\IMPs\Blog\Plugins\Automation Plugin\PLUGINS (WITH UPDATES)\410-gone-manager.zip` to the website public assets directory at `artifacts/website/public/410-gone-manager.zip`.
- **Step 1.3:** Verify the presence and checksum/file-size matches of both zip files in the target public directory.
- **Step 1.4:** **Self-Audit:** Ensure both plugin packages are located in `artifacts/website/public/` and are readable.

### Phase 2: Code Modification & Routing Correction
- **Step 2.1:** Edit `artifacts/website/src/components/OpenSourceAssets.tsx`:
  - Replace the broken `downloadLink: "#"` for RecapYT Summarizer.
  - Replace the "Download" button on the RecapYT card with "Visit Website" linking directly to `https://recapyt.in/`.
  - Replace the "Learn More" button on the RecapYT card with "Try Demo" linking to the internal portfolio showcase route `/tools/youtube-summary`.
  - Update `downloadLink` for Cloudflare Edge Purger to point to `/cloudflare-cache.zip`.
  - Update `downloadLink` for 410 Gone Manager to point to `/410-gone-manager.zip`.
- **Step 2.2:** Edit `artifacts/website/src/pages/tools/index.tsx`:
  - Update the Cloudflare Edge Purger flagship card `href` to point directly to `/cloudflare-cache.zip` (with download behavior).
  - Update the 410 Gone Manager flagship card `href` to point directly to `/410-gone-manager.zip` (with download behavior).
- **Step 2.3:** **Self-Audit:** Verify all edits compiled correctly. Ensure no references to `your-github` or `#` placeholders remain in these files.

### Phase 3: Premium Drawer UX Redesign
- **Step 3.1:** Redesign the slide-out drawer in `OpenSourceAssets.tsx` to align with the website's premium aesthetic:
  - Apply glassmorphism styling: `background: "rgba(10, 14, 23, 0.7)"`, `backdropFilter: "blur(20px)"`, `borderLeft: "1px solid rgba(255, 255, 255, 0.08)"`.
  - Introduce an ambient radial glow backdrop matching the tool's theme color (Amber for Cloudflare, Blue for 410).
  - Refine bullet list items and spacing. Replace basic list indicators with clean custom SVG icons.
  - Ensure the drawer's "Download Free" button dynamically resolves to the correct `/cloudflare-cache.zip` or `/410-gone-manager.zip` file, and has a sleek hover animation.
  - Verify that clicking RecapYT's secondary button bypasses this drawer and redirects directly to the `/tools/youtube-summary` page.
- **Step 3.2:** **Self-Audit:** Confirm drawer layout styling looks premium, is responsive, and functions seamlessly.

### Phase 4: Verification & Production Audit
- **Step 4.1:** Run a complete Vite production build in `artifacts/website/` to ensure no linting, packaging, or compilation regressions.
- **Step 4.2:** Perform a final link-checking audit to verify that all asset downloads trigger correct browser download events and all web links route properly.
- **Step 4.3:** **Self-Audit:** Verify the final state matches all user-specified goals.
