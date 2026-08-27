"""Crea la tabla astraura_voice_mesh en Supabase (micelio de conocimiento 1.58-bit).

La tabla NO existe aun en el proyecto (verificado: GET devuelve 404 PGRST205).
Este script intenta crearla via el endpoint /rest/v1/sql; si el proyecto lo
tiene deshabilitado (este lo tiene), el script imprime el SQL para pegarlo en
el SQL Editor del dashboard de Supabase (https://app.supabase.com ->
project nxstilnyidvkqeosofuh -> SQL Editor -> Run).

Una vez creada la tabla, el micelio de conocimiento (voz + LLM + agentes +
personalidades + cerebros) se descubre automaticamente entre nodos en la nube.
"""
import sys
sys.path.insert(0, ".")
import requests
from app.core import supabase_sync as s

creds = s._load_creds()
rest = creds["supabase_url"].rstrip("/") + "/rest/v1"
key = creds["service_role_key"]
headers = {"apikey": key, "Authorization": f"Bearer {key}",
           "Content-Type": "text/plain", "Accept": "application/json"}

SQL = """
CREATE TABLE IF NOT EXISTS public.astraura_voice_mesh (
    id          text PRIMARY KEY,
    kind        text NOT NULL DEFAULT 'nt',   -- nt | voice | llm_delta | agent_memory | persona_embed | brain_state
    node_id     text,
    speaker     text,
    version     int,
    mos         real,
    mb          real,
    hash        text,
    b64         text,                            -- binario del pack (opcional, para cross-fetch)
    meta        jsonb,
    updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS astraura_voice_mesh_kind_idx ON public.astraura_voice_mesh (kind);
CREATE INDEX IF NOT EXISTS astraura_voice_mesh_node_idx ON public.astraura_voice_mesh (node_id);
-- Lectura publica para descubrimiento de la colonia (escritura solo via service_role).
ALTER TABLE public.astraura_voice_mesh ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS astraura_voice_mesh_anon_read ON public.astraura_voice_mesh;
CREATE POLICY astraura_voice_mesh_anon_read ON public.astraura_voice_mesh
    FOR SELECT TO anon, authenticated USING (true);
"""

print("=== Intentando crear tabla via /rest/v1/sql ===")
r = requests.post(rest + "/sql", headers=headers, data=SQL, timeout=30)
print("HTTP", r.status_code, r.text[:300])
if r.ok:
    print("TABLA CREADA OK")
else:
    print("\n=== /rest/v1/sql deshabilitado en este proyecto. ===")
    print("Pega el siguiente SQL en el SQL Editor de Supabase (dashboard) y ejecuta Run:\n")
    print(SQL)
