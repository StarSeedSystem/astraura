import os
import time
import json
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, BackgroundTasks, Query, Header, Response
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
from .agents.director_orchestrator import director_orchestrator
from .agents.intelligent_authorization_orchestrator import intelligent_authorization_orchestrator
from .workflows.workflow_engine import workflow_engine
from .tools.system_explorer import system_explorer
from .tools.terminal_tool import terminal_tool
from .tools.system_senses import system_senses
from .tools.browser_tool import browser_agent
from .skills.starseed_library import starseed_library
from .projects.project_vault import project_vault_manager
from .projects.projects_manager import projects_manager
from .projects.project_master_agent import project_master_agent
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
from .core.personality_api_engine import personality_api_engine
from .core.agent_vault_engine import agent_vault_engine
from .core.synthesis_reporter_engine import synthesis_reporter_engine
from .api.voice_studio import router as voice_studio_router

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
    
    # 6. Start Sovereign Mesh Tunnel Manager (Cloudflare Quick Tunnel & LAN Discovery)
    try:
        from .core.tunnel_manager import tunnel_manager
        tunnel_manager.start_tunnel_in_background()
        print("🌐 Túnel HTTPS Soberano & Enlace Multi-Dispositivo (Cloudflare/LAN): ACTIVO")
    except Exception as e:
        print(f"⚠️ No se pudo iniciar el túnel automático: {e}")
        
    print("🧠 Worker de aprendizaje continuo en segundo plano: ACTIVO")
    print("🌌 Worker de Imaginación Intuitiva Unificada (Always-On 1.58b): ACTIVO")
    print("⚡ Worker de Enjambre Multiagéntico & Reactivaciones Programadas: ACTIVO")
    print("💾 Worker de Detección & Enrutamiento de Almacenamiento: ACTIVO")
    print("=" * 65)
    
    yield
    
    background_learner.stop()
    try:
        from .core.tunnel_manager import tunnel_manager
        tunnel_manager.stop_tunnel()
    except Exception:
        pass
    print("🛑 Astraura 1.58-Bit AI Engine detenido.")

app = FastAPI(
    title="Astraura 1.58-Bit AI Engine // StarSeed OS",
    version="2.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(voice_studio_router)

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

# ================= Director Orchestrator Supreme Agent APIs =================

@app.get("/api/director/status")
async def get_director_status_endpoint():
    return director_orchestrator.get_status()

@app.get("/api/director/config")
async def get_director_config_endpoint():
    return {"config": director_orchestrator.get_config()}

class UpdateDirectorConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/director/config")
async def update_director_config_endpoint(req: UpdateDirectorConfigRequest):
    updated = director_orchestrator.update_config(req.config)
    return {"success": True, "config": updated}

class SteerSwarmRequest(BaseModel):
    directive: str
    target_project_id: Optional[str] = None

@app.post("/api/director/steer_swarm")
async def steer_director_swarm_endpoint(req: SteerSwarmRequest):
    return director_orchestrator.steer_swarm_with_directive(req.directive, req.target_project_id)

class VerifyTaskRequest(BaseModel):
    task: Dict[str, Any]

@app.post("/api/director/verify_task")
async def verify_director_task_endpoint(req: VerifyTaskRequest):
    return director_orchestrator.audit_and_verify_task_output(req.task)

class AddDirectorMemoryRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    importance: Optional[str] = "medium"
    tags: Optional[List[str]] = None

@app.post("/api/director/add_memory")
async def add_director_memory_endpoint(req: AddDirectorMemoryRequest):
    return {"success": True, "memory": director_orchestrator.add_executive_memory(req.title, req.content, req.category, req.importance, req.tags)}

class TriggerDirectorImaginationRequest(BaseModel):
    target_project_id: Optional[str] = None
    theme: Optional[str] = None

@app.post("/api/director/imagination_cycle")
async def trigger_director_imagination_cycle_endpoint(req: TriggerDirectorImaginationRequest):
    return await director_orchestrator.orchestrate_imagination_cycle(req.target_project_id, req.theme)

@app.post("/api/director/renew_tasks")
async def renew_director_tasks_endpoint():
    from app.agents.swarm_manager import swarm_manager
    pool = ["hephaestus", "hermes", "mnemosyne", "oneiros", "athena", "daedalus"]
    renewed = []
    for ag_id in pool[:3]:
        spec = director_orchestrator.formulate_next_intelligent_task(ag_id)
        swarm_manager.dispatch_task(
            area_id=spec["area_id"],
            title=spec["title"],
            prompt=spec["prompt"],
            agent_id=spec["agent_id"],
            target_project_id=spec["target_project_id"]
        )
        renewed.append(spec)
    return {"success": True, "renewed_tasks": renewed}

@app.post("/api/director/trigger_cycle")
async def trigger_director_cycle_endpoint():
    context = director_orchestrator.get_holistic_context()
    return {"success": True, "context": context}

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
        "projects": projects_manager.list_projects(),
        "total": len(projects_manager.list_projects())
    }

@app.get("/api/projects/{project_id}")
async def get_project_detail_endpoint(project_id: str):
    p = projects_manager.get_project(project_id)
    if not p:
        return {"success": False, "error": "Project not found"}
    return {"success": True, "project": p}

class CreateProjectRequest(BaseModel):
    name: str
    description: str
    type: str = "personal"
    status: Optional[str] = "active"
    priority: Optional[str] = "medium"
    progress: Optional[int] = 10
    current_version: Optional[str] = "v1.0"
    linked_creations: Optional[List[str]] = []
    linked_processes: Optional[List[str]] = []
    linked_agents: Optional[List[str]] = ["daedalus"]
    linked_projects: Optional[List[str]] = []
    linked_personalities: Optional[List[str]] = ["astraura_prime"]
    linked_cerebros: Optional[List[str]] = ["brain_genesis"]
    linked_memories: Optional[List[Dict[str, Any]]] = []
    key_memories: Optional[List[str]] = []
    linked_folders: Optional[List[str]] = []
    linked_files: Optional[List[str]] = []

@app.post("/api/projects/create")
async def create_project_endpoint(req: CreateProjectRequest):
    created = projects_manager.create_project(
        name=req.name, 
        description=req.description, 
        project_type=req.type,
        status=req.status,
        priority=req.priority,
        progress=req.progress,
        current_version=req.current_version,
        linked_creations=req.linked_creations,
        linked_processes=req.linked_processes,
        linked_agents=req.linked_agents,
        linked_projects=req.linked_projects,
        linked_personalities=req.linked_personalities,
        linked_cerebros=req.linked_cerebros,
        linked_memories=req.linked_memories,
        key_memories=req.key_memories,
        linked_folders=req.linked_folders,
        linked_files=req.linked_files
    )
    return {"success": True, "project": created}

class UpdateProjectRequest(BaseModel):
    project_id: str
    updates: Dict[str, Any]

@app.post("/api/projects/update")
async def update_project_endpoint(req: UpdateProjectRequest):
    updated = projects_manager.update_project(req.project_id, req.updates)
    if not updated:
        return {"success": False, "error": "Project not found"}
    return {"success": True, "project": updated}

class DeleteProjectRequest(BaseModel):
    project_id: str

@app.post("/api/projects/delete")
async def delete_project_endpoint(req: DeleteProjectRequest):
    success = projects_manager.delete_project(req.project_id)
    return {"success": success}

class AddProjectVersionRequest(BaseModel):
    project_id: str
    version: Optional[str] = None
    summary: str
    changes: Optional[List[str]] = []
    author: Optional[str] = "Alex Bordón"

@app.post("/api/projects/add_version")
async def add_project_version_endpoint(req: AddProjectVersionRequest):
    updated = projects_manager.add_project_version(req.project_id, req.model_dump())
    if not updated:
        return {"success": False, "error": "Project not found"}
    return {"success": True, "project": updated}

class AddProjectLogRequest(BaseModel):
    project_id: str
    action: str
    agent: str = "Alex Bordón"
    details: str

@app.post("/api/projects/add_log")
async def add_project_log_endpoint(req: AddProjectLogRequest):
    success = projects_manager.add_project_log(req.project_id, req.action, req.agent, req.details)
    return {"success": success}

class LinkProjectItemRequest(BaseModel):
    project_id: str
    item_type: str
    item_id: Any

@app.post("/api/projects/link")
async def link_project_item_endpoint(req: LinkProjectItemRequest):
    success = projects_manager.link_item_to_project(req.project_id, req.item_type, req.item_id)
    return {"success": success}

class UnlinkProjectItemRequest(BaseModel):
    project_id: str
    item_type: str
    item_id: str

@app.post("/api/projects/unlink")
async def unlink_project_item_endpoint(req: UnlinkProjectItemRequest):
    success = projects_manager.unlink_item_from_project(req.project_id, req.item_type, req.item_id)
    return {"success": success}

# --- Extended Project Operations: Integrity, Synapses, Branches, Files & Proposals ---

@app.get("/api/projects/integrity/{project_id}")
async def get_project_integrity_endpoint(project_id: str):
    metrics = projects_manager.get_project_physical_metrics(project_id)
    return metrics

class CreateProjectBranchRequest(BaseModel):
    project_id: str
    branch_name: str
    origin_branch: Optional[str] = "main"
    notes: Optional[str] = ""
    author: Optional[str] = "Alex Bordón"

@app.post("/api/projects/branch/create")
async def create_project_branch_endpoint(req: CreateProjectBranchRequest):
    return projects_manager.create_timeline_branch(
        project_id=req.project_id,
        branch_name=req.branch_name,
        origin_branch=req.origin_branch or "main",
        notes=req.notes or "",
        author=req.author or "Alex Bordón"
    )

class MergeProjectBranchRequest(BaseModel):
    project_id: str
    source_branch: str
    target_branch: Optional[str] = "main"
    strategy: Optional[str] = "fast-forward"
    author: Optional[str] = "Alex Bordón"

@app.post("/api/projects/branch/merge")
async def merge_project_branch_endpoint(req: MergeProjectBranchRequest):
    return projects_manager.merge_timeline_branch(
        project_id=req.project_id,
        source_branch=req.source_branch,
        target_branch=req.target_branch or "main",
        strategy=req.strategy or "fast-forward",
        author=req.author or "Alex Bordón"
    )

class ConnectProjectSynapseRequest(BaseModel):
    source_project_id: str
    target_project_id: str
    synapse_type: Optional[str] = "bidirectional"
    weight: Optional[float] = 0.85
    notes: Optional[str] = ""

@app.post("/api/projects/synapse/connect")
async def connect_project_synapse_endpoint(req: ConnectProjectSynapseRequest):
    return projects_manager.connect_project_synapse(
        source_project_id=req.source_project_id,
        target_project_id=req.target_project_id,
        synapse_type=req.synapse_type or "bidirectional",
        weight=req.weight or 0.85,
        notes=req.notes or ""
    )

class DisconnectProjectSynapseRequest(BaseModel):
    source_project_id: str
    target_project_id: str

@app.post("/api/projects/synapse/disconnect")
async def disconnect_project_synapse_endpoint(req: DisconnectProjectSynapseRequest):
    success = projects_manager.disconnect_project_synapse(req.source_project_id, req.target_project_id)
    return {"success": success}

class ModifyProjectFileRequest(BaseModel):
    project_id: str
    file_path: str
    content: str
    is_binary: Optional[bool] = False
    permissions_mode: Optional[str] = "0644"

@app.post("/api/projects/file/write")
async def modify_project_file_endpoint(req: ModifyProjectFileRequest):
    return projects_manager.modify_or_create_project_file(
        project_id=req.project_id,
        file_path=req.file_path,
        content=req.content,
        is_binary=req.is_binary or False,
        permissions_mode=req.permissions_mode or "0644"
    )

class DeleteProjectFileRequest(BaseModel):
    project_id: str
    file_path: str
    physical_delete: Optional[bool] = False

@app.post("/api/projects/file/delete")
async def delete_project_file_endpoint(req: DeleteProjectFileRequest):
    return projects_manager.delete_project_file(
        project_id=req.project_id,
        file_path=req.file_path,
        physical_delete=req.physical_delete or False
    )

class ApplyProjectProposalRequest(BaseModel):
    project_id: str
    proposal: Dict[str, Any]

@app.post("/api/projects/apply_proposal")
async def apply_project_proposal_endpoint(req: ApplyProjectProposalRequest):
    return projects_manager.apply_agent_proposal(req.project_id, req.proposal)

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

# ================= Project Master Agent (Architectus-ProjectMaster) APIs =================

@app.get("/api/projects/agent/status")
async def get_project_master_agent_status_endpoint():
    return project_master_agent.get_status()

class UpdateProjectAgentConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/projects/agent/config")
async def update_project_master_agent_config_endpoint(req: UpdateProjectAgentConfigRequest):
    return project_master_agent.update_config(req.config)

class TriggerProjectAgentCycleRequest(BaseModel):
    trigger_reason: Optional[str] = "manual"

@app.post("/api/projects/agent/run_cycle")
async def run_project_agent_imaginative_cycle_endpoint(req: Optional[TriggerProjectAgentCycleRequest] = None):
    reason = req.trigger_reason if req and req.trigger_reason else "manual"
    return await project_master_agent.run_imaginative_cycle(reason)

class ApplyProjectAgentProposalRequest(BaseModel):
    proposal_id: str

@app.post("/api/projects/agent/proposals/apply")
async def apply_project_master_agent_proposal_endpoint(req: ApplyProjectAgentProposalRequest):
    return project_master_agent.apply_proposal(req.proposal_id)

@app.post("/api/projects/agent/auto_organize")
async def auto_organize_projects_vault_endpoint():
    return project_master_agent.auto_organize_vault()

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
    target_project_id: Optional[str] = None

@app.post("/api/dream/trigger")
async def trigger_dream(req: TriggerDreamRequest):
    return await dream_engine.execute_dream_burst(
        theme=req.theme, 
        parent_branch_id=req.parent_branch_id, 
        process_type=req.process_type,
        target_project_id=req.target_project_id
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

class LinkCreationProjectsRequest(BaseModel):
    creation_id: str
    project_ids: List[str]

@app.post("/api/creations/link_projects")
async def link_creation_projects_endpoint(req: LinkCreationProjectsRequest):
    return creations_manager.link_creation_to_projects(req.creation_id, req.project_ids)

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

# ================= Personality Sovereign APIs & Server Synchronization =================

@app.get("/api/personalities/api_keys")
async def list_personality_api_keys():
    """Lists all personality API keys and configurations with security masking."""
    return {"success": True, "personalities": personality_api_engine.list_personality_apis()}

@app.get("/api/personalities/{persona_id}/api_status")
async def get_personality_api_detail_endpoint(persona_id: str):
    """Returns detailed API status, full key, permissions, active processes, and connections for a personality."""
    detail = personality_api_engine.get_personality_api_detail(persona_id)
    if not detail:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Personalidad '{persona_id}' no encontrada."})
    return {"success": True, "detail": detail}

@app.post("/api/personalities/{persona_id}/generate_key")
async def regenerate_personality_key_endpoint(persona_id: str):
    """Regenerates the API key for a specific personality."""
    res = personality_api_engine.regenerate_api_key(persona_id)
    return res

@app.post("/api/personalities/{persona_id}/revoke_key")
async def revoke_personality_key_endpoint(persona_id: str):
    """Revokes the API key for a personality."""
    res = personality_api_engine.revoke_api_key(persona_id)
    return res

@app.post("/api/personalities/{persona_id}/restore_key")
async def restore_personality_key_endpoint(persona_id: str):
    """Restores a revoked/suspended API key."""
    res = personality_api_engine.restore_api_key(persona_id)
    return res

class UpdatePermissionsRequest(BaseModel):
    permissions: Dict[str, bool]

@app.post("/api/personalities/{persona_id}/update_permissions")
async def update_personality_permissions_endpoint(persona_id: str, req: UpdatePermissionsRequest):
    """Updates granular modification & access permissions for a personality API."""
    res = personality_api_engine.update_permissions(persona_id, req.permissions)
    return res

class SyncServerConfigRequest(BaseModel):
    server_config: Dict[str, Any]

@app.post("/api/personalities/{persona_id}/sync_server")
async def configure_personality_server_endpoint(persona_id: str, req: SyncServerConfigRequest):
    """Configures a local or external server link for synchronization."""
    res = personality_api_engine.add_or_update_external_server(persona_id, req.server_config)
    return res

@app.delete("/api/personalities/{persona_id}/sync_server/{server_id}")
async def remove_personality_server_endpoint(persona_id: str, server_id: str):
    """Removes a linked server from a personality."""
    res = personality_api_engine.remove_external_server(persona_id, server_id)
    return res

@app.post("/api/personalities/{persona_id}/trigger_sync/{server_id}")
async def trigger_personality_server_sync_endpoint(persona_id: str, server_id: str):
    """Triggers manual bi-directional synchronization with an external or local server."""
    res = await personality_api_engine.trigger_server_sync(persona_id, server_id)
    return res

class InvokePersonalityApiRequest(BaseModel):
    prompt: str
    target_action: Optional[str] = "reason"
    context: Optional[Dict[str, Any]] = None

@app.post("/api/v1/personalities/{persona_id}/invoke")
async def invoke_personality_via_api(
    persona_id: str, 
    req: InvokePersonalityApiRequest, 
    response: Response,
    x_astraura_key: Optional[str] = Header(None, alias="X-Astraura-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    api_key_query: Optional[str] = Query(None, alias="api_key")
):
    """
    Direct programmatic API invocation endpoint for external or local scripts/servers.
    Authenticated with 'X-Astraura-Key' header, 'Authorization: Bearer <key>', or '?api_key=' param.
    """
    raw_key = x_astraura_key or api_key_query or ""
    if not raw_key and authorization:
        raw_key = authorization.replace("Bearer ", "").replace("bearer ", "").strip()

    auth = personality_api_engine.verify_api_key_access(raw_key, required_scope="invoke_agents")
    if not auth.get("authenticated"):
        return JSONResponse(status_code=401, content={"success": False, "error": auth.get("error", "No autorizado.")})

    start_t = time.time()
    thought_cycle = await orchestrator.execute_thought_cycle(
        f"@{persona_id} {req.prompt}", 
        preferences={"selected_personalities": [persona_id], "multi_personality_mode": "single"}
    )
    
    elapsed_ms = round((time.time() - start_t) * 1000, 1)
    
    personality_api_engine._record_api_call(persona_id, {
        "method": "POST",
        "endpoint": f"/api/v1/personalities/{persona_id}/invoke",
        "client_ip": "External Client",
        "status_code": 200,
        "latency_ms": elapsed_ms,
        "tokens_used": 150,
        "scope_checked": "invoke_agents"
    })

    return {
        "success": True,
        "persona_id": persona_id,
        "persona_name": auth.get("persona_name"),
        "latency_ms": elapsed_ms,
        "response": thought_cycle.get("final_synthesis", "Respuesta procesada."),
        "branching_plan": thought_cycle.get("branching_plan"),
        "timestamp": time.time()
    }


# ================= Agent Vault, Governance & Sovereign Agent APIs =================

@app.get("/api/agents")
async def list_agents_endpoint():
    """Lists all configured agents, their personalities, cerebros, processes, and branches."""
    return {"success": True, "agents": agent_vault_engine.list_agents()}

@app.get("/api/agents/{agent_id}")
async def get_agent_endpoint(agent_id: str):
    """Returns detailed configuration for a specific agent."""
    ag = agent_vault_engine.get_agent(agent_id)
    if not ag:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Agente '{agent_id}' no encontrado."})
    return {"success": True, "agent": ag}

class SaveAgentRequest(BaseModel):
    agent: Dict[str, Any]

@app.post("/api/agents/save")
async def save_agent_endpoint(req: SaveAgentRequest):
    """Creates or updates an agent with custom personalities, cerebros, branches, and imagination settings."""
    res = agent_vault_engine.save_agent(req.agent)
    return res

@app.delete("/api/agents/{agent_id}")
async def delete_agent_endpoint(agent_id: str):
    """Deletes a custom agent and its API profile."""
    res = agent_vault_engine.delete_agent(agent_id)
    return res

class ToggleAgentImaginationRequest(BaseModel):
    enabled: bool

@app.post("/api/agents/{agent_id}/toggle_imagination")
async def toggle_agent_imagination_endpoint(agent_id: str, req: ToggleAgentImaginationRequest):
    """Toggles background active intuitive imagination for a specific agent."""
    res = agent_vault_engine.toggle_agent_imagination(agent_id, req.enabled)
    return res

class UpdateAgentImaginationConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/agents/{agent_id}/update_imagination_config")
async def update_agent_imagination_config_endpoint(agent_id: str, req: UpdateAgentImaginationConfigRequest):
    """Updates imagination frequency, permission level, compute trunk, and resource quotas for an agent."""
    res = agent_vault_engine.update_agent_imagination_config(agent_id, req.config)
    return res

@app.get("/api/agents_api/keys")
async def list_agent_api_keys_endpoint():
    """Lists all agent API keys with security masking."""
    return {"success": True, "agents": agent_vault_engine.list_agent_apis()}

@app.get("/api/agents_api/{agent_id}/api_status")
async def get_agent_api_detail_endpoint(agent_id: str):
    """Returns detailed API status, full key, permissions, active processes, and connections for an agent."""
    detail = agent_vault_engine.get_agent_api_detail(agent_id)
    if not detail:
        return JSONResponse(status_code=404, content={"success": False, "error": f"Agente '{agent_id}' no encontrado."})
    return {"success": True, "detail": detail}

@app.post("/api/agents_api/{agent_id}/generate_key")
async def regenerate_agent_key_endpoint(agent_id: str):
    """Rotates/regenerates the API key for an agent."""
    res = agent_vault_engine.regenerate_agent_api_key(agent_id)
    return res

@app.post("/api/agents_api/{agent_id}/revoke_key")
async def revoke_agent_key_endpoint(agent_id: str):
    """Revokes the API key for an agent."""
    res = agent_vault_engine.revoke_agent_api_key(agent_id)
    return res

@app.post("/api/agents_api/{agent_id}/restore_key")
async def restore_agent_key_endpoint(agent_id: str):
    """Restores a revoked API key for an agent."""
    res = agent_vault_engine.restore_agent_api_key(agent_id)
    return res

class UpdateAgentPermissionsRequest(BaseModel):
    permissions: Dict[str, bool]

@app.post("/api/agents_api/{agent_id}/update_permissions")
async def update_agent_permissions_endpoint(agent_id: str, req: UpdateAgentPermissionsRequest):
    """Updates granular modification & access permissions for an agent API."""
    res = agent_vault_engine.update_agent_permissions(agent_id, req.permissions)
    return res

class SyncAgentServerRequest(BaseModel):
    server_config: Dict[str, Any]

@app.post("/api/agents_api/{agent_id}/sync_server")
async def configure_agent_server_endpoint(agent_id: str, req: SyncAgentServerRequest):
    """Configures a local or external sync server for an agent."""
    res = agent_vault_engine.add_or_update_agent_server(agent_id, req.server_config)
    return res

@app.delete("/api/agents_api/{agent_id}/sync_server/{server_id}")
async def remove_agent_server_endpoint(agent_id: str, server_id: str):
    """Removes a linked server from an agent."""
    res = agent_vault_engine.remove_agent_server(agent_id, server_id)
    return res

@app.post("/api/agents_api/{agent_id}/trigger_sync/{server_id}")
async def trigger_agent_server_sync_endpoint(agent_id: str, server_id: str):
    """Triggers manual bi-directional sync between an agent and a server."""
    res = await agent_vault_engine.trigger_agent_server_sync(agent_id, server_id)
    return res

class InvokeAgentApiRequest(BaseModel):
    prompt: str
    target_action: Optional[str] = "execute_task"
    context: Optional[Dict[str, Any]] = None

@app.post("/api/v1/agents/{agent_id}/invoke")
async def invoke_agent_via_api(
    agent_id: str,
    req: InvokeAgentApiRequest,
    response: Response,
    x_astraura_key: Optional[str] = Header(None, alias="X-Astraura-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    api_key_query: Optional[str] = Query(None, alias="api_key")
):
    """
    Direct programmatic API invocation endpoint for agents.
    Authenticated with 'X-Astraura-Key' header, 'Authorization: Bearer <key>', or '?api_key=' param.
    """
    raw_key = x_astraura_key or api_key_query or ""
    if not raw_key and authorization:
        raw_key = authorization.replace("Bearer ", "").replace("bearer ", "").strip()

    auth = agent_vault_engine.verify_agent_api_key_access(raw_key, required_scope="invoke_subagents")
    if not auth.get("authenticated"):
        return JSONResponse(status_code=401, content={"success": False, "error": auth.get("error", "No autorizado.")})

    start_t = time.time()
    agent = agent_vault_engine.get_agent(agent_id) or {}
    primary_persona = agent.get("used_personalities", [{"id": "aurora"}])[0].get("id", "aurora")

    thought_cycle = await orchestrator.execute_thought_cycle(
        f"[{agent.get('name', agent_id)}] {req.prompt}",
        preferences={"selected_personalities": [primary_persona], "multi_personality_mode": "single"}
    )
    elapsed_ms = round((time.time() - start_t) * 1000, 1)

    agent_vault_engine._record_api_call(agent_id, {
        "method": "POST",
        "endpoint": f"/api/v1/agents/{agent_id}/invoke",
        "client_ip": "External Client / Script",
        "status_code": 200,
        "latency_ms": elapsed_ms,
        "tokens_used": 165,
        "scope_checked": "invoke_subagents"
    })

    return {
        "success": True,
        "agent_id": agent_id,
        "agent_name": auth.get("agent_name"),
        "latency_ms": elapsed_ms,
        "response": thought_cycle.get("final_synthesis", "Tarea del agente completada."),
        "branching_plan": thought_cycle.get("branching_plan"),
        "timestamp": time.time()
    }


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

class OpenNativePathRequest(BaseModel):
    path: str
    reveal: bool = True

@app.post("/api/system/open_native")
async def open_native_path_endpoint(req: OpenNativePathRequest):
    return system_explorer.open_native_path(req.path, reveal=req.reveal)

@app.get("/api/system/item_details")
async def get_system_item_details(path: str = Query(...)):
    return system_explorer.get_item_details(path)

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

class SimulateStepRequest(BaseModel):
    branch_id: Optional[str] = None

@app.post("/api/imagination/process/{process_id}/step")
async def simulate_process_step_endpoint(process_id: str, req: Optional[SimulateStepRequest] = None):
    b_id = req.branch_id if req else None
    return intuitive_imagination_engine.simulate_live_process_step(process_id, b_id)

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

@app.get("/api/imagination/sync_execution_state")
async def get_imagination_sync_execution_state():
    """Returns the current multi-agent synchronized proposal execution state (progress, logs, agent breakdown)."""
    state = intuitive_imagination_engine.sync_execution_state
    return {
        "success": True,
        "is_running": state.get("is_running", False),
        "global_progress_pct": state.get("progress_percent", 100),
        "total_tasks": state.get("total_tasks", 0),
        "completed_tasks": state.get("completed_tasks", 0),
        "agents": state.get("agent_progress", {}),
        "current_logs": state.get("current_logs", []),
        "applied_details": state.get("applied_details", [])
    }

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

# ================= Synthesis Reporter & Chronology APIs =================

@app.get("/api/imagination/synthesis_reports")
async def get_synthesis_reports(limit: int = 50):
    return {
        "success": True,
        "total_reports": len(synthesis_reporter_engine.reports_history),
        "latest": synthesis_reporter_engine.get_latest_report(),
        "reports": synthesis_reporter_engine.get_reports_history(limit)
    }

@app.get("/api/imagination/synthesis_reports/latest")
async def get_latest_synthesis_report():
    report = synthesis_reporter_engine.get_latest_report()
    if not report:
        report = synthesis_reporter_engine.generate_synthesis_report(
            trigger_type="initial_baseline",
            context_data={"theme": "Inicialización Soberana de la Bóveda"}
        )
    return {"success": True, "report": report}

@app.get("/api/imagination/synthesis_reports/{report_id}")
async def get_synthesis_report_by_id(report_id: str):
    report = synthesis_reporter_engine.get_report_by_id(report_id)
    if not report:
        return {"success": False, "error": "Informe no encontrado"}
    return {"success": True, "report": report}

class GenerateSynthesisReportRequest(BaseModel):
    trigger_type: Optional[str] = "manual_request"
    context_data: Optional[Dict[str, Any]] = None

@app.post("/api/imagination/synthesis_reports/generate")
async def generate_synthesis_report_endpoint(req: GenerateSynthesisReportRequest):
    report = synthesis_reporter_engine.generate_synthesis_report(
        trigger_type=req.trigger_type or "manual_request",
        context_data=req.context_data or {}
    )
    return {"success": True, "report": report}

@app.delete("/api/imagination/synthesis_reports/clear")
async def clear_synthesis_reports():
    synthesis_reporter_engine.clear_history()
    return {"success": True, "message": "Historial de síntesis reiniciado."}

# ================= Synthesis Report Memory/Brain Link APIs =================

@app.get("/api/imagination/synthesis_reports/{report_id}/memory_graph")
async def get_synthesis_report_memory_graph(report_id: str):
    """
    Fetch the memory graph, brain/cerebro mappings, and folder/file tree 
    specific to a synthesis report. This ensures each tab's content is
    uniquely developed from its own memory traces.
    """
    report = synthesis_reporter_engine.get_report_by_id(report_id)
    if not report:
        return {"success": False, "error": "Informe no encontrado"}
    
    from pathlib import Path as PathLib
    from app.core.memory_graph_engine import memory_graph_engine
    
    # Get linked memory references from the report
    real_links = report.get("real_links", {})
    memory_refs = real_links.get("memories", [])
    file_refs = real_links.get("files", [])
    folder_refs = real_links.get("folders", [])
    project_refs = real_links.get("projects", [])
    
    # Build memory graph from the report's actual memory references
    graph_nodes = []
    graph_edges = []
    
    for mem in memory_refs:
        node = {
            "id": mem.get("id", f"mem_{len(graph_nodes)}"),
            "label": mem.get("title", "Memoria"),
            "type": mem.get("type", "general"),
            "category": mem.get("type", "memoria"),
            "content_snippet": mem.get("content_snippet", ""),
            "path": mem.get("path", ""),
            "size": mem.get("size", 0),
            "brain_id": mem.get("brain_id", ""),
            "created_at": mem.get("timestamp", time.time())
        }
        graph_nodes.append(node)
    
    for file_ref in file_refs:
        node = {
            "id": f"file_{file_refs.index(file_ref)}",
            "label": file_ref.get("name", "archivo"),
            "type": "file",
            "category": "document",
            "path": file_ref.get("path", ""),
            "size_formatted": file_ref.get("size_formatted", ""),
            "status": file_ref.get("status", ""),
            "brain_id": file_ref.get("brain_id", "")
        }
        graph_nodes.append(node)
    
    for folder_ref in folder_refs:
        node = {
            "id": f"folder_{folder_refs.index(folder_ref)}",
            "label": folder_ref.get("name", "carpeta"),
            "type": "folder",
            "category": "workspace",
            "path": folder_ref.get("path", ""),
            "brain_id": folder_ref.get("brain_id", "")
        }
        graph_nodes.append(node)
    
    # Build edges (relationships between memories, files, folders)
    for i, mem in enumerate(memory_refs):
        for j, file_ref in enumerate(file_refs):
            edge = {
                "source": mem.get("id", f"mem_{i}"),
                "target": f"file_{j}",
                "type": "references",
                "weight": 0.8
            }
            graph_edges.append(edge)
    
    for i, mem in enumerate(memory_refs):
        for j, folder_ref in enumerate(folder_refs):
            edge = {
                "source": mem.get("id", f"mem_{i}"),
                "target": f"folder_{j}",
                "type": "stored_in",
                "weight": 0.6
            }
            graph_edges.append(edge)
    
    # Add 2D and 3D layout info
    graph_2d = {
        "nodes": graph_nodes,
        "edges": graph_edges,
        "layout": "force-directed-2d",
        "width": 800,
        "height": 600
    }
    
    graph_3d = {
        "nodes": [{**n, "z": (hash(n["id"]) % 100) / 100.0, "x": i * 50, "y": i * 30} for i, n in enumerate(graph_nodes)],
        "edges": graph_edges,
        "layout": "3d-force-graph",
        "width": 800,
        "height": 600
    }
    
    return {
        "success": True,
        "report_id": report_id,
        "graph_2d": graph_2d,
        "graph_3d": graph_3d,
        "memory_references": memory_refs,
        "total_nodes": len(graph_nodes),
        "total_edges": len(graph_edges)
    }

@app.get("/api/imagination/synthesis_reports/{report_id}/brain_cerebros")
async def get_synthesis_report_brain_cerebros(report_id: str):
    """
    Fetch brain/cerebro mappings specific to a synthesis report.
    Shows which cerebros have access to which memories and files referenced in this report.
    """
    report = synthesis_reporter_engine.get_report_by_id(report_id)
    if not report:
        return {"success": False, "error": "Informe no encontrado"}
    
    from app.core.personality_engine import personality_engine
    from app.memory.starseed_memory_engine import starseed_memory_engine
    
    # Get participating agents and their cerebro mappings
    participating_agents = report.get("participating_agents", [])
    
    cerebro_mappings = []
    for agent in participating_agents:
        agent_id = agent.get("id", agent.get("name", "").lower())
        brain_id = agent.get("brain_id", f"brain_{agent_id}")
        
        # Get cerebro memory access
        cerebro_info = starseed_memory_engine.get_cerebro_access(brain_id) if hasattr(starseed_memory_engine, 'get_cerebro_access') else {"memories": [], "files": [], "projects": []}
        
        mapping = {
            "agent_id": agent_id,
            "agent_name": agent.get("name", ""),
            "agent_role": agent.get("role", ""),
            "brain_id": brain_id,
            "brain_label": agent.get("brain_label", brain_id),
            "memories_access": cerebro_info.get("memories", []),
            "files_access": cerebro_info.get("files", []),
            "projects_access": cerebro_info.get("projects", []),
            "total_memories": len(cerebro_info.get("memories", [])),
            "total_files": len(cerebro_info.get("files", [])),
            "total_projects": len(cerebro_info.get("projects", []))
        }
        cerebro_mappings.append(mapping)
    
    # Also get the report's own memory graph links
    real_links = report.get("real_links", {})
    
    return {
        "success": True,
        "report_id": report_id,
        "synthesis_index": report.get("synthesis_index", 0),
        "total_cerebros": len(cerebro_mappings),
        "cerebro_mappings": cerebro_mappings,
        "memory_refs_in_report": real_links.get("memories", []),
        "folder_refs_in_report": real_links.get("folders", []),
        "file_refs_in_report": real_links.get("files", []),
        "project_refs_in_report": real_links.get("projects", [])
    }

@app.get("/api/imagination/synthesis_reports/{report_id}/file_tree")
async def get_synthesis_report_file_tree(report_id: str):
    """
    Fetch the folder/file tree specific to a synthesis report, 
    with brain/cerebro mapping for each file/folder.
    """
    report = synthesis_reporter_engine.get_report_by_id(report_id)
    if not report:
        return {"success": False, "error": "Informe no encontrado"}
    
    real_links = report.get("real_links", {})
    folders = real_links.get("folders", [])
    files = real_links.get("files", [])
    memories = real_links.get("memories", [])
    
    # Build the tree from actual report links
    file_tree = {
        "report_id": report_id,
        "trees": [],
        "folders": folders,
        "files": files,
        "memories": memories,
        "interconnections": [],
        "brain_mappings": []
    }
    
    # Build folder tree
    folder_tree = {}
    for folder in folders:
        path_parts = folder.get("path", "").split("/")
        brain_id = folder.get("brain_id", "")
        
        current = folder_tree
        for part in path_parts:
            if part:
                if part not in current:
                    current[part] = {"__files": [], "__memories": [], "__brain_id": brain_id, "__path": folder.get("path", "")}
                current = current[part]
    
    # Map files to folders
    for file_ref in files:
        file_path = file_ref.get("path", "")
        brain_id = file_ref.get("brain_id", "")
        
        # Find which folder this file belongs to
        for folder in folders:
            folder_path = folder.get("path", "")
            if file_path.startswith(folder_path):
                file_tree["interconnections"].append({
                    "file": file_path,
                    "folder": folder_path,
                    "brain_id": brain_id,
                    "type": "file_in_folder"
                })
    
    # Map memories to files and folders
    for mem in memories:
        mem_id = mem.get("id", "")
        brain_id = mem.get("brain_id", "")
        
        for file_ref in files:
            if file_ref.get("path", "").find(mem.get("path", "")) != -1:
                file_tree["interconnections"].append({
                    "memory_id": mem_id,
                    "file": file_ref.get("path", ""),
                    "brain_id": brain_id,
                    "type": "memory_in_file"
                })
    
    # Map brains to their resources
    all_brain_ids = set()
    for f in files:
        if f.get("brain_id"): all_brain_ids.add(f["brain_id"])
    for m in memories:
        if m.get("brain_id"): all_brain_ids.add(m["brain_id"])
    for folder in folders:
        if folder.get("brain_id"): all_brain_ids.add(folder["brain_id"])
    
    for brain_id in all_brain_ids:
        brain_files = [f for f in files if f.get("brain_id") == brain_id]
        brain_memories = [m for m in memories if m.get("brain_id") == brain_id]
        brain_folders = [fold for fold in folders if fold.get("brain_id") == brain_id]
        
        file_tree["brain_mappings"].append({
            "brain_id": brain_id,
            "brain_label": f"Cerebro {brain_id}",
            "files": brain_files,
            "memories": brain_memories,
            "folders": brain_folders,
            "total_files": len(brain_files),
            "total_memories": len(brain_memories),
            "total_folders": len(brain_folders)
        })
    
    return {
        "success": True,
        "report_id": report_id,
        "file_tree": file_tree,
        "total_folders": len(folders),
        "total_files": len(files),
        "total_memories": len(memories),
        "total_brains": len(all_brain_ids)
    }

@app.post("/api/imagination/synthesis_reports/{report_id}/regenerate_tab")
async def regenerate_synthesis_report_tab(report_id: str, req: Dict[str, Any]):
    """
    Regenerate the content for a specific tab in a synthesis report.
    Ensures unique content for each tab, developed by the appropriate agent.
    """
    tab_id = req.get("tab_id", "summary")
    report = synthesis_reporter_engine.get_report_by_id(report_id)
    if not report:
        return {"success": False, "error": "Informe no encontrado"}
    
    # Call the synthesis reporter to regenerate tab-specific content
    updated_report = synthesis_reporter_engine.regenerate_tab_content(report_id, tab_id)
    if updated_report:
        return {"success": True, "report": updated_report}
    return {"success": False, "error": "No se pudo regenerar el contenido"}


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

# ================= Folder Registration via File System Access API =================

@app.post("/api/storage/folder/register")
async def register_folder_from_filesystem(req: Dict[str, Any]):
    """
    Register a folder accessed via File System Access API (showDirectoryPicker)
    so the storage routing engine can index and route it.
    """
    folder_name = req.get("folder_name", "Sin nombre")
    folder_path = req.get("folder_path", "/")
    file_count = req.get("file_count", 0)
    access_type = req.get("access_type", "filesystem_api")
    return await storage_routing_engine.register_accessed_folder({
        "folder_name": folder_name,
        "folder_path": folder_path,
        "file_count": file_count,
        "access_type": access_type,
        "registered_at": time.time()
    })

# ================= System Notifications & Branching Logs APIs =================

@app.get("/api/notifications/auth_orchestrator_status")
async def get_auth_orchestrator_status():
    """Estado vivo del Agente de Orquestación Inteligente de Autorizaciones (1.58-bit)."""
    status = intelligent_authorization_orchestrator.get_status()
    status["auto_mode"] = intelligent_authorization_orchestrator.auto_mode
    return status

class AuthAutoModeRequest(BaseModel):
    enabled: bool

@app.post("/api/notifications/auth_orchestrator_auto")
async def set_auth_orchestrator_auto(req: AuthAutoModeRequest):
    """Activa/desactiva la Auto-Orquestación de Autorizaciones en 2do plano (siempre activa)."""
    return intelligent_authorization_orchestrator.set_auto_mode(req.enabled)

# ================= Agent Registry (todos los agentes del ecosistema) =================

from .agents.agent_registry import agent_registry

@app.get("/api/ecosystem/agents")
async def get_all_agents():
    """Lista unificada de TODOS los agentes con estado en vivo y config editable."""
    return {"success": True, "agents": agent_registry.get_all_agents()}

@app.get("/api/ecosystem/agents/{agent_id}")
async def get_single_agent(agent_id: str):
    agent = agent_registry.get_agent(agent_id)
    if not agent:
        return {"success": False, "error": "Agente no encontrado"}
    return {"success": True, "agent": agent}

class AgentConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.post("/api/ecosystem/agents/{agent_id}/config")
async def update_agent_config(agent_id: str, req: AgentConfigRequest):
    """Edita la configuración de un agente (todas sus secciones configurables)."""
    return agent_registry.update_config(agent_id, req.config)

class AgentEnableRequest(BaseModel):
    enabled: bool

@app.post("/api/ecosystem/agents/{agent_id}/toggle")
async def toggle_agent_enabled(agent_id: str, req: AgentEnableRequest):
    """Activa/desactiva un agente del ecosistema."""
    return agent_registry.set_enabled(agent_id, req.enabled)

# ================= Routing, Storage & Universal Sync Agent =================

from .agents.routing_storage_agent import routing_storage_agent

@app.get("/api/routing_storage/status")
async def get_routing_storage_status():
    return routing_storage_agent.get_status()

@app.post("/api/routing_storage/sync")
async def run_routing_storage_sync():
    return await routing_storage_agent.run_sync_cycle()

@app.get("/api/notifications")
async def get_system_notifications():
    system_notifications_engine.sync_with_imagination(intuitive_imagination_engine.branches)
    return system_notifications_engine.get_all()

class MarkReadRequest(BaseModel):
    notif_id: Optional[str] = None

@app.post("/api/notifications/mark_read")
async def mark_notifications_read(req: MarkReadRequest):
    success = system_notifications_engine.mark_as_read(req.notif_id)
    return {"success": success}

class NotificationActionRequest(BaseModel):
    notif_id: str

@app.post("/api/notifications/apply")
async def apply_single_notification_endpoint(req: NotificationActionRequest):
    # Find if it is linked to a branch
    target_notif = next((n for n in system_notifications_engine.notifications if n["id"] == req.notif_id), None)
    b_id = None
    if target_notif:
        b_id = target_notif.get("branch_id")
    if not b_id and req.notif_id.startswith("notif_req_"):
        b_id = req.notif_id.replace("notif_req_", "")

    if b_id:
        intuitive_imagination_engine.grant_and_apply_request(b_id)
    else:
        intuitive_imagination_engine.grant_and_apply_all_requests()

    res = system_notifications_engine.apply_notification(req.notif_id)

    # Check threshold reactivation
    pending_left = len([b for b in intuitive_imagination_engine.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")])
    if pending_left < intuitive_imagination_engine.max_accumulated_requests_threshold:
        intuitive_imagination_engine.is_paused_due_to_threshold = False
        intuitive_imagination_engine._save_state()

    return res



class ApplyAllFromListRequest(BaseModel):
    notif_ids: List[str]


@app.post("/api/notifications/apply_all_from_list")
async def apply_all_notifications_from_list(req: ApplyAllFromListRequest):
    """**[AUTO] Orquestación Inteligente 1.58-bit: procesa TODA lista de notificaciones
    invocando los agentes reales del enjambre con sus personalidades, cerebros y memorias
    correspondientes. Relaciona tareas, determina orden por prioridad/dependencias, refina
    cada propuesta según contexto y actualiza TODOS los medios al final.**"""

    # Delegar a la capa de orquestación inteligente (relación + enrutamiento + exocórtex + medios).
    # force=True: acción explícita del usuario → siempre procesa TODAS las pendientes de inmediato.
    result = await intelligent_authorization_orchestrator.orchestrate_list(req.notif_ids, force=True)

    if not result.get("success"):
        return result

    return {
        "success": True,
        "orchestrated_by": "IntelligentAuthorizationOrchestrator",
        "processed": [p["notif_id"] for p in result.get("processed", [])],
        "processed_count": result.get("processed_count", 0),
        "applied_through_agent": result.get("processed_count", 0),
        "agent_executions": result.get("agent_executions", {}),
        "failed": result.get("failed", []),
        "failed_count": result.get("failed_count", 0),
        "storage_events": result.get("storage_events", 0),
        "elapsed_seconds": result.get("elapsed_seconds", 0),
        "message": result.get("message", "Orquestación completa."),
    }

@app.post("/api/notifications/delete")
async def delete_notification_endpoint(req: NotificationActionRequest):
    target_notif = next((n for n in system_notifications_engine.notifications if n["id"] == req.notif_id), None)
    b_id = None
    if target_notif:
        b_id = target_notif.get("branch_id")
    if not b_id and req.notif_id.startswith("notif_req_"):
        b_id = req.notif_id.replace("notif_req_", "")

    if b_id:
        intuitive_imagination_engine.delete_branch(b_id)

    res = system_notifications_engine.delete_notification(req.notif_id)

    pending_left = len([b for b in intuitive_imagination_engine.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")])
    if pending_left < intuitive_imagination_engine.max_accumulated_requests_threshold:
        intuitive_imagination_engine.is_paused_due_to_threshold = False
        intuitive_imagination_engine._save_state()

    return res

@app.post("/api/notifications/clear")
async def clear_all_notifications_endpoint():
    res = system_notifications_engine.clear_all()
    intuitive_imagination_engine.grant_and_apply_all_requests()
    intuitive_imagination_engine.is_paused_due_to_threshold = False
    intuitive_imagination_engine._save_state()
    return res

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
    preferences: Optional[Dict[str, Any]] = None

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    tokens = []
    agent_traces = []
    tool_executions = []
    branching_plan = None
    async for event in orchestrator.generate_response_stream(req.prompt, req.system_prompt, preferences=req.preferences):
        if event["type"] == "branching_plan":
            branching_plan = event.get("plan")
        elif event["type"] == "agent_traces":
            agent_traces = event.get("traces", [])
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
        async for event in orchestrator.generate_response_stream(req.prompt, req.system_prompt, preferences=req.preferences):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await manager.connect(websocket)
    from app.core.global_state_broadcaster import global_broadcaster
    await global_broadcaster.register(websocket)
    try:
        await websocket.send_json({
            "type": "init_state",
            "environment": environment_sensor.get_live_metrics(),
            "telemetry": system_senses.get_full_telemetry(),
            "profile": profiler.get_profile(),
            "graph": knowledge_graph.get_full_graph(),
            "skills": starseed_library.get_all_skills(),
            "dream": dream_engine.get_status(),
            "swarm": swarm_manager.get_swarm_status(),
            "sync_mesh": global_broadcaster.get_sync_telemetry()
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
                    "telemetry": system_senses.get_full_telemetry(),
                    "sync_mesh": global_broadcaster.get_sync_telemetry()
                })
            
            elif msg_type == "state_mutation_broadcast":
                event_name = data.get("event", "generic_mutation")
                payload = data.get("payload", {})
                await global_broadcaster.broadcast_state_mutation(event_name, payload)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await global_broadcaster.unregister(websocket)
    except Exception:
        manager.disconnect(websocket)
        await global_broadcaster.unregister(websocket)

# ================= Universal Storage & Drives APIs =================

@app.get("/api/system/storage/drives")
async def get_storage_drives():
    from app.tools.storage_adapters import universal_storage_manager
    drives = universal_storage_manager.get_all_storage_drives()
    return {
        "success": True,
        "os_platform": universal_storage_manager.os_type,
        "total_drives": len(drives),
        "drives": drives
    }

@app.post("/api/system/storage/inspect")
async def inspect_file_storage(data: dict):
    from app.tools.storage_adapters import universal_storage_manager
    file_path = data.get("path", "")
    if not file_path:
        return {"success": False, "error": "Ruta de archivo no especificada"}
    
    info = universal_storage_manager.classify_file_format(file_path)
    return {
        "success": True,
        "file_info": info
    }

# ================= Inter-Cerebral Synaptic Bridge & Fusion APIs =================

@app.get("/api/cerebros/external/scan")
async def scan_external_brains():
    from app.cerebros.inter_cerebral_bridge import inter_cerebral_bridge
    detected = inter_cerebral_bridge.scan_connected_storage_for_brains()
    return {
        "success": True,
        "total_detected": len(detected),
        "external_brains": detected
    }

@app.post("/api/cerebros/external/fuse")
async def fuse_external_brain(data: dict):
    from app.cerebros.inter_cerebral_bridge import inter_cerebral_bridge
    from app.core.global_state_broadcaster import global_broadcaster
    brain_id = data.get("brain_id") or data.get("external_brain_id") or data.get("external_vault_path") or data.get("vault_path") or ""
    strategy = data.get("strategy", "bidirectional_merge")
    res = inter_cerebral_bridge.fuse_external_brain(brain_id, strategy)
    if res.get("success"):
        await global_broadcaster.broadcast_state_mutation("cerebral_fusion_completed", res)
    return res

@app.post("/api/cerebros/external/permissions")
async def update_external_brain_permissions(data: dict):
    from app.cerebros.inter_cerebral_bridge import inter_cerebral_bridge
    brain_id = data.get("brain_id") or data.get("external_brain_id") or data.get("external_vault_path") or data.get("vault_path") or ""
    new_mode = data.get("mode", "bidirectional_merge")
    res = inter_cerebral_bridge.update_connection_permissions(brain_id, new_mode)
    return res

# ================= Universal Portable Brain Capsule & Sync APIs =================

@app.post("/api/cerebros/portable/sync_to_storage")
async def sync_portable_brain_to_storage(data: dict):
    from app.cerebros.portable_brain_generator import portable_brain_generator
    from app.core.global_state_broadcaster import global_broadcaster
    brain_id = data.get("brain_id", "starseed_unified_brain")
    drive_path = data.get("drive_path", "")
    include_projects = data.get("include_projects", True)
    include_voice = data.get("include_voice_studio", True)
    
    if not drive_path:
        return {"success": False, "error": "Ruta de almacenamiento de destino no especificada"}

    res = portable_brain_generator.sync_brain_to_storage_drive(
        brain_id=brain_id,
        target_drive_path=drive_path,
        include_projects=include_projects,
        include_voice_studio=include_voice
    )
    if res.get("success"):
        await global_broadcaster.broadcast_state_mutation("portable_brain_synced", res)
    return res

# ================= Real-Time Multi-Device Mesh Telemetry =================

@app.get("/api/system/sync/telemetry")
async def get_sync_mesh_telemetry():
    from app.core.global_state_broadcaster import global_broadcaster
    return {
        "success": True,
        "mesh": global_broadcaster.get_sync_telemetry()
    }

@app.post("/api/system/sync/broadcast")
async def post_sync_mesh_broadcast(data: dict):
    from app.core.global_state_broadcaster import global_broadcaster
    event_name = data.get("event", "client_state_sync")
    payload = data.get("payload", {})
    await global_broadcaster.broadcast_state_mutation(event_name, payload)
    return {"success": True}

# ================= Sovereign Tunnel & Mesh APIs =================

@app.get("/api/system/tunnel/status")
async def get_system_tunnel_status():
    from .core.tunnel_manager import tunnel_manager
    return {
        "success": True,
        "tunnel": tunnel_manager.get_status()
    }

@app.post("/api/system/tunnel/restart")
async def restart_system_tunnel():
    from .core.tunnel_manager import tunnel_manager
    tunnel_manager.stop_tunnel()
    ok = tunnel_manager.start_tunnel_in_background()
    return {
        "success": ok,
        "tunnel": tunnel_manager.get_status()
    }

@app.post("/api/system/tunnel/stop")
async def stop_system_tunnel():
    from .core.tunnel_manager import tunnel_manager
    tunnel_manager.stop_tunnel()
    return {
        "success": True,
        "tunnel": tunnel_manager.get_status()
    }

@app.post("/api/system/tunnel/start")
async def start_system_tunnel():
    from .core.tunnel_manager import tunnel_manager
    ok = tunnel_manager.start_tunnel_in_background()
    return {
        "success": ok,
        "tunnel": tunnel_manager.get_status()
    }

@app.get("/active_tunnel.json")
async def get_active_tunnel_json_dynamic():
    """
    Dynamic active_tunnel.json endpoint — served directly from the backend,
    accessible at TUNNEL_URL/active_tunnel.json for auto-discovery by Vercel/mobile clients.
    Returns current tunnel URL + LAN IPs for zero-config multi-device pairing.
    """
    from .core.tunnel_manager import tunnel_manager
    status = tunnel_manager.get_status()
    lan_ips = status.get("lan_ips", [])
    url = status.get("url")
    vercel_link = f"https://astraura.vercel.app/?gateway={url}" if url else "https://astraura.vercel.app/"
    return {
        "active": status.get("active", False),
        "url": url,
        "lan_ips": lan_ips,
        "lan_endpoints": [f"http://{ip}:8000" for ip in lan_ips],
        "vercel_link": vercel_link,
        "provider": "cloudflare_quick_tunnel",
        "timestamp": __import__('time').time()
    }

@app.get("/api/system/tunnel/qr_data")
async def get_tunnel_qr_data():
    """Returns the tunnel URL + deep link for generating QR codes in the frontend."""
    from .core.tunnel_manager import tunnel_manager
    status = tunnel_manager.get_status()
    url = status.get("url")
    lan_ips = status.get("lan_ips", [])
    return {
        "success": True,
        "tunnel_url": url,
        "vercel_deeplink": f"https://astraura.vercel.app/?gateway={url}" if url else None,
        "lan_endpoints": [f"http://{ip}:8000" for ip in lan_ips],
        "connect_instructions": {
            "step1": "Escanea el código QR o abre el enlace Vercel en cualquier dispositivo",
            "step2": "La app detecta automáticamente el túnel activo y se conecta",
            "step3": "Todos los cerebros, medios y proyectos se sincronizan en tiempo real"
        }
    }

@app.get("/api/system/cerebros_media_map")
async def get_cerebros_media_map():
    """Returns which media/storage devices each Cerebro has access to, and which Cerebros are linked to each storage volume."""
    from .core.tunnel_manager import tunnel_manager
    from app.core.starseed_memory_engine import starseed_memory_engine
    
    tunnel_status = tunnel_manager.get_status()
    
    # Get all cerebros
    cerebros_raw = starseed_memory_engine.get_all_cerebros() if hasattr(starseed_memory_engine, 'get_all_cerebros') else []
    
    # Get storage devices
    try:
        from app.core.storage_routing_engine import storage_routing_engine
        devices_data = storage_routing_engine.get_connected_devices()
        devices = devices_data.get("devices", [])
    except Exception:
        devices = []

    # Build bidirectional map
    cerebro_to_media = {}
    media_to_cerebros = {}

    for cerebro in cerebros_raw:
        cid = cerebro.get("id", "")
        linked_paths = []
        # Check rules for this cerebro
        try:
            rules = storage_routing_engine.get_all_rules().get("rules", []) if hasattr(storage_routing_engine, 'get_all_rules') else []
            for rule in rules:
                brain_ids = rule.get("auto_memory_routing", {}).get("target_brains", [])
                if cid in brain_ids:
                    linked_paths.append({
                        "rule_id": rule.get("id"),
                        "name": rule.get("name"),
                        "path": rule.get("target_path"),
                        "type": rule.get("media_type")
                    })
        except Exception:
            pass
        cerebro_to_media[cid] = {
            "cerebro_name": cerebro.get("name", cid),
            "linked_media": linked_paths,
            "total_linked": len(linked_paths)
        }

    for dev in devices:
        dev_id = dev.get("id") or dev.get("path", "unknown")
        linked_cerebros = []
        try:
            rules = storage_routing_engine.get_all_rules().get("rules", []) if hasattr(storage_routing_engine, 'get_all_rules') else []
            for rule in rules:
                if dev.get("path") and dev.get("path") in rule.get("target_path", ""):
                    brain_ids = rule.get("auto_memory_routing", {}).get("target_brains", [])
                    linked_cerebros.extend(brain_ids)
        except Exception:
            pass
        media_to_cerebros[dev_id] = {
            "device_label": dev.get("label", dev_id),
            "device_type": dev.get("media_type", "unknown"),
            "path": dev.get("path"),
            "linked_cerebros": list(set(linked_cerebros))
        }

    return {
        "success": True,
        "tunnel_url": tunnel_status.get("url"),
        "lan_endpoints": tunnel_status.get("lan_endpoints", []),
        "cerebro_to_media": cerebro_to_media,
        "media_to_cerebros": media_to_cerebros,
        "total_devices": len(devices),
        "total_cerebros": len(cerebros_raw)
    }

frontend_dist = settings.workspace_path / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
