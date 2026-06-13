# Skill: Plan Windows Conversion

## Objective
Create a detailed phased build plan to convert the web Notepad into a Windows app.

## Tech Stack
- Electron (window shell + IPC bridge). Load local HTML file, NOT a URL.
- HTML/CSS/JS extracted from web version, embedded directly in renderer
- Node.js fs module to replace all browser File API calls
- electron-builder to package to .exe installer
- Windows Registry for .txt file association and context menu

## Required Phases

### Phase 1: Electron Project Scaffold
1.1 Create folder structure: notepad-win/ with src/, src/renderer/, src/main/
1.2 Create package.json with Electron and electron-builder dependencies
1.3 Create src/main/main.js: Electron main process, opens window loading local file
1.4 Verify: main.js uses mainWindow.loadFile() NOT loadURL() with any domain
1.5 Run npm install and confirm Electron launches an empty window

### Phase 2: Port Notepad UI
2.1 Copy Notepad HTML structure into src/renderer/index.html. Strip all portfolio nav/header/footer.
2.2 Copy Notepad CSS into src/renderer/styles.css. Keep only Notepad styles.
2.3 Copy Notepad JS logic into src/renderer/notepad.js. Keep only Notepad logic.
2.4 Link all files correctly in index.html
2.5 Self-audit: Does index.html reference any portfolio URLs? Any broken asset paths? Fix all.
2.6 Verify: Electron window shows the Notepad UI correctly

### Phase 3: Native File Operations
3.1 Create src/main/fileOps.js with IPC handlers for save and open using Node.js fs
3.2 Replace browser Blob/download save with IPC call to fs.writeFile, defaulting to Desktop
3.3 Replace FileReader open with IPC call to fs.readFile via Electron dialog.showOpenDialog
3.4 Add Save As dialog using dialog.showSaveDialog
3.5 Self-audit: Are all paths using path.join? Is there error handling on every fs call? Fix any issues.

### Phase 4: .txt File Association
4.1 Configure electron-builder to register app as handler for .txt files on install
4.2 Handle file path passed as process.argv on app launch, load file content on open
4.3 Verify: app receives the file path correctly when launched via double-click simulation

### Phase 5: Context Menu Registration
5.1 Add Windows context menu entry "Open with [AppName]" for .txt files via electron-builder fileAssociations
5.2 Verify registry entries are correct in the build config

### Phase 6: Package to .exe
6.1 Configure electron-builder in package.json, target: nsis (Windows installer)
6.2 Set app name, icon, publisher info
6.3 Run npm run build. Confirm .exe is generated in dist/
6.4 Self-audit: Check build output for errors. Verify installer size is reasonable.

### Phase 7: Final Audit
7.1 Go through every feature listed in production_artifacts/notepad_analysis.md
7.2 Confirm each feature is present and working in the Windows app
7.3 Write final checklist to production_artifacts/final_audit.md

## Output
Save this full plan to: production_artifacts/build_plan.md
