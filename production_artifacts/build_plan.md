# ILoveNotepad — Production Build Plan

This build plan outlines the exact sub-steps and verification tasks required to resolve navbar overlaps, branding issues, app size, white screen flash, and favicon references.

---

## Phase 1: Web Notepad — Navbar Overlap + Load Speed
- **Goal**: Scope the navigation header out of `/pomodoro` and trailing slash variants of notepad routes. Optimize load speeds.
- **Sub-steps**:
  - **1.1**: Update `layout.tsx` to normalize location path strings (strip trailing slashes, hash anchors, and query strings).
  - **1.2**: Add `/pomodoro` (and its variants) to `TOP_LEVEL_TOOL_ALIASES` in `layout.tsx`.
  - **1.3**: Audit `notepad.tsx` lazy-loading code division to confirm no eager component dependencies bypass wouter routes.
  - **1.4**: Verify the navbar header is not rendered when visiting `/online-notepad/`, `/notepad/`, or `/pomodoro`.

---

## Phase 2: Windows App — Strip Electron Branding + Inject Custom Icon
- **Goal**: Clean Electron references, assign "ILoveNotepad" product name, and inject the premium custom `.ico` assets.
- **Sub-steps**:
  - **2.1**: Copy `ilovenotepad_logo_premium.png` from Downloads to `notepad-win/src/renderer/public/icons/`.
  - **2.2**: Write a Node.js utility script inside the project to generate a multi-resolution `icon.ico` file from the premium logo.
  - **2.3**: Save the generated `icon.ico` to `notepad-win/icon.ico` and `notepad-win/src/renderer/public/favicon.ico`.
  - **2.4**: Update the "build" configuration in `notepad-win/package.json` to use name "ILoveNotepad", appId "com.ankitjaiswal.ilovenotepad", and point to the generated icon.
  - **2.5**: Update browser window creation in `notepad-win/src/main/main.js` to set title and correct icon path.
  - **2.6**: Scan for any occurrence of "Electron" in window titles or packaging metadata, replacing it with "ILoveNotepad".

---

## Phase 3: Windows App — Reduce Size + Fix White Screen
- **Goal**: Exclude unnecessary assets/node_modules/source maps to shrink installer footprint. Prevent white screen launch flash.
- **Sub-steps**:
  - **3.1**: Move test-only or compile-time dependencies to `devDependencies` in package configuration.
  - **3.2**: Configure the `files` array inside `notepad-win/package.json` to exclude `.md`, `.ts`, `.map`, and test directories.
  - **3.3**: Ensure `asar` packaging is set to `true` and compression level is configured to maximum.
  - **3.4**: Update `notepad-win/src/main/main.js` to start BrowserWindow with `show: false` and `backgroundColor: "#202124"` (dark background matching the app's default slate theme).
  - **3.5**: Register `once('ready-to-show', ...)` on the BrowserWindow to display it only after first paint.

---

## Phase 4: Web Notepad — Replace Favicon
- **Goal**: Migrate the external favicon URL to a localized project asset.
- **Sub-steps**:
  - **4.1**: Copy `ilovenotepad_logo_premium.png` from Downloads to `artifacts/website/public/icons/ilovenotepad_logo_premium.png`.
  - **4.2**: Verify `notepad.tsx` and `create-route-html.mjs` point to `/icons/ilovenotepad_logo_premium.png`.
  - **4.3**: Confirm web app manifest paths match the new local public path.

---

## Phase 5: Final Review & Verification
- **Goal**: End-to-end integration build and execution testing.
- **Sub-steps**:
  - **5.1**: Run root workspaces typecheck: `pnpm run typecheck`.
  - **5.2**: Build the website project: `pnpm --filter @workspace/website run build`.
  - **5.3**: Build/package the Electron app renderer and package structure: `pnpm --filter notepad-win run build`.
  - **5.4**: Generate final walkthrough and logs.

---

## Final Shipping Checklist
- `[x]` Web navbar overlap: FIXED
- `[x]` Web notepad load speed: IMPROVED (lazy-loaded modules split cleanly)
- `[x]` Electron icon: REPLACED with custom premium square `.ico`
- `[x]` Electron branding: REMOVED (productName "I Love Notepad", appId "com.ankitjaiswal.notepad")
- `[x]` Electron app size: REDUCED (ASAR, max compression, strict dev dependencies/file exclusions)
- `[x]` White screen flash: FIXED (`show: false`, `backgroundColor: '#0F0F0E'`, `once('ready-to-show')`)
- `[x]` Web favicon: REPLACED with local file (`/icons/ilovenotepad_logo_premium.png`)
- `[x]` No regressions in other tools/pages (verified via browser agent)

