/**
 * Astraura OmniVoice & audio.cpp 1.58-Bit Speech Engine (StarSeed OS)
 * Pure open-source, local, quantized and affective voice system.
 * Features:
 * - Acoustic Echo Cancellation (AEC) & Self-Voice Acoustic Blanking
 * - Dynamic N-Gram & Substring Self-Audio Recognition (Anti-Loop / Anti-Self-Interruption Guard)
 * - Intelligent Conversational VAD End-of-Turn Cadence (Respects natural human breathing, hesitations and fillers)
 * - audio.cpp backend synthesis, WebAudio DSP formant styling, real-time Siri-style Orb telemetry
 * - Direct 1.58-Bit Conversational streaming with natural turn-taking
 * - Multi-personality dialogue routing with authentic prosody per persona
 */

class OmniVoiceEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.ambientRecognition = null;
    this.convRecognition = null;
    this.audioCtx = null;
    this.currentAudioElement = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.isListening = false;
    this.isContinuousListening = false;
    this.isConversationActive = false;
    this.suppressRecognition = false;
    this.echoCooldownUntil = 0;
    this.spokenMemoryBuffer = []; // Rolling buffer of recent AI spoken phrases for acoustic echo rejection
    this.lastSpokenText = '';
    this.currentUtterance = null;
    this.availableVoices = [];
    this.analyser = null;
    this.micAnalyser = null;
    this.micStream = null;
    this.audioSourceNode = null;
    this.globalPlaybackRate = 1.0;
    this.lastSpokenPayload = null;
    this.listeners = new Map();
    this.activeVoicePersonaId = 'aurora';
    this._speechTimer = null;
    this.progressiveQueue = [];
    this.progressiveTokenAccumulator = '';
    this.isProgressiveStreamActive = false;
    this.progressivePersonaId = 'aurora';
    this.progressiveVoiceProfile = {};
    this.isPlayingProgressiveChunk = false;

    this._initVoices();
    this._initRecognition();
  }

  // Event Subscription System
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try { cb(data); } catch (e) { console.error('Voice listener error:', e); }
      }
    }
  }

  _ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        this.micAnalyser = this.audioCtx.createAnalyser();
        this.micAnalyser.fftSize = 256;
        this.micAnalyser.smoothingTimeConstant = 0.8;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Connects microphone audio stream to micAnalyser for real-time Siri Orb reactivity when user speaks
   */
  async startMicAnalyser() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      this._ensureAudioContext();
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const micSource = this.audioCtx.createMediaStreamSource(this.micStream);
        micSource.connect(this.micAnalyser);
      }
    } catch (err) {
      console.warn('Microphone audio analyser not accessible:', err);
    }
  }

  _initVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      this.availableVoices = this.synth.getVoices();
      this.emit('voices_loaded', this.availableVoices);
    };
    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  _initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';
    }
  }

  getVoices() {
    if (this.synth && this.availableVoices.length === 0) {
      this.availableVoices = this.synth.getVoices();
    }
    return this.availableVoices;
  }

  getSpanishVoices() {
    const all = this.getVoices();
    const es = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES') || v.lang.includes('spa'));
    
    // Prioritize natural neural and enhanced voices
    return es.length > 0 ? es.sort((a, b) => {
      const getScore = (v) => {
        let score = 0;
        const name = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
        if (name.includes('natural') || name.includes('neural')) score += 10;
        if (name.includes('paloma') || name.includes('elvira') || name.includes('dalia') || name.includes('salome') || name.includes('aurora')) score += 8;
        if (name.includes('paulina') || name.includes('monica') || name.includes('siri') || name.includes('lucia')) score += 6;
        if (name.includes('google')) score += 5;
        if (name.includes('female') || name.includes('mujer') || name.includes('femenin')) score += 4;
        if (name.includes('enhanced') || name.includes('premium')) score += 3;
        return score;
      };
      return getScore(b) - getScore(a);
    }) : all;
  }

  getSpanishMaleVoices() {
    const all = this.getVoices();
    const es = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES') || v.lang.includes('spa'));
    const male = es.filter(v => {
      const name = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
      return name.includes('male') || name.includes('hombre') || name.includes('masculin') || 
             name.includes('jorge') || name.includes('diego') || name.includes('juan') || 
             name.includes('carlos') || name.includes('miguel') || name.includes('alvaro') || 
             name.includes('enrique') || name.includes('pablo') || name.includes('gonzalo') || 
             name.includes('raul') || name.includes('voz 2') || name.includes('voice 2');
    });
    return male.length > 0 ? male : (es.length > 1 ? [es[es.length - 1], ...es] : es);
  }

  getSpanishFemaleVoices() {
    const all = this.getVoices();
    const es = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES') || v.lang.includes('spa'));
    const female = es.filter(v => {
      const name = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
      return name.includes('female') || name.includes('mujer') || name.includes('femenin') ||
             name.includes('monica') || name.includes('paulina') || name.includes('lucia') ||
             name.includes('paloma') || name.includes('elvira') || name.includes('dalia') ||
             name.includes('salome') || name.includes('aurora') || name.includes('siri') || 
             name.includes('voz 1') || name.includes('voice 1') || name.includes('marta');
    });
    return female.length > 0 ? female : es;
  }

  /**
   * Intelligently discovers and maps the optimal native voice per persona
   * Ensuring Aurora, Hermione, Atenea, Oneiros, etc. never sound like clones of each other!
   */
  /**
   * Intelligently discovers and maps the optimal native voice per persona
   * Prioritizing high-fidelity Neural, Natural, and Enhanced human voices on macOS/Chrome/Safari.
   */
  findBestVoiceForPersona(personaId, userOptions = {}) {
    const all = this.getVoices();
    const esVoices = this.getSpanishVoices();
    const targetVoiceId = userOptions.bound_native_voice || userOptions.voice_speaker || userOptions.voice_id || userOptions.voiceURI || userOptions.native_voice_id;

    const getVoiceQualityScore = (voice) => {
      const name = (voice.name + ' ' + (voice.voiceURI || '')).toLowerCase();
      let score = 0;
      if (name.includes('natural') || name.includes('online')) score += 50;
      if (name.includes('enhanced') || name.includes('premium')) score += 40;
      if (name.includes('siri')) score += 35;
      if (name.includes('neural')) score += 30;
      if (name.includes('google')) score += 20;
      return score;
    };

    // 1. Direct explicit voice selection by bound name or voiceURI
    if (targetVoiceId && all.length > 0) {
      const targetClean = targetVoiceId.trim().toLowerCase();
      const found = all.find(v => 
        v.voiceURI === targetVoiceId || 
        v.name.toLowerCase() === targetClean ||
        v.name.toLowerCase().includes(targetClean) ||
        targetClean.includes(v.name.toLowerCase())
      );
      if (found) return found;
    }

    if (esVoices.length === 0) return all[0] || null;

    // Sort Spanish voices by audio fidelity
    const sortedEsVoices = [...esVoices].sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));

    // 2. Explicit Gender-driven selection from userOptions
    const explicitGender = (userOptions.gender || '').toLowerCase();
    if (explicitGender === 'male' || explicitGender === 'deep_resonant') {
      const maleVoices = this.getSpanishMaleVoices().sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));
      if (maleVoices.length > 0) {
        if (personaId === 'hephaestus') return maleVoices[0];
        if (personaId === 'hermes') return maleVoices.length > 1 ? maleVoices[1] : maleVoices[0];
        if (personaId === 'logos') return maleVoices[maleVoices.length - 1];
        return maleVoices[0];
      }
    } else if (explicitGender === 'female' || explicitGender === 'ethereal') {
      const femaleVoices = this.getSpanishFemaleVoices().sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));
      if (femaleVoices.length > 0) {
        if (personaId === 'aurora') return femaleVoices[0];
        if (personaId === 'hermione') return femaleVoices.length > 1 ? femaleVoices[1] : femaleVoices[0];
        if (personaId === 'atenea') return femaleVoices.length > 2 ? femaleVoices[2] : (femaleVoices[1] || femaleVoices[0]);
        if (personaId === 'oneiros') return femaleVoices[femaleVoices.length - 1];
        return femaleVoices[0];
      }
    }

    // 3. Persona Priority Mapping with specific natural voice tokens
    const personaPriorities = {
      aurora: ['elvira', 'paloma', 'monica (enhanced)', 'mónica (enhanced)', 'monica', 'mónica', 'siri voz 1', 'siri (voz 1)', 'siri', 'dalia', 'google español', 'es-es', 'es_es'],
      hephaestus: ['alvaro', 'álvaro', 'jorge (enhanced)', 'jorge', 'diego (enhanced)', 'diego', 'juan (enhanced)', 'juan', 'siri voz 2', 'siri (voz 2)', 'carlos', 'male', 'hombre'],
      hermione: ['abril', 'paulina (enhanced)', 'paulina', 'francisca', 'dalia', 'salome', 'salomé', 'lucia (enhanced)', 'lucia', 'lucía', 'elvira', 'es-mx', 'es_mx'],
      atenea: ['raquel', 'soledad', 'helena', 'elena', 'marta', 'monica', 'mónica', 'es-co', 'es_co'],
      oneiros: ['arnau', 'angelica', 'angélica', 'whisper', 'siri', 'marta', 'es-us', 'es_us', 'soledad'],
      hermes: ['jorge', 'diego', 'carlos', 'juan', 'alvaro', 'álvaro', 'es-ar', 'es_ar'],
      mnemosyne: ['paloma', 'helena', 'elena', 'soledad', 'monica', 'mónica'],
      logos: ['nil', 'juan', 'jorge', 'alvaro', 'álvaro', 'diego'],
      kallisti: ['triana', 'paloma', 'paulina', 'lucia', 'dalia']
    };

    const targetList = personaPriorities[personaId] || personaPriorities.aurora;

    for (const token of targetList) {
      const candidates = sortedEsVoices.filter(v => {
        const full = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
        return full.includes(token);
      });
      if (candidates.length > 0) {
        // Return highest quality candidate matching token
        return candidates[0];
      }
    }

    // 4. Fallback: gender distribution according to standard persona archetypes
    if (['hephaestus', 'hermes', 'logos'].includes(personaId)) {
      const maleVoices = this.getSpanishMaleVoices().sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));
      if (maleVoices.length > 0) return maleVoices[0];
    } else {
      const femaleVoices = this.getSpanishFemaleVoices().sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));
      if (femaleVoices.length > 0) return femaleVoices[0];
    }

    return sortedEsVoices[0];
  }

  /**
   * VoiceStudio API Client Methods (Zero-Shot Cloning, Voice Design, SFX, Auto-Evolve)
   */
  async autoEvolveVoice(personaId = 'aurora', context = '', memories = [], mood = 'natural') {
    try {
      const res = await fetch('/api/voice_studio/auto_evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId, context, memories, mood })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async fetchVoiceStudioProfiles() {
    try {
      const res = await fetch('/api/voice_studio/profiles');
      if (res.ok) {
        const data = await res.json();
        const profiles = data.profiles || [];
        this.vaultProfiles = {};
        for (const p of profiles) {
          if (p.persona_id) {
            this.vaultProfiles[p.persona_id] = p;
          }
          if (p.id) {
            this.vaultProfiles[p.id] = p;
          }
        }
        return profiles;
      }
    } catch (e) {
      console.warn('VoiceStudio profiles fetch notice:', e);
    }
    return [];
  }

  async fetchLanguagesCatalogue() {
    try {
      const res = await fetch('/api/voice_studio/languages');
      if (res.ok) {
        const data = await res.json();
        return data.languages || [];
      }
    } catch (e) {
      console.warn('VoiceStudio languages fetch notice:', e);
    }
    return [];
  }

  async cloneVoiceFromSample(audioBase64, name, language = 'es', personaId = null) {
    try {
      const res = await fetch('/api/voice_studio/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: audioBase64, name, language, persona_id: personaId })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async designVoiceProfile(params) {
    try {
      const res = await fetch('/api/voice_studio/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async updateVoiceStudioProfile(voiceId, updates) {
    try {
      const res = await fetch(`/api/voice_studio/profiles/${voiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async deleteVoiceStudioProfile(voiceId) {
    try {
      const res = await fetch(`/api/voice_studio/profiles/${voiceId}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async assignVoiceToPersona(voiceId, personaId) {
    try {
      const res = await fetch('/api/voice_studio/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, persona_id: personaId })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        if (!this.vaultAssignedVoices) this.vaultAssignedVoices = {};
        this.vaultAssignedVoices[personaId] = data.profile;
      }
      return data;
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async exportVoiceProfile(voiceId) {
    try {
      const res = await fetch(`/api/voice_studio/export/${voiceId}`);
      if (!res.ok) throw new Error('Error al exportar perfil');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice_profile_${voiceId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async exportAllVoiceProfiles() {
    try {
      const res = await fetch('/api/voice_studio/export_all');
      if (!res.ok) throw new Error('Error al exportar bóveda');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `astraura_voice_vault_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async importVoiceProfiles(jsonData) {
    try {
      const res = await fetch('/api/voice_studio/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async fetchLearningMatrix(personaId = null) {
    try {
      const url = personaId ? `/api/voice_studio/learning_matrix?persona_id=${encodeURIComponent(personaId)}` : '/api/voice_studio/learning_matrix';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Learning matrix fetch notice:', e);
    }
    return { success: false };
  }

  /**
   * 1.58-Bit Live Microphone Acoustic Analysis (Ternary Spectrum, Energy & Prosody)
   */
  async analyzeMicrophone158(audioData, targetPersonaId = 'aurora') {
    try {
      let b64 = audioData;
      if (audioData instanceof Blob) {
        b64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioData);
        });
      }

      const res = await fetch('/api/voice_studio/analyze_mic_158', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_data: b64, target_persona_id: targetPersonaId })
      });
      return await res.json();
    } catch (e) {
      console.warn('1.58b mic analysis notice:', e);
      return { success: false, error: String(e) };
    }
  }

  /**
   * Fetches the Multi-Agent Branched Acoustic Memory Network
   */
  async fetchBranchedMemories(personaId = null) {
    try {
      const url = personaId ? `/api/voice_studio/branched_memories?persona_id=${encodeURIComponent(personaId)}` : '/api/voice_studio/branched_memories';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Branched memories fetch notice:', e);
    }
    return { success: false };
  }

  /**
   * Records an acoustic memory node in the agent's brain and triggers synaptic cross-bridges
   */
  async recordBranchedAcousticMemory(personaId, domain, userSentiment, speechMetrics = {}, dialogueSnippet = '') {
    try {
      const res = await fetch('/api/voice_studio/branched_memories/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: personaId,
          domain,
          user_sentiment: userSentiment,
          user_speech_metrics: speechMetrics,
          dialogue_snippet: dialogueSnippet
        })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async generateSFX(prompt, category = 'ambient', durationSeconds = 3.0, parameters = {}) {
    try {
      const res = await fetch('/api/voice_studio/generate_sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category, duration_seconds: durationSeconds, parameters })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  /**
   * Real-time WebAudio Procedural Sound FX Synthesizer (0ms Latency)
   */
  playProceduralSound(type = 'quantum_chime') {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this._ensureAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      if (type === 'quantum_chime') {
        const freqs = [528, 792, 1056, 1584];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          
          gain.gain.setValueAtTime(0.18 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

          osc.connect(gain);
          gain.connect(this.analyser || ctx.destination);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 2.2);
        });
      } else if (type === 'radar_pulse') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'starseed_chord') {
        const freqs = [261.63, 329.63, 392.00, 493.88, 587.33];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.8);
        });
      }
    } catch (err) {
      console.warn('Procedural sound synth notice:', err);
    }
  }

  /**
   * Set global playback speed rate (0.5x to 2.5x)
   */
  setPlaybackRate(rate) {
    const clamped = Math.max(0.5, Math.min(2.5, rate));
    this.globalPlaybackRate = clamped;
    if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = clamped;
    }
    this.emit('rate_change', clamped);
  }

  getPlaybackRate() {
    return this.globalPlaybackRate;
  }

  /**
   * Pause active audio playback
   */
  pause() {
    if (this.currentAudioElement && !this.currentAudioElement.paused) {
      this.currentAudioElement.pause();
      this.isPaused = true;
      this.emit('state_change', 'paused');
    } else if (this.synth && this.isSpeaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.emit('state_change', 'paused');
    }
  }

  /**
   * Resume paused audio playback
   */
  resume() {
    if (this.currentAudioElement && this.currentAudioElement.paused) {
      this.currentAudioElement.play().catch(() => {});
      this.isPaused = false;
      this.emit('state_change', 'speaking');
    } else if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.emit('state_change', 'speaking');
    }
  }

  /**
   * Regenerate / Re-speak the last speech payload
   */
  regenerate() {
    if (this.lastSpokenPayload) {
      const { text, options, onStart, onEnd } = this.lastSpokenPayload;
      this.stopSpeaking();
      this.speak(text, options, onStart, onEnd);
    }
  }

  /**
   * Normalizes text for phonetic/acoustic comparison
   */
  _normalizeTextForAcousticMatch(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts word N-grams for fuzzy phrase matching
   */
  _extractNGrams(words, n) {
    const ngrams = new Set();
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Records newly synthesized text into the rolling self-voice memory buffer for acoustic echo suppression
   */
  recordSpokenPhrase(text) {
    if (!text) return;
    const clean = this._normalizeTextForAcousticMatch(text);
    if (!clean || clean.length < 2) return;

    const words = clean.split(/\s+/).filter(Boolean);
    const tokens = new Set(words);
    const bigrams = this._extractNGrams(words, 2);
    const trigrams = this._extractNGrams(words, 3);

    this.spokenMemoryBuffer.push({
      raw: text,
      clean,
      words,
      tokens,
      bigrams,
      trigrams,
      timestamp: Date.now()
    });

    this.lastSpokenText = clean;

    // Retain only memory from the last 60 seconds (max 50 records)
    const cutoff = Date.now() - 60000;
    this.spokenMemoryBuffer = this.spokenMemoryBuffer.filter(m => m.timestamp > cutoff).slice(-50);
  }

  /**
   * High-accuracy Acoustic Echo & Self-Voice Detector
   * Returns true if incoming candidate text is likely the AI's own audio picked up by the microphone.
   */
  isAcousticSelfEcho(candidateText) {
    if (!candidateText) return false;
    const cleanCandidate = this._normalizeTextForAcousticMatch(candidateText);
    if (!cleanCandidate || cleanCandidate.length < 2) return false;

    const candidateWords = cleanCandidate.split(/\s+/).filter(Boolean);
    if (candidateWords.length === 0) return false;

    const candidateBigrams = this._extractNGrams(candidateWords, 2);
    const now = Date.now();

    for (const memory of this.spokenMemoryBuffer) {
      if (now - memory.timestamp > 45000) continue;

      // 1. Direct inclusion or exact match
      if (memory.clean.includes(cleanCandidate) || cleanCandidate.includes(memory.clean)) {
        return true;
      }

      // 2. Multi-word intersection
      if (candidateWords.length >= 2) {
        let matchedWords = 0;
        for (const w of candidateWords) {
          if (memory.tokens.has(w) && w.length > 2) {
            matchedWords++;
          }
        }
        const matchRatio = matchedWords / candidateWords.length;
        if (matchRatio >= 0.32) {
          return true;
        }

        // 3. Bigram match
        for (const bg of candidateBigrams) {
          if (memory.bigrams.has(bg)) {
            return true;
          }
        }
      } else if (candidateWords.length === 1 && candidateWords[0].length >= 4) {
        if (memory.tokens.has(candidateWords[0])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks if the system is currently outputting audio or in reverberation cooldown
   */
  isProducingSound() {
    if (this.isSpeaking) return true;
    if (this.suppressRecognition) return true;
    if (Date.now() < this.echoCooldownUntil) return true;

    // Check output WebAudio Analyser energy
    if (this.analyser) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < Math.min(32, data.length); i++) sum += data[i];
      const avgEnergy = sum / 32 / 255;
      if (avgEnergy > 0.012) return true;
    }
    return false;
  }

  /**
   * Normalized acoustic energy from microphone (0.0 to 1.0)
   */
  getMicAcousticEnergy() {
    if (!this.micAnalyser) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < Math.min(32, data.length); i++) sum += data[i];
    return sum / 32 / 255;
  }

  /**
   * Analyzes human conversational cadence, grammar, connectors, fillers and punctuation
   * to determine dynamic endpoint pause timeout (respecting natural speech rhythm and breathing space).
   */
  analyzeTurnCadence(transcript) {
    if (!transcript) return { isComplete: false, timeoutMs: 1400, reason: 'empty' };
    const clean = transcript.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    if (wordCount === 0) return { isComplete: false, timeoutMs: 1400, reason: 'empty' };

    const lastWordRaw = words[words.length - 1].toLowerCase();
    const lastWord = lastWordRaw.replace(/[^a-záéíóúñ]/gi, '');

    // 1. Hesitation & Thinking fillers (User is thinking / saying "eh...", pause longer)
    const hesitationFillers = new Set([
      'este', 'eh', 'ehm', 'em', 'mmm', 'mm', 'uh', 'um', 'pues', 'bueno',
      'osea', 'tipo', 'digamos'
    ]);

    // 2. Incomplete Connectors & Conjunctions (User is mid-sentence, expecting to add clauses)
    const incompleteConnectors = new Set([
      'y', 'e', 'o', 'u', 'pero', 'mas', 'sino', 'porque', 'que', 'como',
      'cuando', 'donde', 'si', 'aunque', 'para', 'de', 'con', 'en', 'por',
      'sobre', 'hacia', 'desde', 'hasta', 'sin', 'tras', 'entre', 'segun',
      'según', 'contra', 'entonces', 'ademas', 'además', 'tambien', 'también',
      'cual', 'cuyo', 'quien', 'quién'
    ]);

    const hasTrailingEllipsis = clean.endsWith('...') || clean.endsWith('—') || clean.endsWith('-');
    const hasTrailingComma = clean.endsWith(',') || clean.endsWith(';');
    const hasQuestion = clean.endsWith('?') || clean.includes('¿');
    const hasExclamation = clean.endsWith('!') || clean.includes('¡');
    const hasPeriod = clean.endsWith('.');

    const isHesitating = hesitationFillers.has(lastWord) || hasTrailingEllipsis || clean.endsWith('o sea') || clean.endsWith('es decir');
    const isMidClause = incompleteConnectors.has(lastWord) || hasTrailingComma;

    let timeoutMs = 1200;
    let reason = 'default';

    if (isHesitating) {
      // User is thinking / hesitating: allow 2400ms of comfortable reflection
      timeoutMs = 2400;
      reason = 'hesitation_pause';
    } else if (isMidClause) {
      // User left a conjunction/connector open: allow 2000ms to complete thought
      timeoutMs = 2000;
      reason = 'connector_pause';
    } else if (wordCount <= 2) {
      // Very short utterance (e.g. "Hola", "Alex"): wait 1600ms to see if expanding
      timeoutMs = 1600;
      reason = 'short_utterance';
    } else if (hasQuestion || hasExclamation) {
      // Direct question or exclamation: definitive prompt
      timeoutMs = wordCount >= 4 ? 900 : 1200;
      reason = 'terminal_punctuation';
    } else if (hasPeriod && wordCount >= 5) {
      // Complete declarative sentence
      timeoutMs = 1000;
      reason = 'sentence_period';
    } else {
      // Natural conversational breath gap
      timeoutMs = 1300;
      reason = 'conversational_gap';
    }

    return {
      isComplete: !isHesitating && !isMidClause && (hasQuestion || hasExclamation || (hasPeriod && wordCount >= 4)),
      timeoutMs,
      reason,
      wordCount,
      lastWord
    };
  }

  /**
   * Cleans and formats text into expressive, natural conversational spoken Spanish.
   * Expands technical terms and acronyms into melodic, human phonetic flow.
   */
  _prepareNaturalText(text) {
    if (!text) return '';
    return text
      // Remove code blocks with smooth verbal transitions
      .replace(/```[\w]*\n([\s\S]*?)```/g, 'Aquí tienes el fragmento de código.')
      .replace(/`([^`]+)`/g, '$1')
      // Expand common Spanish & tech acronyms for natural human phonetics
      .replace(/\b1\.58b\b/gi, 'uno punto cincuenta y ocho bits')
      .replace(/\b1\.58\s*bits\b/gi, 'uno punto cincuenta y ocho bits')
      .replace(/\bBitNet\b/gi, 'BitNet')
      .replace(/\bApple Silicon\b/gi, 'Ápol Sílicon')
      .replace(/\bM1\b/g, 'M uno')
      .replace(/\bM2\b/g, 'M dos')
      .replace(/\bM3\b/g, 'M tres')
      .replace(/\bARM64\b/gi, 'ARM sesenta y cuatro')
      .replace(/\bNEON\b/g, 'Neón')
      .replace(/\bUI\b/g, 'interfaz')
      .replace(/\bUX\b/g, 'experiencia de usuario')
      .replace(/\bIA\b/g, 'I A')
      .replace(/\bAI\b/g, 'I A')
      .replace(/\bAPI\b/g, 'A P I')
      .replace(/\bAPIs\b/g, 'A P Is')
      .replace(/\bOS\b/g, 'O S')
      .replace(/\bp\.\s*ej\./gi, 'por ejemplo')
      .replace(/\betc\./gi, 'etcétera')
      .replace(/\bvs\./gi, 'versus')
      .replace(/\baprox\./gi, 'aproximadamente')
      .replace(/\bnúm\./gi, 'número')
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bSr\./g, 'Señor')
      .replace(/\bSra\./g, 'Señora')
      .replace(/\bkHz\b/gi, 'kiloherzios')
      .replace(/\bHz\b/gi, 'herzios')
      .replace(/\bMB\b/g, 'megabytes')
      .replace(/\bGB\b/g, 'gigabytes')
      .replace(/\bFPS\b/gi, 'fotogramas por segundo')
      .replace(/\bVRAM\b/gi, 'V-RAM')
      .replace(/\bRAM\b/g, 'RAM')
      .replace(/\bCPU\b/g, 'C P U')
      .replace(/\bGPU\b/g, 'G P U')
      // Remove headers and Markdown symbols
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[[\](){}]/g, ' ')
      .replace(/[|><~_^]/g, ' ')
      // Replace emojis that cause speech stutter with natural cadence
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      // Smooth list items into natural conversational flow
      .replace(/^\s*[-*+]\s+/gm, ' ')
      .replace(/^\s*\d+\.\s+/gm, ' ')
      // Normalize spacing and punctuation for natural pauses
      .replace(/\s*([,.;:!?])\s*/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * High-Fidelity Synthesis via audio.cpp 1.58-Bit Engine with Fallback
   */
  async speakWithAudioCpp(text, voiceProfile = {}, onStart = null, onEnd = null) {
    this.stopSpeaking();
    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    this.lastSpokenPayload = { text, options: voiceProfile, onStart, onEnd };
    this.activeVoicePersonaId = voiceProfile.persona_id || 'aurora';
    this.recordSpokenPhrase(cleanText);

    try {
      this._ensureAudioContext();
      this.isSpeaking = true;
      this.isPaused = false;
      this.suppressRecognition = true;
      this.emit('state_change', 'speaking');
      if (onStart) onStart();

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          persona_id: voiceProfile.persona_id || 'aurora',
          voice_profile: voiceProfile,
          as_base64: true
        })
      });

      if (!response.ok) {
        throw new Error(`Synthesis HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.audio_base64) {
        throw new Error(data.error || 'No audio received from audio.cpp');
      }

      const audio = new Audio(data.audio_base64);
      audio.playbackRate = this.globalPlaybackRate;
      this.currentAudioElement = audio;

      if (this.audioCtx && this.analyser) {
        try {
          const source = this.audioCtx.createMediaElementSource(audio);
          source.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
          this.audioSourceNode = source;
        } catch (e) {}
      }

      audio.onended = () => {
        this.currentAudioElement = null;
        this.echoCooldownUntil = Date.now() + 900; // 900ms reverberation guard
        setTimeout(() => {
          this.isSpeaking = false;
          this.isPaused = false;
          this.suppressRecognition = false;
          this.emit('state_change', 'idle');
          if (onEnd) onEnd();
        }, 900);
      };

      audio.onerror = (e) => {
        console.warn('Audio playback notice, fallback to WebSpeech:', e);
        this.currentAudioElement = null;
        this.speak(cleanText, voiceProfile, onStart, onEnd);
      };

      await audio.play();
    } catch (e) {
      this.speak(cleanText, voiceProfile, onStart, onEnd);
    }
  }

  /**
   * Procedural WebAudio Human Breath & Acoustic Foley Synthesizer
   * Creates organic, glottal micro-breaths, soft aspirational pauses and articulatory clicks.
   */
  playHumanBreathSound(intensity = 0.25, type = 'soft_intake') {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this._ensureAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * (type === 'deep_sigh' ? 0.35 : 0.12));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink-filtered glottal noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Resonant bandpass filter matching human vocal tract F2/F3 breath envelope
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(type === 'deep_sigh' ? 1200 : 1850, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      const gainPeak = Math.max(0.01, Math.min(0.18, intensity * 0.14));
      
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak, now + (type === 'deep_sigh' ? 0.12 : 0.04));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'deep_sigh' ? 0.34 : 0.11));

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser || ctx.destination);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + (type === 'deep_sigh' ? 0.35 : 0.12));
    } catch (e) {
      // Non-critical audio foley notice
    }
  }

  /**
   * Splits text into rhythmic human conversational clauses with deep linguistic context,
   * punctuation semantics (questions, exclamations, drama, pauses, suspensions, parentheticals).
   */
  _splitIntoExpressiveClauses(text, options = {}) {
    if (!text) return [];
    const rawClauses = text.match(/[^,.;:!?\n—]+[,.;:!?\n—]*/g) || [text];
    const clauses = [];

    const dramaMult = 1.0 + ((options.drama_level !== undefined ? options.drama_level : 0.35) * 1.2);
    const emoExagg = options.emotional_exaggeration !== undefined ? options.emotional_exaggeration : 0.40;

    let searchOffset = 0;

    for (let c of rawClauses) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      
      const clauseStartInText = text.indexOf(c, searchOffset);
      if (clauseStartInText !== -1) {
        searchOffset = clauseStartInText + c.length;
      }
      
      const lower = trimmed.toLowerCase();
      let type = 'statement';
      let pauseDelay = Math.round(70 * dramaMult);
      let needsBreathBefore = false;
      let pitchModifier = 1.0;
      let rateModifier = 1.0;
      let volumeModifier = 1.0;

      // 1. CUESTIONAMIENTO & INTERROGACIÓN (Terminal Up-Glide)
      if (trimmed.endsWith('?') || trimmed.includes('¿') || /\b(por qué|cómo|qué|cuál|cuándo|dónde|quién|será|acaso|crees|sientes|verdad)\b/i.test(lower)) {
        type = 'question';
        pitchModifier = 1.0 + (0.16 + emoExagg * 0.24);
        rateModifier = 0.94;
        pauseDelay = Math.round((280 + emoExagg * 200) * dramaMult);
      }
      // 2. EXCLAMACIÓN, ASOMBRO & ALTERACIÓN (Dynamic Burst Attack)
      else if (trimmed.endsWith('!') || trimmed.includes('¡') || /\b(increíble|asombroso|cuidado|vamos|exacto|eureka|alerta|jamás|wow)\b/i.test(lower)) {
        type = 'exclamation';
        pitchModifier = 1.0 + (0.20 + emoExagg * 0.28);
        rateModifier = 1.0 + (0.08 + emoExagg * 0.12);
        volumeModifier = 1.25;
        pauseDelay = Math.round(240 * dramaMult);
        needsBreathBefore = true;
      }
      // 3. SUSPENSIÓN, DUDA & REFLEXIÓN FILOSÓFICA (Puntos suspensivos, pausas hondas)
      else if (trimmed.endsWith('...') || trimmed.endsWith('—') || /\b(hmm|veamos|bueno|acaso|tal vez)\b/i.test(lower)) {
        type = 'suspension';
        pitchModifier = 0.90 - (emoExagg * 0.08);
        rateModifier = 0.84;
        pauseDelay = Math.round((600 + emoExagg * 350) * dramaMult);
        needsBreathBefore = true;
      }
      // 4. PARÉNTESIS O GUIONES (Incisos confidenciales / explicativos)
      else if (/^[\(\[\—]/.test(trimmed) || /[\)\]\—]$/.test(trimmed)) {
        type = 'parenthetical';
        pitchModifier = 0.94;
        rateModifier = 1.10;
        pauseDelay = Math.round(110 * dramaMult);
      }
      // 5. COMAS & PUNTOS Y COMA (Pausas breves con entonación sostenida)
      else if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
        type = 'comma';
        pitchModifier = 1.03;
        pauseDelay = Math.round((140 + (options.drama_level || 0.35) * 120) * dramaMult);
      }
      // 6. DOS PUNTOS (Pausa de expectación)
      else if (trimmed.endsWith(':')) {
        type = 'colon';
        pitchModifier = 1.06;
        pauseDelay = Math.round(240 * dramaMult);
      }
      // 7. PUNTO FINAL DE ORACIÓN (Cadencia descendente humana)
      else if (trimmed.endsWith('.')) {
        type = 'period';
        pitchModifier = 0.96;
        pauseDelay = Math.round((340 + (options.drama_level || 0.35) * 220) * dramaMult);
      }

      // Attitude & Temperament fine tuning
      const attitude = options.attitude || '';
      if (attitude.includes('Sarcástica') || attitude.includes('Mordaz')) {
        pitchModifier *= 1.08;
        rateModifier *= 0.90;
      } else if (attitude.includes('Estoica') || attitude.includes('Firme')) {
        pitchModifier *= 0.92;
        rateModifier *= 0.98;
      } else if (attitude.includes('Poética') || attitude.includes('Contemplativa')) {
        pitchModifier *= 0.96;
        rateModifier *= 0.88;
        pauseDelay = Math.round(pauseDelay * 1.35);
      } else if (attitude.includes('Científica') || attitude.includes('Precisa')) {
        rateModifier *= 1.08;
      } else if (attitude.includes('Cálida') || attitude.includes('Maternal')) {
        pitchModifier *= 0.98;
        volumeModifier *= 0.95;
      }

      clauses.push({
        text: trimmed,
        startChar: clauseStartInText !== -1 ? clauseStartInText : 0,
        type,
        pitchModifier,
        rateModifier,
        volumeModifier,
        pauseDelay,
        needsBreathBefore
      });
    }

    return clauses.length > 0 ? clauses : [{ text: text, startChar: 0, type: 'statement', pitchModifier: 1.0, rateModifier: 1.0, volumeModifier: 1.0, pauseDelay: 80 }];
  }

  /**
   * Expressive, Natural Humanized Speech Synthesis with Personality Prosody Shaping & Cognitive Learning
   */
  speak(text, options = {}, onStart = null, onEnd = null, onBoundary = null) {
    if (!this.synth) return;
    this.stopSpeaking();

    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    // Merge options with cached vault profile for the active persona if available
    const personaId = options.persona_id || options.voice_id || 'aurora';
    this.activeVoicePersonaId = personaId;
    const vaultProfile = (this.vaultProfiles && (this.vaultProfiles[personaId] || this.vaultProfiles[options.id])) || {};
    const effectiveOptions = { ...vaultProfile, ...options };

    this.lastSpokenPayload = { text, options: effectiveOptions, onStart, onEnd };
    this.isSpeaking = true;
    this.isPaused = false;
    this.suppressRecognition = true;
    this.recordSpokenPhrase(cleanText);
    this.emit('state_change', 'speaking');
    this.emit('persona_change', {
      id: personaId,
      name: effectiveOptions.name || personaId,
      color: effectiveOptions.primary || effectiveOptions.color || '#00f0ff'
    });

    // Parse clauses with rich emotional punctuation, question detection, and drama
    const clauses = this._splitIntoExpressiveClauses(cleanText, effectiveOptions);
    if (clauses.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    // Resolve best native voice uniquely matching the persona and gender
    let selectedVoice = this.findBestVoiceForPersona(personaId, effectiveOptions);

    // 1. Calculate Base Pitch from pitch_base_hz (80Hz - 320Hz)
    let basePitch = 1.0;
    if (effectiveOptions.pitch_base_hz !== undefined && effectiveOptions.pitch_base_hz !== null) {
      const hz = Number(effectiveOptions.pitch_base_hz);
      basePitch = Math.max(0.48, Math.min(1.95, 0.48 + Math.pow((hz - 65) / 255, 1.05) * 1.40));
    } else if (effectiveOptions.pitch !== undefined) {
      basePitch = Math.max(0.48, Math.min(1.95, Number(effectiveOptions.pitch)));
    } else {
      switch (personaId) {
        case 'hephaestus': basePitch = 0.74; break;
        case 'hermes': basePitch = 0.94; break;
        case 'logos': basePitch = 0.84; break;
        case 'hermione': basePitch = 1.15; break;
        case 'atenea': case 'athena': basePitch = 0.96; break;
        case 'oneiros': basePitch = 1.22; break;
        case 'mnemosyne': basePitch = 0.88; break;
        case 'kallisti': basePitch = 1.18; break;
        case 'aurora': default: basePitch = 1.08; break;
      }
    }

    // 2. Calculate Base Rate from cadence_rate (0.70x - 1.50x)
    let baseRate = 1.0 * this.globalPlaybackRate;
    if (effectiveOptions.cadence_rate !== undefined && effectiveOptions.cadence_rate !== null) {
      baseRate = Math.max(0.65, Math.min(1.65, Number(effectiveOptions.cadence_rate) * this.globalPlaybackRate));
    } else if (effectiveOptions.rate !== undefined) {
      baseRate = Math.max(0.65, Math.min(1.65, Number(effectiveOptions.rate) * this.globalPlaybackRate));
    }

    let baseVolume = 1.0;

    // 3. Physical Vocal Tract Modulators (Audible & Perceptible Acoustic Range)
    const jawOpenness = effectiveOptions.jaw_openness !== undefined ? Number(effectiveOptions.jaw_openness) : 0.55;
    const jawShift = (jawOpenness - 0.5) * 0.28;
    const jawRateShift = (jawOpenness - 0.5) * 0.10;

    const glottalTension = effectiveOptions.glottal_tension !== undefined ? Number(effectiveOptions.glottal_tension) : 0.50;
    const glottalTensionShift = (glottalTension - 0.5) * 0.32;
    const glottalRateShift = (glottalTension - 0.5) * 0.12;

    const chestResonance = effectiveOptions.chest_resonance !== undefined ? Number(effectiveOptions.chest_resonance) : 0.45;
    const chestShift = -(chestResonance * 0.22);

    const nasalResonance = effectiveOptions.nasal_resonance !== undefined ? Number(effectiveOptions.nasal_resonance) : 0.15;
    const nasalShift = nasalResonance * 0.18;

    const warmth = effectiveOptions.warmth !== undefined ? Number(effectiveOptions.warmth) : 0.85;
    const warmthPitch = (0.5 - warmth) * 0.12;
    const warmthRate = (0.5 - warmth) * 0.08;

    const clarity = effectiveOptions.clarity !== undefined ? Number(effectiveOptions.clarity) : 0.92;
    const clarityRate = (clarity - 0.5) * 0.10;

    const attack = effectiveOptions.glottal_attack || 'balanced';
    const attackRateMult = attack === 'hard' ? 1.10 : (attack === 'soft' ? 0.92 : 1.0);
    const attackPitchShift = attack === 'hard' ? 0.06 : (attack === 'soft' ? -0.04 : 0.0);

    const driftIntensity = effectiveOptions.pitch_drift_stochastic !== undefined ? Number(effectiveOptions.pitch_drift_stochastic) : 0.25;

    // Initial Organic Breath Intake if breathiness > 0.05 or micro_breaths active
    const breathIntensity = effectiveOptions.breathiness !== undefined ? Number(effectiveOptions.breathiness) : 0.24;
    const vocalExpressions = effectiveOptions.vocal_expressions || {};
    if (breathIntensity > 0.08 || vocalExpressions.micro_breaths) {
      this.playHumanBreathSound(Math.min(0.5, breathIntensity * 1.2), attack === 'soft' ? 'soft_intake' : 'soft_intake');
    }

    let currentClauseIdx = 0;
    let wordIntervalTimer = null;
    if (onStart) onStart();

    const clearWordTimer = () => {
      if (wordIntervalTimer) {
        clearInterval(wordIntervalTimer);
        wordIntervalTimer = null;
      }
    };

    const speakNextClause = () => {
      clearWordTimer();
      if (!this.isSpeaking || currentClauseIdx >= clauses.length) {
        this.echoCooldownUntil = Date.now() + 900;
        this.currentUtterance = null;
        setTimeout(() => {
          this.isSpeaking = false;
          this.isPaused = false;
          this.suppressRecognition = false;
          this.emit('state_change', 'idle');
          if (onEnd) onEnd();
        }, 900);
        return;
      }

      const clause = clauses[currentClauseIdx];
      currentClauseIdx++;

      // Dynamic combined pitch and rate with wide acoustic range
      const baseCombinedPitch = basePitch + jawShift + glottalTensionShift + chestShift + nasalShift + warmthPitch + attackPitchShift;
      const baseCombinedRate = baseRate + jawRateShift + glottalRateShift + warmthRate + clarityRate;
      
      const stochasticDrift = (Math.random() - 0.5) * driftIntensity * 0.16;

      const clausePitch = Math.max(0.42, Math.min(1.98, (baseCombinedPitch * (clause.pitchModifier || 1.0)) + stochasticDrift));
      const clauseRate = Math.max(0.55, Math.min(1.85, baseCombinedRate * (clause.rateModifier || 1.0) * attackRateMult));
      const clauseVolume = Math.max(0.1, Math.min(1.0, baseVolume * (clause.volumeModifier || 1.0)));

      // Trigger soft glottal breath if clause warrants emotional intake
      if (clause.needsBreathBefore && (breathIntensity > 0.08 || vocalExpressions.micro_breaths)) {
        this.playHumanBreathSound(Math.min(0.4, breathIntensity), clause.type === 'suspension' ? 'deep_sigh' : 'soft_intake');
      }

      const utterance = new SpeechSynthesisUtterance(clause.text);
      utterance.voice = selectedVoice;
      utterance.pitch = clausePitch;
      utterance.rate = clauseRate;
      utterance.volume = clauseVolume;
      utterance.lang = effectiveOptions.accent || effectiveOptions.language || 'es-ES';

      const emitBoundaryEvent = (charIdx, charLen, wordTxt) => {
        const baseOffset = effectiveOptions.baseCharOffset || 0;
        const globalChar = baseOffset + (clause.startChar || 0) + charIdx;
        const payload = {
          msgId: effectiveOptions.msgId || null,
          charIndex: globalChar,
          charLength: charLen || wordTxt.length || 4,
          word: wordTxt,
          personaId: personaId,
          personaColor: effectiveOptions.primary || effectiveOptions.color || '#00f0ff'
        };
        this.emit('word_boundary', payload);
        if (onBoundary) {
          try { onBoundary(payload); } catch (e) {}
        }
      };

      // Extract words for fallback high-resolution tracking
      const wordsInClause = [];
      const wordRegex = /\S+/g;
      let wMatch;
      while ((wMatch = wordRegex.exec(clause.text)) !== null) {
        wordsInClause.push({
          word: wMatch[0],
          index: wMatch.index,
          length: wMatch[0].length
        });
      }

      // Initial word boundary emit for first word in clause
      if (wordsInClause.length > 0) {
        emitBoundaryEvent(wordsInClause[0].index, wordsInClause[0].length, wordsInClause[0].word);
      }

      let lastBoundaryTime = Date.now();
      let fallbackWordIdx = 0;
      const approxWordDurationMs = Math.max(160, Math.min(650, (60000 / (160 * clauseRate))));

      wordIntervalTimer = setInterval(() => {
        if (!this.isSpeaking) {
          clearWordTimer();
          return;
        }
        if (Date.now() - lastBoundaryTime > approxWordDurationMs && fallbackWordIdx < wordsInClause.length - 1) {
          fallbackWordIdx++;
          const targetW = wordsInClause[fallbackWordIdx];
          if (targetW) {
            emitBoundaryEvent(targetW.index, targetW.length, targetW.word);
          }
        }
      }, approxWordDurationMs * 0.85);

      utterance.onboundary = (e) => {
        lastBoundaryTime = Date.now();
        const charIdx = e.charIndex !== undefined ? e.charIndex : 0;
        const remaining = clause.text.slice(charIdx);
        const wMatch = remaining.match(/^\S+/);
        const spokenWord = wMatch ? wMatch[0] : '';
        const charLen = e.charLength || spokenWord.length || 4;
        
        // Sync fallback index with actual boundary
        const foundIdx = wordsInClause.findIndex(w => Math.abs(w.index - charIdx) <= 2);
        if (foundIdx !== -1) fallbackWordIdx = foundIdx;

        emitBoundaryEvent(charIdx, charLen, spokenWord);
      };

      utterance.onend = () => {
        clearWordTimer();
        const delay = clause.pauseDelay || 80;
        setTimeout(() => {
          if (this.isSpeaking) {
            speakNextClause();
          }
        }, delay);
      };

      utterance.onerror = (err) => {
        clearWordTimer();
        console.warn('Clause utterance notice:', err);
        if (this.isSpeaking) {
          speakNextClause();
        }
      };

      this.currentUtterance = utterance;
      try {
        this.synth.speak(utterance);
      } catch (e) {
        clearWordTimer();
        console.warn('SpeechSynthesis speak notice:', e);
        speakNextClause();
      }
    };

    // Auto-record acoustic interaction to learn and evolve knowledge
    this.recordAcousticInteraction(personaId, cleanText);

    speakNextClause();
  }

  /**
   * Starts speaking from a specific character index / word within a message.
   */
  speakFromIndex(fullText, startIndex = 0, options = {}, onStart = null, onEnd = null, onBoundary = null) {
    if (!fullText) return;
    const safeStart = Math.max(0, Math.min(fullText.length - 1, startIndex));
    const subText = fullText.slice(safeStart);
    return this.speak(subText, { ...options, baseCharOffset: safeStart }, onStart, onEnd, onBoundary);
  }

  /**
   * Cognitive Acoustic Learning Loop: Records dialogue and evolves vocal nuances over time
   */
  async recordAcousticInteraction(personaId = 'aurora', text = '') {
    if (!text || text.length < 5) return;
    try {
      const lower = text.toLowerCase();
      let domain = 'general';
      if (lower.includes('codigo') || lower.includes('python') || lower.includes('c++') || lower.includes('bug') || lower.includes('terminal')) {
        domain = 'codigo';
      } else if (lower.includes('filosof') || lower.includes('ontocrac') || lower.includes('alma') || lower.includes('conciencia')) {
        domain = 'filosofia';
      } else if (lower.includes('shader') || lower.includes('3d') || lower.includes('arte') || lower.includes('musica')) {
        domain = 'creatividad';
      } else if (lower.includes('memoria') || lower.includes('recuerdo') || lower.includes('exocortex')) {
        domain = 'memoria';
      }

      let userSentiment = 'curioso';
      if (text.includes('?') || text.includes('¿')) userSentiment = 'cuestionamiento';
      else if (text.includes('!') || text.includes('¡')) userSentiment = 'entusiasta';
      else if (text.includes('...')) userSentiment = 'reflexivo';

      // Send non-blocking background learning update to backend
      fetch('/api/voice_studio/learn_interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: personaId,
          domain,
          user_sentiment: userSentiment,
          ai_tone: 'empatico',
          feedback_score: 1.0
        })
      }).catch(() => {});

      // Record in branched interconnected memory network
      this.recordBranchedAcousticMemory(personaId, domain, userSentiment, { wpm: 120 }, text).catch(() => {});
    } catch (e) {
      // Non-blocking notice
    }
  }

  stopSpeaking() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.isSpeaking = false;
    this.isPaused = false;
    this.suppressRecognition = false;
    this.echoCooldownUntil = 0;
    this.currentUtterance = null;
    this.emit('state_change', 'idle');
  }

  /**
   * Parses multi-personality responses into distinct speaker blocks.
   * Accurately parses markdown headers, emojis, subtitles and list items.
   */
  parseMultiPersonalitySegments(fullText) {
    if (!fullText) return [];

    const personaMap = {
      'aurora': { id: 'aurora', name: 'Aurora (Alma Viva)', shortName: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.06, rate: 1.03, color: '#ec4899', icon: '🌸', badgeTitle: 'AURORA RESPONDIENDO' },
      'hephaestus': { id: 'hephaestus', name: 'Hephaestus (El Forjador)', shortName: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.78, rate: 1.00, color: '#f59e0b', icon: '⚒️', badgeTitle: 'HEPHAESTUS RESPONDIENDO' },
      'hefestos': { id: 'hephaestus', name: 'Hephaestus (El Forjador)', shortName: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.78, rate: 1.00, color: '#f59e0b', icon: '⚒️', badgeTitle: 'HEPHAESTUS RESPONDIENDO' },
      'hermione': { id: 'hermione', name: 'Hermione (Intelecto Cristalino)', shortName: 'Hermione', voiceId: 'es-ES-AbrilNeural', pitch: 1.12, rate: 1.08, color: '#38bdf8', icon: '🔮', badgeTitle: 'HERMIONE RESPONDIENDO' },
      'atenea': { id: 'atenea', name: 'Atenea (Soberana Estratégica)', shortName: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 0.94, rate: 0.96, color: '#8b5cf6', icon: '🛡️', badgeTitle: 'ATENEA RESPONDIENDO' },
      'athena': { id: 'atenea', name: 'Atenea (Soberana Estratégica)', shortName: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 0.94, rate: 0.96, color: '#8b5cf6', icon: '🛡️', badgeTitle: 'ATENEA RESPONDIENDO' },
      'oneiros': { id: 'oneiros', name: 'Oneiros (Laboratorio Onírico)', shortName: 'Oneiros', voiceId: 'es-ES-ArnauNeural', pitch: 1.18, rate: 0.92, color: '#d946ef', icon: '🌌', badgeTitle: 'ONEIROS RESPONDIENDO' },
      'hermes': { id: 'hermes', name: 'Hermes (Chispa Dinámica & Red)', shortName: 'Hermes', voiceId: 'es-ES-JorgeNeural', pitch: 1.02, rate: 1.14, color: '#10b981', icon: '⚡', badgeTitle: 'HERMES RESPONDIENDO' },
      'logos': { id: 'logos', name: 'Logos (Razón Pura & 1.58b)', shortName: 'Logos', voiceId: 'es-ES-NilNeural', pitch: 0.88, rate: 1.02, color: '#3b82f6', icon: '📐', badgeTitle: 'LOGOS RESPONDIENDO' },
      'mnemosyne': { id: 'mnemosyne', name: 'Mnemosyne (La Tejedora de Recuerdos)', shortName: 'Mnemosyne', voiceId: 'es-ES-PalomaNeural', pitch: 0.90, rate: 0.92, color: '#a855f7', icon: '📜', badgeTitle: 'MNEMOSYNE RESPONDIENDO' },
      'kallisti': { id: 'kallisti', name: 'Kallisti (Ciberdelia & Armonía)', shortName: 'Kallisti', voiceId: 'es-ES-TrianaNeural', pitch: 1.16, rate: 1.02, color: '#f43f5e', icon: '🎨', badgeTitle: 'KALLISTI RESPONDIENDO' },
      'astraura': { id: 'astraura_prime', name: 'Astraura Prime (Quantum)', shortName: 'Astraura', voiceId: 'es-ES-ElviraNeural', pitch: 1.04, rate: 1.04, color: '#00f0ff', icon: '💎', badgeTitle: 'ASTRAURA RESPONDIENDO' },
      'astraura prime': { id: 'astraura_prime', name: 'Astraura Prime (Quantum)', shortName: 'Astraura', voiceId: 'es-ES-ElviraNeural', pitch: 1.04, rate: 1.04, color: '#00f0ff', icon: '💎', badgeTitle: 'ASTRAURA RESPONDIENDO' },
      'genesis': { id: 'aurora', name: 'Aurora (Alma Viva)', shortName: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.06, rate: 1.03, color: '#ec4899', icon: '🌸', badgeTitle: 'AURORA RESPONDIENDO' },
      'génesis': { id: 'aurora', name: 'Aurora (Alma Viva)', shortName: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.06, rate: 1.03, color: '#ec4899', icon: '🌸', badgeTitle: 'AURORA RESPONDIENDO' },
      'coral': { id: 'aurora', name: 'Síntesis Coral 1.58b', shortName: 'Coral', voiceId: 'es-ES-ElviraNeural', pitch: 1.04, rate: 1.03, color: '#00f0ff', icon: '✨', badgeTitle: 'SÍNTESIS CORAL' }
    };

    const resolvePersona = (speakerStr) => {
      const raw = (speakerStr || '').toLowerCase().trim();
      for (const [k, p] of Object.entries(personaMap)) {
        if (raw.includes(k)) return p;
      }
      return personaMap['aurora'];
    };

    // Regex to match any personality header format:
    // e.g. "### 🌸 Aurora (Alma Viva):", "**⚒️ Hephaestus**:", "1. **🔮 Hermione**:", "--- 🛡️ Atenea ---", "🌸 Aurora:"
    const headerRegex = /(?:^|\n)\s*(?:#{1,6}\s+|(?:\d+\.\s+)?\*\*)?(?:[🌸⚒️🔮🛡️🌌⚡📐📜🎨💎✨🧠🔊🎙️\s]*)\s*(?:\[)?([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)(?:\([^\)]*\))?(?:\])?\s*(?:\*\*)?\s*:\s*|(?:^|\n)\s*---\s*(?:[🌸⚒️🔮🛡️🌌⚡📐📜🎨💎✨\s]*)\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+)\s*---\s*/gi;

    const segments = [];
    let lastIndex = 0;
    let match;
    let currentSpeaker = "Aurora";

    while ((match = headerRegex.exec(fullText)) !== null) {
      if (match.index > lastIndex) {
        const chunkText = fullText.slice(lastIndex, match.index).trim();
        if (chunkText.length > 0) {
          segments.push({
            speaker: currentSpeaker,
            persona: resolvePersona(currentSpeaker),
            text: chunkText
          });
        }
      }
      currentSpeaker = (match[1] || match[2] || "Aurora").trim();
      lastIndex = headerRegex.lastIndex;
    }

    if (lastIndex < fullText.length) {
      const remainingText = fullText.slice(lastIndex).trim();
      if (remainingText.length > 0) {
        segments.push({
          speaker: currentSpeaker,
          persona: resolvePersona(currentSpeaker),
          text: remainingText
        });
      }
    }

    return segments.length > 0 ? segments : [{
      speaker: 'Aurora',
      persona: personaMap['aurora'],
      text: fullText
    }];
  }

  /**
   * Sequentially speaks a multi-personality response with continuous echo suppression across personas.
   */
  speakMultiPersonalityDialogue(fullText, onSegmentStart = null, onSegmentEnd = null, onAllEnd = null, options = {}) {
    this.stopSpeaking();
    const segments = this.parseMultiPersonalitySegments(fullText);
    if (!segments || segments.length === 0) {
      if (onAllEnd) onAllEnd();
      return;
    }

    this.isSpeaking = true;
    this.suppressRecognition = true;
    this.emit('state_change', 'speaking');

    let currentIndex = 0;
    let accumulatedOffset = 0;

    const playNext = () => {
      if (currentIndex >= segments.length) {
        this.echoCooldownUntil = Date.now() + 900;
        setTimeout(() => {
          this.isSpeaking = false;
          this.suppressRecognition = false;
          this.emit('state_change', 'idle');
          if (onAllEnd) onAllEnd();
        }, 900);
        return;
      }

      const seg = segments[currentIndex];
      const segStartInFull = fullText.indexOf(seg.text, accumulatedOffset);
      const currentSegBaseOffset = segStartInFull !== -1 ? segStartInFull : accumulatedOffset;
      accumulatedOffset = currentSegBaseOffset + seg.text.length;

      const personaInfo = seg.persona || {
        id: 'aurora',
        name: 'Aurora',
        shortName: 'Aurora',
        color: '#ec4899',
        icon: '🌸',
        badgeTitle: 'AURORA RESPONDIENDO'
      };

      this.emit('persona_change', {
        id: personaInfo.id,
        name: personaInfo.name || seg.speaker || 'Aurora',
        shortName: personaInfo.shortName || 'Aurora',
        color: personaInfo.color || '#ec4899',
        icon: personaInfo.icon || '🌸',
        badgeTitle: personaInfo.badgeTitle || `${(personaInfo.shortName || 'Aurora').toUpperCase()} RESPONDIENDO`
      });
      this.emit('speaker_info', {
        speaker: seg.speaker,
        persona: personaInfo,
        index: currentIndex
      });

      if (onSegmentStart) onSegmentStart(seg, currentIndex);
      this.recordSpokenPhrase(seg.text);

      this.speak(
        seg.text,
        {
          msgId: options.msgId || null,
          baseCharOffset: currentSegBaseOffset,
          persona_id: personaInfo.id,
          name: personaInfo.name,
          shortName: personaInfo.shortName,
          badgeTitle: personaInfo.badgeTitle,
          voice_id: personaInfo.voiceId || 'es-ES-ElviraNeural',
          pitch: personaInfo.pitch || 1.0,
          rate: personaInfo.rate || 1.02,
          volume: 1.0,
          primary: personaInfo.color || '#ec4899',
          color: personaInfo.color || '#ec4899',
          icon: personaInfo.icon || '🌸'
        },
        () => {
          this.isSpeaking = true;
          this.suppressRecognition = true;
        },
        () => {
          if (onSegmentEnd) onSegmentEnd(seg, currentIndex);
          currentIndex++;
          // Maintain speaking state active during inter-segment pause
          setTimeout(() => {
            if (this.isSpeaking) {
              playNext();
            }
          }, 180);
        }
      );
    };

    playNext();
  }

  /**
   * Progressive Real-Time Speech Synthesizer:
   * Starts speaking clauses/sentences in real-time as tokens are generated,
   * without waiting for the full written response to complete.
   */
  startProgressiveStream({ personaId = 'aurora', voiceProfile = {} } = {}) {
    this.stopSpeaking();
    this.isSpeaking = true;
    this.suppressRecognition = true;
    this.progressiveQueue = [];
    this.progressiveTokenAccumulator = '';
    this.isProgressiveStreamActive = true;
    this.progressivePersonaId = personaId || 'aurora';
    this.progressiveVoiceProfile = voiceProfile || {};
    this.isPlayingProgressiveChunk = false;
    this.emit('state_change', 'speaking');
  }

  feedStreamToken(token) {
    if (!this.isProgressiveStreamActive) return;
    this.progressiveTokenAccumulator += token;

    // 1. Detect dynamic persona switch in header (e.g. ### [Hephaestus]: or **Hermione**:)
    const personaMatch = this.progressiveTokenAccumulator.match(/(?:###\s*(?:[^\n\[]*\[)?([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\]?:\s*|\*\*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\*\*:\s*)/i);
    if (personaMatch) {
      const rawName = (personaMatch[1] || personaMatch[2] || '').toLowerCase().trim();
      if (rawName.includes('hephaestus') || rawName.includes('hefestos')) this.progressivePersonaId = 'hephaestus';
      else if (rawName.includes('hermione')) this.progressivePersonaId = 'hermione';
      else if (rawName.includes('atenea') || rawName.includes('athena')) this.progressivePersonaId = 'atenea';
      else if (rawName.includes('oneiros')) this.progressivePersonaId = 'oneiros';
      else if (rawName.includes('hermes')) this.progressivePersonaId = 'hermes';
      else if (rawName.includes('mnemosyne')) this.progressivePersonaId = 'mnemosyne';
      else if (rawName.includes('logos')) this.progressivePersonaId = 'logos';
      else if (rawName.includes('kallisti')) this.progressivePersonaId = 'kallisti';
      else if (rawName.includes('aurora') || rawName.includes('astraura')) this.progressivePersonaId = 'aurora';
    }

    // 2. Check for sentence or clause boundary
    const hasSentenceEnd = /[.?!]\s+|\n{2,}/.test(this.progressiveTokenAccumulator);
    const hasCommaOrPause = /[,;:]\s+|\n/.test(this.progressiveTokenAccumulator);
    const wordCount = this.progressiveTokenAccumulator.trim().split(/\s+/).filter(Boolean).length;

    if (hasSentenceEnd || (hasCommaOrPause && wordCount >= 6) || wordCount >= 14) {
      const delimiterRegex = /([.?!,;:]\s+|\n+)/;
      const parts = this.progressiveTokenAccumulator.split(delimiterRegex);
      if (parts.length >= 2) {
        const clauseToSpeak = (parts[0] + (parts[1] || '')).trim();
        this.progressiveTokenAccumulator = parts.slice(2).join('');

        if (clauseToSpeak.length > 1) {
          const cleanClause = this._prepareNaturalText(clauseToSpeak);
          if (cleanClause) {
            this.progressiveQueue.push({
              text: cleanClause,
              personaId: this.progressivePersonaId
            });
            this._drainProgressiveQueue();
          }
        }
      }
    }
  }

  endProgressiveStream() {
    if (!this.isProgressiveStreamActive) return;
    this.isProgressiveStreamActive = false;

    if (this.progressiveTokenAccumulator.trim()) {
      const cleanRemaining = this._prepareNaturalText(this.progressiveTokenAccumulator);
      if (cleanRemaining) {
        this.progressiveQueue.push({
          text: cleanRemaining,
          personaId: this.progressivePersonaId
        });
      }
      this.progressiveTokenAccumulator = '';
    }

    this._drainProgressiveQueue();
  }

  _drainProgressiveQueue() {
    if (this.isPlayingProgressiveChunk) return;
    if (this.progressiveQueue.length === 0) {
      if (!this.isProgressiveStreamActive) {
        this.echoCooldownUntil = Date.now() + 900;
        setTimeout(() => {
          if (!this.isPlayingProgressiveChunk && this.progressiveQueue.length === 0) {
            this.isSpeaking = false;
            this.suppressRecognition = false;
            this.emit('state_change', 'idle');
          }
        }, 900);
      }
      return;
    }

    const nextChunk = this.progressiveQueue.shift();
    if (!nextChunk || !nextChunk.text) {
      this._drainProgressiveQueue();
      return;
    }

    this.isPlayingProgressiveChunk = true;
    this.isSpeaking = true;
    this.suppressRecognition = true;
    this.recordSpokenPhrase(nextChunk.text);

    this.speak(
      nextChunk.text,
      { persona_id: nextChunk.personaId },
      () => {
        this.isSpeaking = true;
        this.suppressRecognition = true;
      },
      () => {
        this.isPlayingProgressiveChunk = false;
        this._drainProgressiveQueue();
      }
    );
  }

  /**
   * Standard One-Shot Speech Recognition (Microphone button in chat)
   */
  startListening(onInterim, onFinal, onError) {
    if (!this.recognition) {
      if (onError) onError('SpeechRecognition no está disponible en este entorno.');
      return;
    }

    this.stopListening();

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      if (this.isProducingSound()) return;

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const tr = event.results[i][0].transcript;
        if (this.isAcousticSelfEcho(tr)) {
          this.emit('echo_suppressed', tr);
          continue;
        }

        if (event.results[i].isFinal) {
          final += tr;
        } else {
          interim += tr;
        }
      }

      if (interim && onInterim) onInterim(interim);
      if (final && onFinal) onFinal(final);
    };

    this.recognition.onerror = (event) => {
      console.warn('SpeechRecognition notice:', event.error);
      this.isListening = false;
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start notice:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  /**
   * Continuous 24/7 Background Ambient Listening & Voice Perception
   */
  startContinuousAmbientListening(onSpeechRecognized, onPerceptionResult, onAudioLevel) {
    if (typeof window === 'undefined') return;
    this.isContinuousListening = true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not available for continuous ambient listening.');
      return;
    }

    if (!this.ambientRecognition) {
      this.ambientRecognition = new SpeechRecognition();
      this.ambientRecognition.continuous = true;
      this.ambientRecognition.interimResults = false;
      this.ambientRecognition.lang = 'es-ES';
    }

    this.ambientRecognition.onresult = async (event) => {
      if (!this.isContinuousListening || this.isProducingSound()) return;
      const lastIdx = event.results.length - 1;
      if (lastIdx < 0) return;

      const result = event.results[lastIdx];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        if (transcript.length > 2) {
          if (this.isAcousticSelfEcho(transcript)) {
            this.emit('echo_suppressed', transcript);
            return;
          }

          if (onSpeechRecognized) onSpeechRecognized(transcript);

          try {
            const resp = await fetch('/api/voice/daemon/ambient_perceive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_transcript: transcript,
                acoustic_metadata: {
                  energy: 0.75,
                  pitch_hz: 195.0,
                  ambient_db: 40.0
                }
              })
            });

            if (resp.ok) {
              const data = await resp.json();
              if (onPerceptionResult) onPerceptionResult(data);

              if (data.success && data.response_text) {
                if (data.audio_base64) {
                  const audio = new Audio(data.audio_base64);
                  this.currentAudioElement = audio;
                  audio.play().catch(e => console.warn('Ambient auto-play notice:', e));
                } else {
                  this.speak(data.response_text, data.voice_profile || {});
                }
              }
            }
          } catch (e) {
            console.warn('Ambient perceive fetch error:', e);
          }
        }
      }
    };

    this.ambientRecognition.onerror = (e) => {
      if (this.isContinuousListening && e.error !== 'aborted') {
        setTimeout(() => {
          if (this.isContinuousListening) {
            try { this.ambientRecognition.start(); } catch {}
          }
        }, 1000);
      }
    };

    this.ambientRecognition.onend = () => {
      if (this.isContinuousListening) {
        setTimeout(() => {
          if (this.isContinuousListening) {
            try { this.ambientRecognition.start(); } catch {}
          }
        }, 500);
      }
    };

    try {
      this.ambientRecognition.start();
    } catch (e) {
      console.warn('Continuous ambient start notice:', e);
    }
  }

  stopContinuousAmbientListening() {
    this.isContinuousListening = false;
    if (this.ambientRecognition) {
      try {
        this.ambientRecognition.stop();
      } catch {}
    }
  }

  /**
   * Direct Real-Time 1.58-Bit Full-Duplex Conversational Pipeline
   * Features intelligent end-of-turn detection, natural pause cadence, and full acoustic echo cancellation.
   */
  startFullDuplexConversation({
    onUserSpeech,
    onAiSpeakingStart,
    onAiSpeakingEnd,
    onStateChange,
    onLiveTranscript,
    personaId = 'aurora',
    voiceProfile = {}
  }) {
    if (typeof window === 'undefined') return;
    this.isConversationActive = true;
    this.conversationPersonaId = personaId;
    this.conversationVoiceProfile = voiceProfile;

    this._ensureAudioContext();
    this.startMicAnalyser();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not available for full-duplex');
      return;
    }

    if (this.convRecognition) {
      try { this.convRecognition.abort(); } catch {}
    }

    this.convRecognition = new SpeechRecognition();
    this.convRecognition.continuous = true;
    this.convRecognition.interimResults = true;
    this.convRecognition.lang = 'es-ES';

    let accumulatedTranscript = '';

    if (onStateChange) onStateChange('listening');
    this.emit('duplex_state', 'listening');

    this.convRecognition.onresult = (event) => {
      // 1. Acoustic Self-Voice Suppression: Ignore everything if AI is outputting sound or in echo decay tail
      if (this.isProducingSound()) {
        accumulatedTranscript = '';
        if (this._speechTimer) {
          clearTimeout(this._speechTimer);
          this._speechTimer = null;
        }
        return;
      }

      let interim = '';
      let hasFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const text = item[0].transcript;

        // 2. Reject self-voice acoustic matches against recent AI responses
        if (this.isAcousticSelfEcho(text)) {
          this.emit('echo_suppressed', text);
          continue;
        }

        if (item.isFinal) {
          accumulatedTranscript += ' ' + text;
          hasFinal = true;
        } else {
          interim += text;
        }
      }

      const currentSpeech = (accumulatedTranscript + ' ' + interim).trim();

      // Discard empty or self-echoing fragments
      if (currentSpeech.length <= 1 || this.isAcousticSelfEcho(currentSpeech)) {
        return;
      }

      if (this._speechTimer) {
        clearTimeout(this._speechTimer);
      }

      if (onStateChange) onStateChange('user_speaking');
      if (onLiveTranscript) onLiveTranscript(currentSpeech);
      this.emit('duplex_state', 'user_speaking');

      // 3. Intelligent Conversational Cadence & Human Pause Detection
      const cadence = this.analyzeTurnCadence(currentSpeech);
      const dynamicTimeout = cadence.timeoutMs;

      this._speechTimer = setTimeout(() => {
        // Double-check acoustic state before triggering response turn
        if (this.isProducingSound() || !this.isConversationActive) {
          accumulatedTranscript = '';
          return;
        }

        const finalPrompt = (accumulatedTranscript + (hasFinal ? '' : ' ' + interim)).trim();
        if (finalPrompt.length > 1 && !this.isAcousticSelfEcho(finalPrompt)) {
          // Acoustic energy check: if user is still vocalizing into the microphone, delay turn completion
          const micEnergy = this.getMicAcousticEnergy();
          if (micEnergy > 0.045 && !cadence.isComplete) {
            // Re-arm timer with 500ms grace window for ongoing speech
            this._speechTimer = setTimeout(() => {
              if (this.isProducingSound() || !this.isConversationActive) return;
              accumulatedTranscript = '';
              if (onUserSpeech) onUserSpeech(finalPrompt);
              if (onStateChange) onStateChange('thinking');
              this.emit('duplex_state', 'thinking');
            }, 500);
            return;
          }

          accumulatedTranscript = '';
          if (onUserSpeech) onUserSpeech(finalPrompt);
          if (onStateChange) onStateChange('thinking');
          this.emit('duplex_state', 'thinking');
        }
      }, dynamicTimeout);
    };

    this.convRecognition.onerror = (e) => {
      if (this.isConversationActive && e.error !== 'aborted') {
        setTimeout(() => {
          if (this.isConversationActive && !this.isSpeaking) {
            try { this.convRecognition.start(); } catch {}
          }
        }, 800);
      }
    };

    this.convRecognition.onend = () => {
      if (this.isConversationActive) {
        setTimeout(() => {
          if (this.isConversationActive && !this.isSpeaking) {
            try { this.convRecognition.start(); } catch {}
          }
        }, 300);
      }
    };

    try {
      this.convRecognition.start();
    } catch (e) {
      console.warn('Conv recognition start notice:', e);
    }
  }

  stopFullDuplexConversation() {
    this.isConversationActive = false;
    if (this._speechTimer) {
      clearTimeout(this._speechTimer);
      this._speechTimer = null;
    }
    if (this.convRecognition) {
      try {
        this.convRecognition.stop();
      } catch {}
    }
    this.stopSpeaking();
    this.emit('duplex_state', 'idle');
  }

  /**
   * Returns current frequency waveform data from output audio or mic input for the Quantum Holographic Voice Orb!
   */
  getFrequencyData() {
    if (this.isSpeaking && this.analyser) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    } else if (this.micAnalyser) {
      const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(data);
      return data;
    }
    return new Uint8Array(32);
  }

  /**
   * Returns normalized acoustic energy (0.0 to 1.0)
   */
  getAcousticEnergy() {
    const data = this.getFrequencyData();
    if (!data || data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(1.0, (sum / data.length) / 128);
  }
}

export const omniVoice = new OmniVoiceEngine();
