# Skill: Analyze Microsoft Store AppX Configuration

## Purpose

Perform a comprehensive audit of the Electron application package configuration, build scripts, and visual assets before starting the AppX migration.
This ensures we have everything needed to build a valid `.appx` package that Microsoft Partner Center will accept and sign automatically.

---

## Step 1: Map the Project and Build Structure

```
1. Verify the location of the Electron app.
2. Read the project's package.json.
3. Verify which package manager is used (npm/yarn/pnpm/pnpm-workspace) and check available scripts.
4. Locate the build directory, if any.
```

Document in `production_artifacts/analysis_report.md`:
```
## Project and Build Structure
- Electron project location: [path]
- Build configuration format: [package.json build field / external file]
- Package manager used: [npm/yarn/pnpm]
- Build/Package scripts: [list scripts]
```

---

## Step 2: Audit Existing electron-builder Configuration

```
1. Read the "build" block in notepad-win/package.json completely.
2. Inspect the "win" configurations and "target" list.
3. Inspect the "appx" configurations.
4. Check properties:
   - identityName
   - publisherDisplayName
   - publisher (should be CN=...)
   - applicationId
   - showNameOnTile
   - customInstallPage
```

Document:
```
## Existing electron-builder Settings
- Target architectures/packages: [e.g. nsis, appx]
- App ID: [value]
- AppX Identity Name: [value]
- AppX Publisher Name: [value]
- AppX Publisher ID: [value]
```

---

## Step 3: Audit Required AppX Store Assets

```
1. Electron-builder expects Windows Store logo assets under build/appx/ or build/.
2. Check if build/appx/ folder exists.
3. Check for the following required logo files:
   - StoreLogo.png (50x50)
   - Square150x150Logo.png (150x150)
   - Square44x44Logo.png (44x44)
   - Wide310x150Logo.png (310x150)
   - Square71x71Logo.png (71x71) (optional but recommended)
   - Square310x310Logo.png (310x310) (optional but recommended)
4. If missing, look in store-assets/ or downloads for source logos to generate them.
```

Document:
```
## AppX Logo Assets Audit
- build/appx/ directory status: [exists / missing]
- Found assets: [list found assets and dimensions]
- Missing assets: [list missing assets]
- Source image available: [path to source logo for generation]
```

---

## Step 4: Audit Microsoft Partner Center Requirements

```
1. Look for instructions or existing credentials files in the workspace.
2. Confirm the reason for the rejection based on Policy 10.2.9:
   - The user submitted the NSIS .exe installer, which is unsigned.
   - Microsoft Store requires EXE/MSI submissions to be signed with a paid CA certificate.
   - By submitting a (.appx) package, Microsoft signs the package for free.
3. Extract information about where the developer can find their Publisher ID (CN string) in the Partner Center:
   - Go to Partner Center Dashboard -> App Management -> Product Identity.
   - Copy the "Package/Identity/Publisher" value (looks like: CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX).
```

Document:
```
## Microsoft Store Submission Rejection Root Cause
- Policy Violated: 10.2.9 Security - Package Submissions
- Reason: Unsigned EXE installer uploaded.
- Workaround: Change submission target to AppX/MSIX so Microsoft signs it for free.
- Partner Center Identity Matching: [Steps to find Publisher CN]
```

---

## Step 5: Self-Audit the Analysis

Before writing the final analysis report, verify:

```
Checklist:
[ ] Did I read the build section of notepad-win/package.json completely?
[ ] Did I search the project for any other package.json or build configs?
[ ] Did I verify if the build/appx/ folder exists?
[ ] Did I locate the source assets (e.g. store-assets/ilovenotepad_logo_premium.png)?
[ ] Did I verify the exact error message from the user's rejection screenshot?
```

If any item is unchecked, go back and inspect the files.

---

## Step 6: Write Final Analysis Report

Save findings to `production_artifacts/analysis_report.md`

Log to `production_artifacts/build_log.md`:
```
[ANALYSIS COMPLETE] — [timestamp]
Report saved to production_artifacts/analysis_report.md
Ready to generate plan.
```
