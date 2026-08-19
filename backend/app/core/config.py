import os
from pathlib import Path
from pydantic import BaseModel

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
WORKSPACE_DIR = BASE_DIR
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "backend" / "models"
BITNET_REPO_DIR = BASE_DIR / "backend" / "BitNet"

# Ensure essential directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "vector_store").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "knowledge_graph").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "Astraura 1.58-Bit AI Engine"
    app_version: str = "1.0.0"
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Storage Paths
    workspace_path: Path = WORKSPACE_DIR
    data_path: Path = DATA_DIR
    models_path: Path = MODELS_DIR
    bitnet_path: Path = BITNET_REPO_DIR
    
    # Auto-Tuned Defaults (overwritten by hardware profiler)
    threads: int = 4
    context_size: int = 4096
    batch_size: int = 512
    quantization_type: str = "i2_s" # 1.58-bit ternary quantization
    
    # Background Learner Settings
    background_learning_interval_seconds: int = 15
    memory_consolidation_threshold: int = 5
    similarity_threshold: float = 0.65

settings = Settings()
