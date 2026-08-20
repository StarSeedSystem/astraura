import json, urllib.request

BASE = "http://127.0.0.1:8011"

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read().decode())

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())

notifs = get("/api/notifications")
if isinstance(notifs, dict):
    notifs = notifs.get("notifications", [])
pending = [n for n in notifs if not n.get("read") and (
    n.get("status") == "pending" or n.get("action_type") == "grant_authorization"
    or n.get("category") == "Solicitud de Autorización")]
ids = [n["id"] for n in pending if n.get("id")]
print(f"Procesando TODAS las pendientes: {len(ids)}")
res = post("/api/notifications/apply_all_from_list", {"notif_ids": ids})
print("processed_count:", res.get("processed_count"))
print("agent_executions:", json.dumps(res.get("agent_executions", {}), ensure_ascii=False))
print("storage_events:", res.get("storage_events"))
print("elapsed_seconds:", res.get("elapsed_seconds"))
print("message:", res.get("message"))
