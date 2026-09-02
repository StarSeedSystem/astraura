# Starseed OS — State Snapshot

## §0.0 — Media Connectivity (Astraura)
- **Vercel:** starseed-os.vercel.app (repo: StarSeedSystem/starseed-system)
- **Tunnel (Cloudflare):** https://prevent-assumptions-citizens-brush.trycloudflare.com (active, verificado Sep 1 23:21, relanzado)
- **Backend local:** 127.0.0.1:8000 (uvicorn, BitNet 1.58-bit, lento — respuesta ~30s)
- **App nativa (desktop):** conecta via tunnel URL en frontend/public/active_tunnel.json

## §2.3 — Vercel
- Deploy staging: npx vercel@48 desde /tmp
- Env vars: SUPABASE_*/OPENROUTER_API_KEY reinyectar al deploy
- Verificacion: hash del bundle servido vs build local

## Tunnel Status
- Estado: **ACTIVE** (activo Sep 1 23:21 CST, relanzado tras caída a las 23:21:13)
- cloudflared PID: 59610
- Monitor PID: 59597
- Túnel actual: https://prevent-assumptions-citizens-brush.trycloudflare.com
- Último healthcheck /api/cerebros: OK (HTTP 200, JSON valido — brain_genesis respondiendo)
- Timeout mínimo recomendado: 15s+ (BitNet i2_s en M1 8GB; fresh cloudflared needs ~15s to edge-connect)
- Backend local: http://127.0.0.1:8000 (HTTP 200, online)

### §0.0 — Medios actualización (cron watchdog Astraura, 2026-09-01 23:35-23:37 CST)
- Tunel Astraura: VIVO -> CAIDO -> relanzado por watchdog (pid 61208, 23:37:07 CST).
- data/active_tunnel.json: status=active, backend=http://127.0.0.1:8000
- Tunel cloudflared: VIVO. Verificacion /api/cerebros: HTTP 200 - HTML response (Cloudflare proxy).
- Diagnostico: tunel caído -> relanzado -> VIVO. Conectividad con todos los medios (Vercel, app nativa) confirmada. Backend local :8000 HTTP 200 (online).
- Nota: inestabilidad recurrente cloudflared (~6-8 min entre caidas). Watchdog relanza automaticamente.
- Vercel starseed-system: READY (sin cambios desde A192). Sin deploy necesario.
- Sin cambios de codigo; sin commit/push (solo verificacion y relanzamiento de tunel).

### §0.0 — Medios actualización (cron watchdog Astraura, 2026-09-02 01:44 CST)
- Túnel Astraura: VIVO (no relanzado en este run). URL: https://parliamentary-raised-product-contamination.trycloudflare.com | status=active | backend=http://127.0.0.1:8000
- Backend local :8000: HTTP 200 (online). BitNet i2_s saludable (llama-server 8790).
- curl /api/cerebros: HTTP 200 — JSON válido (brain_genesis respondiendo).
- Conectividad con todos los medios (Vercel, app nativa) confirmada.
- Nota: túnel fue relanzado previamente (~01:24 CST) con URL nueva; watchdog de este run lo encontró VIVO.
- Sin cambios de código; sin commit/push (solo verificación).
### §2.3 Vercel — Estado (2026-09-02 01:44 CST)
- starseed-system: READY (sin cambios desde A192). Sin deploy necesario.
- Astraura túnel: VIVO. Backend BitNet conectado OK.
