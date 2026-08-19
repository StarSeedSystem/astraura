import os
import time
import json
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .core.config import settings
from .core.profiler import profiler
from .core.environment import environment_sensor
from .core.auto_discovery import auto_discovery_engine
from .core.dream_engine import dream_engine
from .core.vault import connections_vault
from .engine.bitnet_engine import bitnet_engine
from .engine.bitnet_cpp_manager import bitnet_cpp_manager
from .memory.starseed_memory_engine import starseed_memory
from .memory.openviking_engine import openviking_memory
from .memory.knowledge_graph import knowledge_graph
from .memory.vector_store import vector_store
from .memory.document_indexer import document_indexer
from .memory.background_learner import background_learner
from .cerebros.cerebros_manager import cerebros_manager
from .personalities.personality_engine import personality_engine
from .agents.orchestrator import orchestrator
from .agents.swarm_manager import swarm_manager
from .workflows.workflow_engine import workflow_engine
from .tools.system_explorer import system_explorer
from .tools.terminal_tool import terminal_tool
from .tools.system_senses import system_senses
from .tools.browser_tool import browser_agent
from .skills.starseed_library import starseed_library
from .projects.project_vault import project_vault_manager
from .core.sensorium_engine import sensorium_engine
from .core.intuitive_imagination_engine import intuitive_imagination_engine
from .core.system_notifications_engine import system_notifications_engine
from .core.storage_routing_engine import storage_routing_engine
from .core.universal_device_access import universal_device_access
from .memory.mem0_engine import mem0_engine
from .agents.layered_quantum_orchestrator import layered_quantum_orchestrator
from .core.privacy_manager import privacy_manager
from .creations.creations_manager import creations_manager
from .core.os_manager import starseed_os_manager
from .core.audio_cpp_engine import audio_cpp_engine
from .core.continuous_voice_daemon import continuous_voice_daemon
from .core.needle_engine import needle_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 65)
    print("🚀 INICIANDO ASTRAURA 1.58-BIT COGNITIVE ENGINE (StarSeed OS)")
    print("⚡ Arquitectura: Apple Silicon M1 (ARM64 NEON) + BitNet b1.58 Ternary")
    print("🌌 Personalidades: Génesis, Hephaestus, Hermes, Atenea, Oneiros, etc.")
    print("🛡️ Seguridad: Bóveda Local Soberana 100% Offline / Zero-Leak")
    print("=" * 65)
    
    # 1. Hardware Profiling & Auto-Tuning
    profile = profiler.auto_tune()
    print(f"✅ Hardware: {profile['system']['processor']} ({profile['system']['arch']})")
    
    # 2. Auto-Discovery of Models and Documents
    discovery = auto_discovery_engine.scan_for_existing_contexts()
    print(f"🔍 Auto-Descubrimiento: {discovery['total_models']} modelos GGUF/1.58b y {discovery['total_documents']} documentos detectados.")
    
    # 3. Workspace Document Auto-Indexing
    index_res = document_indexer.scan_and_index()
    print(f"📚 Base de conocimiento: {index_res['total_documents_in_store']} fragmentos | {index_res['total_knowledge_nodes']} nodos conceptuales.")
    
    # 4. StarSeed Skills Catalog
    skills_count = len(starseed_library.get_all_skills())
    print(f"🌌 Biblioteca StarSeed OS: {skills_count} habilidades y paquetes activos por defecto.")
    
    # 5. Start Background Loops: Learner, Intuitive Imagination, Swarm Scheduler & Storage Watcher
    asyncio.create_task(background_learner.start_background_loop())
    asyncio.create_task(intuitive_imagination_engine.start_background_loop())
    asyncio.create_task(swarm_manager.start_scheduler_loop())
    asyncio.create_task(storage_routing_engine.start_watcher_loop())
    print("🧠 Worker de aprendizaje continuo en segundo plano: ACTIVO")
    print("🌌 Worker de Imaginación Intuitiva Unificada (Always-On 1.58b): ACTIVO")
    print("⚡ Worker de Enjambre Multiagéntico & Reactivaciones Programadas: ACTIVO")
    print("💾 Worker de Detección & Enrutamiento de Almacenamiento: ACTIVO")
    print("=" * 65)
    
    yield
    
    background_learner.stop()
    print("🛑 Astraura 1.58-Bit AI Engine detenido.")

app = FastAPI(
    title="Astraura 1.58-Bit AI Engine // StarSeed OS",
    version="2.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

background_learner.register_callback(lambda evt: asyncio.create_task(manager.broadcast({
    "type": "learning_event",
    "event": evt
})))

intuitive_imagination_engine.register_callback(lambda evt: asyncio.create_task(manager.broadcast(evt)))
swarm_manager.register_callback(lambda evt: asyncio.create_task(manager.broadcast(evt)))
storage_routing_engine.register_callback(lambda evt: asyncio.create_task(manager.broadcast(evt)))

# ================= Status & Profiling APIs =================

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "app_name": settings.app_name,
        "engine": bitnet_engine.get_engine_status(),
        "environment": environment_sensor.get_live_metrics(),
        "telemetry": system_senses.get_full_telemetry(),
        "profiler": profiler.get_profile(),
        "browser_ready": browser_agent.is_playwright_available,
        "memory_summary": {
            "knowledge_nodes": len(knowledge_graph.nodes),
            "knowledge_edges": len(knowledge_graph.edges),
            "vector_documents": len(vector_store.documents),
            "learned_events_count": len(background_learner.learned_events_log)
        },
        "skills_active": len([s for s in starseed_library.get_all_skills() if s["enabled"]]),
        "dream_status": dream_engine.get_status(),
        "swarm_status": swarm_manager.get_swarm_status()
    }

@app.get("/api/profile")
async def get_hardware_profile():
    return profiler.get_profile()

@app.get("/api/environment")
async def get_environment():
    return environment_sensor.get_live_metrics()

@app.get("/api/memory/graph")
async def get_memory_graph():
    return knowledge_graph.get_full_graph()

@app.get("/api/memory/events")
async def get_learning_events():
    return {
        "events": background_learner.learned_events_log,
        "user_profile": background_learner.user_profile
    }

# ================= Swarm & Multi-Area Multi-Agent Orchestration APIs =================

@app.get("/api/swarm/status")
async def get_swarm_status():
    return swarm_manager.get_status()

class CapacityModeRequest(BaseModel):
    mode: str # "adaptive", "performance", "eco", "manual"
    manual_percent: Optional[int] = None

@app.post("/api/swarm/capacity_mode")
async def update_swarm_capacity_mode(req: CapacityModeRequest):
    return swarm_manager.set_capacity_mode(req.mode, req.manual_percent)

class DispatchTaskRequest(BaseModel):
    area_id: str
    title: str
    prompt: str
    agent_id: Optional[str] = None

@app.post("/api/swarm/task/dispatch")
async def dispatch_swarm_task(req: DispatchTaskRequest):
    return swarm_manager.dispatch_task(req.area_id, req.title, req.prompt, req.agent_id)

class CancelTaskRequest(BaseModel):
    task_id: str

@app.post("/api/swarm/task/cancel")
async def cancel_swarm_task(req: CancelTaskRequest):
    return {"success": swarm_manager.cancel_task(req.task_id)}

class ToggleScheduleRequest(BaseModel):
    schedule_id: str
    enabled: bool

@app.post("/api/swarm/schedule/toggle")
async def toggle_swarm_schedule(req: ToggleScheduleRequest):
    return {"success": swarm_manager.toggle_schedule(req.schedule_id, req.enabled)}

class UpdateScheduleFrequencyRequest(BaseModel):
    schedule_id: str
    frequency_minutes: int

@app.post("/api/swarm/schedule/frequency")
async def update_swarm_schedule_frequency(req: UpdateScheduleFrequencyRequest):
    return {"success": swarm_manager.update_schedule_frequency(req.schedule_id, req.frequency_minutes)}

class CreateScheduleRequest(BaseModel):
    title: str
    area_id: str
    agent_id: str
    frequency_minutes: int
    prompt: Optional[str] = "Ejecución autónoma programada"

@app.post("/api/swarm/schedule/create")
async def create_swarm_schedule(req: CreateScheduleRequest):
    return {"success": True, "schedule": swarm_manager.create_custom_schedule(req.title, req.area_id, req.agent_id, req.frequency_minutes, req.prompt)}

class ToggleAgentRequest(BaseModel):
    agent_id: str
    enabled: bool

@app.post("/api/swarm/agent/toggle")
async def toggle_agent(req: ToggleAgentRequest):
    if req.agent_id in swarm_manager.agents:
        swarm_manager.agents[req.agent_id]["status"] = "active" if req.enabled else "paused"
        swarm_manager._save_state()
        return {"success": True}
    return {"success": False}

class UpdateConcurrencyRequest(BaseModel):
    agent_id: str
    concurrency: int

@app.post("/api/swarm/agent/concurrency")
async def update_agent_concurrency(req: UpdateConcurrencyRequest):
    if req.agent_id in swarm_manager.agents:
        swarm_manager.agents[req.agent_id]["concurrency"] = max(1, min(16, req.concurrency))
        swarm_manager._save_state()
        return {"success": True}
    return {"success": False}

# ================= Vault & Connections APIs =================

@app.get("/api/vault")
async def get_vault():
    return connections_vault.get_vault_data()

class UpdateConnectionRequest(BaseModel):
    conn_id: str
    account: Optional[str] = None
    token: Optional[str] = None
    status: Optional[str] = None

@app.post("/api/vault/connection/update")
async def update_connection(req: UpdateConnectionRequest):
    updates = {}
    if req.account: updates["account"] = req.account
    if req.status: updates["status"] = req.status
    if req.token: updates["token_set"] = True
    return {"success": connections_vault.update_connection(req.conn_id, updates)}

class UpdateParametersRequest(BaseModel):
    parameters: Dict[str, Any]

@app.post("/api/vault/parameters/update")
async def update_parameters(req: UpdateParametersRequest):
    return {"success": True, "parameters": connections_vault.update_parameters(req.parameters)}

# ================= Workflows Engine APIs =================

@app.get("/api/workflows")
async def get_workflows():
    return {"workflows": workflow_engine.get_all_workflows(), "logs": workflow_engine.execution_logs}

class ToggleWorkflowRequest(BaseModel):
    workflow_id: str
    enabled: bool

@app.post("/api/workflows/toggle")
async def toggle_workflow(req: ToggleWorkflowRequest):
    return {"success": workflow_engine.toggle_workflow(req.workflow_id, req.enabled)}

class RunWorkflowRequest(BaseModel):
    workflow_id: str

@app.post("/api/workflows/run")
async def run_workflow(req: RunWorkflowRequest):
    return await workflow_engine.run_workflow(req.workflow_id)

class SaveWorkflowRequest(BaseModel):
    workflow: Dict[str, Any]

@app.post("/api/workflows/save")
async def save_workflow_endpoint(req: SaveWorkflowRequest):
    saved = workflow_engine.save_workflow(req.workflow)
    return {"success": True, "workflow": saved}

@app.delete("/api/workflows/{wf_id}")
async def delete_workflow_endpoint(wf_id: str):
    success = workflow_engine.delete_workflow(wf_id)
    return {"success": success}

# ================= Universal Code Execution Sandbox API =================

class ExecuteCodeRequest(BaseModel):
    code: str
    language: str = "python"
    timeout_secs: int = 15

@app.post("/api/execute/code")
async def execute_code_endpoint(req: ExecuteCodeRequest):
    import tempfile
    start_time = time.time()
    lang = req.language.lower().strip()
    code = req.code
    
    if lang in ["python", "py", "python3"]:
        with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        try:
            res = terminal_tool.execute_command(f"python3 '{tmp_path}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    elif lang in ["javascript", "js", "node"]:
        with tempfile.NamedTemporaryFile(suffix=".js", mode="w", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        try:
            res = terminal_tool.execute_command(f"node '{tmp_path}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    elif lang in ["typescript", "ts", "tsx"]:
        with tempfile.NamedTemporaryFile(suffix=".ts", mode="w", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        try:
            res = terminal_tool.execute_command(f"npx -y tsx '{tmp_path}' || npx -y ts-node '{tmp_path}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    elif lang in ["bash", "zsh", "sh", "shell"]:
        res = terminal_tool.execute_command(code, timeout_secs=req.timeout_secs)
    elif lang in ["cpp", "c++"]:
        with tempfile.NamedTemporaryFile(suffix=".cpp", mode="w", delete=False) as f:
            f.write(code)
            tmp_src = f.name
        tmp_bin = tmp_src + ".out"
        try:
            comp_res = terminal_tool.execute_command(f"clang++ -O2 -std=c++17 '{tmp_src}' -o '{tmp_bin}'", timeout_secs=10)
            if not comp_res.get("success", False):
                res = comp_res
            else:
                res = terminal_tool.execute_command(f"'{tmp_bin}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_src):
                os.unlink(tmp_src)
            if os.path.exists(tmp_bin):
                os.unlink(tmp_bin)
    elif lang in ["c", "h"]:
        with tempfile.NamedTemporaryFile(suffix=".c", mode="w", delete=False) as f:
            f.write(code)
            tmp_src = f.name
        tmp_bin = tmp_src + ".out"
        try:
            comp_res = terminal_tool.execute_command(f"clang -O2 '{tmp_src}' -o '{tmp_bin}'", timeout_secs=10)
            if not comp_res.get("success", False):
                res = comp_res
            else:
                res = terminal_tool.execute_command(f"'{tmp_bin}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_src):
                os.unlink(tmp_src)
            if os.path.exists(tmp_bin):
                os.unlink(tmp_bin)
    elif lang in ["rust", "rs"]:
        with tempfile.NamedTemporaryFile(suffix=".rs", mode="w", delete=False) as f:
            f.write(code)
            tmp_src = f.name
        tmp_bin = tmp_src + ".bin"
        try:
            comp_res = terminal_tool.execute_command(f"rustc -O '{tmp_src}' -o '{tmp_bin}'", timeout_secs=15)
            if not comp_res.get("success", False):
                res = comp_res
            else:
                res = terminal_tool.execute_command(f"'{tmp_bin}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_src):
                os.unlink(tmp_src)
            if os.path.exists(tmp_bin):
                os.unlink(tmp_bin)
    elif lang in ["go", "golang"]:
        with tempfile.NamedTemporaryFile(suffix=".go", mode="w", delete=False) as f:
            f.write(code)
            tmp_src = f.name
        try:
            res = terminal_tool.execute_command(f"go run '{tmp_src}'", timeout_secs=req.timeout_secs)
        finally:
            if os.path.exists(tmp_src):
                os.unlink(tmp_src)
    else:
        res = terminal_tool.execute_command(code, timeout_secs=req.timeout_secs)

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    res["execution_time_ms"] = elapsed_ms
    return res

class ExecuteProjectRequest(BaseModel):
    files: List[Dict[str, Any]]
    entrypoint: Optional[str] = None
    language: Optional[str] = "python"
    timeout_secs: Optional[int] = 20

@app.post("/api/execute/project")
async def execute_multi_file_project(req: ExecuteProjectRequest):
    """
    Executes a multi-file project sandbox with filesystem isolation and stdout/stderr capture.
    """
    import tempfile
    import shutil
    start_time = time.time()
    tmp_dir = tempfile.mkdtemp(prefix="astraura_sandbox_")

    try:
        # Write all files
        for f in req.files:
            fname = f.get("filename", "file.txt")
            fcontent = f.get("content", "")
            fpath = Path(tmp_dir) / fname
            fpath.parent.mkdir(parents=True, exist_ok=True)
            fpath.write_text(fcontent, encoding="utf-8")

        # Determine entry point
        entry = req.entrypoint
        if not entry:
            file_names = [f.get("filename", "") for f in req.files]
            if "main.py" in file_names:
                entry = "main.py"
            elif "index.js" in file_names or "app.js" in file_names:
                entry = "index.js" if "index.js" in file_names else "app.js"
            elif "main.rs" in file_names:
                entry = "main.rs"
            elif "main.cpp" in file_names:
                entry = "main.cpp"
            elif "run.sh" in file_names:
                entry = "run.sh"
            elif req.files:
                entry = req.files[0].get("filename")

        lang = (req.language or "python").lower()
        if entry.endswith(".py"):
            res = terminal_tool.execute_command(f"python3 '{entry}'", cwd=tmp_dir, timeout_secs=req.timeout_secs)
        elif entry.endswith(".js"):
            res = terminal_tool.execute_command(f"node '{entry}'", cwd=tmp_dir, timeout_secs=req.timeout_secs)
        elif entry.endswith(".ts"):
            res = terminal_tool.execute_command(f"npx -y tsx '{entry}'", cwd=tmp_dir, timeout_secs=req.timeout_secs)
        elif entry.endswith(".rs"):
            comp = terminal_tool.execute_command(f"rustc '{entry}' -o prog.bin", cwd=tmp_dir, timeout_secs=15)
            if comp.get("success"):
                res = terminal_tool.execute_command("./prog.bin", cwd=tmp_dir, timeout_secs=req.timeout_secs)
            else:
                res = comp
        elif entry.endswith(".cpp") or entry.endswith(".c"):
            comp = terminal_tool.execute_command(f"clang++ -std=c++17 '{entry}' -o prog.out", cwd=tmp_dir, timeout_secs=12)
            if comp.get("success"):
                res = terminal_tool.execute_command("./prog.out", cwd=tmp_dir, timeout_secs=req.timeout_secs)
            else:
                res = comp
        elif entry.endswith(".sh"):
            res = terminal_tool.execute_command(f"bash '{entry}'", cwd=tmp_dir, timeout_secs=req.timeout_secs)
        else:
            res = terminal_tool.execute_command(f"python3 '{entry}'", cwd=tmp_dir, timeout_secs=req.timeout_secs)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        res["execution_time_ms"] = elapsed_ms
        res["entrypoint"] = entry
        return res
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

class ExportZipRequest(BaseModel):
    name: str
    files: List[Dict[str, Any]]
    description: Optional[str] = ""

@app.post("/api/projects/export/zip")
async def export_project_as_zip(req: ExportZipRequest):
    import io
    import zipfile
    from fastapi.responses import Response

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in req.files:
            fname = f.get("filename", "file.txt")
            fcontent = f.get("content", "")
            zf.writestr(fname, fcontent)

        # Add README
        readme_content = f"# {req.name}\n\n{req.description}\n\nGenerado y exportado desde StarSeed OS & Astraura 1.58-Bit."
        zf.writestr("README.md", readme_content)

    zip_buffer.seek(0)
    safe_name = "".join([c if c.isalnum() or c in "_-" else "_" for c in req.name])
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.zip"}
    )

# ================= Multifaceted Projects Vault & Code Memory APIs =================

@app.get("/api/projects")
async def list_projects_endpoint():
    return {
        "projects": project_vault_manager.list_projects(),
        "total": len(project_vault_manager.list_projects())
    }

class SaveProjectRequest(BaseModel):
    project: Dict[str, Any]

@app.post("/api/projects/save")
async def save_project_endpoint(req: SaveProjectRequest):
    saved = project_vault_manager.save_project(req.project)
    return {"success": True, "project": saved}

class ExportProjectRequest(BaseModel):
    project_id: str
    target_directory: str

@app.post("/api/projects/export")
async def export_project_endpoint(req: ExportProjectRequest):
    return project_vault_manager.export_project_to_disk(req.project_id, req.target_directory)

class LinkFolderRequest(BaseModel):
    folder_path: str

@app.post("/api/projects/link_folder")
async def link_folder_endpoint(req: LinkFolderRequest):
    return project_vault_manager.scan_and_link_local_folder(req.folder_path)

# ================= Dream Studio & Imagination APIs =================

@app.get("/api/dream/status")
async def get_dream_status():
    return dream_engine.get_status()

@app.get("/api/dream/process_types")
async def get_dream_process_types():
    return {"process_types": dream_engine.get_process_types()}

class UpdateDreamConfigRequest(BaseModel):
    max_capacity_percentage: Optional[int] = None
    max_hourly_kb: Optional[int] = None
    max_daily_mb: Optional[float] = None
    dream_frequency_minutes: Optional[int] = None
    dream_intensity: Optional[float] = None
    quantum_entropy_level: Optional[float] = None
    dream_mode: Optional[str] = None
    active_process_types: Optional[List[str]] = None
    target_thematic_areas: Optional[List[str]] = None

@app.post("/api/dream/config")
async def update_dream_config(req: UpdateDreamConfigRequest):
    return dream_engine.update_config(req.model_dump(exclude_unset=True))

class TriggerDreamRequest(BaseModel):
    theme: Optional[str] = None
    parent_branch_id: Optional[str] = None
    process_type: Optional[str] = None

@app.post("/api/dream/trigger")
async def trigger_dream(req: TriggerDreamRequest):
    return await dream_engine.execute_dream_burst(
        theme=req.theme, 
        parent_branch_id=req.parent_branch_id, 
        process_type=req.process_type
    )

class AddCreationRequest(BaseModel):
    title: str
    type: str
    content: str
    tags: List[str]
    origin_branch: Optional[str] = None

@app.post("/api/dream/creation")
async def add_dream_creation(req: AddCreationRequest):
    creation_id = f"creation_{int(time.time())}"
    item = {
        "id": creation_id,
        "title": req.title,
        "type": req.type,
        "content": req.content,
        "tags": req.tags,
        "origin_branch": req.origin_branch,
        "timestamp": time.time()
    }
    dream_engine.proactive_creations.insert(0, item)
    return {"success": True, "creation": item}

class AddReminderRequest(BaseModel):
    text: str
    time: str

@app.post("/api/dream/reminder")
async def add_dream_reminder(req: AddReminderRequest):
    rem_id = f"rem_{int(time.time())}"
    item = {
        "id": rem_id,
        "text": req.text,
        "time": req.time,
        "active": True
    }
    dream_engine.reminders.insert(0, item)
    return {"success": True, "reminder": item}

@app.post("/api/dream/reminder/toggle")
async def toggle_dream_reminder(req: Dict[str, Any]):
    rem_id = req.get("reminder_id")
    for r in dream_engine.reminders:
        if r.get("id") == rem_id:
            r["active"] = not r.get("active", True)
            return {"success": True, "reminder": r}
    return {"success": False, "error": "Recordatorio no encontrado"}

class DreamBranchActionRequest(BaseModel):
    branch_id: str
    action: str
    data: Optional[Dict[str, Any]] = None

@app.post("/api/dream/branch/action")
async def handle_dream_branch_action(req: DreamBranchActionRequest):
    if req.action == "apply":
        return dream_engine.apply_branch(req.branch_id)
    elif req.action == "discard":
        return dream_engine.discard_branch(req.branch_id)
    elif req.action == "edit":
        return dream_engine.edit_branch(req.branch_id, req.data or {})
    return {"success": False, "error": "Acción no reconocida"}

class DreamCreationActionRequest(BaseModel):
    creation_id: str
    action: str
    data: Optional[Dict[str, Any]] = None

@app.post("/api/dream/creation/action")
async def handle_dream_creation_action(req: DreamCreationActionRequest):
    if req.action == "apply":
        return dream_engine.apply_creation(req.creation_id)
    elif req.action == "discard":
        return dream_engine.discard_creation(req.creation_id)
    elif req.action == "edit":
        return dream_engine.edit_creation(req.creation_id, req.data or {})
    return {"success": False, "error": "Acción no reconocida"}

# ================= StarSeed Memory & Recuerdos Core APIs =================

@app.get("/api/memory/starseed")
async def get_starseed_memory_graph():
    return starseed_memory.build_harmonic_graph()

@app.get("/api/memory/starseed/manifest")
async def get_starseed_manifest():
    return starseed_memory.get_manifest()

@app.get("/api/memory/starseed/documents")
async def list_starseed_documents(branch: Optional[str] = Query(None)):
    return starseed_memory.list_documents(branch)

class SaveMemoryDocRequest(BaseModel):
    id: Optional[str] = None
    name: str
    branch: str
    category: Optional[str] = "General"
    tags: Optional[List[str]] = []
    markdown: str
    color: Optional[str] = "#00f0ff"
    active: Optional[bool] = True

@app.post("/api/memory/starseed/document")
async def save_starseed_document(req: SaveMemoryDocRequest):
    doc = starseed_memory.create_or_update_document(req.model_dump(exclude_unset=True))
    return {"success": True, "document": doc}

@app.delete("/api/memory/starseed/document/{doc_id}")
async def delete_starseed_document(doc_id: str):
    success = starseed_memory.delete_document(doc_id)
    return {"success": success}

@app.get("/api/memory/recuerdos")
async def get_recuerdos():
    return starseed_memory.recuerdos

class SaveRecuerdosRequest(BaseModel):
    user_preferences: Optional[Dict[str, Any]] = None
    context_personality_rules: Optional[List[Dict[str, Any]]] = None
    connected_accounts_prefs: Optional[List[Dict[str, Any]]] = None
    pinned_core_memories: Optional[List[Dict[str, Any]]] = None

@app.post("/api/memory/recuerdos")
async def save_recuerdos(req: SaveRecuerdosRequest):
    data = req.model_dump(exclude_unset=True)
    current = starseed_memory.recuerdos
    for k, v in data.items():
        current[k] = v
    starseed_memory.save_recuerdos(current)
    return {"success": True, "recuerdos": current}

# ================= OpenViking Multi-Tier Cognitive Memory APIs =================

@app.get("/api/memory/openviking")
async def get_openviking_memory():
    return openviking_memory.get_full_memory_state()

# ================= Multidimensional Cerebros (Brains) APIs =================

@app.get("/api/cerebros")
async def get_all_cerebros():
    return cerebros_manager.get_cerebros()

class ActivateBrainRequest(BaseModel):
    brain_id: str

@app.post("/api/cerebros/activate")
async def activate_brain_endpoint(req: ActivateBrainRequest):
    success = cerebros_manager.activate_brain(req.brain_id)
    return {"success": success, "active_brain_id": cerebros_manager.active_brain_id}

@app.post("/api/cerebros/save")
async def save_brain_endpoint(req: Dict[str, Any]):
    saved = cerebros_manager.save_brain(req)
    return {"success": True, "brain": saved}

@app.delete("/api/cerebros/{brain_id}")
async def delete_brain_endpoint(brain_id: str):
    success = cerebros_manager.delete_brain(brain_id)
    return {"success": success}

class ScanFolderRequest(BaseModel):
    folder_path: str

@app.post("/api/cerebros/scan_folder")
async def scan_folder_endpoint(req: ScanFolderRequest):
    metrics = cerebros_manager.scan_folder(req.folder_path)
    return {"success": True, "metrics": metrics}

class LinkGDriveRequest(BaseModel):
    brain_id: str
    gdrive_source: Dict[str, Any]

@app.post("/api/cerebros/link_gdrive")
async def link_gdrive_endpoint(req: LinkGDriveRequest):
    linked = cerebros_manager.link_gdrive_source(req.brain_id, req.gdrive_source)
    return {"success": True, "source": linked}

@app.delete("/api/cerebros/{brain_id}/gdrive/{source_id}")
async def delete_gdrive_endpoint(brain_id: str, source_id: str):
    success = cerebros_manager.delete_gdrive_source(brain_id, source_id)
    return {"success": success}

class SyncSourcesRequest(BaseModel):
    brain_id: str

@app.post("/api/cerebros/sync_sources")
async def sync_sources_endpoint(req: SyncSourcesRequest):
    return cerebros_manager.sync_all_sources(req.brain_id)

class UpdateNeuronPermissionsRequest(BaseModel):
    brain_id: str
    neuron_id: str
    permissions: Dict[str, Any]

@app.post("/api/cerebros/neuron/permissions")
async def update_neuron_permissions_endpoint(req: UpdateNeuronPermissionsRequest):
    return cerebros_manager.update_neuron_permissions(req.brain_id, req.neuron_id, req.permissions)

class ModifyBrainMemoryRequest(BaseModel):
    brain_id: str
    target_id: str
    content: str
    caller_persona_id: Optional[str] = "astraura_prime"
    session_id: Optional[str] = "default"

@app.post("/api/cerebros/memory/modify")
async def modify_brain_memory_endpoint(req: ModifyBrainMemoryRequest):
    return cerebros_manager.modify_brain_memory(
        brain_id=req.brain_id,
        layer_or_neuron_id=req.target_id,
        content=req.content,
        caller_persona_id=req.caller_persona_id,
        session_id=req.session_id
    )

@app.get("/api/cerebros/{brain_id}/synaptic_tree")
async def get_brain_synaptic_tree_endpoint(brain_id: str):
    return cerebros_manager.get_brain_synaptic_tree(brain_id)

class AttachBrainMemoryRequest(BaseModel):
    brain_id: str
    memory: Dict[str, Any]
    personality_id: Optional[str] = None
    agent_id: Optional[str] = None

@app.post("/api/cerebros/memory/attach")
async def attach_brain_memory_endpoint(req: AttachBrainMemoryRequest):
    return cerebros_manager.attach_memory_to_brain(
        brain_id=req.brain_id,
        memory_data=req.memory,
        personality_id=req.personality_id,
        agent_id=req.agent_id
    )

class ControlBrainProcessRequest(BaseModel):
    brain_id: str
    agent_id: str
    action: str
    params: Optional[Dict[str, Any]] = None

@app.post("/api/cerebros/process/control")
async def control_brain_process_endpoint(req: ControlBrainProcessRequest):
    return cerebros_manager.control_brain_process(
        brain_id=req.brain_id,
        agent_id=req.agent_id,
        action=req.action,
        params=req.params
    )

class AutoLinkSynapsesRequest(BaseModel):
    brain_id: str

@app.post("/api/cerebros/auto_link_synapses")
async def auto_link_synapses_endpoint(req: AutoLinkSynapsesRequest):
    return cerebros_manager.auto_link_brain_synapses(req.brain_id)

# ================= Creaciones & Evolución Progresiva APIs =================

@app.get("/api/creations")
async def get_all_creations_endpoint():
    return creations_manager.get_all_creations()

@app.get("/api/creations/{creation_id}")
async def get_creation_by_id_endpoint(creation_id: str):
    item = creations_manager.get_creation_by_id(creation_id)
    if not item:
        return {"success": False, "error": "Creación no encontrada"}
    return {"success": True, "creation": item}

class ExecuteCreationSampleRequest(BaseModel):
    creation_id: str
    custom_code: Optional[str] = None

@app.post("/api/creations/execute_sample")
async def execute_creation_sample_endpoint(req: ExecuteCreationSampleRequest):
    return creations_manager.execute_sample_simulation(req.creation_id, req.custom_code)

class ForkCreationVersionRequest(BaseModel):
    creation_id: str
    branch_name: str
    diff_summary: str
    new_content: str
    author_agent: Optional[str] = None

@app.post("/api/creations/fork_version")
async def fork_creation_version_endpoint(req: ForkCreationVersionRequest):
    return creations_manager.fork_new_version(
        creation_id=req.creation_id,
        branch_name=req.branch_name,
        diff_summary=req.diff_summary,
        new_content=req.new_content,
        author_agent=req.author_agent
    )

@app.post("/api/creations/recycle")
async def recycle_creations_storage_endpoint():
    return creations_manager.recycle_and_balance_storage()

# ================= Mem0 Universal Memory APIs (https://github.com/mem0ai/mem0) =================

@app.get("/api/memory/mem0")
async def get_mem0_all():
    return mem0_engine.get_all()

class AddMem0Request(BaseModel):
    memory: str
    user_id: Optional[str] = "alex"
    agent_id: Optional[str] = "*"
    run_id: Optional[str] = "default"
    category: Optional[str] = "general"
    metadata: Optional[Dict[str, Any]] = None

@app.post("/api/memory/mem0/add")
async def add_mem0_memory(req: AddMem0Request):
    added = mem0_engine.add_memory(
        memory_text=req.memory,
        user_id=req.user_id,
        agent_id=req.agent_id,
        run_id=req.run_id,
        category=req.category,
        metadata=req.metadata
    )
    return {"success": True, "memory": added}

class SearchMem0Request(BaseModel):
    query: str
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    limit: Optional[int] = 10

@app.post("/api/memory/mem0/search")
async def search_mem0_memories(req: SearchMem0Request):
    results = mem0_engine.search_memories(
        query=req.query,
        user_id=req.user_id,
        agent_id=req.agent_id,
        limit=req.limit
    )
    return {"success": True, "results": results, "total": len(results)}

class UpdateMem0Request(BaseModel):
    memory: str
    metadata: Optional[Dict[str, Any]] = None

@app.put("/api/memory/mem0/{memory_id}")
async def update_mem0_memory(memory_id: str, req: UpdateMem0Request):
    updated = mem0_engine.update_memory(memory_id, req.memory, req.metadata)
    if updated:
        return {"success": True, "memory": updated}
    raise HTTPException(status_code=404, detail="Mem0 memory not found")

@app.delete("/api/memory/mem0/{memory_id}")
async def delete_mem0_memory(memory_id: str):
    success = mem0_engine.delete_memory(memory_id)
    return {"success": success}

# ================= Chat File Attachment API =================

@app.post("/api/upload/attachment")
async def upload_chat_attachment(file: UploadFile = File(...)):
    """
    Accepts ANY file format, extracts textual content or structural summary,
    and returns rich metadata for immediate chat prompt injection.
    """
    filename = file.filename or "archivo_adjunto"
    content_bytes = await file.read()
    file_size_kb = round(len(content_bytes) / 1024.0, 2)
    ext = Path(filename).suffix.lower()

    text_content = ""
    # Try decoding text/code/markdown/json
    try:
        text_content = content_bytes.decode('utf-8', errors='ignore')
    except Exception:
        text_content = f"[Archivo binario/multimedia: {filename} ({file_size_kb} KB)]"

    # Save to scratch folder for local reference
    scratch_dir = settings.data_path / "attachments"
    scratch_dir.mkdir(parents=True, exist_ok=True)
    saved_path = scratch_dir / f"{int(time.time())}_{filename}"
    saved_path.write_bytes(content_bytes)

    # Add to working memory in OpenViking
    openviking_memory.add_working_item(f"Archivo adjuntado por el usuario: {filename} ({file_size_kb} KB)")

    return {
        "success": True,
        "filename": filename,
        "extension": ext,
        "size_kb": file_size_kb,
        "path": str(saved_path),
        "content_preview": text_content[:4000],
        "is_text": ext in [".txt", ".md", ".py", ".js", ".ts", ".json", ".csv", ".html", ".css", ".sh", ".c", ".cpp", ".rs", ".go"]
    }

# ================= Personalities & Affective Profiles APIs =================

@app.get("/api/personalities")
async def get_personalities():
    return {
        "personalities": personality_engine.list_personalities(),
        "active_persona": personality_engine.get_active_persona()
    }

class ActivatePersonaRequest(BaseModel):
    persona_id: str

@app.post("/api/personalities/activate")
async def activate_personality(req: ActivatePersonaRequest):
    success = personality_engine.set_active_persona(req.persona_id)
    return {"success": success, "active_persona": personality_engine.get_active_persona()}

class SavePersonaRequest(BaseModel):
    persona: Dict[str, Any]

@app.post("/api/personalities/save")
async def save_personality_endpoint(req: SavePersonaRequest):
    saved = personality_engine.save_personality(req.persona)
    return {"success": True, "persona": saved}

@app.delete("/api/personalities/{persona_id}")
async def delete_personality_endpoint(persona_id: str):
    success = personality_engine.delete_personality(persona_id)
    return {"success": success}

# ================= audio.cpp 1.58-Bit Inference & Holographic Voice Matrix APIs =================

@app.get("/api/voice/status")
async def get_voice_engine_status():
    return audio_cpp_engine.get_status()

@app.get("/api/voice/models")
async def get_voice_models():
    return {"success": True, "models": audio_cpp_engine.get_supported_models()}

@app.get("/api/voice/organs")
async def get_voice_cognitive_organs():
    return {"success": True, "organs": audio_cpp_engine.get_cognitive_organs()}

@app.get("/api/voice/matrix")
async def get_voice_holographic_matrix():
    return audio_cpp_engine.get_holographic_matrix()

class VoiceSynthesizeRequest(BaseModel):
    text: str
    persona_id: Optional[str] = "astraura_prime"
    voice_profile: Optional[Dict[str, Any]] = None
    as_base64: Optional[bool] = False

@app.post("/api/voice/synthesize")
async def synthesize_voice_endpoint(req: VoiceSynthesizeRequest):
    import base64
    profile = req.voice_profile
    if not profile:
        matrix = audio_cpp_engine.get_holographic_matrix().get("holographic_matrix", {})
        profile = matrix.get(req.persona_id, {})

    wav_bytes = audio_cpp_engine.synthesize_native_pcm(req.text, profile)
    
    if req.as_base64:
        b64 = base64.b64encode(wav_bytes).decode("utf-8")
        return {
            "success": True,
            "persona_id": req.persona_id,
            "audio_base64": f"data:audio/wav;base64,{b64}",
            "sample_rate": 24000,
            "format": "audio/wav"
        }

    return Response(content=wav_bytes, media_type="audio/wav")

class UpdateVoiceProfileRequest(BaseModel):
    persona_id: str
    profile: Dict[str, Any]

@app.post("/api/voice/personality_profile")
async def update_voice_profile_endpoint(req: UpdateVoiceProfileRequest):
    return audio_cpp_engine.update_persona_voice_profile(req.persona_id, req.profile)

class LearnVoiceExpressionRequest(BaseModel):
    persona_id: str
    expression: str
    emotion: str
    acoustic_tweak: Optional[Dict[str, Any]] = None

@app.post("/api/voice/learn_expression")
async def learn_voice_expression_endpoint(req: LearnVoiceExpressionRequest):
    return audio_cpp_engine.learn_and_evolve_voice(
        req.persona_id,
        req.expression,
        req.emotion,
        req.acoustic_tweak
    )

# ================= Continuous Ambient Voice Daemon & Multi-Personality Perception APIs =================

@app.get("/api/voice/daemon/status")
async def get_voice_daemon_status():
    return continuous_voice_daemon.get_daemon_status()

class ToggleMasterVoiceSwitchRequest(BaseModel):
    switch_key: str
    enabled: bool

@app.post("/api/voice/daemon/toggle_master")
async def toggle_master_voice_switch_endpoint(req: ToggleMasterVoiceSwitchRequest):
    return continuous_voice_daemon.toggle_master_switch(req.switch_key, req.enabled)

class TogglePersonaVoiceSwitchRequest(BaseModel):
    persona_id: str
    voice_enabled: Optional[bool] = None
    multiagent_enabled: Optional[bool] = None

@app.post("/api/voice/daemon/toggle_personality")
async def toggle_persona_voice_switch_endpoint(req: TogglePersonaVoiceSwitchRequest):
    return continuous_voice_daemon.toggle_personality_voice_autonomous(
        req.persona_id,
        req.voice_enabled,
        req.multiagent_enabled
    )

class AmbientPerceiveRequest(BaseModel):
    user_transcript: str
    acoustic_metadata: Optional[Dict[str, Any]] = None

@app.post("/api/voice/daemon/ambient_perceive")
async def ambient_perceive_endpoint(req: AmbientPerceiveRequest):
    return await continuous_voice_daemon.perceive_ambient_audio_and_respond(
        req.user_transcript,
        req.acoustic_metadata
    )



# ================= Autonomous Browser & Web Navigation APIs =================

class BrowserNavigateRequest(BaseModel):
    url: str
    take_screenshot: Optional[bool] = True

@app.post("/api/browser/navigate")
async def browser_navigate(req: BrowserNavigateRequest):
    return await browser_agent.navigate_and_extract(req.url, take_screenshot=req.take_screenshot)

class BrowserSearchRequest(BaseModel):
    query: str
    num_results: Optional[int] = 5

@app.post("/api/browser/search")
async def browser_search(req: BrowserSearchRequest):
    return await browser_agent.search_web(req.query, num_results=req.num_results)

class BrowserActionRequest(BaseModel):
    url: str
    actions: List[Dict[str, Any]]
    take_screenshot: Optional[bool] = True

@app.post("/api/browser/action")
async def browser_action_endpoint(req: BrowserActionRequest):
    return await browser_agent.navigate_and_extract(req.url, take_screenshot=req.take_screenshot, actions=req.actions)

class IndexMemoryRequest(BaseModel):
    url: str
    title: str
    content: str

@app.post("/api/browser/index_memory")
async def browser_index_memory_endpoint(req: IndexMemoryRequest):
    return browser_agent.index_url_into_starseed_memory(req.url, req.title, req.content)

# ================= Universal Auto-Discovery & Installer APIs =================

@app.get("/api/discovery/scan")
async def run_discovery_scan():
    return auto_discovery_engine.scan_for_existing_contexts()

@app.get("/api/installer/script")
async def get_installer_script():
    script_content = auto_discovery_engine.generate_installer_script()
    return PlainTextResponse(script_content, media_type="text/x-shellscript")

# ================= StarSeed OS Control & Smart Updates Endpoints =================

@app.get("/api/system/os/status")
async def get_os_system_status_endpoint():
    return starseed_os_manager.get_os_system_status()

class CheckUpdatesRequest(BaseModel):
    channel: Optional[str] = "stable"

@app.post("/api/system/os/check-updates")
async def check_os_updates_endpoint(req: CheckUpdatesRequest):
    return starseed_os_manager.check_starseed_updates(req.channel)

class InstallUpdateRequest(BaseModel):
    channel: Optional[str] = "stable"
    auto_restart: Optional[bool] = True

@app.post("/api/system/os/install-update")
async def install_os_update_endpoint(req: InstallUpdateRequest):
    return starseed_os_manager.install_starseed_update(req.channel, req.auto_restart)

class ModifyOSRequest(BaseModel):
    os_type: str
    modifications: Dict[str, Any] = {}
    user_permissions_granted: bool = False
    security_consent_token: Optional[str] = None

@app.post("/api/system/os/modify")
async def modify_os_endpoint(req: ModifyOSRequest):
    return starseed_os_manager.modify_os_configuration(
        req.os_type,
        req.modifications,
        req.user_permissions_granted,
        req.security_consent_token
    )

class OSPreferencesRequest(BaseModel):
    preferences: Dict[str, Any]

@app.post("/api/system/os/preferences")
async def save_os_preferences_endpoint(req: OSPreferencesRequest):
    return starseed_os_manager.save_preferences(req.preferences)

# ================= Computer-Wide Filesystem Endpoints =================

@app.get("/api/system/fs")
async def list_computer_files(path: Optional[str] = Query(None)):
    return system_explorer.list_directory(path)

@app.get("/api/system/file")
async def read_computer_file(path: str = Query(...)):
    return system_explorer.read_file_content(path)

@app.get("/api/system/search")
async def search_computer_files(query: str = Query(...), root: Optional[str] = Query(None)):
    root_path = root or str(system_explorer.home_dir)
    return system_explorer.search_files(root_path, query)

class IndexPathRequest(BaseModel):
    path: str

@app.post("/api/system/index-path")
async def index_custom_path(req: IndexPathRequest):
    target = Path(req.path).expanduser().resolve()
    if not target.exists():
        return {"success": False, "error": "Ruta no encontrada"}

    new_chunks = 0
    if target.is_file():
        res = system_explorer.read_file_content(str(target))
        if res["success"]:
            chunks = document_indexer.chunk_text(res["content"])
            for idx, chunk in enumerate(chunks):
                vector_store.add_document(
                    text=chunk,
                    metadata={"source": target.name, "path": str(target), "chunk_idx": idx}
                )
                document_indexer.extract_concepts_from_chunk(chunk, target.name)
                new_chunks += 1
    elif target.is_dir():
        for p in target.glob("**/*"):
            if p.is_file() and p.suffix.lower() in [".pdf", ".md", ".txt", ".py", ".json", ".js", ".ts"]:
                if any(x in str(p) for x in [".git", "node_modules", ".venv"]):
                    continue
                res = system_explorer.read_file_content(str(p))
                if res["success"] and res["content"].strip():
                    chunks = document_indexer.chunk_text(res["content"])
                    for idx, chunk in enumerate(chunks):
                        vector_store.add_document(
                            text=chunk,
                            metadata={"source": p.name, "path": str(p), "chunk_idx": idx}
                        )
                        document_indexer.extract_concepts_from_chunk(chunk, p.name)
                        new_chunks += 1

    if new_chunks > 0:
        vector_store.rebuild_idf()
        vector_store.save()

    return {
        "success": True,
        "path": str(target),
        "new_chunks_added": new_chunks,
        "total_documents": len(vector_store.documents),
        "total_nodes": len(knowledge_graph.nodes)
    }

# ================= Terminal Execution & Senses Endpoints =================

class ExecRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

@app.post("/api/system/exec")
async def execute_terminal_command(req: ExecRequest):
    return terminal_tool.execute_command(req.command, req.cwd)

@app.get("/api/system/senses")
async def get_system_senses_telemetry():
    return system_senses.get_full_telemetry()

# ================= Sensorium 360° Environmental & Senses APIs =================

@app.get("/api/sensorium/live")
async def get_sensorium_live():
    return sensorium_engine.get_full_sensorium()

class UpdateSensorsRequest(BaseModel):
    sensors: Dict[str, Any]

@app.post("/api/sensorium/update_client_sensors")
async def update_client_sensors_endpoint(req: UpdateSensorsRequest):
    sensorium_engine.update_client_sensors(req.sensors)
    return {"success": True, "sensors": sensorium_engine.client_sensors}

class UpdateLocationRequest(BaseModel):
    location: Dict[str, Any]

@app.post("/api/sensorium/location")
async def update_sensorium_location(req: UpdateLocationRequest):
    updated = sensorium_engine.update_location(req.location)
    # Automatically trigger weather fetch for new coords in background
    lat = updated.get("latitude")
    lon = updated.get("longitude")
    if lat is not None and lon is not None:
        asyncio.create_task(sensorium_engine.fetch_live_weather_multisource(lat, lon))
    return {"success": True, "location": updated}

class FetchWeatherRequest(BaseModel):
    latitude: Optional[float] = 20.6597
    longitude: Optional[float] = -103.3496

@app.post("/api/sensorium/weather/fetch")
async def fetch_weather_endpoint(req: FetchWeatherRequest):
    w = await sensorium_engine.fetch_live_weather_multisource(req.latitude, req.longitude)
    return {"success": True, "weather": w}

# ================= Unified Intuitive Imagination & Oneiric State APIs =================

@app.get("/api/imagination/status")
async def get_imagination_status():
    return intuitive_imagination_engine.get_status()

@app.get("/api/imagination/process_types")
async def get_imagination_process_types():
    return {"process_types": intuitive_imagination_engine.get_status()["process_types_catalog"]}

class ImaginationConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/imagination/config")
async def update_imagination_config(req: ImaginationConfigRequest):
    return {"success": True, "config": intuitive_imagination_engine.update_config(req.config)}

class TriggerImaginationRequest(BaseModel):
    theme: Optional[str] = None
    process_type: Optional[str] = None

@app.post("/api/imagination/trigger")
async def trigger_imagination_endpoint(req: TriggerImaginationRequest):
    res = await intuitive_imagination_engine.trigger_cycle(req.theme, req.process_type)
    system_notifications_engine.add_notification({
        "title": "✨ Nueva Imaginación Intuitiva",
        "message": res.get("branch", {}).get("theme", "")[:100],
        "category": "Imaginación Intuitiva",
        "severity": "suggestion"
    })
    return res

@app.post("/api/imagination/recycle")
async def recycle_imagination_memories():
    rec = intuitive_imagination_engine.recycle_and_prune_memories()
    system_notifications_engine.add_notification({
        "title": "Reciclaje de Memorias Intuitivas",
        "message": f"Se compactaron {rec.get('items_compacted')} pensamientos (+{rec.get('space_freed_kb')} KB liberados).",
        "category": "Reciclaje de Memoria",
        "severity": "info"
    })
    return {"success": True, "recycle": rec}

@app.get("/api/imagination/process/{process_id}")
async def get_process_details_endpoint(process_id: str):
    return intuitive_imagination_engine.get_process_details(process_id)

@app.get("/api/imagination/process/{process_id}/branches")
async def get_process_branches_endpoint(process_id: str):
    return intuitive_imagination_engine.get_process_branches(process_id)

class ForkBranchRequest(BaseModel):
    fork_note: Optional[str] = ""

@app.post("/api/imagination/branch/{branch_id}/fork")
async def fork_branch_endpoint(branch_id: str, req: Optional[ForkBranchRequest] = None):
    note = req.fork_note if req else ""
    return intuitive_imagination_engine.fork_branch(branch_id, note)

@app.post("/api/imagination/branch/{branch_id}/regenerate")
async def regenerate_branch_endpoint(branch_id: str):
    return await intuitive_imagination_engine.regenerate_branch(branch_id)

class ModifyBranchRequest(BaseModel):
    data: Dict[str, Any]

@app.post("/api/imagination/branch/{branch_id}/modify")
async def modify_branch_endpoint(branch_id: str, req: ModifyBranchRequest):
    return intuitive_imagination_engine.modify_branch(branch_id, req.data)

@app.delete("/api/imagination/branch/{branch_id}")
async def delete_branch_endpoint(branch_id: str):
    return intuitive_imagination_engine.delete_branch(branch_id)

class UpdateProcessConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/imagination/process/{process_id}/config")
async def update_process_config_endpoint(process_id: str, req: UpdateProcessConfigRequest):
    return intuitive_imagination_engine.update_process_config(process_id, req.config)

class ProcessPolicyRequest(BaseModel):
    policy: Dict[str, Any]

@app.post("/api/imagination/process/{process_id}/permission_policy")
async def update_process_policy_endpoint(process_id: str, req: ProcessPolicyRequest):
    return intuitive_imagination_engine.update_process_permission_policy(process_id, req.policy)

class ApplyAllProposalsRequest(BaseModel):
    item_ids: Optional[List[str]] = None

@app.post("/api/imagination/apply_all")
async def apply_all_proposals_endpoint(req: Optional[ApplyAllProposalsRequest] = None):
    ids = req.item_ids if req else None
    return await intuitive_imagination_engine.apply_all_proposals_concurrently(ids)

@app.post("/api/imagination/requests/grant_all")
async def grant_all_requests_endpoint():
    return intuitive_imagination_engine.grant_and_apply_all_requests()

class GrantSingleRequestPayload(BaseModel):
    data: Optional[Dict[str, Any]] = None

@app.post("/api/imagination/requests/{branch_id}/grant")
async def grant_single_request_endpoint(branch_id: str, req: Optional[GrantSingleRequestPayload] = None):
    d = req.data if req else None
    return intuitive_imagination_engine.grant_and_apply_request(branch_id, d)

# ================= Universal Device & OS Native Hardware Access APIs =================

@app.get("/api/system/universal_device_access")
async def get_universal_device_access_status():
    return universal_device_access.get_hardware_profile()

class GrantPermissionRequest(BaseModel):
    permission_key: str
    granted: bool = True

@app.post("/api/system/universal_device_access/grant")
async def grant_universal_permission_endpoint(req: GrantPermissionRequest):
    return universal_device_access.grant_permission(req.permission_key, req.granted)

# ================= Dual-Trunk 1.58-Bit Master Resource Governor APIs =================

@app.get("/api/system/dual_trunk")
async def get_dual_trunk_governor_status():
    return intuitive_imagination_engine.get_dual_trunk_status()

class DualTrunkLimitRequest(BaseModel):
    imagination_percent: int
    swarm_percent: int

@app.post("/api/system/dual_trunk")
async def set_dual_trunk_limits_endpoint(req: DualTrunkLimitRequest):
    res = intuitive_imagination_engine.set_dual_trunk_limits(req.imagination_percent, req.swarm_percent)
    if hasattr(swarm_manager, "set_capacity_mode"):
        swarm_manager.set_capacity_mode("manual", req.swarm_percent)
    return res

class UnifiedActionRequest(BaseModel):
    item_id: str
    item_type: str = "branch" # "branch" | "creation" | "insight" | "suggestion"
    action: str # "apply" | "discard" | "edit"
    data: Optional[Dict[str, Any]] = None

@app.post("/api/imagination/action")
async def handle_unified_imagination_action(req: UnifiedActionRequest):
    if req.action == "apply":
        return intuitive_imagination_engine.apply_proposal(req.item_id, req.item_type)
    elif req.action == "discard":
        return intuitive_imagination_engine.discard_proposal(req.item_id, req.item_type)
    elif req.action == "edit":
        return intuitive_imagination_engine.edit_proposal(req.item_id, req.item_type, req.data or {})
    return {"success": False, "error": "Acción no reconocida"}

# ================= Storage Media, Folders & Files Dynamic Memory Routing APIs =================

@app.get("/api/storage/devices")
async def get_storage_devices():
    return storage_routing_engine.get_detected_devices_and_volumes()

@app.get("/api/storage/rules")
async def get_storage_rules():
    return {"rules": storage_routing_engine.get_all_rules()}

class CreateStorageRuleRequest(BaseModel):
    rule: Dict[str, Any]

@app.post("/api/storage/rules")
async def create_or_update_storage_rule(req: CreateStorageRuleRequest):
    return storage_routing_engine.create_or_update_rule(req.rule)

@app.delete("/api/storage/rules/{rule_id}")
async def delete_storage_rule(rule_id: str):
    return storage_routing_engine.delete_rule(rule_id)

@app.post("/api/storage/scan_now")
async def scan_storage_now():
    events = await storage_routing_engine.scan_and_execute_rules(force_all=True)
    return {"success": True, "events_triggered": events, "rules": storage_routing_engine.get_all_rules()}

@app.post("/api/storage/rules/{rule_id}/simulate")
async def simulate_storage_connection(rule_id: str):
    return await storage_routing_engine.simulate_media_connection(rule_id)

# ================= System Notifications & Branching Logs APIs =================

@app.get("/api/notifications")
async def get_system_notifications():
    return system_notifications_engine.get_all()

class MarkReadRequest(BaseModel):
    notif_id: Optional[str] = None

@app.post("/api/notifications/mark_read")
async def mark_notifications_read(req: MarkReadRequest):
    success = system_notifications_engine.mark_as_read(req.notif_id)
    return {"success": success}

# ================= Sovereign Privacy & Sensor Permissions Control APIs =================

@app.get("/api/privacy/settings")
async def get_privacy_settings():
    return privacy_manager.get_privacy_report()

class UpdatePrivacySettingsRequest(BaseModel):
    settings: Dict[str, Any]

@app.post("/api/privacy/settings")
async def update_privacy_settings(req: UpdatePrivacySettingsRequest):
    updated = privacy_manager.update_settings(req.settings)
    return {"success": True, "settings": updated}

class ToggleAirGapRequest(BaseModel):
    enabled: Optional[bool] = None

@app.post("/api/privacy/toggle_air_gap")
async def toggle_air_gap(req: ToggleAirGapRequest):
    active = privacy_manager.toggle_air_gap(req.enabled)
    return {"success": True, "air_gap_mode": active}

# ================= Layered Quantum Multi-Agent Chat API =================

class LayeredChatRequest(BaseModel):
    prompt: str
    preferences: Optional[Dict[str, Any]] = None

@app.post("/api/chat/layered")
async def layered_chat_endpoint(req: LayeredChatRequest):
    async def event_generator():
        async for ev in layered_quantum_orchestrator.execute_phased_layered_pipeline(req.prompt, req.preferences):
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ================= StarSeed Skills Endpoints =================

@app.get("/api/skills")
async def get_skills_catalog():
    return {
        "skills": starseed_library.get_all_skills(),
        "total": len(starseed_library.skills),
        "active_count": len([s for s in starseed_library.get_all_skills() if s["enabled"]])
    }

class ToggleSkillRequest(BaseModel):
    skill_id: str
    enabled: bool

@app.post("/api/skills/toggle")
async def toggle_skill(req: ToggleSkillRequest):
    return starseed_library.toggle_skill(req.skill_id, req.enabled)

# ================= Needle 2 (ESP32-S3 Edge AI) Endpoints =================

@app.get("/api/needle/status")
async def get_needle_status():
    return needle_engine.get_engine_status()

@app.get("/api/needle/tools")
async def get_needle_tools():
    return {"tools": needle_engine.built_in_schemas}

class GenerateToolCallRequest(BaseModel):
    prompt: str
    schema_id: Optional[str] = "led_rgb"
    max_tokens: Optional[int] = 64
    allow_reasoning: Optional[bool] = True

@app.post("/api/needle/generate")
async def generate_tool_call(req: GenerateToolCallRequest):
    return needle_engine.generate_tool_call(
        prompt=req.prompt,
        schema_id=req.schema_id,
        max_tokens=req.max_tokens,
        allow_reasoning=req.allow_reasoning
    )

class HardwareActionRequest(BaseModel):
    action_type: str
    payload: Dict[str, Any]

@app.post("/api/needle/hardware_action")
async def dispatch_hardware_action(req: HardwareActionRequest):
    return needle_engine.dispatch_hardware_action(req.action_type, req.payload)

@app.get("/api/needle/devices")
async def scan_serial_devices():
    return {"devices": needle_engine.scan_serial_devices()}

# ================= BitNet & Chat Endpoints =================

@app.get("/api/bitnet/status")
async def get_bitnet_status():
    return bitnet_cpp_manager.check_status()

class ChatRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = ""

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    tokens = []
    agent_traces = []
    tool_executions = []
    branching_plan = None
    async for event in orchestrator.generate_response_stream(req.prompt, req.system_prompt):
        if event["type"] == "branching_plan":
            branching_plan = event.get("plan")
        elif event["type"] == "agent_traces":
            agent_traces = event["traces"]
            tool_executions = event.get("tool_executions", [])
        elif event["type"] == "token":
            tokens.append(event["token"])
    return {
        "branching_plan": branching_plan,
        "agent_traces": agent_traces,
        "tool_executions": tool_executions,
        "response": "".join(tokens)
    }

@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    async def sse_generator():
        async for event in orchestrator.generate_response_stream(req.prompt, req.system_prompt):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "init_state",
            "environment": environment_sensor.get_live_metrics(),
            "telemetry": system_senses.get_full_telemetry(),
            "profile": profiler.get_profile(),
            "graph": knowledge_graph.get_full_graph(),
            "skills": starseed_library.get_all_skills(),
            "dream": dream_engine.get_status(),
            "swarm": swarm_manager.get_swarm_status()
        })
        
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "user_message")
            
            if msg_type == "user_message":
                prompt = data.get("prompt", "")
                sys_prompt = data.get("system_prompt", "")
                preferences = data.get("preferences", {})
                
                if prompt.strip():
                    async for event in orchestrator.generate_response_stream(prompt, sys_prompt, preferences=preferences):
                        await websocket.send_json(event)
                        
            elif msg_type == "ping":
                await websocket.send_json({
                    "type": "pong", 
                    "environment": environment_sensor.get_live_metrics(),
                    "telemetry": system_senses.get_full_telemetry()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

frontend_dist = settings.workspace_path / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
