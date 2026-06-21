# Desktop File Association and Shell Integration Audit Report

## 1. Findings
- **Startup Launch Parsing**: Startup argument parsing in `main.js` correctly reads double-clicked files on startup and passes them to the renderer. Single instance locks correctly redirect files to the already-running main window.
- **File Associations**: Currently, the Electron package configuration (`package.json`) lacks a `"fileAssociations"` field, meaning Windows does not map any document types to the application automatically.
- **Explorer Right-Click Context Menu**: We need to add an "Edit with I Love Notepad" command to the Windows right-click context menu. Doing this at the User level (`HKCU\Software\Classes\*\shell`) is safe, does not require Administrator rights, and will not trigger UAC elevation prompts during installation.
- **File Sizing & Binary Content Safety**: Opening non-text files (e.g. PDFs, EXEs) or large documents (> 1.5MB) causes Tiptap parser freezes and application crash loops. Early blocking in Main Process (size check + null-byte test) and localStorage sanitization (during `loadDocs`) are needed to ensure runtime stability and recover from boot hangs.

## 2. Recommendations
- Add `.txt`, `.md`, `.html`, `.htm`, and `.json` file formats to `"build.fileAssociations"` in `package.json`.
- Implement main process size check (> 1.5MB) and binary check (null byte in first 1024 bytes) in `main.js` for both `openFileInWindow` and the `native-open-file` handler. Show standard error dialogs using `dialog.showErrorBox`.
- Implement `sanitizeDocContent` in renderer application states (`App.tsx` and `notepad.tsx` in website pages) to handle loaded localStorage documents exceeding length/content constraints and prevent black-screen crash loops.
- Create `installer.nsh` in `notepad-win/build/` to register the explorer context menu using NSIS custom install/uninstall macros.
