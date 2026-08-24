import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

class AstrauraConnectionsVault:
    """
    Secure In-Memory & Local Storage Vault for API Keys, Tokens, and Integration Parameters.
    Manages connections to GitHub, Vercel, Supabase, Google Cloud, Hugging Face, MCP, and Local Nodes.
    """
    def __init__(self):
        self.vault_file = Path.home() / ".astraura" / "vault.json"
        self.connections: Dict[str, Dict[str, Any]] = {
            "vercel": {
                "id": "vercel",
                "name": "Vercel Cloud Platform",
                "account": "alexbordongarrigos",
                "project": "astraura",
                "status": "connected",
                "token_set": True,
                "url": "https://astraura.vercel.app",
                "type": "deployment"
            },
            "github": {
                "id": "github",
                "name": "GitHub Ecosystem",
                "account": "alexbordongarrigos",
                "status": "connected",
                "token_set": True,
                "type": "version_control"
            },
            "huggingface": {
                "id": "huggingface",
                "name": "Hugging Face Hub",
                "account": "Configurable",
                "status": "available",
                "token_set": False,
                "type": "model_hub"
            },
            "supabase": {
                "id": "supabase",
                "name": "Supabase PostgreSQL & Vector",
                "account": "StarSeed Database",
                "status": "available",
                "token_set": False,
                "type": "database"
            },
            "google_cloud": {
                "id": "google_cloud",
                "name": "Google Cloud CLI & Vertex",
                "account": "Local gcloud",
                "status": "configured",
                "token_set": True,
                "type": "cloud"
            },
            "mcp_server": {
                "id": "mcp_server",
                "name": "Model Context Protocol (MCP)",
                "account": "Localhost MCP Bridge",
                "status": "active",
                "token_set": True,
                "type": "protocol"
            }
        }
        self.custom_parameters: Dict[str, Any] = {
            "bitnet_threads": 8,
            "bitnet_context_size": 2048,
            "quantization_format": "i2_s (1.58-bit ternary)",
            "memory_cache_mb": 512,
            "browser_headless": True,
            "dream_interval_minutes": 15,
            "auto_wipe_cache": False
        }

        # (Adenda 158 · Ola 6) Persistencia REAL. Antes esta clase declaraba
        # `vault_file` y no lo leia ni lo escribia nunca: todo vivia en memoria y
        # se perdia al reiniciar, y el token que mandaba el usuario se tiraba
        # (`update_connection` solo ponia `token_set = True`). La boveda del OS
        # decia «token guardado» y no habia nada guardado. Ahora se guarda.
        self._load_from_disk()

    # ── Persistencia en disco ────────────────────────────────────────────────

    def _load_from_disk(self) -> None:
        """Funde lo guardado sobre las conexiones sembradas. Nunca revienta."""
        try:
            if not self.vault_file.exists():
                return
            with open(self.vault_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return  # boveda corrupta o ilegible: se sigue con las semillas

        for conn_id, saved in (data.get("connections") or {}).items():
            if not isinstance(saved, dict):
                continue
            base = self.connections.get(conn_id, {"id": conn_id, "name": conn_id})
            base.update(saved)
            self.connections[conn_id] = base
        params = data.get("parameters")
        if isinstance(params, dict):
            self.custom_parameters.update(params)

    def _save_to_disk(self) -> bool:
        """
        Escribe la boveda con permisos restrictivos (0700 la carpeta, 0600 el
        fichero): contiene credenciales en claro, asi que no debe ser legible
        por otros usuarios de la maquina.
        """
        try:
            self.vault_file.parent.mkdir(parents=True, exist_ok=True)
            try:
                os.chmod(self.vault_file.parent, 0o700)
            except Exception:
                pass
            payload = {"connections": self.connections, "parameters": self.custom_parameters}
            tmp = self.vault_file.with_suffix(".json.tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            try:
                os.chmod(tmp, 0o600)
            except Exception:
                pass
            tmp.replace(self.vault_file)
            return True
        except Exception:
            return False

    # ── Lectura ──────────────────────────────────────────────────────────────

    @staticmethod
    def _mask(token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        tail = token[-4:] if len(token) > 4 else ""
        return f"{'*' * 8}{tail}"

    def get_vault_data(self) -> Dict[str, Any]:
        """
        NUNCA devuelve el token en claro: solo `token_set` y una pista
        enmascarada. El OS solo necesita saber si hay credencial y cual es.
        """
        safe: List[Dict[str, Any]] = []
        for conn in self.connections.values():
            clean = {k: v for k, v in conn.items() if k != "token"}
            clean["token_set"] = bool(conn.get("token")) or bool(conn.get("token_set"))
            clean["masked_token"] = self._mask(conn.get("token"))
            safe.append(clean)
        return {
            "connections": safe,
            "parameters": self.custom_parameters,
            "vault_path": str(self.vault_file),
            "persisted": self.vault_file.exists(),
        }

    def get_token(self, conn_id: str) -> Optional[str]:
        """Token en claro, para uso INTERNO del backend (deploy, git, hub…)."""
        conn = self.connections.get(conn_id) or {}
        tok = conn.get("token")
        return tok if isinstance(tok, str) and tok else None

    # ── Escritura ────────────────────────────────────────────────────────────

    def update_connection(self, conn_id: str, updates: Dict[str, Any]) -> bool:
        """
        Acepta conexiones NUEVAS (antes solo dejaba tocar las 6 sembradas) y
        guarda de verdad el token que llega.
        """
        conn = self.connections.get(conn_id)
        if conn is None:
            conn = {"id": conn_id, "name": conn_id, "type": "custom", "status": "available"}
            self.connections[conn_id] = conn
        conn.update(updates)
        if updates.get("token"):
            conn["token_set"] = True
            conn["status"] = conn.get("status") or "connected"
        self._save_to_disk()
        return True

    def update_parameters(self, new_params: Dict[str, Any]) -> Dict[str, Any]:
        self.custom_parameters.update(new_params)
        self._save_to_disk()
        return self.custom_parameters

connections_vault = AstrauraConnectionsVault()
