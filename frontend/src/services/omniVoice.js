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
    
    // Prioritize natural neural and enhanced feminine/attractive voices
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
   */
  _prepareNaturalText(text) {
    if (!text) return '';
    return text
      // Remove code blocks with smooth verbal transitions
      .replace(/```[\w]*\n([\s\S]*?)```/g, 'Aquí tienes el código.')
      .replace(/`([^`]+)`/g, '$1')
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
   * Splits text into rhythmic human conversational clauses (breath phrases) with punctuation context.
   */
  _splitIntoExpressiveClauses(text) {
    if (!text) return [];
    const rawClauses = text.match(/[^,.;:!?\n—]+[,.;:!?\n—]*/g) || [text];
    const clauses = [];

    for (let c of rawClauses) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      
      let type = 'statement';
      if (trimmed.endsWith('?')) type = 'question';
      else if (trimmed.endsWith('!')) type = 'exclamation';
      else if (trimmed.endsWith('...') || trimmed.endsWith('—')) type = 'pause';
      else if (trimmed.endsWith(',')) type = 'comma';

      clauses.push({
        text: trimmed,
        type: type,
        hasQuestion: trimmed.includes('?'),
        hasExclamation: trimmed.includes('!')
      });
    }

    return clauses.length > 0 ? clauses : [{ text: text, type: 'statement' }];
  }

  /**
   * Expressive, Natural Humanized Speech Synthesis with Personality Prosody Shaping
   */
  speak(text, options = {}, onStart = null, onEnd = null, onBoundary = null) {
    if (!this.synth) return;
    this.stopSpeaking();

    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    this.lastSpokenPayload = { text, options, onStart, onEnd };
    this.isSpeaking = true;
    this.isPaused = false;
    this.suppressRecognition = true;
    this.recordSpokenPhrase(cleanText);
    this.emit('state_change', 'speaking');

    const clauses = this._splitIntoExpressiveClauses(cleanText);
    if (clauses.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    const personaId = options.persona_id || options.voice_id || 'aurora';
    this.activeVoicePersonaId = personaId;

    // Base voice and prosody configuration
    const esVoices = this.getSpanishVoices();
    const targetVoiceId = options.voice_speaker || options.voice_id || options.voiceURI || options.native_voice_id;
    let selectedVoice = esVoices.length > 0 ? esVoices[0] : null;

    if (targetVoiceId && this.availableVoices.length > 0) {
      const found = this.availableVoices.find(v => 
        v.voiceURI === targetVoiceId || 
        v.name.toLowerCase().includes(targetVoiceId.toLowerCase())
      );
      if (found) selectedVoice = found;
    }

    // Persona-specific authentic vocal traits
    let basePitch = 1.08;
    let baseRate = 1.04 * this.globalPlaybackRate;
    let baseVolume = 1.0;

    switch (personaId) {
      case 'aurora':
      case 'astraura_prime':
      case 'genesis':
        basePitch = 1.08;
        baseRate = 1.03 * this.globalPlaybackRate;
        break;
      case 'hephaestus':
        basePitch = 0.84;
        baseRate = 1.02 * this.globalPlaybackRate;
        break;
      case 'hermione':
        basePitch = 1.06;
        baseRate = 1.10 * this.globalPlaybackRate;
        break;
      case 'atenea':
      case 'athena':
        basePitch = 0.98;
        baseRate = 0.98 * this.globalPlaybackRate;
        break;
      case 'oneiros':
        basePitch = 1.12;
        baseRate = 0.95 * this.globalPlaybackRate;
        break;
      case 'hermes':
        basePitch = 1.04;
        baseRate = 1.16 * this.globalPlaybackRate;
        break;
      case 'mnemosyne':
        basePitch = 0.92;
        baseRate = 0.92 * this.globalPlaybackRate;
        break;
      case 'logos':
        basePitch = 0.96;
        baseRate = 1.04 * this.globalPlaybackRate;
        break;
      case 'kallisti':
        basePitch = 1.12;
        baseRate = 1.02 * this.globalPlaybackRate;
        break;
      default:
        basePitch = options.pitch || 1.06;
        baseRate = (options.rate || 1.03) * this.globalPlaybackRate;
        break;
    }

    let currentClauseIdx = 0;
    if (onStart) onStart();

    const speakNextClause = () => {
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

      let clausePitch = basePitch;
      let clauseRate = baseRate;

      // Dynamic prosody inflection by clause type
      if (clause.type === 'question' || clause.hasQuestion) {
        clausePitch = Math.min(1.26, basePitch * 1.08);
        clauseRate = baseRate * 1.02;
      } else if (clause.type === 'exclamation' || clause.hasExclamation) {
        clausePitch = Math.min(1.24, basePitch * 1.06);
        clauseRate = Math.min(1.20, baseRate * 1.04);
      } else if (clause.type === 'pause') {
        clausePitch = Math.max(0.92, basePitch * 0.96);
        clauseRate = Math.max(0.85, baseRate * 0.93);
      } else if (clause.type === 'comma') {
        clausePitch = basePitch * 1.01;
      }

      const utterance = new SpeechSynthesisUtterance(clause.text);
      utterance.voice = selectedVoice;
      utterance.pitch = Math.max(0.6, Math.min(1.8, clausePitch));
      utterance.rate = Math.max(0.7, Math.min(1.6, clauseRate));
      utterance.volume = Math.max(0.1, Math.min(1.0, baseVolume));
      utterance.lang = 'es-ES';

      utterance.onend = () => {
        const pauseDelay = clause.type === 'comma' ? 60 : (clause.type === 'pause' ? 120 : 75);
        setTimeout(() => {
          if (this.isSpeaking) {
            speakNextClause();
          }
        }, pauseDelay);
      };

      utterance.onerror = (err) => {
        console.warn('Clause utterance notice:', err);
        if (this.isSpeaking) {
          speakNextClause();
        }
      };

      if (onBoundary) {
        utterance.onboundary = (e) => onBoundary(e);
      }

      this.currentUtterance = utterance;
      try {
        this.synth.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis speak notice:', e);
        speakNextClause();
      }
    };

    try {
      this.synth.cancel();
      this.synth.resume();
      speakNextClause();
    } catch (e) {
      console.warn('Speech synthesis start notice:', e);
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
   */
  parseMultiPersonalitySegments(fullText) {
    if (!fullText) return [];
    
    const headerRegex = /(?:###\s*(?:[^\n\[]*\[)?([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\]?:\s*|\*\*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\*\*:\s*)/gi;
    
    const segments = [];
    let lastIndex = 0;
    let match;
    let currentSpeaker = "Aurora";

    const personaMap = {
      'aurora': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.08, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'hephaestus': { id: 'hephaestus', name: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.84, rate: 1.02, color: '#f59e0b', icon: 'Cpu' },
      'hefestos': { id: 'hephaestus', name: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.84, rate: 1.02, color: '#f59e0b', icon: 'Cpu' },
      'hermione': { id: 'hermione', name: 'Hermione', voiceId: 'es-ES-AbrilNeural', pitch: 1.06, rate: 1.10, color: '#38bdf8', icon: 'Compass' },
      'atenea': { id: 'atenea', name: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 0.98, rate: 0.98, color: '#8b5cf6', icon: 'Shield' },
      'athena': { id: 'atenea', name: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 0.98, rate: 0.98, color: '#8b5cf6', icon: 'Shield' },
      'hermes': { id: 'hermes', name: 'Hermes', voiceId: 'es-ES-JorgeNeural', pitch: 1.04, rate: 1.16, color: '#10b981', icon: 'Globe' },
      'oneiros': { id: 'oneiros', name: 'Oneiros', voiceId: 'es-ES-ArnauNeural', pitch: 1.12, rate: 0.95, color: '#ec4899', icon: 'Flame' },
      'mnemosyne': { id: 'mnemosyne', name: 'Mnemosyne', voiceId: 'es-ES-PalomaNeural', pitch: 0.92, rate: 0.92, color: '#a855f7', icon: 'Brain' },
      'logos': { id: 'logos', name: 'Logos', voiceId: 'es-ES-NilNeural', pitch: 0.96, rate: 1.04, color: '#3b82f6', icon: 'Terminal' },
      'kallisti': { id: 'kallisti', name: 'Kallisti', voiceId: 'es-ES-TrianaNeural', pitch: 1.12, rate: 1.02, color: '#ec4899', icon: 'Sparkles' },
      'astraura prime': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.08, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'genesis': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.08, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'génesis': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.08, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'síntesis coral': { id: 'aurora', name: 'Síntesis Coral 1.58b', voiceId: 'es-ES-ElviraNeural', pitch: 1.05, rate: 1.04, color: '#00f0ff', icon: 'Sparkles' },
      'sintesis coral': { id: 'aurora', name: 'Síntesis Coral 1.58b', voiceId: 'es-ES-ElviraNeural', pitch: 1.05, rate: 1.04, color: '#00f0ff', icon: 'Sparkles' }
    };

    while ((match = headerRegex.exec(fullText)) !== null) {
      if (match.index > lastIndex) {
        const chunkText = fullText.slice(lastIndex, match.index).trim();
        if (chunkText.length > 0) {
          const rawSpeakerKey = currentSpeaker.toLowerCase().trim();
          let matchedPersona = personaMap['astraura prime'];
          for (const [k, p] of Object.entries(personaMap)) {
            if (rawSpeakerKey.includes(k)) {
              matchedPersona = p;
              break;
            }
          }
          segments.push({
            speaker: currentSpeaker,
            persona: matchedPersona,
            text: chunkText
          });
        }
      }
      currentSpeaker = (match[1] || match[2] || "").trim();
      lastIndex = headerRegex.lastIndex;
    }

    if (lastIndex < fullText.length) {
      const remainingText = fullText.slice(lastIndex).trim();
      if (remainingText.length > 0) {
        const rawSpeakerKey = currentSpeaker.toLowerCase().trim();
        let matchedPersona = personaMap['astraura prime'];
        for (const [k, p] of Object.entries(personaMap)) {
          if (rawSpeakerKey.includes(k)) {
            matchedPersona = p;
            break;
          }
        }
        segments.push({
          speaker: currentSpeaker,
          persona: matchedPersona,
          text: remainingText
        });
      }
    }

    return segments.length > 0 ? segments : [{
      speaker: 'Astraura Prime',
      persona: personaMap['astraura prime'],
      text: fullText
    }];
  }

  /**
   * Sequentially speaks a multi-personality response with continuous echo suppression across personas.
   */
  speakMultiPersonalityDialogue(fullText, onSegmentStart = null, onSegmentEnd = null, onAllEnd = null) {
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
      if (onSegmentStart) onSegmentStart(seg, currentIndex);
      this.recordSpokenPhrase(seg.text);

      this.speak(
        seg.text,
        {
          persona_id: seg.persona?.id || 'aurora',
          voice_id: seg.persona?.voiceId || 'es-ES-ElviraNeural',
          pitch: seg.persona?.pitch || 1.0,
          rate: seg.persona?.rate || 1.02,
          volume: 1.0
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
          }, 200);
        }
      );
    };

    playNext();
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
