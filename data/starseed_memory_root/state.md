# Starseed OS — State Snapshot

## §0.0 — Media Connectivity (Astraura)
- **Vercel:** starseed-os.vercel.app (repo: StarSeedSystem/starseed-system)
- **Tunnel (Cloudflare):** https://brussels-chrome-biblical-heaven.trycloudflare.com (active, verificado)
- **Backend local:** 127.0.0.1:8000 (uvicorn, BitNet 1.58-bit, lento — respuesta ~30s)
- **App nativa (desktop):** conecta via tunnel URL en frontend/public/active_tunnel.json

## §2.3 — Vercel
- Deploy staging: npx vercel@48 desde /tmp
- Env vars: SUPABASE_*/OPENROUTER_API_KEY reinyectar al deploy
- Verificacion: hash del bundle servido vs build local

## Tunnel Status
- Estado: **ACTIVE** (relanzado hoy)
- cloudflared PID: 66877
- Último healthcheck /api/cerebros: OK (JSON valido)
- Timeout mínimo recomendado: 60s (BitNet i2_s en M1 8GB)
