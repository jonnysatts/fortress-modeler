const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Listen for menu events
  onMenuAction: (callback) => ipcRenderer.on('menu-new-project', callback),
  
  // Example: Get app version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Example: Check for updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
});