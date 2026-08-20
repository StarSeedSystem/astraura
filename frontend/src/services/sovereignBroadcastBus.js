/**
 * Sovereign Broadcast Bus for Astraura / StarSeed OS
 * Synchronizes sessions, active tabs, imagination tasks, project modifications,
 * and memory writes across ALL open browser tabs, PWA windows, and desktop instances in real time.
 */

class SovereignBroadcastBus {
  constructor() {
    this.channelName = 'astraura_sovereign_realtime_mesh';
    this.channel = null;
    this.listeners = new Set();
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          this._handleMessage(event.data);
        };
      } catch (err) {
        console.warn('⚠️ [BroadcastBus] BroadcastChannel not supported, falling back to window events', err);
      }
    }

    // Fallback: localStorage storage events for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'astraura_storage_event_sync' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this._handleMessage(data);
          } catch (err) {
            // Ignore parse errors
          }
        }
      });
    }
  }

  _handleMessage(data) {
    if (!data || data.senderTabId === this.tabId) return; // Skip own messages
    
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in BroadcastBus listener:', err);
      }
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  emit(eventType, payload = {}) {
    const message = {
      type: eventType,
      payload,
      senderTabId: this.tabId,
      timestamp: Date.now()
    };

    // 1. BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel postMessage error:', err);
      }
    }

    // 2. Storage event fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('astraura_storage_event_sync', JSON.stringify(message));
      } catch (err) {
        // Storage quota / privacy error
      }
    }
  }
}

export const sovereignBroadcastBus = new SovereignBroadcastBus();
