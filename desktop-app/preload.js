/**
 * Astraura 1.58-Bit // Preload Script
 * Secure bridge between Electron renderer and main process.
 * Context isolation is enabled, so only explicitly exposed APIs are available.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astraura', {
  // App info
  getInfo: () => ipcRenderer.invoke('app:get-info'),
  
  // Backend control
  startBackend: () => ipcRenderer.invoke('backend:start'),
  stopBackend: () => ipcRenderer.invoke('backend:stop'),
  backendStatus: () => ipcRenderer.invoke('backend:status'),
  
  // Frontend
  reload: () => ipcRenderer.invoke('frontend:reload'),
  
  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Dialogs
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  
  // Store
  getStore: (key) => ipcRenderer.invoke('store:get', key),
  setStore: (key, value) => ipcRenderer.invoke('store:set', key, value),
  
  // Event subscriptions
  onBackendLog: (cb) => ipcRenderer.on('backend-log', (_, data) => cb(data)),
  onBackendError: (cb) => ipcRenderer.on('backend-error', (_, data) => cb(data)),
  onBackendStarted: (cb) => ipcRenderer.on('backend-started', () => cb()),
  onBackendStopped: (cb) => ipcRenderer.on('backend-stopped', (_, data) => cb(data)),
  onOpenSettings: (cb) => ipcRenderer.on('open-settings', () => cb()),
});
