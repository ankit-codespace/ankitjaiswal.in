# Build Plan: Desktop File Association Hardening

## Phase 1: Builder Configuration
Add file formats (`.txt`, `.md`, `.html`, `.htm`, `.json`) under `"build.fileAssociations"` inside `notepad-win/package.json`.

## Phase 2: NSIS Context Menu Scripting
Create `notepad-win/build/installer.nsh` with custom `customInstall` and `customUninstall` macros to write/delete the `"Edit with I Love Notepad"` registry key under `HKCU\Software\Classes\*\shell`.

## Phase 3: Packaging & Verification
Run renderer and electron build scripts inside `notepad-win` to compile and output installers.
Verify the output exe and appx.
