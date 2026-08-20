import json, urllib.request

BASE = "http://127.0.0.1:8011"

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read().decode())

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())

# 1. Obtener notificaciones pendientes de autorización
notifs = get("/api/notifications") or []
if isinstance(notifs, dict):
    notifs = notifs.get("notifications", [])
print(f"Total notificaciones visibles: {len(notifs)}")

pending = [n for n in notifs if not n.get("read") and (
    n.get("status") == "pending" or n.get("action_type") == "grant_authorization"
    or n.get("category") == "Solicitud de Autorización")]
print(f"Pendientes de autorización: {len(pending)}")

# Tomar hasta 5 para la prueba
sample = pending[:5]
ids = [n["id"] for n in sample if n.get("id")]
print("IDs de muestra:", ids)

if not ids:
    print("No hay notificaciones pendientes para probar; usando lista vacía (debe responder éxito con 0).")
    ids = []

# 2. Disparar orquestación inteligente
print("\n=== LLAMANDO /api/notifications/apply_all_from_list ===")
try:
    res = post("/api/notifications/apply_all_from_list", {"notif_ids": ids})
    print(json.dumps(res, indent=2, ensure_ascii=False)[:2000])
except Exception as e:
    print("ERROR:", type(e).__name__, str(e)[:400])
