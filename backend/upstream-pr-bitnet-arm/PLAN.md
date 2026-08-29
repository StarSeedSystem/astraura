# Plan: llevar los arreglos del kernel ARM i2_s a upstream (Adenda 176)

**Material fuente (este directorio):**
- `01-superproject-microsoft-BitNet.diff` — diff del clon sala-limpia (`~/.astraura/bitnet-upstream`,
  base `0b341e5`) vs upstream: 5 archivos.
- `02-submodule-isHuangXin-llamacpp.diff` — diff del submódulo `3rdparty/llama.cpp`
  (`isHuangXin/llama.cpp` rama `release-bitnet-embedding-0.6b-270m`, base `390c307`): 6 archivos.
- `03-nuevo-ggml-i2s.c` — archivo NUEVO (untracked; no sale en el diff): las definiciones de
  `dequantize_row_i2_s`/`quantize_i2_s` reubicadas en ggml-base con el layout ARM correcto.

## Los 4 bugs verificados que se aportan (Adendas 160-162-169)

1. **CMake pisaba los kernels NEON**: `set(GGML_SOURCES_BITNET …)` dos veces — la segunda
   sobrescribía y `ggml-bitnet-mad.cpp` no se compilaba jamás → `list(APPEND …)`.
2. **Despachador `_1xN` roto en ARM**: calculaba bien la fila 0 y escribía ESE valor en todas las
   salidas (15/16 incorrectas) → logits planos, token constante.
3. **`ggml_gemm_i2_i8_s` erraba 3 de cada 4 columnas** (96/128) — corrompía prompt/KV.
4. **`dequantize_row_i2_s` asumía layout x86** (128 val/32 B, paso 32) pero en ARM `QK_I2_S=64`
   (64 val/16 B, paso 16) → lectura fuera del tensor → SIGSEGV vía `ggml_backend_blas_mul_mat`.
   Además el upstream **ni enlaza en arm64**: declara en `ggml-quants.h` (ggml-base) y define en
   `ggml-cpu` → *Undefined symbols*; la reubicación a ggml-base lo cura.

Verificación existente: kernels contrastados contra producto escalar a mano (vec_dot 0/16 ·
gemv 0/32 · gemm 0/128 mal), prueba C aislada de dequantize **0/192 incorrectos**, sonda del motor
1,94→28,26 tok/s, PPL 5.38, producción diaria en el Mac M1.

## Estrategia de envío (dos PRs + un issue)

- **PR-A → `microsoft/BitNet`**: SOLO `src/CMakeLists.txt` (fix set→APPEND) +
  `src/ggml-bitnet-mad.cpp` (fixes _1xN/gemm). **EXCLUIR** `include/bitnet-lut-kernels.h` y
  `include/kernel_config.ini` (son SALIDA del codegen por-hardware, no fuente) y el puntero de
  submódulo.
- **PR-B → `isHuangXin/llama.cpp`** (rama `release-bitnet-embedding-0.6b-270m`): reubicación i2_s a
  ggml-base (`ggml/src/ggml-i2s.c` nuevo + CMakeLists ×2 + recortes en `ggml-cpu/quants.c` +
  `ggml-cpu-i2s.c`). **EXCLUIR** las líneas de debug `ASTRAURA_I2S_DEBUG` (fprintf) de
  `ggml-cpu.c`/`repack.cpp` — instrumentación de diagnóstico, no fix.
- **Issue → `microsoft/BitNet`** (visibilidad): "i2_s inference broken on ARM (wrong results +
  SIGSEGV): 4 fixes" con síntomas, causas, números medidos y enlaces a ambos PRs.

## Protocolo de sala limpia ANTES de enviar (obligatorio)

1. Clon fresco `microsoft/BitNet` (recursivo) en `/tmp` → aplicar SOLO PR-A → compilar → correr la
   prueba C aislada + generación real → registrar números.
2. Ídem con SOLO PR-B sobre submódulo fresco (el árbol debe COMPILAR sin PR-A, aunque siga lento:
   un PR no puede depender del otro sin declararlo).
3. Traducir los comentarios al inglés técnico (los actuales citan Adendas en español).
4. Forks bajo `StarSeedSystem` (`gh repo fork --clone=false`), ramas `fix/arm-i2s-*`, push,
   `gh pr create --draft` + `gh issue create` — **el envío final lo aprueba Alex**.

## Estado

- [x] Material extraído y versionado (este directorio).
- [ ] Sala limpia PR-A · [ ] Sala limpia PR-B · [ ] Comentarios en inglés · [ ] Forks+ramas ·
  [ ] Draft PRs + issue (con visto bueno de Alex).
