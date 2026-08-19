/**
 * Astraura OmniVoice & audio.cpp 1.58-Bit Speech Engine (StarSeed OS)
 * Pure open-source, local, quantized and affective voice system.
 * Supports audio.cpp backend synthesis, WebAudio DSP formant styling, and Web Speech API fallback.
 */

class OmniVoiceEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.audioCtx = null;
    this.currentAudioElement = null;
    this.isSpeaking = false;
    this.isListening = false;
    this.currentUtterance = null;
    this.availableVoices = [];
    this.analyser = null;
    this.audioSourceNode = null;

    this._initVoices();
    this._initRecognition();
  }

  _ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  _initVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      this.availableVoices = this.synth.getVoices();
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
        if (name.includes('paloma') || name.includes('elvira') || name.includes('dalia') || name.includes('salome')) score += 8;
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

    try {
      this._ensureAudioContext();
      this.isSpeaking = true;
      this.suppressRecognition = true;
      this.lastSpokenText = cleanText.toLowerCase();
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
        this.isSpeaking = false;
        this.currentAudioElement = null;
        // Keep echo suppression for a short buffer
        setTimeout(() => {
          this.suppressRecognition = false;
        }, 700);
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback notice, using WebSpeech:', e);
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
    // Match clauses by sentence endings and natural clause pauses
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
   * Expressive, Natural Humanized Speech Synthesis with Clause-by-Clause Prosody Shaping
   */
  speak(text, options = {}, onStart = null, onEnd = null, onBoundary = null) {
    if (!this.synth) return;
    this.stopSpeaking();

    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    this.isSpeaking = true;
    this.suppressRecognition = true;
    this.lastSpokenText = cleanText.toLowerCase();

    const clauses = this._splitIntoExpressiveClauses(cleanText);
    if (clauses.length === 0) {
      if (onEnd) onEnd();
      return;
    }

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

    let basePitch = options.pitch !== undefined ? options.pitch : 1.07;
    let baseRate = options.rate !== undefined ? options.rate : 1.04;
    let baseVolume = options.volume !== undefined ? options.volume : 1.0;

    // Aurora & female attractive prosody tuning
    if (options.voice_id?.includes('aurora') || options.persona_id === 'aurora' || !options.voice_id) {
      basePitch = 1.07;
      baseRate = 1.04;
    }

    if (options.traits) {
      const { empatia = 85, calidez = 85, alegria = 80, humor = 75 } = options.traits;
      if (alegria > 80 || humor > 80) {
        basePitch = Math.min(1.18, basePitch * 1.03);
        baseRate = Math.min(1.15, baseRate * 1.02);
      }
      if (calidez > 80 || empatia > 80) {
        basePitch = Math.max(0.96, basePitch * 0.99);
      }
    }

    let currentClauseIdx = 0;
    if (onStart) onStart();

    const speakNextClause = () => {
      if (!this.isSpeaking || currentClauseIdx >= clauses.length) {
        this.isSpeaking = false;
        this.currentUtterance = null;
        // Acoustic reverb buffer: suppress recognition for 600ms after speech ends
        setTimeout(() => {
          this.suppressRecognition = false;
        }, 600);
        if (onEnd) onEnd();
        return;
      }

      const clause = clauses[currentClauseIdx];
      currentClauseIdx++;

      let clausePitch = basePitch;
      let clauseRate = baseRate;

      // Dynamic prosody inflection by clause type
      if (clause.type === 'question' || clause.hasQuestion) {
        clausePitch = Math.min(1.22, basePitch * 1.07); // Upward pitch curve for questions
        clauseRate = baseRate * 1.02;
      } else if (clause.type === 'exclamation' || clause.hasExclamation) {
        clausePitch = Math.min(1.20, basePitch * 1.05); // Lively bright pitch for excitement
        clauseRate = Math.min(1.18, baseRate * 1.04);
      } else if (clause.type === 'pause') {
        clausePitch = Math.max(0.94, basePitch * 0.97); // Reflective intimate drop
        clauseRate = Math.max(0.85, baseRate * 0.94);
      } else if (clause.type === 'comma') {
        clausePitch = basePitch * 1.01;
      }

      const utterance = new SpeechSynthesisUtterance(clause.text);
      utterance.voice = selectedVoice;
      utterance.pitch = Math.max(0.6, Math.min(1.8, clausePitch));
      utterance.rate = Math.max(0.7, Math.min(1.5, clauseRate));
      utterance.volume = Math.max(0.1, Math.min(1.0, baseVolume));
      utterance.lang = 'es-ES';

      utterance.onend = () => {
        // Natural human breathing pause between clauses (50ms - 90ms)
        const pauseDelay = clause.type === 'comma' ? 60 : (clause.type === 'pause' ? 140 : 80);
        setTimeout(() => {
          speakNextClause();
        }, pauseDelay);
      };

      utterance.onerror = (err) => {
        console.warn('Clause utterance error:', err);
        speakNextClause();
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

  /**
   * Parses multi-personality responses into distinct speaker blocks.
   */
  parseMultiPersonalitySegments(fullText) {
    if (!fullText) return [];
    
    // Check for headers like ### [Aurora]: or ### 🌸 [Aurora]: or **Aurora:**
    const headerRegex = /(?:###\s*(?:[^\n\[]*\[)?([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\]?:\s*|\*\*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s/]+)\*\*:\s*)/gi;
    
    const segments = [];
    let lastIndex = 0;
    let match;
    let currentSpeaker = "Aurora";

    // Known persona mappings
    const personaMap = {
      'aurora': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.07, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'hephaestus': { id: 'hephaestus', name: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.82, rate: 1.05, color: '#f59e0b', icon: 'Cpu' },
      'hefestos': { id: 'hephaestus', name: 'Hephaestus', voiceId: 'es-ES-AlvaroNeural', pitch: 0.82, rate: 1.05, color: '#f59e0b', icon: 'Cpu' },
      'hermione': { id: 'hermione', name: 'Hermione', voiceId: 'es-ES-AbrilNeural', pitch: 1.08, rate: 1.15, color: '#38bdf8', icon: 'Compass' },
      'atenea': { id: 'atenea', name: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 1.12, rate: 1.02, color: '#8b5cf6', icon: 'Shield' },
      'athena': { id: 'atenea', name: 'Atenea', voiceId: 'es-ES-RaquelNeural', pitch: 1.12, rate: 1.02, color: '#8b5cf6', icon: 'Shield' },
      'hermes': { id: 'hermes', name: 'Hermes', voiceId: 'es-ES-JorgeNeural', pitch: 1.15, rate: 1.18, color: '#10b981', icon: 'Globe' },
      'oneiros': { id: 'oneiros', name: 'Oneiros', voiceId: 'es-ES-ArnauNeural', pitch: 0.92, rate: 0.95, color: '#ec4899', icon: 'Flame' },
      'mnemosyne': { id: 'mnemosyne', name: 'Mnemosyne', voiceId: 'es-ES-PalomaNeural', pitch: 0.95, rate: 0.96, color: '#a855f7', icon: 'Brain' },
      'logos': { id: 'logos', name: 'Logos', voiceId: 'es-ES-NilNeural', pitch: 0.98, rate: 1.05, color: '#3b82f6', icon: 'Terminal' },
      'kallisti': { id: 'kallisti', name: 'Kallisti', voiceId: 'es-ES-TrianaNeural', pitch: 1.18, rate: 1.1, color: '#ec4899', icon: 'Sparkles' },
      'astraura prime': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.07, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'genesis': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.07, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
      'génesis': { id: 'aurora', name: 'Aurora', voiceId: 'es-ES-ElviraNeural', pitch: 1.07, rate: 1.04, color: '#ec4899', icon: 'Sparkles' },
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
   * Sequentially speaks a multi-personality response with each persona's unique voice profile!
   */
  speakMultiPersonalityDialogue(fullText, onSegmentStart = null, onSegmentEnd = null, onAllEnd = null) {
    this.stopSpeaking();
    const segments = this.parseMultiPersonalitySegments(fullText);
    if (!segments || segments.length === 0) {
      if (onAllEnd) onAllEnd();
      return;
    }

    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex >= segments.length) {
        this.isSpeaking = false;
        if (onAllEnd) onAllEnd();
        return;
      }

      const seg = segments[currentIndex];
      if (onSegmentStart) onSegmentStart(seg, currentIndex);

      this.speak(
        seg.text,
        {
          voice_id: seg.persona?.voiceId || 'es-ES-ElviraNeural',
          pitch: seg.persona?.pitch || 1.0,
          rate: seg.persona?.rate || 1.02,
          volume: 1.0
        },
        () => {
          this.isSpeaking = true;
        },
        () => {
          if (onSegmentEnd) onSegmentEnd(seg, currentIndex);
          currentIndex++;
          // Brief dynamic pause between speakers
          setTimeout(playNext, 250);
        }
      );
    };

    playNext();
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
    this.currentUtterance = null;
  }

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
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim && onInterim) onInterim(interim);
      if (final && onFinal) onFinal(final);
    };

    this.recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
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
      if (!this.isContinuousListening) return;
      const lastIdx = event.results.length - 1;
      if (lastIdx < 0) return;

      const result = event.results[lastIdx];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        if (transcript.length > 2) {
          if (onSpeechRecognized) onSpeechRecognized(transcript);

          // Dispatch to StarSeed Continuous Voice Daemon
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

              // Auto-speak responding personality if audio is returned
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
      // Auto-recover continuous listening unless aborted
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
   * Natural Conversational Full-Duplex Voice Mode (StarSeed 1.58b Continuous Dialogue)
   * Listens naturally with real-time speech detection, silence detection,
   * contextual understanding, and smooth interruptibility.
   */
  startFullDuplexConversation({
    onUserSpeech,
    onAiSpeakingStart,
    onAiSpeakingEnd,
    onStateChange,
    allowInterrupt = true,
    personaId = 'astraura_prime',
    voiceProfile = {}
  }) {
    if (typeof window === 'undefined') return;
    this.isConversationActive = true;
    this.conversationPersonaId = personaId;
    this.conversationVoiceProfile = voiceProfile;
    this.allowInterrupt = allowInterrupt;

    this._ensureAudioContext();

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

    let speechTimer = null;
    let accumulatedTranscript = '';

    if (onStateChange) onStateChange('listening');

    this.convRecognition.onresult = (event) => {
      // Acoustic Echo Cancellation: Completely ignore microphone input while AI is speaking or in reverb buffer
      if (this.isSpeaking || this.suppressRecognition) {
        accumulatedTranscript = '';
        return;
      }

      let interim = '';
      let hasFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const text = item[0].transcript;

        // Verify that the recognized text is not an acoustic echo of what was just spoken
        if (this.lastSpokenText && text.trim().length > 3) {
          const lower = text.toLowerCase().trim();
          if (this.lastSpokenText.includes(lower) || lower.includes(this.lastSpokenText.slice(0, 15))) {
            continue; // Skip echo match
          }
        }

        if (item.isFinal) {
          accumulatedTranscript += ' ' + text;
          hasFinal = true;
        } else {
          interim += text;
        }
      }

      if (speechTimer) clearTimeout(speechTimer);

      const currentSpeech = (accumulatedTranscript + ' ' + interim).trim();
      if (currentSpeech.length > 2) {
        if (onStateChange) onStateChange('user_speaking');

        // Adaptive Ultra-Low-Latency Turn Detection (450ms for completed sentences/questions, 700ms for pauses)
        const isCompleteSentence = hasFinal || /[.?!]$/.test(currentSpeech);
        const dynamicTimeout = isCompleteSentence ? 450 : 700;

        speechTimer = setTimeout(() => {
          const finalPrompt = (accumulatedTranscript + (hasFinal ? '' : ' ' + interim)).trim();
          if (finalPrompt.length > 2 && this.isConversationActive && !this.isSpeaking && !this.suppressRecognition) {
            accumulatedTranscript = '';
            if (onUserSpeech) onUserSpeech(finalPrompt);
            if (onStateChange) onStateChange('thinking');
          }
        }, dynamicTimeout);
      }
    };

    this.convRecognition.onerror = (e) => {
      if (this.isConversationActive && e.error !== 'aborted') {
        setTimeout(() => {
          if (this.isConversationActive) {
            try { this.convRecognition.start(); } catch {}
          }
        }, 1000);
      }
    };

    this.convRecognition.onend = () => {
      if (this.isConversationActive) {
        setTimeout(() => {
          if (this.isConversationActive) {
            try { this.convRecognition.start(); } catch {}
          }
        }, 400);
      }
    };

    try {
      this.convRecognition.start();
    } catch (e) {
      console.warn('Conv recognition start:', e);
    }
  }

  stopFullDuplexConversation() {
    this.isConversationActive = false;
    if (this.convRecognition) {
      try {
        this.convRecognition.stop();
      } catch {}
    }
    this.stopSpeaking();
  }

  /**
   * Returns current frequency waveform data from the WebAudio analyser.
   */
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(32);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const omniVoice = new OmniVoiceEngine();


