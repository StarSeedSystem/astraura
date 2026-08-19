import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Sparkles, 
  Wand2, 
  Play, 
  Square, 
  RotateCcw, 
  Plus, 
  Upload, 
  Download, 
  Music, 
  Layers, 
  Radio, 
  Globe, 
  Zap, 
  Check, 
  CheckCircle2, 
  Activity, 
  Flame, 
  Brain,
  SlidersHorizontal,
  Headphones,
  Save,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  Settings2,
  Gauge,
  Wind,
  HeartPulse,
  Share2,
  FileDown,
  FileUp,
  Drama,
  Smile,
  MessageSquare,
  Sparkle,
  Shield,
  Edit3,
  X
} from 'lucide-react';
import { omniVoice } from '../services/omniVoice';

export default function VoiceStudioView({ onBackToChat }) {
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'design' | 'cloning' | 'sfx' | 'dsp' | 'languages'
  const [profiles, setProfiles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [systemVoices, setSystemVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Auto-Regeneration & Evolution State
  const [selectedPersonaForEvolution, setSelectedPersonaForEvolution] = useState('aurora');
  const [autoEvolveRationale, setAutoEvolveRationale] = useState('');

  // Voice Designer / Editor State (Ultra-Granular & Natural)
  const [editingVoiceId, setEditingVoiceId] = useState(null); // null when creating new
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [designName, setDesignName] = useState('Aurora • Resonancia Álmica');
  const [designPersonaTarget, setDesignPersonaTarget] = useState('aurora');
  const [designGender, setDesignGender] = useState('female');
  const [designAge, setDesignAge] = useState('young_adult');
  const [designStyle, setDesignStyle] = useState('empathic_warm');
  const [designAttitude, setDesignAttitude] = useState('Cálida & Maternal');
  const [designCharacter, setDesignCharacter] = useState('Empático');
  const [designDramaLevel, setDesignDramaLevel] = useState(35);
  const [designEmotionalExaggeration, setDesignEmotionalExaggeration] = useState(40);
  const [designExpressiveness, setDesignExpressiveness] = useState(85);
  const [designContextFusion, setDesignContextFusion] = useState(true);
  const [designVocalExpressions, setDesignVocalExpressions] = useState({
    micro_breaths: true,
    subtle_laughs: false,
    sighs_of_relief: false,
    chime_accent: false,
    emphasis_clicks: true
  });
  const [designPitch, setDesignPitch] = useState(215);
  const [designCadenceRate, setDesignCadenceRate] = useState(1.03);
  const [designWarmth, setDesignWarmth] = useState(90);
  const [designClarity, setDesignClarity] = useState(96);
  const [designBreathiness, setDesignBreathiness] = useState(24);
  const [designProsodyDynamics, setDesignProsodyDynamics] = useState(92);
  const [designFormantF1, setDesignFormantF1] = useState(560);
  const [designFormantF2, setDesignFormantF2] = useState(1980);
  const [designReverb, setDesignReverb] = useState(16);
  const [designCompression, setDesignCompression] = useState(32);
  const [designBoundNativeVoice, setDesignBoundNativeVoice] = useState('');

  // Physical Vocal Tract & Bio-Acoustic Modulators (Ultra-Realism)
  const [designJawOpenness, setDesignJawOpenness] = useState(55); // 0-100%
  const [designLipRounding, setDesignLipRounding] = useState(40); // 0-100%
  const [designGlottalTension, setDesignGlottalTension] = useState(50); // 0-100%
  const [designNasalResonance, setDesignNasalResonance] = useState(15); // 0-100%
  const [designChestResonance, setDesignChestResonance] = useState(45); // 0-100%
  const [designGlottalAttack, setDesignGlottalAttack] = useState('balanced'); // 'soft' | 'balanced' | 'hard'
  const [designVibratoRate, setDesignVibratoRate] = useState(5.2); // 4.0 - 7.0 Hz
  const [designVibratoDepth, setDesignVibratoDepth] = useState(30); // 0-100%
  const [designPitchDrift, setDesignPitchDrift] = useState(25); // 0-100% stochastic micro-jitter

  // 1.58-Bit Live Microphone Acoustic Analyzer State
  const [isMicAnalyzing, setIsMicAnalyzing] = useState(false);
  const [micAnalysisData, setMicAnalysisData] = useState(null);
  const [micRecordingSeconds, setMicRecordingSeconds] = useState(0);
  const micMediaRecorderRef = useRef(null);
  const micAudioChunksRef = useRef([]);

  // Branched Multi-Agent Acoustic Memories Network State
  const [branchedMemoriesNetwork, setBranchedMemoriesNetwork] = useState(null);
  const [selectedBranchedPersona, setSelectedBranchedPersona] = useState('aurora');

  // Cloning State
  const [cloneName, setCloneName] = useState('');
  const [cloneLanguage, setCloneLanguage] = useState('es-ES');
  const [clonePersonaTarget, setClonePersonaTarget] = useState('aurora');
  const [recordedAudioB64, setRecordedAudioB64] = useState(null);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const importFileInputRef = useRef(null);

  // SFX Generator State
  const [sfxPrompt, setSfxPrompt] = useState('Campanas cuánticas de cristal y armónicos resonantes');
  const [sfxCategory, setSfxCategory] = useState('ambient');
  const [sfxDuration, setSfxDuration] = useState(3.0);
  const [generatedSfxList, setGeneratedSfxList] = useState([]);

  // DSP Rack State (10-Band EQ)
  const [eqBands, setEqBands] = useState({
    band32: 0, band64: 1.5, band125: 2.0, band250: 1.0, band500: 0.5,
    band1k: 0.0, band2k: 1.5, band4k: 2.5, band8k: 3.0, band16k: 1.0
  });
  const [dspCompressorThreshold, setDspCompressorThreshold] = useState(-24);
  const [dspReverbRoomSize, setDspReverbRoomSize] = useState(25);
  const [dspPitchShiftSemitones, setDspPitchShiftSemitones] = useState(0);

  // Expressive & Natural Test Phrase Presets
  const EXPRESSIVE_PRESETS = [
    {
      id: 'question',
      label: '❓ Cuestionamiento',
      text: '¿Cómo sientes la entonación cuando formulo una pregunta reflexiva? ¿Percibes cómo el tono asciende con curiosidad natural?'
    },
    {
      id: 'exclamation',
      label: '💥 Exclamación & Asombro',
      text: '¡Increíble! ¡Mira cómo la energía, el volumen y la velocidad se disparan con un ataque dinámico instantáneo!'
    },
    {
      id: 'pause',
      label: '💭 Pausa & Reflexión',
      text: 'Hmm... déjame pensarlo con calma... A veces, el silencio entre las ideas es lo que les da verdadera profundidad.'
    },
    {
      id: 'sarcasm',
      label: '🎭 Sarcasmo & Drama',
      text: 'Oh, claro... como si fuera facilísimo sincronizar armónicos cuánticos en medio segundo...'
    },
    {
      id: 'warmth',
      label: '🌸 Calidez & Afecto',
      text: 'Estoy aquí contigo. Tómate el tiempo que necesites, avanzamos paso a paso en cada descubrimiento.'
    },
    {
      id: 'solemn',
      label: '🛡️ Estoica & Firme',
      text: 'La estructura se mantiene firme y verificada. El núcleo de procesamiento opera con precisión absoluta.'
    }
  ];

  // Preview State
  const [testText, setTestText] = useState('Hola Alex, esta es mi voz calibrada en alta fidelidad y calidez acústica. ¿Cómo sientes mi tono, presencia y naturalidad ahora?');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [searchLangQuery, setSearchLangQuery] = useState('');
  const [learningMatrix, setLearningMatrix] = useState(null);

  useEffect(() => {
    loadStudioData();
    const voices = omniVoice.getVoices();
    setSystemVoices(voices);
  }, []);

  const loadStudioData = async () => {
    setLoading(true);
    try {
      const pList = await omniVoice.fetchVoiceStudioProfiles();
      setProfiles(pList);
      const lList = await omniVoice.fetchLanguagesCatalogue();
      setLanguages(lList);
      const vList = omniVoice.getVoices();
      if (vList && vList.length > 0) setSystemVoices(vList);
      const lm = await omniVoice.fetchLearningMatrix();
      if (lm?.matrix) setLearningMatrix(lm.matrix);
      const bm = await omniVoice.fetchBranchedMemories();
      if (bm?.network) setBranchedMemoriesNetwork(bm.network);
    } catch (e) {
      console.warn('Error loading voice studio data:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reassign Voice strictly 1-to-1 to a Personality
  const handleReassignPersona = async (voiceId, newPersonaId) => {
    setLoading(true);
    try {
      const res = await omniVoice.assignVoiceToPersona(voiceId, newPersonaId);
      if (res.success) {
        showNotification(`⚡ ${res.message || `Voz reasignada a ${newPersonaId}`}`);
        await loadStudioData();
      } else {
        showNotification(res.error || 'Error al reasignar voz', true);
      }
    } catch (e) {
      showNotification('Error al reasignar: ' + String(e), true);
    } finally {
      setLoading(false);
    }
  };

  // Delete Voice Profile
  const handleDeleteProfile = async (voiceId, voiceName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la voz '${voiceName}' de la bóveda?`)) return;
    setLoading(true);
    try {
      const res = await omniVoice.deleteVoiceStudioProfile(voiceId);
      if (res.success) {
        showNotification(`🗑️ ${res.message || 'Voz eliminada'}`);
        await loadStudioData();
      } else {
        showNotification(res.error || 'Error al eliminar', true);
      }
    } catch (e) {
      showNotification('Error: ' + String(e), true);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit In-Situ
  const handleOpenEdit = (profile) => {
    setEditingVoiceId(profile.id);
    setDesignName(profile.name || 'Voz');
    setDesignPersonaTarget(profile.persona_id || 'custom');
    setDesignGender(profile.gender || 'neutral');
    setDesignAge(profile.age_group || 'adult');
    setDesignStyle(profile.style || 'conversational_natural');
    setDesignAttitude(profile.attitude || 'Cálida & Maternal');
    setDesignCharacter(profile.character || 'Empático');
    setDesignDramaLevel(Math.round((profile.drama_level || 0.35) * 100));
    setDesignEmotionalExaggeration(Math.round((profile.emotional_exaggeration || 0.40) * 100));
    setDesignExpressiveness(Math.round((profile.expressiveness || 0.85) * 100));
    setDesignContextFusion(profile.context_fusion !== false);
    setDesignVocalExpressions(profile.vocal_expressions || {
      micro_breaths: true,
      subtle_laughs: false,
      sighs_of_relief: false,
      chime_accent: false,
      emphasis_clicks: true
    });
    setDesignPitch(profile.pitch_base_hz || 190);
    setDesignCadenceRate(profile.cadence_rate || 1.03);
    setDesignWarmth(Math.round((profile.warmth || 0.85) * 100));
    setDesignClarity(Math.round((profile.clarity || 0.92) * 100));
    setDesignBreathiness(Math.round((profile.breathiness || 0.22) * 100));
    setDesignProsodyDynamics(Math.round((profile.prosody_dynamics || 0.85) * 100));
    setDesignBoundNativeVoice(profile.bound_native_voice || '');
    setDesignJawOpenness(Math.round((profile.jaw_openness !== undefined ? profile.jaw_openness : 0.55) * 100));
    setDesignLipRounding(Math.round((profile.lip_rounding !== undefined ? profile.lip_rounding : 0.40) * 100));
    setDesignGlottalTension(Math.round((profile.glottal_tension !== undefined ? profile.glottal_tension : 0.50) * 100));
    setDesignNasalResonance(Math.round((profile.nasal_resonance !== undefined ? profile.nasal_resonance : 0.15) * 100));
    setDesignChestResonance(Math.round((profile.chest_resonance !== undefined ? profile.chest_resonance : 0.45) * 100));
    setDesignGlottalAttack(profile.glottal_attack || 'balanced');
    setDesignPitchDrift(Math.round((profile.pitch_drift_stochastic !== undefined ? profile.pitch_drift_stochastic : 0.25) * 100));
    if (profile.vibrato) {
      setDesignVibratoRate(profile.vibrato.rate_hz || 5.2);
      setDesignVibratoDepth(Math.round((profile.vibrato.depth || 0.30) * 100));
    }
    if (profile.formants) {
      setDesignFormantF1(profile.formants.f1 || 520);
      setDesignFormantF2(profile.formants.f2 || 1850);
    }
    if (profile.dsp) {
      setDesignReverb(Math.round((profile.dsp.reverb || 0.15) * 100));
      setDesignCompression(Math.round((profile.dsp.compression || 0.30) * 100));
    }
    setIsEditModalOpen(true);
  };

  // Save Edits or New Design
  const handleSaveDesignOrEdit = async () => {
    setLoading(true);
    const params = {
      name: designName,
      persona_id: designPersonaTarget,
      gender: designGender,
      age_group: designAge,
      style: designStyle,
      attitude: designAttitude,
      character: designCharacter,
      drama_level: designDramaLevel / 100.0,
      emotional_exaggeration: designEmotionalExaggeration / 100.0,
      expressiveness: designExpressiveness / 100.0,
      context_fusion: designContextFusion,
      vocal_expressions: designVocalExpressions,
      pitch_base_hz: designPitch,
      cadence_rate: designCadenceRate,
      warmth: designWarmth / 100.0,
      clarity: designClarity / 100.0,
      breathiness: designBreathiness / 100.0,
      prosody_dynamics: designProsodyDynamics / 100.0,
      bound_native_voice: designBoundNativeVoice,
      jaw_openness: designJawOpenness / 100.0,
      lip_rounding: designLipRounding / 100.0,
      glottal_tension: designGlottalTension / 100.0,
      nasal_resonance: designNasalResonance / 100.0,
      chest_resonance: designChestResonance / 100.0,
      glottal_attack: designGlottalAttack,
      pitch_drift_stochastic: designPitchDrift / 100.0,
      vibrato: {
        rate_hz: designVibratoRate,
        depth: designVibratoDepth / 100.0,
        delay_sec: 0.35
      },
      formants: {
        f1: designFormantF1,
        f2: designFormantF2,
        f3: 2800,
        f4: 3900
      },
      dsp: {
        reverb: designReverb / 100.0,
        compression: designCompression / 100.0,
        eq_low_db: designGender === 'male' || designGender === 'deep_resonant' ? 4.0 : 1.5,
        eq_mid_db: 0.5,
        eq_high_db: designClarity > 80 ? 2.5 : 1.0
      }
    };

    let res;
    if (editingVoiceId) {
      res = await omniVoice.updateVoiceStudioProfile(editingVoiceId, params);
    } else {
      res = await omniVoice.designVoiceProfile(params);
    }
    setLoading(false);

    if (res.success) {
      showNotification(`✨ ${res.message || 'Perfil guardado con éxito'}`);
      setIsEditModalOpen(false);
      setEditingVoiceId(null);
      await loadStudioData();
      if (activeTab !== 'vault') setActiveTab('vault');
    } else {
      showNotification(res.error || 'Error al guardar perfil de voz', true);
    }
  };

  // Preview Speech with Foley, Physical Tract & Expressions
  const handleTestPreview = (customProfile = null) => {
    setIsPlayingPreview(true);
    const profile = customProfile || {
      name: designName,
      persona_id: designPersonaTarget,
      gender: designGender,
      style: designStyle,
      attitude: designAttitude,
      character: designCharacter,
      drama_level: designDramaLevel / 100.0,
      emotional_exaggeration: designEmotionalExaggeration / 100.0,
      expressiveness: designExpressiveness / 100.0,
      pitch_base_hz: designPitch,
      cadence_rate: designCadenceRate,
      warmth: designWarmth / 100.0,
      clarity: designClarity / 100.0,
      breathiness: designBreathiness / 100.0,
      prosody_dynamics: designProsodyDynamics / 100.0,
      bound_native_voice: designBoundNativeVoice,
      jaw_openness: designJawOpenness / 100.0,
      lip_rounding: designLipRounding / 100.0,
      glottal_tension: designGlottalTension / 100.0,
      nasal_resonance: designNasalResonance / 100.0,
      chest_resonance: designChestResonance / 100.0,
      glottal_attack: designGlottalAttack,
      pitch_drift_stochastic: designPitchDrift / 100.0,
      vibrato: {
        rate_hz: designVibratoRate,
        depth: designVibratoDepth / 100.0,
        delay_sec: 0.35
      },
      vocal_expressions: designVocalExpressions
    };

    if (profile.vocal_expressions?.chime_accent) {
      omniVoice.playProceduralSound('quantum_chime');
    }

    omniVoice.speak(
      testText,
      profile,
      () => setIsPlayingPreview(true),
      () => setIsPlayingPreview(false)
    );
  };

  const handleStopPreview = () => {
    omniVoice.stop();
    setIsPlayingPreview(false);
  };

  // 1.58-Bit Live Microphone Acoustic Analyzer Handlers
  const handleStartMicAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micAudioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      micMediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) micAudioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const audioBlob = new Blob(micAudioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        setLoading(true);
        const analysis = await omniVoice.analyzeMicrophone158(audioBlob, selectedPersonaForEvolution);
        setLoading(false);
        if (analysis.success) {
          setMicAnalysisData(analysis);
          showNotification('🎤 Análisis acústico 1.58b completado');
          const bm = await omniVoice.fetchBranchedMemories();
          if (bm?.network) setBranchedMemoriesNetwork(bm.network);
        } else {
          showNotification('Error al analizar audio: ' + (analysis.error || 'Desconocido'), true);
        }
      };

      mr.start(200);
      setIsMicAnalyzing(true);
      setMicRecordingSeconds(0);
    } catch (e) {
      showNotification('Acceso a micrófono denegado: ' + String(e), true);
    }
  };

  const handleStopMicAnalysis = () => {
    if (micMediaRecorderRef.current && isMicAnalyzing) {
      micMediaRecorderRef.current.stop();
      setIsMicAnalyzing(false);
    }
  };

  // Import JSON File
  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      setLoading(true);
      const res = await omniVoice.importVoiceProfiles(jsonData);
      setLoading(false);
      if (res.success) {
        showNotification(`📥 ${res.message || 'Perfiles importados exitosamente'}`);
        await loadStudioData();
      } else {
        showNotification(res.error || 'Error al importar', true);
      }
    } catch (err) {
      showNotification('Archivo JSON inválido: ' + String(err), true);
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  // Export Entire Vault
  const handleExportAllVault = async () => {
    setLoading(true);
    const res = await omniVoice.exportAllVoiceProfiles();
    setLoading(false);
    if (res.success) {
      showNotification('📦 Bóveda de voces exportada y descargada');
    } else {
      showNotification('Error al exportar bóveda', true);
    }
  };

  // Export Single Profile
  const handleExportSingle = async (voiceId) => {
    const res = await omniVoice.exportVoiceProfile(voiceId);
    if (res.success) {
      showNotification(`📤 Perfil ${voiceId} exportado`);
    } else {
      showNotification('Error al exportar', true);
    }
  };

  // Intelligent Auto-Evolution
  const handleAutoEvolve = async (targetPersona = null) => {
    const pId = targetPersona || selectedPersonaForEvolution || 'aurora';
    setLoading(true);
    showNotification(`⚡ IA 1.58b analizando contexto, emoción y memorias para ${pId.toUpperCase()}...`);
    
    const res = await omniVoice.autoEvolveVoice(pId, testText, [], 'natural');
    setLoading(false);
    
    if (res.success && res.profile) {
      const p = res.profile;
      setDesignPersonaTarget(pId);
      setDesignName(p.name || `Voz Evolucionada • ${pId}`);
      setDesignGender(p.gender || (pId === 'hephaestus' || pId === 'hermes' ? 'male' : 'female'));
      setDesignAge(p.age_group || 'young_adult');
      setDesignStyle(p.style || 'empathic_warm');
      setDesignAttitude(p.attitude || 'Cálida & Auténtica');
      setDesignCharacter(p.character || 'Empático');
      setDesignDramaLevel(Math.round((p.drama_level || 0.35) * 100));
      setDesignEmotionalExaggeration(Math.round((p.emotional_exaggeration || 0.40) * 100));
      setDesignExpressiveness(Math.round((p.expressiveness || 0.85) * 100));
      setDesignPitch(p.pitch_base_hz || 190);
      setDesignCadenceRate(p.cadence_rate || 1.03);
      setDesignWarmth(Math.round((p.warmth || 0.85) * 100));
      setDesignClarity(Math.round((p.clarity || 0.92) * 100));
      setDesignBreathiness(Math.round((p.breathiness || 0.20) * 100));
      setDesignProsodyDynamics(Math.round((p.prosody_dynamics || 0.85) * 100));
      setAutoEvolveRationale(p.rationale || '');
      
      showNotification(`✨ Estilo acústico de ${pId.toUpperCase()} regenerado con éxito.`);
      handleTestPreview(p);
      await loadStudioData();
    } else {
      showNotification(res.error || 'Error al evolucionar voz', true);
    }
  };

  // Record Clone Sample
  const startRecordingSample = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudioB64(reader.result);
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(200);
      setIsRecordingSample(true);
      setRecordingSeconds(0);
    } catch (e) {
      showNotification('Acceso a micrófono denegado: ' + String(e), true);
    }
  };

  const stopRecordingSample = () => {
    if (mediaRecorderRef.current && isRecordingSample) {
      mediaRecorderRef.current.stop();
      setIsRecordingSample(false);
    }
  };

  const handleCloneVoice = async () => {
    if (!cloneName) {
      showNotification('Introduce un nombre para la voz clonada', true);
      return;
    }
    setLoading(true);
    const res = await omniVoice.cloneVoiceFromSample(
      recordedAudioB64,
      cloneName,
      cloneLanguage,
      clonePersonaTarget
    );
    setLoading(false);
    if (res.success) {
      showNotification(`🎙️ ${res.message || 'Voz clonada exitosamente'}`);
      setCloneName('');
      setRecordedAudioB64(null);
      await loadStudioData();
      setActiveTab('vault');
    } else {
      showNotification(res.error || 'Error al clonar voz', true);
    }
  };

  const handleGenerateSFX = async () => {
    if (!sfxPrompt) return;
    setLoading(true);
    const res = await omniVoice.generateSFX(sfxPrompt, sfxCategory, sfxDuration);
    setLoading(false);
    if (res.success && res.sfx) {
      setGeneratedSfxList([res.sfx, ...generatedSfxList]);
      showNotification('✨ Efecto de sonido sintetizado');
      playSFXAudio(res.sfx.audio_base64);
    }
  };

  const playSFXAudio = (base64) => {
    try {
      const audio = new Audio(base64);
      audio.play();
    } catch (e) {
      omniVoice.playProceduralSound('quantum_chime');
    }
  };

  const filteredLanguages = languages.filter((l) =>
    l.name.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.code.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.region.toLowerCase().includes(searchLangQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05070d] text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        ref={importFileInputRef}
        onChange={handleImportJsonFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* TOP HEADER */}
      <div className="h-16 px-6 border-b border-cyan-500/20 bg-[#080c16]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/20 animate-pulse">
            <div className="w-full h-full bg-[#080c16] rounded-2xl flex items-center justify-center">
              <Headphones className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-bold text-white tracking-wide">
                VoiceStudio 1.58-Bit // Suite de Síntesis, Bóveda & Calibración
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Hi-Fi 1.58b DSP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Bóveda de Voces 1 a 1, Clonación Zero-Shot, Expresividad Teatral, Formantes y 646 Idiomas
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Auto-Evolve Button */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 font-mono px-2">Evolucionar:</span>
            <select
              value={selectedPersonaForEvolution}
              onChange={(e) => setSelectedPersonaForEvolution(e.target.value)}
              className="bg-[#0f172a] text-cyan-300 text-xs font-mono rounded-lg px-2 py-1 border border-cyan-500/30 focus:outline-none"
            >
              <option value="aurora">Aurora (Alma Viva)</option>
              <option value="hephaestus">Hephaestus (Hardware)</option>
              <option value="hermione">Hermione (Analítica)</option>
              <option value="atenea">Atenea (Soberana)</option>
              <option value="oneiros">Oneiros (Etéreo)</option>
              <option value="hermes">Hermes (Mensajero)</option>
            </select>
            <button
              onClick={() => handleAutoEvolve(selectedPersonaForEvolution)}
              disabled={loading}
              className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Regenerar Estilo IA</span>
            </button>
          </div>

          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 transition-colors"
            >
              Volver al Chat
            </button>
          )}
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {statusMessage && (
        <div className={`px-4 py-2 text-xs font-mono flex items-center justify-between z-30 transition-all ${
          statusMessage.isError ? 'bg-rose-500/20 border-b border-rose-500/40 text-rose-300' : 'bg-cyan-500/20 border-b border-cyan-500/40 text-cyan-300'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="h-12 px-6 border-b border-white/5 bg-[#070a12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto">
          {[
            { id: 'vault', label: 'Bóveda de Voces (1 a 1)', icon: Music, badge: profiles.length },
            { id: 'design', label: 'Diseño & Expresividad', icon: SlidersHorizontal },
            { id: 'mic_analyzer', label: 'Analizador Mic 1.58b', icon: Activity, badge: 'En Vivo' },
            { id: 'cloning', label: 'Clonación Zero-Shot', icon: Mic },
            { id: 'learning', label: 'Aprendizaje & Memorias', icon: Brain, badge: 'IA' },
            { id: 'sfx', label: 'Generador SFX & Texturas', icon: Sparkles },
            { id: 'dsp', label: 'Rack DSP & Ecualizador', icon: Sliders },
            { id: 'languages', label: '646 Idiomas & Dialectos', icon: Globe, badge: '646' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-white/[0.02] border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Vault Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 border border-white/10 transition-colors"
            title="Importar archivo JSON de voces a la bóveda"
          >
            <FileUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Importar JSON</span>
          </button>

          <button
            onClick={handleExportAllVault}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 border border-white/10 transition-colors"
            title="Exportar toda la bóveda como JSON descargable"
          >
            <FileDown className="w-3.5 h-3.5 text-purple-400" />
            <span>Exportar Bóveda</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* TAB 1: BÓVEDA DE VOCES (1 A 1) */}
        {activeTab === 'vault' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Music className="w-5 h-5 text-cyan-400" />
                    Bóveda de Voces Activas // Asignación Estricta 1 a 1
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cada personalidad tiene <span className="text-cyan-300 font-bold">una sola voz asignada</span> de la bóveda. Puedes editar, reasignar, exportar o importar perfiles con total libertad.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingVoiceId(null);
                      setDesignName('Nueva Voz Diseñada');
                      setIsEditModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Diseñar Nueva Voz</span>
                  </button>

                  <button
                    onClick={loadStudioData}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                    title="Recargar perfiles"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((p) => {
                  const isAssigned = p.persona_id && p.persona_id !== 'unassigned' && p.persona_id !== 'custom';
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl bg-black/50 border transition-all space-y-3 relative group ${
                        isAssigned
                          ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-sm block">{p.name}</span>
                          <span className="text-[10px] text-slate-400">{p.gender} • {p.age_group || 'adulto'}</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          p.is_factory ? 'bg-cyan-500/20 text-cyan-300' : (p.is_cloned ? 'bg-purple-500/20 text-purple-300' : (p.is_evolved ? 'bg-pink-500/20 text-pink-300' : 'bg-emerald-500/20 text-emerald-300'))
                        }`}>
                          {p.is_factory ? 'Fábrica' : (p.is_cloned ? 'Clonada' : (p.is_evolved ? 'Evolucionada' : 'Diseñada'))}
                        </span>
                      </div>

                      {/* 1-to-1 Persona Binding Dropdown */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-mono block">Personalidad Vinculada (1 a 1):</span>
                        <select
                          value={p.persona_id || 'unassigned'}
                          onChange={(e) => handleReassignPersona(p.id, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-black/70 border border-cyan-500/30 text-cyan-300 text-xs font-bold focus:outline-none"
                        >
                          <option value="unassigned">-- Desvinculada / Libre --</option>
                          <option value="aurora">Aurora (Alma Viva Principal)</option>
                          <option value="hephaestus">Hephaestus (Forja & Hardware)</option>
                          <option value="hermione">Hermione (Intelecto Cristalino)</option>
                          <option value="atenea">Atenea (Soberana Estratégica)</option>
                          <option value="oneiros">Oneiros (Susurro Onírico)</option>
                          <option value="hermes">Hermes (Chispa Dinámica)</option>
                          <option value="logos">Logos (Razón Pura)</option>
                          <option value="mnemosyne">Mnemosyne (Guardián de Memoria)</option>
                          <option value="kallisti">Kallisti (Estética & Armonía)</option>
                          <option value="custom">Uso Libre / General</option>
                        </select>
                      </div>

                      {/* Rich Characteristics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <div>Actitud: <span className="text-purple-300">{p.attitude || 'Natural'}</span></div>
                        <div>Carácter: <span className="text-emerald-300">{p.character || 'Empático'}</span></div>
                        <div>Drama: <span className="text-pink-300">{Math.round((p.drama_level || 0.35) * 100)}%</span></div>
                        <div>Tono F0: <span className="text-cyan-300">{p.pitch_base_hz || 190} Hz</span></div>
                        <div>Cadencia: <span className="text-slate-200">{p.cadence_rate ? `${p.cadence_rate}x` : '1.03x'}</span></div>
                        <div>Calidez: <span className="text-amber-300">{Math.round((p.warmth || 0.85) * 100)}%</span></div>
                      </div>

                      {p.rationale && (
                        <p className="text-[10px] text-cyan-300/80 italic line-clamp-2 bg-cyan-950/20 p-2 rounded-lg border border-cyan-500/10">
                          "{p.rationale}"
                        </p>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-white/5 gap-2">
                        <button
                          onClick={() => handleTestPreview(p)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Escuchar</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                            title="Editar parámetros in-situ"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => handleExportSingle(p.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                            title="Exportar JSON"
                          >
                            <Download className="w-3.5 h-3.5 text-purple-400" />
                          </button>

                          {!p.is_factory && (
                            <button
                              onClick={() => handleDeleteProfile(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Eliminar de la bóveda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISEÑO & EXPRESIVIDAD ACÚSTICA */}
        {activeTab === 'design' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                    Diseño de Voces // Actitud, Drama, Exageración y Resonancia
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Modela la arquitectura acústica, actitud psicológica y modulación formántica para cualquier entidad.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Personalidad Objetivo:</span>
                  <select
                    value={designPersonaTarget}
                    onChange={(e) => setDesignPersonaTarget(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold focus:outline-none"
                  >
                    <option value="aurora">Aurora (Alma Viva)</option>
                    <option value="hephaestus">Hephaestus (Forja & Hardware)</option>
                    <option value="hermione">Hermione (Analítica Aguda)</option>
                    <option value="atenea">Atenea (Soberana Estratégica)</option>
                    <option value="oneiros">Oneiros (Susurro Etéreo)</option>
                    <option value="hermes">Hermes (Chispa Dinámica)</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Granular Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Column 1: Identity, Style & Attitude */}
                <div className="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="font-bold text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4" />
                    Identidad, Actitud & Carácter
                  </span>

                  <div>
                    <label className="text-slate-400 mb-1 block">Nombre del Perfil:</label>
                    <input
                      type="text"
                      value={designName}
                      onChange={(e) => setDesignName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Actitud & Temperamento:</label>
                    <select
                      value={designAttitude}
                      onChange={(e) => setDesignAttitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-purple-300 focus:outline-none"
                    >
                      <option value="Cálida & Maternal">Cálida & Maternal (Protectora y Cercana)</option>
                      <option value="Sarcástica & Mordaz">Sarcástica & Mordaz (Humor Ácido e Inteligente)</option>
                      <option value="Poética & Contemplativa">Poética & Contemplativa (Lírica y Profunda)</option>
                      <option value="Estoica & Firme">Estoica & Firme (Inquebrantable y Serena)</option>
                      <option value="Solemne & Ceremonial">Solemne & Ceremonial (Trascendental)</option>
                      <option value="Rebelde & Provocativa">Rebelde & Provocativa (Disruptiva y Fuerte)</option>
                      <option value="Científica & Precisa">Científica & Precisa (Rigor Impecable)</option>
                      <option value="Zen & Meditativa">Zen & Meditativa (Paz Absoluta)</option>
                      <option value="Heroica & Inspiradora">Heroica & Inspiradora (Épica)</option>
                      <option value="Enigmática & Mística">Enigmática & Mística (Ciberdélica)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Carácter Psicológico:</label>
                    <select
                      value={designCharacter}
                      onChange={(e) => setDesignCharacter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-emerald-300 focus:outline-none"
                    >
                      <option value="Empático">Empático (Sintonizado con las emociones)</option>
                      <option value="Dominante">Dominante (Liderazgo seguro y asertivo)</option>
                      <option value="Analítico">Analítico (Desglose lógico continuo)</option>
                      <option value="Reservado">Reservado (Pausado y selectivo)</option>
                      <option value="Carismático">Carismático (Magnético y entusiasta)</option>
                      <option value="Filosófico">Filosófico (Indagador ontológico)</option>
                      <option value="Lúdico">Lúdico / Juguetón (Alegre e inventivo)</option>
                      <option value="Protector">Protector (Guardián inquebrantable)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Género / Timbre:</label>
                    <select
                      value={designGender}
                      onChange={(e) => setDesignGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none"
                    >
                      <option value="female">Femenino (Cálido y Expresivo)</option>
                      <option value="male">Masculino (Barítono / Tenor)</option>
                      <option value="neutral">Neutro / Andrógino</option>
                      <option value="deep_resonant">Profundo / Barítono Torácico</option>
                      <option value="ethereal">Celestial / Etéreo</option>
                    </select>
                  </div>

                  {/* Native System Voice Binder */}
                  <div>
                    <label className="text-slate-400 mb-1 block">Voz Nativa macOS / Navegador:</label>
                    <select
                      value={designBoundNativeVoice}
                      onChange={(e) => setDesignBoundNativeVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-cyan-300 focus:outline-none truncate"
                    >
                      <option value="">Auto-Selección Inteligente 1.58b</option>
                      {systemVoices.map((v, i) => (
                        <option key={i} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Column 2: Drama, Emotional Exaggeration & Acoustics */}
                <div className="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="font-bold text-purple-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <Drama className="w-4 h-4" />
                    Drama, Emoción & Frecuencias
                  </span>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Nivel de Drama & Teatralidad:</span>
                      <span className="text-pink-300 font-bold">{designDramaLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designDramaLevel}
                      onChange={(e) => setDesignDramaLevel(Number(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Pausas oratorias, dinamismo de tempo y énfasis escénico</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Exageración Emocional:</span>
                      <span className="text-purple-300 font-bold">{designEmotionalExaggeration}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designEmotionalExaggeration}
                      onChange={(e) => setDesignEmotionalExaggeration(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Modulación expansiva en euforia, asombro o ternura</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Expresividad & Gesticulación:</span>
                      <span className="text-emerald-300 font-bold">{designExpressiveness}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={designExpressiveness}
                      onChange={(e) => setDesignExpressiveness(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Tono Fundamental (F0 Pitch):</span>
                      <span className="text-cyan-300 font-bold">{designPitch} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="320"
                      value={designPitch}
                      onChange={(e) => setDesignPitch(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Velocidad & Cadencia:</span>
                      <span className="text-amber-300 font-bold">{designCadenceRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.45"
                      step="0.02"
                      value={designCadenceRate}
                      onChange={(e) => setDesignCadenceRate(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Column 3: Foley, Human Expressions & Space */}
                <div className="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                  <span className="font-bold text-pink-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4" />
                    Sonidos, Foley & Fusión de Contexto
                  </span>

                  {/* Vocal Foley Checkboxes */}
                  <div className="space-y-2 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <span className="text-slate-300 font-bold block mb-1">Uso de Sonidos & Expresiones Humanas:</span>
                    
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={designVocalExpressions.micro_breaths}
                        onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, micro_breaths: e.target.checked })}
                        className="accent-pink-400 rounded"
                      />
                      <span>Micro-respiros glotales antes de hablar</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={designVocalExpressions.subtle_laughs}
                        onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, subtle_laughs: e.target.checked })}
                        className="accent-pink-400 rounded"
                      />
                      <span>Risas sutiles & sonrisas acústicas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={designVocalExpressions.sighs_of_relief}
                        onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, sighs_of_relief: e.target.checked })}
                        className="accent-pink-400 rounded"
                      />
                      <span>Suspiros de alivio o reflexión</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={designVocalExpressions.chime_accent}
                        onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, chime_accent: e.target.checked })}
                        className="accent-cyan-400 rounded"
                      />
                      <span>Campanilleo cuántico / armónico sutil</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={designVocalExpressions.emphasis_clicks}
                        onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, emphasis_clicks: e.target.checked })}
                        className="accent-emerald-400 rounded"
                      />
                      <span>Chasquidos articulatorios de énfasis</span>
                    </label>
                  </div>

                  {/* Context Fusion Toggle */}
                  <label className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 cursor-pointer">
                    <div>
                      <span className="font-bold text-cyan-300 block">Fusión con Contexto & Memorias</span>
                      <span className="text-[10px] text-slate-400">Adapta el tono al humor del chat</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={designContextFusion}
                      onChange={(e) => setDesignContextFusion(e.target.checked)}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Respirabilidad Humana (Micro-Air):</span>
                      <span className="text-pink-300 font-bold">{designBreathiness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={designBreathiness}
                      onChange={(e) => setDesignBreathiness(Number(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Calidez & Cuerpo Torácico:</span>
                      <span className="text-amber-300 font-bold">{designWarmth}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={designWarmth}
                      onChange={(e) => setDesignWarmth(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Vocal Tract & Bio-Acoustic Modulators (Ultra-Realism) */}
              <div className="p-4 rounded-2xl bg-[#090e1a]/80 border border-cyan-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm text-cyan-300">Moduladores del Tracto Vocal & Articulación Física</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                    Bio-Física 1.58b
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Apertura de Mandíbula */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">🗣️ Apertura Mandibular (F1/F2):</span>
                      <span className="text-cyan-300 font-bold">{designJawOpenness}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={designJawOpenness}
                      onChange={(e) => setDesignJawOpenness(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block">Modula la cavidad bucal y brillo fonético</span>
                  </div>

                  {/* Tensión Glotal */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">⚡ Tensión Glotal (Cuerdas Vocales):</span>
                      <span className="text-purple-300 font-bold">{designGlottalTension}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={designGlottalTension}
                      onChange={(e) => setDesignGlottalTension(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block">Firmeza del pliegue vocal y brillo armónico</span>
                  </div>

                  {/* Resonancia Nasal */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">👃 Resonancia Nasal (Velo del Paladar):</span>
                      <span className="text-pink-300 font-bold">{designNasalResonance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={designNasalResonance}
                      onChange={(e) => setDesignNasalResonance(Number(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block">Acoplamiento del puerto nasal en consonantes</span>
                  </div>

                  {/* Resonancia Torácica */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">🫁 Resonancia Torácica (Cuerpo Grave):</span>
                      <span className="text-amber-300 font-bold">{designChestResonance}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={designChestResonance}
                      onChange={(e) => setDesignChestResonance(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block">Cuerpo orgánico y resonancia de pecho</span>
                  </div>

                  {/* Micro-Intonación & Fluctuación Estocástica 1.58b */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">🎲 Jitter Estocástico Humano:</span>
                      <span className="text-emerald-300 font-bold">{designPitchDrift}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={designPitchDrift}
                      onChange={(e) => setDesignPitchDrift(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block">Elimina la monotonía robótica entre frases</span>
                  </div>

                  {/* Tipo de Ataque Glotal */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 text-[11px] block">🌊 Ataque Glotal de Inicio:</span>
                    <select
                      value={designGlottalAttack}
                      onChange={(e) => setDesignGlottalAttack(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="soft">Suave & Aspirado (Respiración sutil)</option>
                      <option value="balanced">Equilibrado (Conversacional natural)</option>
                      <option value="hard">Firme & Marcado (Autoridad / Énfasis)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 block">Inicio de la oscilación de cuerdas vocales</span>
                  </div>
                </div>
              </div>

              {/* Expressive Prosody Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">
                  Presintonías Expresivas // Cuestionamiento, Exclamación, Pausas & Modos Emocionales:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EXPRESSIVE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTestText(p.text)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                        testText === p.text
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action & Preview Bar */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Texto de prueba vocal..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={isPlayingPreview ? handleStopPreview : () => handleTestPreview()}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isPlayingPreview
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    {isPlayingPreview ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlayingPreview ? 'Detener' : 'Probar Locución'}</span>
                  </button>

                  <button
                    onClick={handleSaveDesignOrEdit}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingVoiceId ? 'Actualizar en la Bóveda' : 'Guardar en la Bóveda'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANALIZADOR DE MICRÓFONO 1.58-BIT EN VIVO */}
        {activeTab === 'mic_analyzer' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                    Analizador de Micrófono & Extractor Prosódico 1.58-Bit
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Escucha la voz del usuario por micrófono, extrae la cuantización ternaria [-1, 0, +1], cadencia, entonación interrogativa y estado emocional para generar una síntesis acústica coherente en tiempo real.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Personalidad Objetivo:</span>
                  <select
                    value={selectedPersonaForEvolution}
                    onChange={(e) => setSelectedPersonaForEvolution(e.target.value)}
                    className="bg-[#0f172a] text-cyan-300 text-xs font-mono rounded-xl px-3 py-1.5 border border-cyan-500/30 font-bold"
                  >
                    <option value="aurora">Aurora (Alma Viva)</option>
                    <option value="hephaestus">Hephaestus (Hardware)</option>
                    <option value="hermione">Hermione (Analítica)</option>
                    <option value="atenea">Atenea (Soberana)</option>
                    <option value="oneiros">Oneiros (Etéreo)</option>
                    <option value="hermes">Hermes (Mensajero)</option>
                  </select>
                </div>
              </div>

              {/* Mic Controls & Live Visualizer */}
              <div className="p-6 rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isMicAnalyzing
                    ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400 shadow-xl shadow-rose-500/30 animate-pulse scale-110'
                    : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                }`}>
                  <Mic className="w-8 h-8" />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-sm font-bold text-white block">
                    {isMicAnalyzing ? 'Escuchando & Analizando en 1.58 Bits...' : 'Habla para Analizar y Co-Evolucionar la Voz'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isMicAnalyzing
                      ? 'Habla con naturalidad (preguntas, dudas, asombro o calma)'
                      : 'Presiona Iniciar para capturar tu prosodia y generar directivas coherentes'}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  {!isMicAnalyzing ? (
                    <button
                      onClick={handleStartMicAnalysis}
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Iniciar Análisis de Micrófono</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopMicAnalysis}
                      className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer animate-bounce"
                    >
                      <Square className="w-4 h-4" />
                      <span>Finalizar & Sintetizar Coherencia</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Analysis Results Display */}
              {micAnalysisData && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      📊 Diagnóstico Acústico 1.58b Extraído:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Timestamp: {new Date(micAnalysisData.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* 1.58-Bit Ternary Spectrum Bands {-1, 0, 1} */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-300">
                        Espectro Ternario Cuantizado 1.58b {'{-1, 0, +1}'}:
                      </span>
                      <span className="text-[10px] text-cyan-400">5 Sub-Bandas Cognitivas</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-1">
                      {['Sub-Grave (60-250Hz)', 'Fundamental (250-800Hz)', 'Formantes (800-2.5k)', 'Sibilancia (2.5-8k)', 'Aire (>8kHz)'].map((bandName, bIdx) => {
                        const val = micAnalysisData.metrics?.ternary_spectral_bands_158?.[bIdx] ?? 0;
                        return (
                          <div
                            key={bandName}
                            className={`p-2.5 rounded-xl border text-center space-y-1 ${
                              val === 1
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                                : val === -1
                                ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <span className="text-[9px] block truncate text-slate-400">{bandName}</span>
                            <span className="text-base font-bold font-mono">
                              {val > 0 ? `+${val}` : val}
                            </span>
                            <span className="text-[9px] block">
                              {val === 1 ? 'RESONANTE' : val === -1 ? 'ATENUADO' : 'NEUTRO'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acoustic Prosody Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 block">Tono Fundamental (F0):</span>
                      <span className="text-base font-bold text-cyan-300">
                        {micAnalysisData.metrics?.pitch_f0_hz || 180} Hz
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        {micAnalysisData.metrics?.is_question_contour ? '❓ Entonación Ascendente' : '➡️ Cadencia Sostenida'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 block">Potencia / RMS:</span>
                      <span className="text-base font-bold text-purple-300">
                        {micAnalysisData.metrics?.energy_rms || 0.25}
                      </span>
                      <span className="text-[9px] text-slate-500 block">Energía vocal ponderada</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 block">Cadencia Estimada:</span>
                      <span className="text-base font-bold text-amber-300">
                        ~{micAnalysisData.metrics?.estimated_user_wpm || 120} WPM
                      </span>
                      <span className="text-[9px] text-slate-500 block">Velocidad de habla del usuario</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 block">Estado Afectivo Detectado:</span>
                      <span className="text-xs font-bold text-pink-300 capitalize block truncate">
                        {micAnalysisData.metrics?.user_speaking_mood || 'calmado_reflexivo'}
                      </span>
                      <span className="text-[9px] text-slate-500 block">Inferencia cognitiva</span>
                    </div>
                  </div>

                  {/* Coherent Persona Synthesis Directives */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1322] to-[#120a1c] border border-purple-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-sm text-purple-200">
                          Directivas de Síntesis Coherente para {selectedPersonaForEvolution.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                        {micAnalysisData.synthesis_directives?.response_attitude || 'Empática & Atenta'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-slate-400 block text-[10px]">Tono Recomendado:</span>
                        <span className="text-cyan-300 font-bold">
                          {micAnalysisData.synthesis_directives?.recommended_pitch_hz} Hz
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-slate-400 block text-[10px]">Cadencia Recomendada:</span>
                        <span className="text-amber-300 font-bold">
                          {micAnalysisData.synthesis_directives?.recommended_cadence_rate}x
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-slate-400 block text-[10px]">Calidez / Rapport:</span>
                        <span className="text-pink-300 font-bold">
                          {Math.round((micAnalysisData.synthesis_directives?.recommended_warmth || 0.85) * 100)}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-slate-400 block text-[10px]">Drama / Expresividad:</span>
                        <span className="text-emerald-300 font-bold">
                          {Math.round((micAnalysisData.synthesis_directives?.recommended_drama_level || 0.40) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Test Coherent Response Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          const dirs = micAnalysisData.synthesis_directives || {};
                          const customP = {
                            name: `${selectedPersonaForEvolution} Coherente`,
                            persona_id: selectedPersonaForEvolution,
                            gender: selectedPersonaForEvolution === 'hephaestus' || selectedPersonaForEvolution === 'hermes' ? 'male' : 'female',
                            pitch_base_hz: dirs.recommended_pitch_hz || 200,
                            cadence_rate: dirs.recommended_cadence_rate || 1.03,
                            warmth: dirs.recommended_warmth || 0.85,
                            breathiness: dirs.recommended_breathiness || 0.24,
                            drama_level: dirs.recommended_drama_level || 0.40,
                            attitude: dirs.response_attitude || 'Empática & Atenta'
                          };
                          handleTestPreview(customP);
                        }}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Escuchar Respuesta Coherente en Vivo</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLONACIÓN ZERO-SHOT */}
        {activeTab === 'cloning' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-purple-400" />
                  Clonación Instantánea Zero-Shot (3 a 15 Segundos)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Graba tu voz o sube un fragmento de audio para extraer el envolvente tímbrico, formantes y adaptarlo al motor 1.58-Bit.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecordingSample
                    ? 'bg-rose-500/30 text-rose-300 border-2 border-rose-500 animate-ping'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  <Mic className="w-8 h-8" />
                </div>

                <div className="text-center">
                  <span className="font-bold text-white text-sm block">
                    {isRecordingSample ? 'Grabando Muestra de Voz...' : (recordedAudioB64 ? 'Muestra Capturada y Lista' : 'Presiona para Grabar Muestra')}
                  </span>
                  <span className="text-slate-500 text-[11px]">Habla con naturalidad durante 5 a 10 segundos</span>
                </div>

                <div className="flex items-center gap-3">
                  {!isRecordingSample ? (
                    <button
                      onClick={startRecordingSample}
                      className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{recordedAudioB64 ? 'Regrabar Muestra' : 'Iniciar Grabación'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecordingSample}
                      className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 animate-pulse transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                      <span>Finalizar Grabación</span>
                    </button>
                  )}
                </div>
              </div>

              {recordedAudioB64 && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 mb-1 block">Nombre de la Voz Clonada:</label>
                      <input
                        type="text"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder="Ej. Mi Voz Clón 1.58b"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 mb-1 block">Idioma Principal:</label>
                      <select
                        value={cloneLanguage}
                        onChange={(e) => setCloneLanguage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none"
                      >
                        <option value="es-ES">Español (España)</option>
                        <option value="es-MX">Español (México)</option>
                        <option value="es-CO">Español (Colombia)</option>
                        <option value="es-AR">Español (Argentina)</option>
                        <option value="en-US">English (US)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 mb-1 block">Asignar a Personalidad:</label>
                      <select
                        value={clonePersonaTarget}
                        onChange={(e) => setClonePersonaTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-purple-300 focus:outline-none font-bold"
                      >
                        <option value="aurora">Aurora (Alma Viva)</option>
                        <option value="hephaestus">Hephaestus (Hardware)</option>
                        <option value="hermione">Hermione (Analítica)</option>
                        <option value="atenea">Atenea (Soberana)</option>
                        <option value="oneiros">Oneiros (Etéreo)</option>
                        <option value="hermes">Hermes (Mensajero)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCloneVoice}
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{loading ? 'Procesando Timbre 1.58b...' : 'Guardar y Asignar en la Bóveda'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: APRENDIZAJE ACÚSTICO & EVOLUCIÓN COGNITIVA */}
        {activeTab === 'learning' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Matriz de Aprendizaje Acústico & Evolución de Prosodia
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cada personalidad calibra de manera continua su grado de sintonía con el usuario, micro-pausas, inflexiones de cuestionamiento y entonación por dominios de conocimiento.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    setLoading(true);
                    const lm = await omniVoice.fetchLearningMatrix();
                    if (lm?.matrix) setLearningMatrix(lm.matrix);
                    setLoading(false);
                    showNotification('🧠 Matriz de aprendizaje actualizada');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Aprendizaje</span>
                </button>
              </div>

              {/* Personalities Learning Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(learningMatrix?.personas || {
                  aurora: { rapport_level: 88, total_interactions: 42, domains: { filosofia: 92, emocional: 95, creatividad: 90 }, inflection_offsets: { question_inquisitiveness: 0.88, expressive_exaggeration: 0.82 } },
                  hephaestus: { rapport_level: 82, total_interactions: 35, domains: { hardware: 96, codigo: 94, terminal: 92 }, inflection_offsets: { question_inquisitiveness: 0.75, expressive_exaggeration: 0.70 } },
                  hermione: { rapport_level: 85, total_interactions: 38, domains: { ciencia: 98, analisis: 95, datos: 92 }, inflection_offsets: { question_inquisitiveness: 0.94, expressive_exaggeration: 0.78 } },
                  atenea: { rapport_level: 80, total_interactions: 28, domains: { estrategia: 94, seguridad: 92, ontocracia: 90 }, inflection_offsets: { question_inquisitiveness: 0.80, expressive_exaggeration: 0.85 } },
                  oneiros: { rapport_level: 90, total_interactions: 30, domains: { onirico: 96, shaders: 92, meditacion: 98 }, inflection_offsets: { question_inquisitiveness: 0.86, contemplative_pauses: 0.95 } },
                  hermes: { rapport_level: 84, total_interactions: 32, domains: { red: 94, web: 95, agilidad: 96 }, inflection_offsets: { question_inquisitiveness: 0.90, expressive_exaggeration: 0.88 } }
                }).map(([pId, pData]) => {
                  const pProfile = profiles.find((p) => p.persona_id === pId) || { name: pId.toUpperCase() };
                  return (
                    <div
                      key={pId}
                      className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/40 transition-all space-y-4 shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                              {pId[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block capitalize">{pId}</span>
                              <span className="text-[10px] text-slate-400">{pProfile.name}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                            {pData.total_interactions || 0} chats
                          </span>
                        </div>

                        {/* Rapport Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Sintonía / Rapport:</span>
                            <span className="text-cyan-400 font-bold">{pData.rapport_level || 70}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${pData.rapport_level || 70}%` }}
                            />
                          </div>
                        </div>

                        {/* Domains */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Dominios de Conocimiento:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(pData.domains || {}).map(([dKey, dVal]) => (
                              <span
                                key={dKey}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1"
                              >
                                <span>{dKey}:</span>
                                <span className="text-emerald-400 font-bold">{dVal}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick Test & Evolve Actions */}
                      <div className="pt-3 border-t border-white/5 flex gap-2">
                        <button
                          onClick={() => {
                            const pProf = profiles.find((pr) => pr.persona_id === pId) || { persona_id: pId };
                            handleTestPreview(
                              `Hola Alex, he estado aprendiendo y calibrando mi entonación. ¿Percibes cómo mi ritmo y cercanía evolucionan contigo?`,
                              pProf
                            );
                          }}
                          className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Probar Locución</span>
                        </button>

                        <button
                          onClick={() => handleAutoEvolve(pId)}
                          disabled={loading}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Forzar auto-regeneración de estilo acústico con conocimientos"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MULTI-AGENT BRANCHED & INTERCONNECTED ACOUSTIC MEMORY TREE */}
            <div className="p-6 rounded-3xl bg-[#080d19] border border-purple-500/30 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    Red de Memorias Acústicas Ramificadas & Puentes Sinápticos Inter-Agente
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cada agente autónomo desarrolla su propio aprendizaje acústico ramificado en 1.58 bits, interconectado mediante puentes sinápticos con los demás cerebros.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Inspeccionar Cerebro:</span>
                  <select
                    value={selectedBranchedPersona}
                    onChange={(e) => setSelectedBranchedPersona(e.target.value)}
                    className="bg-[#0f172a] text-purple-300 text-xs font-mono rounded-xl px-3 py-1.5 border border-purple-500/30 font-bold cursor-pointer"
                  >
                    <option value="aurora">Aurora (Alma Viva)</option>
                    <option value="hephaestus">Hephaestus (Hardware)</option>
                    <option value="hermione">Hermione (Analítica)</option>
                    <option value="atenea">Atenea (Soberana)</option>
                    <option value="oneiros">Oneiros (Etéreo)</option>
                    <option value="hermes">Hermes (Mensajero)</option>
                  </select>
                </div>
              </div>

              {/* Branched Trees Grid for Selected Persona */}
              {(() => {
                const bData = branchedMemoriesNetwork?.[selectedBranchedPersona] || {
                  total_branches: 12,
                  rapport_index: 85,
                  branches: {
                    domain_prosody: {
                      filosofia: { interactions_count: 14, learned_pitch_offset: 2.1, learned_warmth_offset: 0.08 },
                      codigo: { interactions_count: 9, learned_cadence_mult: 1.06, learned_pitch_offset: 0.8 }
                    },
                    ternary_affective_vectors: [
                      { node_id: 'n1', domain: 'filosofia', user_sentiment: 'cuestionamiento', timestamp: Date.now() / 1000 - 300 },
                      { node_id: 'n2', domain: 'microfono_en_vivo', user_sentiment: 'calmado_reflexivo', timestamp: Date.now() / 1000 - 60 }
                    ],
                    synaptic_cross_bridges: [
                      { source_agent: 'aurora', shared_domain: 'filosofia', resonance_sentiment: 'cuestionamiento', synaptic_influence: 'prosody_warmth_infusion' },
                      { source_agent: 'hermes', shared_domain: 'codigo', resonance_sentiment: 'entusiasta', synaptic_influence: 'rhythmic_precision_boost' }
                    ]
                  }
                };

                return (
                  <div className="space-y-4 animate-fade-in">
                    {/* Top Brain Status Banner */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-base">
                          {selectedBranchedPersona[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white block capitalize text-sm">
                            Cerebro Acústico de {selectedBranchedPersona}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {bData.total_branches || 12} ramas activas • Rapport {bData.rapport_index || 85}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                          Puentes Sinápticos: {bData.branches?.synaptic_cross_bridges?.length || 2} Activos
                        </span>
                      </div>
                    </div>

                    {/* 4 Branched Memory Sub-Systems */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Synaptic Cross-Bridges */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            Puentes Sinápticos Inter-Agente
                          </span>
                          <span className="text-[10px] text-slate-400">Ecos cruzados</span>
                        </div>
                        <div className="space-y-2">
                          {(bData.branches?.synaptic_cross_bridges || []).map((bridge, bIdx) => (
                            <div
                              key={bIdx}
                              className="p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/10 space-y-1"
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-purple-300 font-bold uppercase">
                                  {bridge.source_agent} ➔ {selectedBranchedPersona}
                                </span>
                                <span className="text-cyan-400">{bridge.shared_domain}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                Resonancia: <span className="text-pink-300 font-bold">{bridge.resonance_sentiment}</span>
                              </span>
                              <span className="text-[9px] text-emerald-400 block truncate font-mono">
                                • {bridge.synaptic_influence}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Domain Prosody Tuning */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300 flex items-center gap-1.5">
                            <Music className="w-4 h-4 text-purple-400" />
                            Prosodia Aprendida por Dominio
                          </span>
                          <span className="text-[10px] text-slate-400">Calibración</span>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(bData.branches?.domain_prosody || {}).map(([dName, dInfo]) => (
                            <div
                              key={dName}
                              className="p-2.5 rounded-xl bg-white/[0.02] border border-purple-500/10 space-y-1"
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-white font-bold capitalize">{dName}</span>
                                <span className="text-purple-300">{dInfo.interactions_count || 1} turnos</span>
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400">
                                <span>Offset F0: +{dInfo.learned_pitch_offset || 0.0} Hz</span>
                                <span>Cadencia: x{dInfo.learned_cadence_mult || 1.0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3. Ternary Affective 1.58b Vectors */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-pink-300 flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-pink-400" />
                            Huellas Afectivas Ternarias 1.58b
                          </span>
                          <span className="text-[10px] text-slate-400">Últimos Nodos</span>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {(bData.branches?.ternary_affective_vectors || []).slice(-4).reverse().map((node, nIdx) => (
                            <div
                              key={nIdx}
                              className="p-2 rounded-xl bg-white/[0.02] border border-pink-500/10 space-y-1"
                            >
                              <div className="flex justify-between text-[10px]">
                                <span className="text-cyan-300 capitalize">{node.domain}</span>
                                <span className="text-pink-300 font-bold">{node.user_sentiment}</span>
                              </div>
                              <div className="flex gap-1 pt-0.5">
                                {(node.ternary_vector_158 || [1, 0, -1, 1, 0, -1, 1, 0]).slice(0, 8).map((v, vIdx) => (
                                  <span
                                    key={vIdx}
                                    className={`px-1 py-0.2 rounded text-[8px] font-mono ${
                                      v === 1 ? 'bg-cyan-500/30 text-cyan-300' : v === -1 ? 'bg-pink-500/30 text-pink-300' : 'bg-white/10 text-slate-400'
                                    }`}
                                  >
                                    {v > 0 ? `+${v}` : v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 5: GENERADOR SFX */}
        {activeTab === 'sfx' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Generador de Texturas & Efectos de Sonido SFX
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Genera cualquier textura acústica, foley o paisaje cósmico para enriquecer las respuestas auditivas.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div>
                  <label className="text-slate-400 mb-1 block">Descripción del Sonido deseado:</label>
                  <input
                    type="text"
                    value={sfxPrompt}
                    onChange={(e) => setSfxPrompt(e.target.value)}
                    placeholder="Ej. Resonancia de cristales cuánticos con eco espacial..."
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 mb-1 block">Categoría de Sonido:</label>
                    <select
                      value={sfxCategory}
                      onChange={(e) => setSfxCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none"
                    >
                      <option value="ambient">Ambiente & Texturas Cósmicas</option>
                      <option value="scifi">Efectos Sci-Fi & Interfaz</option>
                      <option value="nature">Naturaleza & Elementos</option>
                      <option value="musical">Acordes Armónicos & Pads</option>
                      <option value="foley">Foley & Objetos Físicos</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Duración:</span>
                      <span className="text-emerald-300 font-bold">{sfxDuration}s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={sfxDuration}
                      onChange={(e) => setSfxDuration(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateSFX}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? 'Sintetizando Audio...' : 'Generar Efecto de Sonido'}</span>
                  </button>
                </div>
              </div>

              {generatedSfxList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-300">Efectos Generados en esta Sesión:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {generatedSfxList.map((sfx) => (
                      <div
                        key={sfx.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{sfx.title}</span>
                          <span className="text-[10px] text-slate-400">{sfx.category} • {sfx.duration}s</span>
                        </div>
                        <button
                          onClick={() => playSFXAudio(sfx.audio_base64)}
                          className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RACK DSP MASTERING */}
        {activeTab === 'dsp' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Rack de Procesamiento & Ecualización DSP de 10 Bandas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Masterización en tiempo real para darle presencia, brillo de estudio y calidez analógica a cualquier voz generada.
                </p>
              </div>

              {/* 10-Band Graphic EQ */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <span className="font-bold text-amber-300 uppercase tracking-wider block">Ecualizador Gráfico de 10 Bandas (Hz)</span>
                
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center pt-2">
                  {[
                    { key: 'band32', label: '32' },
                    { key: 'band64', label: '64' },
                    { key: 'band125', label: '125' },
                    { key: 'band250', label: '250' },
                    { key: 'band500', label: '500' },
                    { key: 'band1k', label: '1k' },
                    { key: 'band2k', label: '2k' },
                    { key: 'band4k', label: '4k' },
                    { key: 'band8k', label: '8k' },
                    { key: 'band16k', label: '16k' }
                  ].map((band) => (
                    <div key={band.key} className="flex flex-col items-center space-y-2">
                      <span className="text-[10px] text-amber-300 font-bold">{eqBands[band.key] > 0 ? `+${eqBands[band.key]}` : eqBands[band.key]} dB</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={eqBands[band.key]}
                        onChange={(e) => setEqBands({ ...eqBands, [band.key]: Number(e.target.value) })}
                        className="h-28 -rotate-90 my-8 accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400">{band.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamics & Acoustics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="font-bold text-slate-300 block">Compresor Dinámico</span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Umbral (Threshold):</span>
                    <span className="text-cyan-300">{dspCompressorThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-48"
                    max="0"
                    value={dspCompressorThreshold}
                    onChange={(e) => setDspCompressorThreshold(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="font-bold text-slate-300 block">Reverberación de Sala</span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Tamaño de Espacio:</span>
                    <span className="text-purple-300">{dspReverbRoomSize}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={dspReverbRoomSize}
                    onChange={(e) => setDspReverbRoomSize(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="font-bold text-slate-300 block">Pitch Shift Fino</span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Semitonos:</span>
                    <span className="text-emerald-300">{dspPitchShiftSemitones > 0 ? `+${dspPitchShiftSemitones}` : dspPitchShiftSemitones} st</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={dspPitchShiftSemitones}
                    onChange={(e) => setDspPitchShiftSemitones(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: 646 IDIOMAS */}
        {activeTab === 'languages' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-mono text-xs">
            <div className="p-6 rounded-3xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    Catálogo de 646 Idiomas & Acentos Regionales
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Soporte nativo con marcadores de prosodia y fonética regional adaptables a la matriz ternaria 1.58b.
                  </p>
                </div>

                <input
                  type="text"
                  value={searchLangQuery}
                  onChange={(e) => setSearchLangQuery(e.target.value)}
                  placeholder="Buscar idioma o región..."
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400 w-64"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLanguages.map((lang) => (
                  <div
                    key={lang.code}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{lang.name}</span>
                      <span className="text-[10px] text-cyan-300">{lang.code} • {lang.region}</span>
                    </div>
                    <button
                      onClick={() => {
                        omniVoice.speak(`Pronunciación nativa verificada para ${lang.name}`, { lang: lang.code });
                      }}
                      className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors cursor-pointer"
                      title="Probar fonética"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL IN-SITU */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c101d] border border-cyan-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                {editingVoiceId ? `Editar Perfil de Voz: ${designName}` : 'Diseñar Nueva Voz para la Bóveda'}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingVoiceId(null);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 mb-1 block">Nombre de la Voz:</label>
                <input
                  type="text"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Personalidad Vinculada (1 a 1):</label>
                <select
                  value={designPersonaTarget}
                  onChange={(e) => setDesignPersonaTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-cyan-300 font-bold focus:outline-none"
                >
                  <option value="unassigned">-- Libre / Desvinculada --</option>
                  <option value="aurora">Aurora (Alma Viva)</option>
                  <option value="hephaestus">Hephaestus (Hardware)</option>
                  <option value="hermione">Hermione (Analítica)</option>
                  <option value="atenea">Atenea (Soberana)</option>
                  <option value="oneiros">Oneiros (Etéreo)</option>
                  <option value="hermes">Hermes (Mensajero)</option>
                  <option value="logos">Logos (Razón)</option>
                  <option value="mnemosyne">Mnemosyne (Memoria)</option>
                  <option value="kallisti">Kallisti (Estética)</option>
                  <option value="custom">General / Personalizada</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Actitud & Temperamento:</label>
                <select
                  value={designAttitude}
                  onChange={(e) => setDesignAttitude(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-purple-300 focus:outline-none"
                >
                  <option value="Cálida & Maternal">Cálida & Maternal</option>
                  <option value="Sarcástica & Mordaz">Sarcástica & Mordaz</option>
                  <option value="Poética & Contemplativa">Poética & Contemplativa</option>
                  <option value="Estoica & Firme">Estoica & Firme</option>
                  <option value="Solemne & Ceremonial">Solemne & Ceremonial</option>
                  <option value="Rebelde & Provocativa">Rebelde & Provocativa</option>
                  <option value="Científica & Precisa">Científica & Precisa</option>
                  <option value="Zen & Meditativa">Zen & Meditativa</option>
                  <option value="Heroica & Inspiradora">Heroica & Inspiradora</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Carácter Psicológico:</label>
                <select
                  value={designCharacter}
                  onChange={(e) => setDesignCharacter(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-emerald-300 focus:outline-none"
                >
                  <option value="Empático">Empático</option>
                  <option value="Dominante">Dominante</option>
                  <option value="Analítico">Analítico</option>
                  <option value="Reservado">Reservado</option>
                  <option value="Carismático">Carismático</option>
                  <option value="Filosófico">Filosófico</option>
                  <option value="Lúdico">Lúdico / Juguetón</option>
                  <option value="Protector">Protector</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Género Vocal:</label>
                <select
                  value={designGender}
                  onChange={(e) => setDesignGender(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none"
                >
                  <option value="female">Femenino (Cálido y Expresivo)</option>
                  <option value="male">Masculino (Barítono / Tenor)</option>
                  <option value="neutral">Neutro / Andrógino</option>
                  <option value="deep_resonant">Profundo / Barítono Torácico</option>
                  <option value="ethereal">Celestial / Etéreo</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Voz Nativa macOS / Navegador:</label>
                <select
                  value={designBoundNativeVoice}
                  onChange={(e) => setDesignBoundNativeVoice(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-cyan-300 focus:outline-none truncate"
                >
                  <option value="">Auto-Selección Inteligente 1.58b</option>
                  {systemVoices.map((v, i) => (
                    <option key={i} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Nivel de Drama:</span>
                  <span className="text-pink-300 font-bold">{designDramaLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={designDramaLevel}
                  onChange={(e) => setDesignDramaLevel(Number(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Exageración Emocional:</span>
                  <span className="text-purple-300 font-bold">{designEmotionalExaggeration}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={designEmotionalExaggeration}
                  onChange={(e) => setDesignEmotionalExaggeration(Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Tono F0:</span>
                  <span className="text-cyan-300 font-bold">{designPitch} Hz</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="320"
                  value={designPitch}
                  onChange={(e) => setDesignPitch(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Velocidad / Cadencia:</span>
                  <span className="text-amber-300 font-bold">{designCadenceRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.45"
                  step="0.02"
                  value={designCadenceRate}
                  onChange={(e) => setDesignCadenceRate(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Vocal Foley Checkboxes inside Modal */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <span className="text-slate-300 font-bold block">Expresiones Vocales Humanas & Foley:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={designVocalExpressions.micro_breaths}
                    onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, micro_breaths: e.target.checked })}
                    className="accent-pink-400 rounded"
                  />
                  <span>Micro-respiros glotales</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={designVocalExpressions.subtle_laughs}
                    onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, subtle_laughs: e.target.checked })}
                    className="accent-pink-400 rounded"
                  />
                  <span>Risas sutiles acústicas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={designVocalExpressions.sighs_of_relief}
                    onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, sighs_of_relief: e.target.checked })}
                    className="accent-pink-400 rounded"
                  />
                  <span>Suspiros de reflexión</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={designVocalExpressions.chime_accent}
                    onChange={(e) => setDesignVocalExpressions({ ...designVocalExpressions, chime_accent: e.target.checked })}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Campanilleo cuántico</span>
                </label>
              </div>
            </div>

            {/* Vocal Tract Modulators in Modal */}
            <div className="p-3.5 bg-black/40 rounded-2xl border border-cyan-500/20 space-y-3">
              <span className="text-cyan-300 font-bold block text-[11px]">Moduladores Físicos del Tracto Vocal (1.58b):</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                    <span>Apertura Mandibular:</span>
                    <span className="text-cyan-300 font-bold">{designJawOpenness}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={designJawOpenness}
                    onChange={(e) => setDesignJawOpenness(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                    <span>Tensión Glotal:</span>
                    <span className="text-purple-300 font-bold">{designGlottalTension}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={designGlottalTension}
                    onChange={(e) => setDesignGlottalTension(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                    <span>Resonancia Nasal:</span>
                    <span className="text-pink-300 font-bold">{designNasalResonance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={designNasalResonance}
                    onChange={(e) => setDesignNasalResonance(Number(e.target.value))}
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                    <span>Resonancia Torácica:</span>
                    <span className="text-amber-300 font-bold">{designChestResonance}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={designChestResonance}
                    onChange={(e) => setDesignChestResonance(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                    <span>Jitter Estocástico:</span>
                    <span className="text-emerald-300 font-bold">{designPitchDrift}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={designPitchDrift}
                    onChange={(e) => setDesignPitchDrift(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Ataque Glotal:</span>
                  <select
                    value={designGlottalAttack}
                    onChange={(e) => setDesignGlottalAttack(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[11px] text-slate-200"
                  >
                    <option value="soft">Suave</option>
                    <option value="balanced">Equilibrado</option>
                    <option value="hard">Firme</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Expressive Presets & Preview Bar */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex flex-wrap gap-1">
                {EXPRESSIVE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTestText(p.text)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                      testText === p.text
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Texto de prueba vocal..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <button
                onClick={() => handleTestPreview()}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isPlayingPreview
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                {isPlayingPreview ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlayingPreview ? 'Detener' : 'Probar Locución'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingVoiceId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveDesignOrEdit}
                  disabled={loading}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
