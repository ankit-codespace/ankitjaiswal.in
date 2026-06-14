const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
    frame: false, // Frameless window for custom premium title bar
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../renderer/public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.webContents.session.clearCache();

  // Load the compiled renderer index.html
  const indexPath = path.join(__dirname, '../renderer/dist/index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    // If not built yet, we can load a fallback or print instruction
    console.log("Renderer build not found. Please build renderer first.");
    mainWindow.loadURL('data:text/html,<h1>Please build renderer first (npm run build:renderer)</h1>');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (fileToOpenOnStartup) {
      openFileInWindow(fileToOpenOnStartup);
      fileToOpenOnStartup = null; // Clear after opening
    }
  });
}

function openFileInWindow(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('open-file-channel', {
      path: filePath,
      name: path.basename(filePath),
      content: content
    });
  } catch (err) {
    console.error("Failed to read file:", err);
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
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
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        path: filePath,
        name: path.basename(filePath),
        content: content
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
