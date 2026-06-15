# Microsoft Store AppX Submission Checklist & Guide
Generated: 2026-06-15T17:12:00+05:30

This guide details how to configure your Publisher ID and upload the compiled `.appx` package to the Microsoft Store without paying for an Authenticode certificate.

---

## 1. Compiled Package Metadata
- **Package Path:** `notepad-win/dist/I Love Notepad 1.0.0.appx`
- **File Size:** 114,481,938 bytes (~109.17 MB)
- **Target OS:** Windows 10/11 Desktop
- **Signature Status:** Unsigned (ready for Store-managed signing)

---

## 2. Retrieve Your Publisher ID (CN) from Partner Center
To pass the Microsoft Store upload validation, the `"publisher"` string in your `package.json` **must match your Partner Center account details exactly**. 

Follow these steps to find it:
1. Log in to the [Microsoft Partner Center Dashboard](https://partner.microsoft.com/en-us/dashboard).
2. Go to **Apps and games** and select your reserved app (**I Love Notepad**).
3. In the left navigation pane under **App management**, click on **Product identity**.
4. Locate the field labeled **Package/Identity/Publisher**. It will look like a CN string:
   `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
5. Copy this string.

---

## 3. Configure and Rebuild the Final Package
Once you have retrieved your `CN` string:

1. Open `notepad-win/package.json` in your editor.
2. Locate the `"build" -> "appx"` block (around line 31):
   ```json
   "appx": {
     "identityName": "com.ankitjaiswal.notepad",
     "publisherDisplayName": "Ankit Jaiswal",
     "publisher": "CN=PLEASE_REPLACE_WITH_YOUR_PUBLISHER_ID_FROM_PARTNER_CENTER"
   }
   ```
3. Replace the `"publisher"` value with your actual copied `CN` string:
   ```json
   "publisher": "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
   ```
4. Save the file.
5. Re-run the build script in your terminal to package the final version with the matching publisher signature:
   ```bash
   cd notepad-win
   npm run build
   ```

---

## 4. Upload and Publish on Partner Center
Now you are ready to upload the package to the Microsoft Store:

1. In the Microsoft Partner Center under your app dashboard, create a new submission or update your draft submission.
2. Navigate to the **Packages** section of the submission.
3. Drag and drop the generated `I Love Notepad 1.0.0.appx` package from `notepad-win/dist/` into the upload zone.
4. Partner Center will inspect the package metadata. Because the **Identity Name**, **Publisher CN**, and **Publisher Display Name** match your Partner Center reservation exactly, the upload will succeed.
5. Finish the rest of the store listing details (store screenshots, pricing, availability) and click **Submit to the Store**.

> [!NOTE]
> **Why this saves you money:** Microsoft Store will now run the automated certification tests (WACK) on your `.appx` package. Once it passes, Microsoft will sign the package with their own trusted corporate certificate before publishing it to the Store. Users will install the app seamlessly without any "Unknown Publisher" security warnings, and you did not have to purchase an Authenticode certificate!
