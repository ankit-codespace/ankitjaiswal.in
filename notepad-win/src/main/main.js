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

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error("Failed to open external link:", err);
    return false;
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
