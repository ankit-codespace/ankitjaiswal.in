# Desktop File Association and Shell Integration Audit Report

## 1. Findings
- **Startup Launch Parsing**: Startup argument parsing in `main.js` correctly reads double-clicked files on startup and passes them to the renderer. Single instance locks correctly redirect files to the already-running main window.
- **File Associations**: Currently, the Electron package configuration (`package.json`) lacks a `"fileAssociations"` field, meaning Windows does not map any document types to the application automatically.
- **Explorer Right-Click Context Menu**: We need to add an "Edit with I Love Notepad" command to the Windows right-click context menu. Doing this at the User level (`HKCU\Software\Classes\*\shell`) is safe, does not require Administrator rights, and will not trigger UAC elevation prompts during installation.

## 2. Recommendation
- Add `.txt`, `.md`, `.html`, `.htm`, and `.json` file formats to `"build.fileAssociations"` in `package.json`.
- Create `installer.nsh` in `notepad-win/build/` to register the explorer context menu using NSIS custom install/uninstall macros.
