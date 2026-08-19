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
    const es = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES'));
    return es.length > 0 ? es.sort((a, b) => {
      const aScore = (a.name.includes('Neural') || a.name.includes('Natural') || a.name.includes('Siri') || a.name.includes('Premium')) ? 1 : 0;
      const bScore = (b.name.includes('Neural') || b.name.includes('Natural') || b.name.includes('Siri') || b.name.includes('Premium')) ? 1 : 0;
      return bScore - aScore;
    }) : all;
  }

  /**
   * Cleans text and removes markdown noise for natural voice rendering.
   */
  _prepareNaturalText(text) {
    if (!text) return '';
    return text
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, 'código procesado')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[[\]]/g, '')
      .replace(/[|>\-_~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * High-Fidelity Synthesis via audio.cpp 1.58-Bit Engine
   */
  async speakWithAudioCpp(text, voiceProfile = {}, onStart = null, onEnd = null) {
    this.stopSpeaking();
    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    try {
      this._ensureAudioContext();
      this.isSpeaking = true;
      if (onStart) onStart();

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          persona_id: voiceProfile.persona_id || 'astraura_prime',
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

      // Connect to WebAudio DSP analyzer if available
      if (this.audioCtx && this.analyser) {
        try {
          const source = this.audioCtx.createMediaElementSource(audio);
          source.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
          this.audioSourceNode = source;
        } catch (e) {
          // MediaElementSource might be restricted across domains
        }
      }

      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudioElement = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to WebSpeech:', e);
        this.currentAudioElement = null;
        this.speak(cleanText, voiceProfile, onStart, onEnd);
      };

      await audio.play();
    } catch (e) {
      console.warn('audio.cpp synthesis fallback to native WebSpeech:', e);
      this.speak(cleanText, voiceProfile, onStart, onEnd);
    }
  }

  /**
   * Speak with personality affective modulation (Web Speech + WebAudio DSP fallback).
   */
  speak(text, options = {}, onStart = null, onEnd = null, onBoundary = null) {
    if (!this.synth) return;
    this.stopSpeaking();

    const cleanText = this._prepareNaturalText(text);
    if (!cleanText) return;

    let finalPitch = options.pitch !== undefined ? options.pitch : 1.0;
    let finalRate = options.rate !== undefined ? options.rate : 1.02;
    let finalVolume = options.volume !== undefined ? options.volume : 1.0;

    // Trait based fine-tuning
    if (options.traits) {
      const { empatia = 80, calidez = 80, serenidad = 70, entusiasmo = 60 } = options.traits;
      if (calidez > 80 || empatia > 80) {
        finalRate = Math.max(0.85, finalRate * 0.96);
      }
      if (serenidad > 80) {
        finalPitch = Math.max(0.8, finalPitch * 0.97);
      }
      if (entusiasmo > 80) {
        finalRate = Math.min(1.25, finalRate * 1.05);
        finalPitch = Math.min(1.2, finalPitch * 1.04);
      }
    }

    if (options.tone_shift || options.toneShift) {
      const shift = options.tone_shift !== undefined ? options.tone_shift : options.toneShift;
      finalPitch = Math.max(0.5, Math.min(2.0, finalPitch + shift));
    }

    if (options.formant_shift) {
      finalPitch = Math.max(0.5, Math.min(2.0, finalPitch + options.formant_shift * 0.2));
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = Math.max(0.5, Math.min(2.0, finalPitch));
    utterance.rate = Math.max(0.5, Math.min(2.0, finalRate));
    utterance.volume = Math.max(0.1, Math.min(1.0, finalVolume));

    // Voice Selection
    const esVoices = this.getSpanishVoices();
    const targetVoiceId = options.voice_speaker || options.voice_id || options.voiceURI || options.native_voice_id;
    if (targetVoiceId) {
      const found = this.availableVoices.find(v => 
        v.voiceURI === targetVoiceId || 
        v.name.toLowerCase().includes(targetVoiceId.toLowerCase())
      );
      if (found) utterance.voice = found;
    } else if (esVoices.length > 0) {
      utterance.voice = esVoices[0];
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.warn('OmniVoice notice:', err);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    if (onBoundary) {
      utterance.onboundary = (e) => onBoundary(e);
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
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
      this.synth.cancel();
      this.currentUtterance = null;
    }
    this.isSpeaking = false;
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
      let interim = '';
      let hasFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const text = item[0].transcript;
        if (item.isFinal) {
          accumulatedTranscript += ' ' + text;
          hasFinal = true;
        } else {
          interim += text;
        }
      }

      // If user speaks while AI is speaking, interrupt smoothly if allowed
      if ((interim.trim().length > 3 || hasFinal) && this.isSpeaking && this.allowInterrupt) {
        this.stopSpeaking();
        if (onAiSpeakingEnd) onAiSpeakingEnd();
      }

      if (speechTimer) clearTimeout(speechTimer);

      const currentSpeech = (accumulatedTranscript + ' ' + interim).trim();
      if (currentSpeech.length > 2) {
        if (onStateChange) onStateChange('user_speaking');

        // Set silence timeout to trigger AI turn
        speechTimer = setTimeout(() => {
          if (accumulatedTranscript.trim() && this.isConversationActive) {
            const finalPrompt = accumulatedTranscript.trim();
            accumulatedTranscript = '';
            if (onUserSpeech) onUserSpeech(finalPrompt);
            if (onStateChange) onStateChange('thinking');
          }
        }, 1300);
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


