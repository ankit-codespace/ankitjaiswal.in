# Portfolio Links and Asset Refinement Build Plan

This phased plan outlines the remediation path for repairing broken assets and upgrading the UI elements in the portfolio's "Open Source Assets" section.

## Phase 1: Local Asset Integration
- [ ] **1.1:** Copy the latest validated `cloudflare-cache.zip` package from the shared source location:
  `E:\IMPs\Blog\Plugins\Automation Plugin\PLUGINS (WITH UPDATES)\cloudflare-cache.zip`
  to the website's public assets folder:
  `artifacts/website/public/cloudflare-cache.zip`
- [ ] **1.2:** Copy the latest validated `410-gone-manager.zip` package from the shared source location:
  `E:\IMPs\Blog\Plugins\Automation Plugin\PLUGINS (WITH UPDATES)\410-gone-manager.zip`
  to the website's public assets folder:
  `artifacts/website/public/410-gone-manager.zip`
- [ ] **1.3:** Verify both files are correctly placed in the `public/` directory and possess non-zero file sizes.

## Phase 2: Link Alignment & Route Correction
- [ ] **2.1:** Modify `artifacts/website/src/components/OpenSourceAssets.tsx`:
  - Update `downloadLink` for the **Cloudflare Edge Purger** card to `/cloudflare-cache.zip`.
  - Update `downloadLink` for the **410 Gone Manager** card to `/410-gone-manager.zip`.
  - On the **RecapYT Summarizer** card:
    - Remove the broken `downloadLink: "#"` placeholder.
    - Set the primary button text to "Visit Website" and route it to `https://recapyt.in/` in a new tab.
    - Set the secondary button text to "Try Demo" and route it internally to `/tools/youtube-summary`.
- [ ] **2.2:** Modify `artifacts/website/src/pages/tools/index.tsx`:
  - Update the Cloudflare Edge Purger flagship card `href` to point directly to `/cloudflare-cache.zip` with a download anchor attribute to trigger a package download.
  - Update the 410 Gone Manager flagship card `href` to point directly to `/410-gone-manager.zip` with a download anchor attribute to trigger a package download.
- [ ] **2.3:** **Self-Audit:** Run a regex search across the website codebase to verify that all occurrences of the placeholder Github links (`https://github.com/your-github/...`) and RecapYT alert triggers are removed.

## Phase 3: Premium Drawer UI/UX Refinement
- [ ] **3.1:** Redesign the slide-out drawer panel inside `OpenSourceAssets.tsx` to elevate its aesthetic value:
  - Replace the flat `#0A0E17` background with a modern, glossy glassmorphism sidebar:
    `background: "rgba(10, 14, 23, 0.72)"`, `backdropFilter: "blur(24px)"`, `borderLeft: "1px solid rgba(255, 255, 255, 0.08)"`.
  - Integrate a dynamic background radial glow matching the theme color of the active tool:
    - Cloudflare Edge Purger: Amber-orange glow (`rgba(244, 129, 32, 0.08)`)
    - 410 Gone Manager: Cool blue glow (`rgba(37, 99, 235, 0.08)`)
  - Modernize list items (tech stack details & key capabilities) to replace basic gray bullet markers with glowing, color-matching custom SVG icons.
  - Ensure the "Download Free" CTA button within the drawer panel points to the correct local zip path (`/cloudflare-cache.zip` or `/410-gone-manager.zip`), styling it with high-contrast text, polished hover animations, and subtle drop shadows.
  - Set the RecapYT CTA to skip the drawer altogether, redirecting the user immediately to `/tools/youtube-summary`.

## Phase 4: Compilation & Link Audit
- [ ] **4.1:** Execute a production validation build in the `artifacts/website/` folder to check for compile-time syntax errors or warnings:
  ```powershell
  cd artifacts/website
  npm run build
  ```
- [ ] **4.2:** Manually test links and download responses to guarantee that clicking download actions serves the actual `.zip` plugins rather than broken paths.
