# Skill: Analyze Size Optimization

## Objective
Analyze the current application directory structure, Electron-builder configurations, and packaged artifacts to identify unnecessary files, language packs, or dev-only scripts that can be stripped from the final build to reduce installer and installed size.

---

## Analysis Checklist

1. **Verify Root Packaging Configurations:**
   - Read `notepad-win/package.json`.
   - Inspect the `build` field for exclusions: `"files"` array, `"asar"` setting, `"compression"`.

2. **Inspect Packaged Output Directory (`dist/win-unpacked`):**
   - List the contents of `dist/win-unpacked`.
   - Analyze files and folders taking up significant space.
   - Focus on the `locales` folder and check the list of `.pak` files.

3. **Determine Necessary Locales:**
   - Define a rule to preserve only English (`en.pak`, `en-US.pak`) or a small subset of primary target locales.
   - Identify how to exclude or delete the remaining 70+ `.pak` files during or after the build process.

4. **Self-Audit the Analysis:**
   - Confirm that deleting locales does not crash the Electron launch (by verifying localized font or translation fallback behavior).
   - Ensure the exclusions rule in `package.json` does not delete essential runtime files like `ffmpeg.dll`, `resources.pak`, or `chrome_100_percent.pak`.

---

## Action Plan
- Run analysis tasks in terminal.
- Document current size baseline (installer and unpacked).
- Detail proposed configuration rules for file exclusions and language pruning.
