import json, urllib.request, time
GW = "https://optimum-forest-evans-spaces.trycloudflare.com"
def get(p): return json.loads(urllib.request.urlopen(GW+p, timeout=30).read().decode())
def post(p,b):
    data=json.dumps(b).encode()
    req=urllib.request.Request(GW+p,data=data,headers={"Content-Type":"application/json"},method="POST")
    return json.loads(urllib.request.urlopen(req,timeout=200).read().decode())

# Simular lo que hace el boton: aplicar todas las pendientes
n = get("/api/notifications")
pend = [x["id"] for x in n.get("notifications",[]) if x.get("status") not in ("applied","resolved")]
print(f"Pendientes en tunnel: {len(pend)}")
if pend:
    sample = pend[:5]
    t=time.time()
    res = post("/api/notifications/apply_all_from_list", {"notif_ids": sample})
    print(f"Boton(API)= success={res.get('success')} processed={res.get('processed_count')} failed={res.get('failed_count')} ({round(time.time()-t,1)}s)")
    # Verificar que desaparecieron
    n2 = get("/api/notifications")
    pend2 = [x["id"] for x in n2.get("notifications",[]) if x.get("status") not in ("applied","resolved")]
    print(f"Tras aplicar {len(sample)}: pendientes {len(pend)} -> {len(pend2)} (desaparecieron {len(pend)-len(pend2)})")
print("Gateway OK:", GW)
