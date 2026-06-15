# Skill: Plan Microsoft Store AppX Packaging

## Purpose

Read the analysis report. Build a precise, phased execution plan.
Save it to `production_artifacts/build_plan.md`.
This plan is what the execution loop follows — it must be specific enough that each sub-step has exactly one action to perform.

---

## Input

Read `production_artifacts/analysis_report.md` before writing the plan.
The plan is built from actual findings, not assumptions.

---

## Plan Structure

Each phase has:
- A clear goal
- Numbered sub-steps (1.1, 1.2, 1.3...)
- A self-audit step at the end
- A log checkpoint

---

## Phase 1: Generate AppX Visual Assets

```
Goal: Create required AppX visual assets from the source logo.

Sub-steps:
1.1  Create the build/appx directory inside the notepad-win project.
1.2  Verify the presence of the source image store-assets/ilovenotepad_logo_premium.png.
1.3  Create an asset generation script (e.g. using Jimp or Sharp if installed, or an automated powershell/node script) to resize the logo.
1.4  Generate the following required logo files:
     - notepad-win/build/appx/StoreLogo.png (50x50)
     - notepad-win/build/appx/Square150x150Logo.png (150x150)
     - notepad-win/build/appx/Square44x44Logo.png (44x44)
     - notepad-win/build/appx/Wide310x150Logo.png (310x150)
1.5  Self-Audit: Verify that each generated file exists and has the correct dimensions.
```

---

## Phase 2: Configure AppX in electron-builder

```
Goal: Set up package.json for a correct and compliant AppX store package.

Sub-steps:
2.1  Read notepad-win/package.json completely.
2.2  Ensure target list under build.win includes "appx" (you can remove "nsis" or keep it, but focus on appx).
2.3  Examine build.appx config block:
     - identityName: Ensure it matches the reserved name in Partner Center (e.g. "com.ankitjaiswal.notepad" or similar).
     - publisherDisplayName: "Ankit Jaiswal".
     - publisher: Set to the CN value from the Partner Center (e.g. "CN=PLEASE_REPLACE_WITH_YOUR_PUBLISHER_ID_FROM_PARTNER_CENTER").
2.4  Self-Audit: Re-read package.json and verify that no syntax errors were introduced and the configurations match standard electron-builder specs.
```

---

## Phase 3: Build and Package the App

```
Goal: Run the build script to generate the .appx package.

Sub-steps:
3.1  Navigate to the notepad-win directory.
3.2  Install dependencies if any are missing.
3.3  Run the build command: npm run build (or electron-builder --win appx).
3.4  Monitor the build log for any errors.
3.5  Self-Audit: Verify that the build completed successfully.
```

---

## Phase 4: Verify Output and Create Submission Checklist

```
Goal: Verify build artifacts and compile the manual submission checklist.

Sub-steps:
4.1  Locate the generated .appx file in notepad-win/dist/ or similar directory.
4.2  Check the file size and verify it is a valid .appx archive.
4.3  Generate production_artifacts/msstore_ready_checklist.md with:
     - Verification of built artifacts (.appx file details, size, and paths).
     - Manual steps for the developer to upload the package to Partner Center.
     - Explanation of how Microsoft will sign it automatically.
     - How to retrieve the Publisher CN from Partner Center to replace the placeholder if not already done.
4.4  Self-Audit: Check all links and instructions in the checklist for correctness.
4.5  Log final execution complete to build_log.md.
```

---

## Save the Plan

Write the complete plan to `production_artifacts/build_plan.md`

Log to `production_artifacts/build_log.md`:
```
[PLAN COMPLETE] — [timestamp]
4 phases defined.
Proceeding to execution.
```
