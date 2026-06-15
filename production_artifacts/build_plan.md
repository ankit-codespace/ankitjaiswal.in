# ILoveNotepad Microsoft Store AppX Packaging — Build Plan
Generated: 2026-06-15T17:07:00+05:30

This build plan is derived from the pre-work analysis and is executed step-by-step.

---

## Phase 1: Generate AppX Visual Assets
Goal: Create required AppX visual assets under `notepad-win/build/appx/` from the source image.

### Sub-steps:
* **1.1** Create the directory `notepad-win/build/appx`.
* **1.2** Verify that `store-assets/ilovenotepad_logo_premium.png` exists.
* **1.3** Write and execute a PowerShell script `scratch/resize_logos.ps1` that uses .NET `System.Drawing` to load the source logo and resize it to:
  - `StoreLogo.png` (50x50)
  - `Square150x150Logo.png` (150x150)
  - `Square44x44Logo.png` (44x44)
  - `Wide310x150Logo.png` (310x150)
* **1.4** Verify the sizes and existence of the generated images.
* **1.5** Write the Phase 1 audit report to `production_artifacts/phase_audits/phase1_audit.md`.

---

## Phase 2: Configure AppX in electron-builder
Goal: Update the build configuration in `notepad-win/package.json` to configure the AppX packaging parameters.

### Sub-steps:
* **2.1** Open `notepad-win/package.json` and inspect the existing `"build"` block.
* **2.2** Update the `"win"` configuration to target `"appx"` (optionally keeping `"nsis"` if needed for traditional builds).
* **2.3** Verify and ensure the `"appx"` block matches the Partner Center details:
  - `"identityName": "com.ankitjaiswal.notepad"`
  - `"publisherDisplayName": "Ankit Jaiswal"`
  - Keep `"publisher"` as the variable/placeholder `CN=PLEASE_REPLACE_WITH_YOUR_PUBLISHER_ID_FROM_PARTNER_CENTER` so the developer can replace it easily, or check if we can configure it cleanly.
* **2.4** Write the Phase 2 audit report to `production_artifacts/phase_audits/phase2_audit.md`.

---

## Phase 3: Build and Package the App
Goal: Trigger the compiler and electron-builder to generate the AppX package.

### Sub-steps:
* **3.1** Verify if the node modules are installed in `notepad-win`.
* **3.2** Run `npm run build` in the `notepad-win` directory to build the renderer and package the app.
* **3.3** Verify if the build completes successfully and check for any packaging warnings.
* **3.4** Write the Phase 3 audit report to `production_artifacts/phase_audits/phase3_audit.md`.

---

## Phase 4: Verify Output and Create Submission Checklist
Goal: Double-check the generated packaging and write instructions for submission.

### Sub-steps:
* **4.1** Locate the output `.appx` file inside the `notepad-win/dist/` directory.
* **4.2** Record the size of the generated package.
* **4.3** Create `production_artifacts/msstore_ready_checklist.md` with:
  - Package metadata (filename, path, size).
  - Detailed instructions on how the user can retrieve their exact Publisher CN from the Partner Center dashboard.
  - Step-by-step instructions to upload the `.appx` package to Partner Center for automated free signing.
* **4.4** Write the Phase 4 audit report to `production_artifacts/phase_audits/phase4_audit.md`.
* **4.5** Write the final completion entry in `production_artifacts/build_log.md`.
