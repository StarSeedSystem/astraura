/**
 * Astraura 1.58-Bit - Electron Preload Script
 * Secure IPC bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('astraura', {
  // App info
  getInfo: () => ipcRenderer.invoke('app:get-info'),
  
  // Backend control
  backend: {
    start: () => ipcRenderer.invoke('backend:start'),
    stop: () => ipcRenderer.invoke('backend:stop'),
    status: () => ipcRenderer.invoke('backend:status')
  },
  
  // Frontend control
  frontend: {
    reload: () => ipcRenderer.invoke('frontend:reload')
  },
  
  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },
  
  // Dialog operations
  dialog: {
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options)
  },
  
  // Configuration store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value)
  },
  
  // Window control
  window: {
    minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
    show: () => ipcRenderer.invoke('window:show')
  },
  
  // App control
  app: {
    quit: () => ipcRenderer.invoke('app:quit')
  },
  
  // Event listeners
  onBackendLog: (callback) => {
    ipcRenderer.on('backend-log', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('backend-log');
  },
  
  onBackendError: (callback) => {
    ipcRenderer.on('backend-error', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('backend-error');
  },
  
  onBackendStopped: (callback) => {
    ipcRenderer.on('backend-stopped', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('backend-stopped');
  },
  
  onBackendStarted: (callback) => {
    ipcRenderer.on('backend-started', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('backend-started');
  },
  
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('open-settings');
  }
});

// Also expose a minimal version for direct use
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions
});

console.log('[Astraura Preload] Secure IPC bridge initialized');