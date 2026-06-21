# Skill: Plan Desktop File Association Integration

This skill establishes a phased implementation plan for registering file associations, adding the right-click context menu in the Windows installer setup, and implementing binary/file-size safety checks.

## Implementation Phases

### Phase 1: Pre-Flight Setup & Backups
- **Step 1.1:** Initialize the build log (`build_log.md`).
- **Step 1.2:** Create a Git safety backup branch `backup_file_associations_[timestamp]`.
- **Step 1.3:** Initialize the build plan artifact at `production_artifacts/build_plan.md`.

### Phase 2: Builder File Association Configuration
- **Step 2.1:** Open `notepad-win/package.json`.
- **Step 2.2:** Update the `"build.fileAssociations"` array to register target document types:
  - `.txt` (Text Document)
  - `.md` (Markdown Document)
  - `.html` (HTML Document)
  - `.htm` (HTML Document)
  - `.json` (JSON Document)

### Phase 3: Main Process Sizing and Binary Content Filtering
- **Step 3.1:** Open `notepad-win/src/main/main.js`.
- **Step 3.2:** Modify the `openFileInWindow(filePath)` function:
  - Use `fs.statSync` to check file size. If size is > 1.5MB (1,572,864 bytes), show a native `dialog.showErrorBox` and return early.
  - Read first 1024 bytes of the file. Loop through buffer bytes. If any byte is `0`, block and show an error box for binary files.
  - Read file as UTF-8 string only if checks pass.
- **Step 3.3:** Modify the `native-open-file` IPC handler:
  - Add the identical size and binary content checks before reading and returning file data to the renderer.

### Phase 4: LocalStorage Sanitization & Recovery
- **Step 4.1:** Open `notepad-win/src/renderer/src/App.tsx` and `artifacts/website/src/pages/tools/notepad.tsx`.
- **Step 4.2:** Declare the helper function `sanitizeDocContent(doc: NotepadDoc): NotepadDoc`:
  - Check if `doc.content` starts with `%PDF`, contains null bytes (`\x00` / `\u0000`), or length is > 1,572,864 characters.
  - If matched, return a copy of the document with an error string replacement: `[Error: Unsupported Format]`, clear the contents, set `isUnsaved = true`, and append `(Unsupported Format)` to the title.
- **Step 4.3:** Inside the `loadDocs()` function, map the loaded localStorage documents array through `sanitizeDocContent`.
- **Step 4.4:** If any document is modified during mapping, write the updated sanitized array back to localStorage immediately.

### Phase 5: NSIS Right-Click Context Menu Scripting
- **Step 5.1:** Create a new folder (if not present) at `notepad-win/build/`.
- **Step 5.2:** Create the NSIS custom installer script `notepad-win/build/installer.nsh`.
- **Step 5.3:** Inject the `customInstall` macro to register `Edit with I Love Notepad` context command keys under `HKCU\Software\Classes\*\shell`.
- **Step 5.4:** Inject the `customUninstall` macro to clean up these registry keys on app removal.

### Phase 6: Verification & Compiler Checks
- **Step 6.1:** Run a test compilation of the renderer inside `notepad-win` using `npm run build:renderer`.
- **Step 6.2:** Compile the final installer using `npm run build` inside `notepad-win`.
- **Step 6.3:** Verify that the NSIS setup executable `.exe` is generated successfully under `notepad-win/dist/`.
- **Step 6.4:** Commit all changes to the repository and push to GitHub.
