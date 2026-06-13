const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('native-open-file'),
  showSaveDialog: (defaultName) => ipcRenderer.invoke('native-show-save-dialog', { defaultName }),
  saveFile: (filePath, content) => ipcRenderer.invoke('native-save-file', { filePath, content }),
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  maximizeApp: () => ipcRenderer.invoke('maximize-app'),
  onOpenFile: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('open-file-channel', subscription);
    return () => ipcRenderer.removeListener('open-file-channel', subscription);
  }
});
