"""Arregla RLS de astraura_voice_mesh usando la libreria supabase (metodo .sql())."""
import sys
sys.path.insert(0, ".")
from supabase import create_client
from app.core import supabase_sync as s

creds = s._load_creds()
url = creds["supabase_url"]
key = creds["service_role_key"]
sb = create_client(url, key)
T = "astraura_voice_mesh"

sql = f"""
ALTER TABLE {T} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "{T}_anon_read" ON {T};
CREATE POLICY "{T}_anon_read" ON {T}
  FOR SELECT TO anon, authenticated
  USING (true);
"""
print("ejecutando DDL...")
res = sb.sql(sql).execute()
print("OK:", res)

# Verifica lectura anon.
anon_key = creds["anon_key"]
sb_anon = create_client(url, anon_key)
rows = sb_anon.table(T).select("kind,speaker,version").limit(8).execute()
data = rows.data or []
print(f"filas visibles anon: {len(data)}")
for r in data[:8]:
    print("  -", r.get("kind"), r.get("speaker"), "v" + str(r.get("version")))
