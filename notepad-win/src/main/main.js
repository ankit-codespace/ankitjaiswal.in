const { app, BrowserWindow, ipcMain, dialog, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToOpenOnStartup = null;

// Parse arguments to find if a file was passed to open
function getFilePathFromArgs(argv) {
  // On Windows, the last argument is typically the file path
  // We ignore arguments starting with '-' (flags) and the executable/index path
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
      return arg;
    }
  }
  return null;
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      const filePath = getFilePathFromArgs(commandLine);
      if (filePath) {
        openFileInWindow(filePath);
      }
    }
  });

  // Save the startup file path if passed
  fileToOpenOnStartup = getFilePathFromArgs(process.argv);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false, // Don't show until content is painted
    backgroundColor: '#0F0F0E', // Match app background to prevent flash
    frame: false, // Frameless window for custom premium title bar
    autoHideMenuBar: true,
    icon: fs.existsSync(path.join(__dirname, '../renderer/dist/favicon.ico'))
      ? path.join(__dirname, '../renderer/dist/favicon.ico')
      : path.join(__dirname, '../renderer/public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle render process crash
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logCrash('render-process-gone', `Reason: ${details.reason}, ExitCode: ${details.exitCode}`);
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  // Handle window unresponsive
  mainWindow.on('unresponsive', () => {
    logCrash('unresponsive', 'Window became unresponsive');
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Wait', 'Reload', 'Close'],
      title: 'Application Unresponsive',
      message: 'The application is not responding. Would you like to wait, reload, or close the app?',
      cancelId: 0
    }).then(({ response }) => {
      if (response === 1) {
        mainWindow.reload();
      } else if (response === 2) {
        app.quit();
      }
    });
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.webContents.session.clearCache();

  // Load the compiled renderer index.html
  const indexPath = path.join(__dirname, '../renderer/dist/index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    logCrash('build-missing', `Renderer build not found: ${err.message}`);
    mainWindow.loadURL('data:text/html,<h1>Please build renderer first (npm run build:renderer)</h1>');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (fileToOpenOnStartup) {
      openFileInWindow(fileToOpenOnStartup);
      fileToOpenOnStartup = null; // Clear after opening
    }
  });

  // Native Context Menu Handler for premium right-click behaviors
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menuTemplate = [];

    // Spellcheck suggestions (put at the top of the menu if present)
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach((suggestion) => {
        menuTemplate.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        });
      });
      menuTemplate.push({ type: 'separator' });
    }

    // Cut / Copy / Paste
    if (params.editFlags.canCut) {
      menuTemplate.push({ label: 'Cut', role: 'cut', accelerator: 'Ctrl+X' });
    }
    if (params.editFlags.canCopy) {
      menuTemplate.push({ label: 'Copy', role: 'copy', accelerator: 'Ctrl+C' });
    }
    if (params.editFlags.canPaste) {
      menuTemplate.push({ label: 'Paste', role: 'paste', accelerator: 'Ctrl+V' });
    }
    
    // Link options
    if (params.linkURL) {
      if (menuTemplate.length > 0 && menuTemplate[menuTemplate.length - 1].type !== 'separator') {
        menuTemplate.push({ type: 'separator' });
      }
      menuTemplate.push({
        label: 'Open Link in Browser',
        click: () => {
          shell.openExternal(params.linkURL);
        }
      });
      menuTemplate.push({
        label: 'Copy Link Address',
        click: () => {
          const { clipboard } = require('electron');
          clipboard.writeText(params.linkURL);
        }
      });
    }

    // Select All / Undo / Redo
    let hasEditingActions = false;
    const editingActions = [];
    if (params.editFlags.canSelectAll) {
      editingActions.push({ label: 'Select All', role: 'selectall', accelerator: 'Ctrl+A' });
      hasEditingActions = true;
    }
    if (params.editFlags.canUndo) {
      editingActions.push({ label: 'Undo', role: 'undo', accelerator: 'Ctrl+Z' });
      hasEditingActions = true;
    }
    if (params.editFlags.canRedo) {
      editingActions.push({ label: 'Redo', role: 'redo', accelerator: 'Ctrl+Y' });
      hasEditingActions = true;
    }

    if (hasEditingActions) {
      if (menuTemplate.length > 0 && menuTemplate[menuTemplate.length - 1].type !== 'separator') {
        menuTemplate.push({ type: 'separator' });
      }
      menuTemplate.push(...editingActions);
    }

    // Only build and popup the menu if we have items
    if (menuTemplate.length > 0) {
      // Remove any trailing/leading separators or double separators to make it clean
      const cleanTemplate = [];
      menuTemplate.forEach((item, index) => {
        if (item.type === 'separator') {
          if (cleanTemplate.length === 0 || index === menuTemplate.length - 1 || cleanTemplate[cleanTemplate.length - 1].type === 'separator') {
            return;
          }
        }
        cleanTemplate.push(item);
      });
      
      if (cleanTemplate.length > 0 && cleanTemplate[cleanTemplate.length - 1].type === 'separator') {
        cleanTemplate.pop();
      }

      if (cleanTemplate.length > 0) {
        const menu = Menu.buildFromTemplate(cleanTemplate);
        menu.popup(mainWindow);
      }
    }
  });
}

function isFileSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { safe: false, reason: 'File does not exist.' };
    }
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { safe: false, reason: 'Path is not a file.' };
    }
    // 10MB limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (stats.size > MAX_SIZE) {
      return { safe: false, reason: 'File size exceeds the 10MB limit.' };
    }

    // Binary check: read the first 1024 bytes
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return { safe: false, reason: 'Binary files are not supported.' };
      }
    }

    return { safe: true, isLarge: stats.size > 1.0 * 1024 * 1024 };
  } catch (err) {
    return { safe: false, reason: `Failed to inspect file: ${err.message}` };
  }
}

function openFileInWindow(filePath) {
  const safetyCheck = isFileSafe(filePath);
  if (!safetyCheck.safe) {
    dialog.showErrorBox('Unsupported File', `Could not open file: ${safetyCheck.reason}`);
    return;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('open-file-channel', {
      path: filePath,
      name: path.basename(filePath),
      content: content,
      size: fs.statSync(filePath).size,
      isLarge: safetyCheck.isLarge
    });
  } catch (err) {
    console.error("Failed to read file:", err);
  }
}

app.whenReady().then(() => {
  app.setName('ILoveNotepad');
  app.setAppUserModelId('com.ankitjaiswal.notepad');
  Menu.setApplicationMenu(null);

  // Hardening: Block unused browser permissions (like geolocation, media, notifications)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (['geolocation', 'media', 'notifications', 'openExternal'].includes(permission)) {
      return callback(false); // Deny permission
    }
    callback(true); // Allow other basic permissions
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for file loading/saving dialogs and operations
ipcMain.handle('native-open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Supported', extensions: ['txt', 'md', 'html'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'HTML Files', extensions: ['html'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const safetyCheck = isFileSafe(filePath);
    if (!safetyCheck.safe) {
      dialog.showErrorBox('Unsupported File', `Could not open file: ${safetyCheck.reason}`);
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        path: filePath,
        name: path.basename(filePath),
        content: content,
        size: fs.statSync(filePath).size,
        isLarge: safetyCheck.isLarge
      };
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }
  return null;
});

ipcMain.handle('native-show-save-dialog', async (event, { defaultName }) => {
  const suggestedExt = defaultName.split('.').pop()?.toLowerCase() || 'txt';
  const filters = [];
  if (suggestedExt === 'html') {
    filters.push({ name: 'HTML Files', extensions: ['html'] });
    filters.push({ name: 'Markdown Files', extensions: ['md'] });
    filters.push({ name: 'Text Files', extensions: ['txt'] });
  } else if (suggestedExt === 'md') {
    filters.push({ name: 'Markdown Files', extensions: ['md'] });
    filters.push({ name: 'HTML Files', extensions: ['html'] });
    filters.push({ name: 'Text Files', extensions: ['txt'] });
  } else {
    filters.push({ name: 'Text Files', extensions: ['txt'] });
    filters.push({ name: 'Markdown Files', extensions: ['md'] });
    filters.push({ name: 'HTML Files', extensions: ['html'] });
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('desktop'), defaultName),
    filters: filters
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('native-save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
      path: filePath,
      name: path.basename(filePath)
    };
  } catch (err) {
    throw new Error(`Failed to write file: ${err.message}`);
  }
});

ipcMain.handle('get-desktop-path', () => {
  return app.getPath('desktop');
});

ipcMain.handle('close-app', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('minimize-app', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-app', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('set-window-size', (event, w, h) => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.setSize(w, h, true);
    mainWindow.center();
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error("Failed to open external link:", err);
    return false;
  }
});

ipcMain.handle('native-save-pdf', async (event, { title, html }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('desktop'), `${title}.pdf`),
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, reason: 'cancelled' };
    }

    const filePath = result.filePath;
    
    // Create a hidden browser window
    const tempWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const printDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>\${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.75;
      color: #1a1a1a;
      background: #ffffff;
      max-width: 720px;
      margin: 0 auto;
      padding: 20px 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Headings ── */
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Sora', 'Inter', sans-serif;
      font-weight: 700;
      color: #0d1117;
      margin-top: 1.6em;
      margin-bottom: 0.5em;
      line-height: 1.3;
      page-break-after: avoid;
    }
    h1 { font-size: 22pt; }
    h2 { font-size: 17pt; }
    h3 { font-size: 13pt; }

    /* ── Paragraphs & spacing ── */
    p { margin-bottom: 0.75em; }
    p:last-child { margin-bottom: 0; }

    /* ── Bold / Italic / Underline / Strike ── */
    strong, b { font-weight: 600; color: #0d1117; }
    em, i { font-style: italic; }
    u { text-decoration: underline; text-underline-offset: 2px; }
    s, del { text-decoration: line-through; color: #6b7280; }

    /* ── Inline code ── */
    code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 0.88em;
      background: #f0f0f0;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      padding: 0.1em 0.35em;
      color: #c7254e;
    }

    /* ── Code blocks ── */
    pre {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.6;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 14px 18px;
      overflow-x: auto;
      margin: 1em 0;
      page-break-inside: avoid;
      white-space: pre-wrap;
      word-break: break-word;
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
      color: #24292f;
      font-size: inherit;
    }

    /* ── Blockquote ── */
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 1.2em 0;
      padding: 10px 16px;
      background: #f8f7ff;
      border-radius: 0 6px 6px 0;
      color: #374151;
      font-style: italic;
      page-break-inside: avoid;
    }
    blockquote p { margin-bottom: 0; }

    /* ── Lists ── */
    ul, ol {
      margin: 0.5em 0 0.75em 1.5em;
      padding: 0;
    }
    li {
      margin-bottom: 0.3em;
      line-height: 1.7;
    }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    ul ul { list-style-type: circle; }
    ul ul ul { list-style-type: square; }

    /* ── Task list ── */
    ul[data-type="taskList"] {
      list-style: none;
      margin-left: 0.5em;
    }
    li[data-type="taskItem"] {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    li[data-type="taskItem"] > label { flex-shrink: 0; margin-top: 2px; }
    li[data-type="taskItem"][data-checked="true"] > div { 
      text-decoration: line-through; 
      color: #9ca3af; 
    }

    /* ── Highlight ── */
    mark {
      background: #fef08a;
      color: #713f12;
      border-radius: 2px;
      padding: 0 2px;
    }

    /* ── Links ── */
    a {
      color: #1d4ed8;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* ── Horizontal rule ── */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }

    /* ── Images ── */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      margin: 1em auto;
      page-break-inside: avoid;
    }

    /* ── Tables ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.2em 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #111827;
    }
    tr:nth-child(even) td { background: #f9fafb; }

    /* ── Print page setup ── */
    @page {
      size: A4 portrait;
      margin: 20mm 18mm;
    }
    @media print {
      body { padding: 0; max-width: 100%; }
      h1, h2, h3 { page-break-after: avoid; }
      pre, blockquote, table, img { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  \${html}
</body>
</html>`;

    // Load content as data URI
    await tempWindow.loadURL(`data:text/html;charset=utf-8,\${encodeURIComponent(printDoc)}`);

    // Generate PDF buffer
    const pdfBuffer = await tempWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false
    });

    // Write buffer to file
    fs.writeFileSync(filePath, pdfBuffer);
    tempWindow.close();
    return { success: true, filePath };

  } catch (err) {
    return { success: false, reason: err.message };
  }
});

// Crash Hardening and Logging
const logPath = path.join(app.getPath('userData'), 'crash.log');

function logCrash(type, error) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${type}] ${error?.stack || error || 'Unknown Error'}\n`;
  try {
    fs.appendFileSync(logPath, message);
  } catch (err) {
    process.stderr.write(`Failed to write to crash log: ${err.message}\n`);
  }
}

process.on('uncaughtException', (error) => {
  logCrash('uncaughtException', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logCrash('unhandledRejection', reason);
});
