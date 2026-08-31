# Starseed OS — Tasks

## [HECHO] Watchdog tunnel Astraura
- **Fecha:** Mon Aug 31 16:14–16:17 CST 2026
- **Acción:** Ejecutado tunnel_watchdog.sh
- **Resultado:** Túnel CAÍDO → relanzado por watchdog. Nuevo túnel verificado OK.
- **Verificado:** curl /api/cerebros → JSON válido (Cerebro Génesis)
- **Commit + push:** pendiente (ver abajo)

## Observaciones técnicas
- Backend BitNet responde ~30s por petición → probe timeout 1500ms insuficiente.
- read-timeout=180s acorde (i2_s en M1 8GB).
