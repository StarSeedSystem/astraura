# StarSeed OS — Tareas Pendientes

## Tareas activas
- [x] Watchdog tunnel Astraura — verificado y relanzado (Sep 2 17:42 CST)

## Tareas recientes
- [2026-09-02 17:42] Ejecutado `bash tunnel_watchdog.sh` desde working dir "IA 1.58 bit". Túnel caído detectado → monitor relanzado (pid 19536). Nueva URL: ahead-drop-judge-safer.trycloudflare.com


## Tareas - Wed Sep 2 2026
- [x] Ejecutar watchdog del tunel de Astraura
  - Estado inicial: tunel CAIDO (old URL)
  - Accion: relanzar monitor (pid 22608)
  - Estado final: tunel VIVO /api/cerebros responde OK

## Adenda 242 - Watchdog túnel Astraura (cron, 2026-09-02 20:50 CST)
- Comando: `cd "/Users/alex/Documents/IA 1.58 bit" && bash tunnel_watchdog.sh && tail -3 data/tunnel_watchdog.log`
- Resultado watchdog: EXITO (exit_code=0). Estado INICIAL: TUNEL CAIDO (https://norm-wishing-concern-discrete.trycloudflare.com) → relanzado por watchdog (pid 42719).
- cloudflared creó URL NUEVA: https://home-russia-resume-lincoln.trycloudflare.com (race condition: active_tunnel.json retuvo URL vieja).
- CORRECCIÓN OPERATIVA (sin cambios de código): actualizados data/active_tunnel.json + frontend/public/active_tunnel.json con URL correcta.
- Backend local :8000: HTTP 200. BitNet i2_s saludable.
- curl /api/cerebros (túnel): 200 OK JSON {"active_brain_id":"brain_genesis","cerebros":[{"i
- Conectividad Vercel + app nativa: OK.
