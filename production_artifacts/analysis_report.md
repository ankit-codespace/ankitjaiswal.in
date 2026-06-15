# ILoveNotepad — Pre-Work Analysis Report (MSStore AppX Submission)
Generated: 2026-06-15T17:06:00+05:30

## 1. Project and Build Structure
- **Electron App Location:** `c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\notepad-win`
- **Build Configuration:** Configured inline in `notepad-win/package.json` under the `"build"` key.
- **Package Manager:** `npm` (indicated by `package-lock.json` in `notepad-win/`).
- **Build/Package Scripts:**
  - `npm run start` -> Launches local Electron developer mode
  - `npm run build:renderer` -> Compiles front-end components
  - `npm run build` -> Compiles renderer and triggers `electron-builder`
  - `npm run pack` -> Runs local unpacked packaging for testing

## 2. Existing electron-builder Settings
- **Win target list:** `["nsis", "appx"]`
- **App ID:** `com.ankitjaiswal.notepad`
- **AppX Identity Name:** `com.ankitjaiswal.notepad`
- **AppX Publisher Name:** `Ankit Jaiswal`
- **AppX Publisher ID:** `CN=PLEASE_REPLACE_WITH_YOUR_PUBLISHER_ID_FROM_PARTNER_CENTER`
- **Current Icon:** `icon.ico` directly in `notepad-win/`.

## 3. AppX Logo Assets Audit
- **Directory `notepad-win/build/`:** Currently missing entirely in `notepad-win/`.
- **Directory `notepad-win/build/appx/`:** Missing.
- **Required Store Assets to create:**
  - `StoreLogo.png` (50x50)
  - `Square150x150Logo.png` (150x150)
  - `Square44x44Logo.png` (44x44)
  - `Wide310x150Logo.png` (310x150)
- **Source Logo Available:** `store-assets/ilovenotepad_logo_premium.png` is available at `c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\store-assets\ilovenotepad_logo_premium.png`.

## 4. Microsoft Store Submission Rejection Root Cause
- **Policy Violated:** 10.2.9 Security - Package Submissions
- **Reason:** The uploaded file was a traditional Win32 executable (`ilovenotepad-setup-1.0.0.exe`) that was unsigned. Store Policy requires Win32 EXE installers to be signed with a purchased Authenticode certificate.
- **Workaround:** Compile the app as a `.appx` (MSIX) package. Uploading `.appx` to the Store leverages Microsoft's complimentary signing process where Microsoft signs it for free with their trusted certificate.
- **Action Required:** Change builder configuration to package `.appx` correctly and guide the developer to locate their `Publisher ID` (CN string) in the Partner Center (dashboard -> Product Identity) to replace the placeholder value.

## 5. Assumptions
- It is assumed that the developer has reserved the app name "I Love Notepad" in Microsoft Partner Center and that the matching Publisher Name is "Ankit Jaiswal".
- It is assumed that the local system has the required Windows SDK installed to enable `electron-builder` to package `.appx` files using Windows SDK `makeappx.exe` or node-appx.
