/**
 * Astraura Universal Device Context & Native Permissions Auto-Detector (v2.9)
 * Detects hardware, OS, GPU, battery, network, storage quotas, and browser permissions.
 * Bridges local backend (http://127.0.0.1:8000) when available, or activates sovereign client mode.
 */

// Gateway activo (custom / túnel / default) para sondear el puente antes que el localhost fijo.
import { getGatewayUrl } from './api';

class DeviceContextDetector {
  constructor() {
    this.deviceProfile = null;
    this.permissionsState = {};
    this.isLocalAgentConnected = false;
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    if (this.deviceProfile) callback(this.deviceProfile);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.deviceProfile));
  }

  async detectAll() {
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const win = typeof window !== 'undefined' ? window : {};

    // 1. Detect OS & Platform
    let os = 'Desconocido';
    let deviceType = 'Desktop';
    const ua = nav.userAgent || '';
    const platform = nav.platform || '';

    if (/Mac|iPhone|iPad|iPod/i.test(ua) || /Mac/i.test(platform)) {
      if (/iPhone|iPad|iPod/i.test(ua)) {
        os = 'iOS / iPadOS';
        deviceType = 'Mobile';
      } else {
        os = 'macOS (Apple Silicon / Intel)';
        deviceType = 'Desktop';
      }
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      deviceType = 'Mobile';
    } else if (/Win/i.test(ua) || /Win/i.test(platform)) {
      os = 'Windows';
      deviceType = 'Desktop';
    } else if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
      os = 'Linux';
      deviceType = 'Desktop';
    }

    // 2. Hardware Capabilities
    const logicalCores = nav.hardwareConcurrency || 8;
    const ramMemoryGb = nav.deviceMemory || 8;
    const isTouch = nav.maxTouchPoints > 0;
    const screenRes = win.screen ? `${win.screen.width}x${win.screen.height} (@${win.devicePixelRatio || 1}x)` : '1920x1080';

    // 3. GPU Vendor & WebGL Renderer Detection
    let gpuRenderer = 'WebGL 2.0 Acelerado por Hardware';
    let gpuVendor = 'Apple / Metal';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gpuVendor;
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
        }
      }
    } catch {}

    // 4. Battery Telemetry (if supported)
    let batteryInfo = { percent: 100, isCharging: true, available: false };
    try {
      if (nav.getBattery) {
        const bat = await nav.getBattery();
        batteryInfo = {
          percent: Math.round(bat.level * 100),
          isCharging: bat.charging,
          available: true
        };
      }
    } catch {}

    // 5. Network Information
    let networkInfo = { type: 'WiFi / LAN', downlinkMbps: 10, rttMs: 20 };
    if (nav.connection) {
      networkInfo = {
        type: nav.connection.effectiveType || '4g',
        downlinkMbps: nav.connection.downlink || 10,
        rttMs: nav.connection.rtt || 25,
        saveData: nav.connection.saveData || false
      };
    }

    // 6. Storage Quota & Persistence
    let storageInfo = { quotaMb: 0, usageMb: 0, persisted: false, supported: false };
    try {
      if (nav.storage && nav.storage.estimate) {
        const est = await nav.storage.estimate();
        storageInfo = {
          quotaMb: Math.round((est.quota || 0) / (1024 * 1024)),
          usageMb: Math.round((est.usage || 0) / (1024 * 1024)),
          persisted: nav.storage.persisted ? await nav.storage.persisted() : false,
          supported: true
        };
      }
    } catch {}

    // 7. Test Host Agent Bridge: primero el gateway configurado (custom en localStorage / túnel / default),
    //    después la sonda local directa (http://127.0.0.1:8000). Se reporta hostData del primero que responda.
    let localBridge = { connected: false, latencyMs: null, hostData: null, endpoint: null };
    const probeEndpoints = [];
    try {
      const gw = getGatewayUrl();
      if (gw) probeEndpoints.push(`${gw.replace(/\/$/, '')}/api/status`);
    } catch {}
    probeEndpoints.push('http://127.0.0.1:8000/api/status');
    this.isLocalAgentConnected = false;
    for (const endpoint of [...new Set(probeEndpoints)]) {
      try {
        const t0 = performance.now();
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(endpoint, { signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          localBridge = {
            connected: true,
            latencyMs: Math.round(performance.now() - t0),
            hostData: data,
            endpoint
          };
          this.isLocalAgentConnected = true;
          break;
        }
      } catch {
        // Endpoint sin respuesta: se prueba el siguiente.
      }
    }

    // 8. Permissions Status Audit
    const permissions = {
      fileSystemAccess: typeof win.showDirectoryPicker === 'function',
      persistentStorage: storageInfo.persisted,
      webAudio: typeof win.AudioContext !== 'undefined' || typeof win.webkitAudioContext !== 'undefined',
      webSpeechSTT: typeof win.SpeechRecognition !== 'undefined' || typeof win.webkitSpeechRecognition !== 'undefined',
      webSpeechTTS: typeof win.speechSynthesis !== 'undefined',
      webWorkers: typeof win.Worker !== 'undefined',
      webAssemblySIMD: typeof WebAssembly !== 'undefined',
      localShellBridge: localBridge.connected
    };

    this.deviceProfile = {
      os,
      deviceType,
      platform,
      logicalCores,
      ramMemoryGb,
      isTouch,
      screenRes,
      gpuVendor,
      gpuRenderer,
      batteryInfo,
      networkInfo,
      storageInfo,
      localBridge,
      permissions,
      detectedAt: Date.now()
    };

    this.notify();
    return this.deviceProfile;
  }

  /**
   * Requests persistent local storage on this browser.
   */
  async requestPersistentStorage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      if (this.deviceProfile) {
        this.deviceProfile.storageInfo.persisted = isPersisted;
        this.deviceProfile.permissions.persistentStorage = isPersisted;
        this.notify();
      }
      return isPersisted;
    }
    return false;
  }

  /**
   * Detects precise location via HTML5 Geolocation (High Accuracy) or Client IP Fallback.
   * Caches in localStorage and updates the backend Sensorium.
   */
  async detectPreciseLocation() {
    // 1. Check local cached location
    let cached = null;
    try {
      const saved = localStorage.getItem('astraura_calibrated_location');
      if (saved) cached = JSON.parse(saved);
    } catch {}

    // 2. Try HTML5 Geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 60000
          });
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const alt = pos.coords.altitude || (cached?.altitude_m || 1500);

        // Reverse geocoding via Nominatim
        let city = cached?.city || 'Mi Ciudad';
        let region = cached?.region || '';
        let country = cached?.country || 'México';

        try {
          const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`, {
            headers: { 'Accept': 'application/json' }
          });
          if (rev.ok) {
            const data = await rev.json();
            const addr = data.address || {};
            city = addr.city || addr.town || addr.village || addr.municipality || addr.county || city;
            region = addr.state || addr.region || region;
            country = addr.country || country;
          }
        } catch {}

        const locObj = {
          latitude: lat,
          longitude: lon,
          city,
          region,
          country,
          altitude_m: alt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
          source: 'GPS Satelital (Alta Precisión)',
          updated_at: Date.now()
        };

        try {
          localStorage.setItem('astraura_calibrated_location', JSON.stringify(locObj));
        } catch {}

        return locObj;
      } catch (gpsErr) {
        console.warn('GPS browser error, falling back to IP geolocation:', gpsErr.message);
      }
    }

    // 3. Fallback: Client IP Geolocation
    try {
      const ipRes = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData && ipData.success !== false) {
          const locObj = {
            latitude: ipData.latitude || 20.6597,
            longitude: ipData.longitude || -103.3496,
            city: ipData.city || 'Ciudad Soberana',
            region: ipData.region || '',
            country: ipData.country || 'México',
            timezone: ipData.timezone?.id || 'America/Mexico_City',
            altitude_m: cached?.altitude_m || 1500,
            source: 'Geolocalización por IP Cliente',
            updated_at: Date.now()
          };
          try {
            localStorage.setItem('astraura_calibrated_location', JSON.stringify(locObj));
          } catch {}
          return locObj;
        }
      }
    } catch {}

    return cached || {
      latitude: 20.6597,
      longitude: -103.3496,
      city: 'Guadalajara',
      region: 'Jalisco',
      country: 'México',
      timezone: 'America/Mexico_City',
      altitude_m: 1566,
      source: 'Predeterminada (Soberana)'
    };
  }

  /**
   * Prompts user to pick a local folder via File System Access API (when supported).
   */
  async pickLocalFolder() {
    if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        return {
          success: true,
          name: dirHandle.name,
          handle: dirHandle
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'FileSystem Access API no soportada en este navegador' };
  }
}

export const deviceContextDetector = new DeviceContextDetector();
