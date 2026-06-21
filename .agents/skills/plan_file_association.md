# Skill: Plan Desktop File Association Integration

This skill establishes a phased implementation plan for registering file associations and adding the right-click context menu in the Windows installer setup.

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

### Phase 3: NSIS Right-Click Context Menu Scripting
- **Step 3.1:** Create a new folder (if not present) at `notepad-win/build/`.
- **Step 3.2:** Create the NSIS custom installer script `notepad-win/build/installer.nsh`.
- **Step 3.3:** Inject the `customInstall` macro to register `Edit with I Love Notepad` context command keys under `HKCU\Software\Classes\*\shell`.
- **Step 3.4:** Inject the `customUninstall` macro to clean up these registry keys on app removal.

### Phase 4: Verification & Compiler Checks
- **Step 4.1:** Run a test compilation of the renderer inside `notepad-win` using `npm run build:renderer`.
- **Step 4.2:** Compile the final installer using `npm run build` inside `notepad-win`.
- **Step 4.3:** Verify that the NSIS setup executable `.exe` is generated successfully under `notepad-win/dist/`.
- **Step 4.4:** Commit all changes to the repository and push to GitHub.
