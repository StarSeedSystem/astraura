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


## [HECHO] Watchdog tunnel Astraura — Run 2
- **Fecha:** Mon Aug 31 18:38–18:41 CST 2026
- **Acción:** Ejecutado tunnel_watchdog.sh
- **Resultado:** Túnel CAÍDO → watchdog lo relanzó. Nuevo túnel: https://newton-para-possibilities-somerset.trycloudflare.com
- **Verificado:** curl /api/cerebros → {"active_brain_id":"brain_genesis","cerebros":[...]} (200 OK)
- **Observación:** BitNet i2_s sigue lento (~30s); timeout mínimo 60s recomendado.
- **Commit + push:** pendiente (ver abajo)
