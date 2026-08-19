from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from ..core.voice_studio_engine import voice_studio_engine
from ..core.audio_cpp_engine import audio_cpp_engine

router = APIRouter(prefix="/api/voice_studio", tags=["VoiceStudio 1.58-Bit"])

class VoiceDesignRequest(BaseModel):
    name: str
    persona_id: Optional[str] = "custom"
    gender: Optional[str] = "neutral"
    age_group: Optional[str] = "adult"
    style: Optional[str] = "conversational_natural"
    attitude: Optional[str] = "Cálida & Auténtica"
    character: Optional[str] = "Empático"
    drama_level: Optional[float] = 0.35
    emotional_exaggeration: Optional[float] = 0.40
    expressiveness: Optional[float] = 0.85
    context_fusion: Optional[bool] = True
    vocal_expressions: Optional[Dict[str, bool]] = None
    accent: Optional[str] = "es-ES"
    language: Optional[str] = "es"
    pitch_base_hz: Optional[float] = 190.0
    cadence_rate: Optional[float] = 1.03
    warmth: Optional[float] = 0.85
    clarity: Optional[float] = 0.92
    breathiness: Optional[float] = 0.22
    prosody_dynamics: Optional[float] = 0.85
    bound_native_voice: Optional[str] = ""
    formants: Optional[Dict[str, float]] = None
    dsp: Optional[Dict[str, Any]] = None

class VoiceUpdateRequest(BaseModel):
    name: Optional[str] = None
    persona_id: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    style: Optional[str] = None
    attitude: Optional[str] = None
    character: Optional[str] = None
    drama_level: Optional[float] = None
    emotional_exaggeration: Optional[float] = None
    expressiveness: Optional[float] = None
    context_fusion: Optional[bool] = None
    vocal_expressions: Optional[Dict[str, bool]] = None
    accent: Optional[str] = None
    language: Optional[str] = None
    pitch_base_hz: Optional[float] = None
    cadence_rate: Optional[float] = None
    warmth: Optional[float] = None
    clarity: Optional[float] = None
    breathiness: Optional[float] = None
    prosody_dynamics: Optional[float] = None
    bound_native_voice: Optional[str] = None
    formants: Optional[Dict[str, float]] = None
    dsp: Optional[Dict[str, Any]] = None

class VoiceAssignRequest(BaseModel):
    voice_id: str
    persona_id: str

class SoundEffectRequest(BaseModel):
    prompt: str
    category: Optional[str] = "ambient"
    duration_seconds: Optional[float] = 3.0
    parameters: Optional[Dict[str, Any]] = None

class VoiceCloneRequest(BaseModel):
    name: str
    audio_base64: Optional[str] = None
    language: Optional[str] = "es"
    persona_id: Optional[str] = None

class VoicePreviewRequest(BaseModel):
    text: str
    profile_id: Optional[str] = None
    voice_profile: Optional[Dict[str, Any]] = None

class AutoEvolveRequest(BaseModel):
    persona_id: str = "aurora"
    context: Optional[str] = ""
    memories: Optional[List[str]] = []
    mood: Optional[str] = "natural"

@router.get("/profiles")
async def get_all_profiles():
    return {
        "profiles": voice_studio_engine.list_profiles(),
        "total": len(voice_studio_engine.list_profiles())
    }

@router.get("/profiles/{voice_id}")
async def get_profile(voice_id: str):
    p = voice_studio_engine.get_profile(voice_id)
    if not p:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return p

@router.put("/profiles/{voice_id}")
async def update_profile(voice_id: str, req: VoiceUpdateRequest):
    updates = req.model_dump(exclude_unset=True)
    res = voice_studio_engine.update_profile(voice_id, updates)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error actualizando perfil"))
    return res

@router.delete("/profiles/{voice_id}")
async def delete_profile(voice_id: str):
    res = voice_studio_engine.delete_profile(voice_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Error eliminando perfil"))
    return res

@router.post("/assign")
async def assign_voice_to_persona(req: VoiceAssignRequest):
    return voice_studio_engine.assign_voice_to_persona(req.voice_id, req.persona_id)

@router.get("/export/{voice_id}")
async def export_profile(voice_id: str):
    p = voice_studio_engine.export_profile(voice_id)
    if not p:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return p

@router.get("/export_all")
async def export_all_profiles():
    return voice_studio_engine.export_all_profiles()

@router.post("/import")
async def import_profiles(body: Any = Body(...)):
    return voice_studio_engine.import_profiles(body)

@router.get("/languages")
async def get_languages():
    return {
        "languages": voice_studio_engine.get_languages_catalogue(),
        "total_supported": 646
    }

@router.post("/clone")
async def clone_voice(req: VoiceCloneRequest):
    return voice_studio_engine.clone_voice_from_audio(
        audio_base64_or_bytes=req.audio_base64,
        name=req.name,
        language=req.language,
        persona_id=req.persona_id
    )

@router.post("/design")
async def design_voice(req: VoiceDesignRequest):
    return voice_studio_engine.design_voice(req.model_dump())

@router.post("/generate_sfx")
async def generate_sfx(req: SoundEffectRequest):
    return voice_studio_engine.generate_sound_effect(
        prompt=req.prompt,
        category=req.category,
        duration_seconds=req.duration_seconds,
        parameters=req.parameters
    )

@router.post("/preview")
async def preview_voice(req: VoicePreviewRequest):
    res = await audio_cpp_engine.synthesize_speech(
        text=req.text,
        voice_params=req.voice_profile or {},
        stream=False
    )
    return res

class LearnInteractionRequest(BaseModel):
    persona_id: str
    domain: Optional[str] = "general"
    user_sentiment: Optional[str] = "curioso"
    ai_tone: Optional[str] = "empatico"
    feedback_score: Optional[float] = 1.0

@router.post("/auto_evolve")
async def auto_evolve_voice(req: AutoEvolveRequest):
    return voice_studio_engine.auto_evolve_voice_profile(req.model_dump())

@router.post("/learn_interaction")
async def learn_interaction(req: LearnInteractionRequest):
    return voice_studio_engine.learn_acoustic_interaction(
        persona_id=req.persona_id,
        domain=req.domain,
        user_sentiment=req.user_sentiment,
        ai_tone=req.ai_tone,
        feedback_score=req.feedback_score
    )

@router.get("/learning_matrix")
async def get_learning_matrix(persona_id: Optional[str] = None):
    return voice_studio_engine.get_learning_matrix(persona_id)

class AnalyzeMicRequest(BaseModel):
    audio_data: str
    target_persona_id: Optional[str] = "aurora"

class RecordBranchedMemoryRequest(BaseModel):
    persona_id: str
    domain: Optional[str] = "general"
    user_sentiment: Optional[str] = "curioso"
    user_speech_metrics: Optional[Dict[str, Any]] = None
    dialogue_snippet: Optional[str] = ""

@router.post("/analyze_mic_158")
async def analyze_mic_158(req: AnalyzeMicRequest):
    return voice_studio_engine.analyze_microphone_audio_158(
        audio_data=req.audio_data,
        target_persona_id=req.target_persona_id
    )

@router.get("/branched_memories")
async def get_branched_memories(persona_id: Optional[str] = None):
    return voice_studio_engine.get_branched_memories_network(persona_id)

@router.post("/branched_memories/record")
async def record_branched_memory(req: RecordBranchedMemoryRequest):
    return voice_studio_engine.record_branched_acoustic_interaction(
        persona_id=req.persona_id,
        domain=req.domain,
        user_sentiment=req.user_sentiment,
        user_speech_metrics=req.user_speech_metrics,
        dialogue_snippet=req.dialogue_snippet
    )
