/**
 * Astraura 1.58-Bit Cognitive Engine // StarSeed OS
 * Electron Main Process - Sovereign Multi-Agent Desktop Application
 * 
 * Features:
 * - Auto-starts local FastAPI backend (port 8000)
 * - Opens frontend in native window (Vite dev or production build)
 * - Custom PNG icon for all platforms
 * - Cross-platform: macOS, Linux, Windows
 * - Secure IPC with preload script
 * - Auto-update checks
 * - Deep linking support
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Configuration store
const store = new Store({
  name: 'astraura-config',
  defaults: {
    backendPort: 8000,
    frontendPort: 5173,
    autoStartBackend: true,
    autoOpenBrowser: true,
    theme: 'dark',
    language: 'es',
    showTray: true,
    minimizeToTray: true,
    checkUpdates: true,
    lastVersion: '1.5.8'
  }
});

// Global references
let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let tray = null;
let isQuitting = false;

// Paths
const RESOURCES_PATH = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, '..', 'frontend')
  : path.join(process.resourcesPath, 'frontend');
const BACKEND_PATH = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend');

// Platform detection
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Create app icon from PNG
function createAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

// Get backend executable command
function getBackendCommand() {
  const pythonCmd = isWin ? 'python.exe' : 'python3';
  const venvPath = path.join(BACKEND_PATH, '.venv');
  const pythonPath = isWin 
    ? path.join(venvPath, 'Scripts', pythonCmd)
    : path.join(venvPath, 'bin', pythonCmd);
  
  // Check if venv exists
  if (fs.existsSync(pythonPath)) {
    return pythonPath;
  }
  
  // Fallback to system python
  return pythonCmd;
}

// Start backend server
async function startBackend() {
  if (backendProcess) {
    console.log('[Astraura] Backend already running');
    return;
  }

  const pythonCmd = getBackendCommand();
  const runScript = path.join(BACKEND_PATH, 'run_backend.py');
  
  if (!fs.existsSync(runScript)) {
    console.error('[Astraura] Backend run script not found:', runScript);
    return;
  }

  console.log('[Astraura] Starting backend with:', pythonCmd, runScript);
  
  backendProcess = spawn(pythonCmd, [runScript], {
    cwd: BACKEND_PATH,
    env: { 
      ...process.env, 
      PYTHONPATH: BACKEND_PATH,
      PYTHONUNBUFFERED: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Backend]', output.trim());
    
    // Send to renderer for logging
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-log', output);
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error('[Backend Error]', output.trim());
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-error', output);
    }
  });

  backendProcess.on('close', (code) => {
    console.log('[Astraura] Backend process exited with code:', code);
    backendProcess = null;
    
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-stopped', { code });
      
      // Auto-restart if configured
      if (store.get('autoStartBackend')) {
        setTimeout(startBackend, 3000);
      }
    }
  });

  // Wait for backend to be ready
  return new Promise((resolve) => {
    const checkReady = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${store.get('backendPort')}/api/status`);
        if (response.ok) {
          clearInterval(checkReady);
          console.log('[Astraura] Backend is ready!');
          resolve(true);
        }
      } catch (e) {
        // Not ready yet
      }
    }, 1000);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkReady);
      resolve(false);
    }, 30000);
  });
}

// Stop backend server
function stopBackend() {
  if (backendProcess) {
    console.log('[Astraura] Stopping backend...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

// Create main window
function createMainWindow() {
  const icon = createAppIcon();
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: icon,
    title: 'Astraura 1.58-Bit // StarSeed OS',
    show: false,
    frame: false, // Custom frameless window
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: false, // Allow loading local resources
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });

  // Set window title
  mainWindow.setTitle('Astraura 1.58-Bit Cognitive Engine');

  // Load frontend
  loadFrontend();

  // Window events
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isMac) {
      app.dock.setIcon(icon);
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting && store.get('minimizeToTray')) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.setToolTip('Astraura 1.58-Bit running in background');
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

// Load frontend (Vite dev server or production build)
async function loadFrontend() {
  const isDev = process.env.NODE_ENV === 'development';
  const frontendPort = store.get('frontendPort');
  
  if (isDev) {
    // Development: load from Vite dev server
    const viteUrl = `http://localhost:${frontendPort}`;
    console.log('[Astraura] Loading frontend from Vite:', viteUrl);
    
    // Wait for Vite to be ready
    let retries = 30;
    while (retries > 0) {
      try {
        await fetch(viteUrl);
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 1000));
        retries--;
      }
    }
    
    await mainWindow.loadURL(viteUrl);
  } else {
    // Production: load from built files
    const indexPath = path.join(RESOURCES_PATH, 'dist', 'index.html');
    console.log('[Astraura] Loading frontend from:', indexPath);
    
    if (fs.existsSync(indexPath)) {
      await mainWindow.loadFile(indexPath);
    } else {
      console.error('[Astraura] Frontend build not found at:', indexPath);
      // Show error page
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head><title>Astraura - Build Not Found</title></head>
        <body style="font-family: system-ui; padding: 40px; background: #07090e; color: #e2e8f0;">
          <h1>🚀 Astraura 1.58-Bit</h1>
          <p>Frontend build not found. Please run <code>npm run build</code> in the frontend directory.</p>
          <p>Path checked: ${indexPath}</p>
        </body>
        </html>
      `)}`);
    }
  }
}

// Create system tray
function createTray() {
  const icon = createAppIcon().resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  tray.setToolTip('Astraura 1.58-Bit Cognitive Engine');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Astraura',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Estado del Backend',
      submenu: [
        {
          label: 'Iniciar Backend',
          click: () => startBackend().then(() => {
            if (mainWindow) mainWindow.webContents.send('backend-started');
          }),
          enabled: !backendProcess
        },
        {
          label: 'Detener Backend',
          click: () => {
            stopBackend();
            if (mainWindow) mainWindow.webContents.send('backend-stopped', { code: 0 });
          },
          enabled: !!backendProcess
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}

// Create application menu
function createAppMenu() {
  const template = [
    {
      label: isMac ? 'Astraura' : 'File',
      submenu: [
        {
          label: 'Nueva Ventana',
          accelerator: 'CmdOrCtrl+N',
          click: () => createMainWindow()
        },
        { type: 'separator' },
        {
          label: 'Preferencias',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'quit', label: 'Salir' } : { 
          label: 'Salir',
          click: () => { isQuitting = true; app.quit(); }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Traer al Frente',
          role: 'front'
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Documentación Oficial',
          click: () => shell.openExternal('https://astraura.vercel.app/')
        },
        {
          label: 'Repositorio GitHub',
          click: () => shell.openExternal('https://github.com/StarSeedSystem/astraura')
        },
        {
          label: 'Reportar Error',
          click: () => shell.openExternal('https://github.com/StarSeedSystem/astraura/issues')
        },
        { type: 'separator' },
        {
          label: 'Acerca de Astraura 1.58-Bit',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de Astraura 1.58-Bit',
              message: 'Astraura 1.58-Bit Cognitive Engine',
              detail: `Versión ${app.getVersion()}\nStarSeed OS - Sistema Operativo Cognitivo Soberano\nArquitectura: Microsoft BitNet b1.58 Ternary ({-1, 0, 1})\n\nDesarrollado con 💙 por la comunidad StarSeed System`,
              buttons: ['OK'],
              icon: createAppIcon()
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIpcHandlers() {
  // Get app info
  ipcMain.handle('app:get-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    backendPort: store.get('backendPort'),
    frontendPort: store.get('frontendPort'),
    resourcesPath: RESOURCES_PATH,
    backendPath: BACKEND_PATH
  }));

  // Backend control
  ipcMain.handle('backend:start', async () => {
    return await startBackend();
  });

  ipcMain.handle('backend:stop', () => {
    stopBackend();
    return { success: true };
  });

  ipcMain.handle('backend:status', () => ({
    running: !!backendProcess
  }));

  // Frontend reload
  ipcMain.handle('frontend:reload', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  // Open external URL
  ipcMain.handle('shell:openExternal', async (_, url) => {
    return await shell.openExternal(url);
  });

  // Show save dialog
  ipcMain.handle('dialog:saveFile', async (_, options) => {
    if (!mainWindow) return { canceled: true };
    return await dialog.showSaveDialog(mainWindow, options);
  });

  // Show open dialog
  ipcMain.handle('dialog:openFile', async (_, options) => {
    if (!mainWindow) return { canceled: true };
    return await dialog.showOpenDialog(mainWindow, options);
  });

  // Get store value
  ipcMain.handle('store:get', (_, key) => store.get(key));
  
  // Set store value
  ipcMain.handle('store:set', (_, key, value) => {
    store.set(key, value);
    return { success: true };
  });

  // Minimize to tray
  ipcMain.handle('window:minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
  });

  // Show window
  ipcMain.handle('window:show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Quit app
  ipcMain.handle('app:quit', () => {
    isQuitting = true;
    app.quit();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Prevent multiple instances
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Set app user model ID for Windows
  if (isWin) {
    app.setAppUserModelId('com.starseed.astraura');
  }

  // Create menu
  createAppMenu();

  // Create tray
  if (store.get('showTray')) {
    createTray();
  }

  // Setup IPC
  setupIpcHandlers();

  // Start backend if configured
  if (store.get('autoStartBackend')) {
    await startBackend();
  }

  // Create main window
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (!isMac || isQuitting) {
    stopBackend();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Handle certificate errors (for self-signed localhost)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🚀 ASTRAURA 1.58-BIT COGNITIVE ENGINE // STARSEED OS               ║
║  Electron Desktop Application v${app.getVersion()}                        ║
║  Arquitectura: Microsoft BitNet b1.58 Ternary ({-1, 0, 1})         ║
║  Plataforma: ${process.platform} (${process.arch})                                    ║
╚══════════════════════════════════════════════════════════════════════╝
`);