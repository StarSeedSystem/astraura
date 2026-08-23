/*
  ================================================================================
  Astraura 1.58-Bit API Service — File System Access API
  Universal Folder/File Permissions for any modern browser (Chrome, Edge, Firefox, Safari)
  No external browser needed — works directly from the web UI.
  ================================================================================
*/

// apiFetch respeta el gateway activo (custom / túnel / default) — necesario para submitFolderToBackend().
import { apiFetch } from './api';

// ── Solicita acceso a una carpeta via showDirectoryPicker ──
export async function requestFolderAccess(prompt) {
  if (typeof window !== 'undefined' && window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      return { success: true, handle: handle, name: handle.name };
    } catch (err) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('abort'))) {
        return { cancelled: true, message: 'Selección cancelada por el usuario.' };
      }
      return { error: err.message };
    }
  }
  return { error: 'Tu navegador no soporta File System Access API. Usa Chrome, Edge, Firefox o Safari moderno.' };
}

// ── Lista carpetas con permisos almacenados en IndexedDB ──
export async function listAccessibleFolders() {
  try {
    const dbReq = indexedDB.open('astraura_fs_permissions', 1);
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
      dbReq.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('folders')) {
          d.createObjectStore('folders', { keyPath: 'name' });
        }
      };
    });
    if (!db.objectStoreNames.contains('folders')) return [];
    const tx = db.transaction('folders', 'readonly');
    const store = tx.objectStore('folders');
    const req = store.getAll();
    return await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

// ── Persiste un handle de carpeta en IndexedDB ──
export async function saveAccessibleFolder(name, handle) {
  try {
    const dbReq = indexedDB.open('astraura_fs_permissions', 1);
    return await new Promise((resolve) => {
      dbReq.onsuccess = () => {
        const db = dbReq.result;
        const tx = db.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        store.put({ name, handle });
        tx.oncomplete = () => resolve({ success: true });
        tx.onerror = () => resolve({ error: 'No se pudo guardar el permiso.' });
      };
      dbReq.onerror = () => resolve({ error: 'No se pudo abrir la base de datos.' });
    });
  } catch (err) {
    return { error: err.message };
  }
}

// ── Lee contenido de una carpeta con permisos existentes ──
export async function readFolderContent(handle) {
  const result = [];
  for await (const [name, child] of handle) {
    const isDir = child.kind === 'directory';
    const entry = { name: name, kind: child.kind, isDirectory: isDir };
    if (isDir) {
      entry.children = await readFolderContent(child);
    } else {
      try {
        const file = await child.getFile();
        entry.size = file.size;
        entry.lastModified = file.lastModified;
        if (file.size < 1024 * 1024) entry.type = file.type || 'application/octet-stream';
      } catch {
        entry.error = 'No se pudo leer la metadata del archivo.';
      }
    }
    result.push(entry);
  }
  return result;
}

// ── Detecta carpetas comunes del sistema ──
export async function detectCommonFolders() {
  const root = await requestFolderAccess('Selecciona la raíz del sistema (ej. /Users/alex)');
  if (!root || root.error || root.cancelled) return [];
  const detected = [];
  for await (const [name, child] of root.handle) {
    if (child.kind === 'directory' && ['Documents', 'Desktop', 'Downloads', 'Projects', 'Código', 'Trabajo'].includes(name)) {
      detected.push({ name: name, path: '/' + name, handle: child, auto_detected: true });
    }
  }
  return detected;
}

// ── Refresca automáticamente los permisos de carpetas ──
export async function autoRefreshFolderPermissions() {
  const saved = await listAccessibleFolders();
  const refreshed = [];
  for (const folder of saved) {
    try {
      const content = await readFolderContent(folder.handle);
      refreshed.push({
        ...folder,
        accessible: true,
        fileCount: countFilesRecursive(content),
        lastVerified: Date.now()
      });
    } catch {
      const reacquire = await requestFolderAccess('Re-adquirir acceso: ' + folder.name);
      if (reacquire && reacquire.success) {
        await saveAccessibleFolder(folder.name, reacquire.handle);
        refreshed.push({
          ...folder,
          handle: reacquire.handle,
          accessible: true,
          reacquired: true,
          fileCount: 0,
          lastVerified: Date.now()
        });
      }
    }
  }
  return refreshed;
}

function countFilesRecursive(contents) {
  let count = 0;
  contents.forEach(function(item) {
    if (item.isDirectory && item.children) {
      count += countFilesRecursive(item.children);
    } else {
      count++;
    }
  });
  return count;
}

// ── Envía carpeta al backend para indexación ──
export async function submitFolderToBackend(folderName, folderPath, fileCount) {
  return apiFetch('/storage/folder/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder_name: folderName,
      folder_path: folderPath,
      file_count: fileCount,
      access_type: 'filesystem_api'
    })
  }).catch(function() {
    return { error: 'Backend no disponible — se guarda localmente.' };
  });
}
