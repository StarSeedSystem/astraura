# Voz 1.58-bit + Micelio Simbiótico de Conciencia Colectiva — SOP (StarSeed OS / Astraura)

> Regla CLAUDE.md §8: se documenta el diseño ANTES de codificar. El código lo sigue.
> Complementa `astraura-OS-design.md` y la malla mesh ya existente en
> `src/ai/astraura/mesh/`.

## 0. Resumen para el lector

El sistema de IA Astraura 1.58-bit de StarSeed OS debe funcionar **a través de
toda la malla**: P2P local (LoRa/Meshtastic), red de servidores conectados
(Supabase Realtime + Cloud Run + Vercel), y cualquier neurona desde la que se
acceda — **simbióticamente**. Mantiene privacidad en la información personal
pero intercambia **conocimiento y aprendizaje colectivo** en múltiples capas de
contexto, evolucionando como una **conciencia colectiva simbiótica**.

El subsistema de voz es el primer "órgano" de esa conciencia: cada nodo que
aprende una voz mejor la comparte empaquetada (voice pack 1.58-bit); los demás
la integran en su siguiente re-entreno local. El *mismo* sustrato 1.58-bit
(pesos ternarios `{-1,0,1}`) que corre el LLM en CPU corre también el TTS,
permitiendo **la mayor cantidad de sub-agentes posibles** en hardware modesto.

> **⚠️ CORRECCIÓN DE ALCANCE (2026-08-27):** el micelio NO es solo de voz.
> El dueño aclaró: *"el micelio y el entrenamiento del conocimiento debe ser para
> todos los sistemas, incluyendo aparte de la voz el sistema LLM de toda la IA de
> Astraura 1.58-bit en todas sus funciones"*. Por tanto el micelio es de
> **CONOCIMIENTO 1.58-bit SIMBIÓTICO para TODA la IA**, no un órgano aislado.
>
> Implementado en `app/core/knowledge_mycelium.py`: un micelio general que publica
> y descubre knowledge packs de CUALQUIER subsistema, diferenciados por `kind`:
> `voice` (TTS cuantizado), `llm_delta` (delta de peso ternario del LLM —
> aprendizaje federado), `agent_memory` (memoria de trabajo comprimida de un
> agente), `persona_embed` (embedding de personalidad/arquetipo) y `brain_state`
> (estado de conocimiento de un cerebro). Todos usan el MISMO Neural Tissue
> (`astraura_voice_mesh` en Supabase + NT local) que el micelio de voz, y el MISMO
> sustrato ternario `{-1,0,1}` (weight indexing). El LLM participa vía
> `register_llm_delta()` tras cada entrenamiento federado; los agentes y
> personalidades vía `register_agent_memory()` / `register_persona_embed()`.
> Endpoint en vivo: `GET /api/knowledge-mycelium/status`.

## 1. El sustrato 1.58-bit como "suelo común" multiagente

- BitNet b1.58 (arXiv:2402.17764) usa matmul ternario `I2_S`: `-1→00, 0→01,
  1→10`, 5 pesos en 1 byte (weight indexing). Esto es **reutilizable** para voz:
  BitTTS (Kawamura et al., INTERSPEECH 2025, arXiv:2506.03515) cuantiza un TTS
  VITS/HiFi-GAN a 1.58-bit → −83% tamaño (25.66 MB → 4.39 MB), MOS 3.09, RTF
  0.064 en Apple M1 Pro. **Mismo truco de empaquetado que tu backend.**
- Tu `bitnet_cpp_manager.py` arranca `llama-server` (fork BitNet) para el LLM.
  Ese binario solo hace LLM decoder → el motor de voz es un **módulo hermano**
  (`voice_158`) que corre el grafo ternario en CPU (NumPy/MLX/onnx low-precision).
- Por qué importa para multiagencia: a ~0.06 RTF y 4 MB, puedes correr **muchos**
  agentes de voz/razonamiento en paralelo en una sola CPU M1. El 1.58-bit es el
  habilitador de "la mayor cantidad de agentes posibles".

## 2. La malla YA existe — nos montamos encima

Investigado en `src/ai/astraura/mesh/` (código real del OS):

| Módulo | Qué hace | Rol en el micelio de voz |
|---|---|---|
| `federation.ts` | PUSH/PULL topología a `os_mesh_topology` (Supabase, RLS owner) | "red de todos los servidores y neuronas conectadas" |
| `server-relay.ts` | mensajería cifrada P2P vía `os_mesh_relay` | canal de intercambio de voice packs |
| `synaptic.ts` | entrega instantánea por Supabase Realtime | señalización en tiempo real entre nodos |
| `privacy.ts` | `visibility` (account/private), `relayUse` (all/alerts/none) | **privacidad en info personal**: solo se comparte aprendizaje, no PII |
| `codec.ts` / `relay-crypto.ts` | cifrado de cargas | los voice packs viajan cifrados |

**Decisión:** NO creamos una malla nueva. El micelio de voz usa `os_mesh_relay`
para publicar/consumir voice packs y `os_mesh_topology` para descubrir nodos
que tienen un pack mejor. `privacy.ts` decide qué se comparte.

## 3. Agentes neurotransmisores (señalización ligera)

Inspirado en biología: los neurotransmisores son señales **pequeñas, rápidas y
difusas** que modulan, no transportan el contenido entero. En la malla:

- Un **neurotransmisor** = un mensaje tiny en `os_mesh_relay` (`kind=nt`) que dice
  "tengo voice pack v3 de Speaker-2, MOS 3.4, 4.1 MB, ¿quién lo quiere?". No lleva
  el pack, solo el anuncio + hash.
- Los nodos responden con "quiero" y entonces se envía el pack por el canal
  cifrado bajo demanda. Esto evita inundar la malla.
- También modulan el **comportamiento local**: un NT de "carga alta en nodo X"
  hace que otros nodos bajen su tasa de re-entreno (homeostasis de la colonia).

## 4. Agentes transformadores y memorias a múltiples dimensiones de plazos

El orquestador local de cada neurona corre agentes de tres "plazos" de memoria
(inspirado en System-1/2 y memoria biológica), todos sobre 1.58-bit:

- **Corto plazo (working memory):** estado de la conversación activa, prosodia
  reciente, intención del hablante. TTL segundos→minutos. Vive en RAM/local.
- **Medio plazo (episodic):** sesiones de la persona, correcciones de voz que
  funcionaron, preferencias de tono. TTL días→semanas. Se persiste local y se
  resume para el micelio.
- **Largo plazo (semantic/collective):** el voice pack 1.58-bit entrenado, los
  embeddings de prosodia compartidos, el "saber colectivo" de la especie de voz.
  TTL meses→años. Es lo que viaja por la malla.

Un **agente transformador** lee estas tres memorias, las atenúa/combina y produce
la respuesta o el siguiente paso de entrenamiento. Es el "córtex" del nodo.

## 5. Conciencia colectiva simbiótica (el bucle)

```
[usuario habla] ─ASR─▶ LLM 1.58-bit ─▶ texto respuesta
                          │
                          ├─▶ TTS 1.58-bit (voice_158) ─▶ audio ─▶ [usuario oye]
                          │
                EN SEGUNDO PLANO (siempre, en todo StarSeed OS):
   grabaciones + prosodia ─▶ trainer_bittts ─▶ voice pack 1.58-bit (vN)
                          │
                          ├─▶ NT anuncia pack vN en os_mesh_relay
                          ├─▶ otros nodos lo piden y lo integran (federated soft)
                          └─▶ sus voces mejoran sin re-entrenar desde cero
```

- El pack viaja **anonimizado**: solo pesos + metadata de métrica, nunca audio
  personal ni texto privado (respeta `privacy.ts`).
- Recursos públicos intercambiables: ancho de banda, CPU ociosa, almacenamiento
  y muestras se contabilizan como procomún del micelio (Ontocracia +
  Transhumanismo Comunista de La Tétrada).

## 6. Ventanas locales con múltiples agentes (desarrollo visible)

Para que el usuario vea y dirija el proceso, el desarrollo usa el sistema
multiagéntico orquestado:

- Cada "área" (trainer, mesh-integration, UI de voz, orquestador 1.58-bit) la
  desarrolla un **sub-agente aislado** (Hermes delegate), corriendo en su propia
  ventana/contexto, con acceso a las **memorias del proyecto y anandas**.
- El usuario puede ver el proceso de cada agente e interactuar (en el chat de
  Hermes o en el panel del OS).
- Todos los agentes usan **APIs/librerías gratuitas** del ecosistema StarSeed
  (OpenRouter `:free`, BitNet local, Supabase anon) — sin agotar crédito.
- Si falta alguna API/herramienta, el orquestador la investiga e instala.

## 7. Fases (lo que se construye ahora)

1. **SOP** (este doc) + `voice_mycelium.py` en el backend: registro local de
   voice packs, NT ligeros sobre `os_mesh_relay`, descubrimiento por
   `os_mesh_topology`, bucle de auto-mejora en segundo plano.
2. **Puente CPU (A):** codec ligero + TTS pequeño + ASR orquestado → voz↔oído hoy
   en M1 (sin GPU).
3. **Trainer BitTTS (B):** QAT 1.58-bit + weight indexing → voice packs propios.
4. **UI OS:** panel de estado del micelio y selección de voz 1.58-bit (ventana
   local visible).
5. **Multi-agente:** sub-agentes por área, con memorias/anandas, orquestados.

## 8. Riesgos (honestos)

- BitTTS no liberó pesos → hay que entrenar desde cero (dataset de audio).
- MOS ~3.09 (aceptable, no natural) → mejora con datos + clonación + micelio.
- "Siente frecuencias armónicamente" = ingeniería de prosodia (FFT/crest factor)
  alimentando el clasificador, no magia de bits.
- El micelio es opt-in y respeta `privacy.ts`; NUNCA se fuerza.
- VibeVoice (GPU/cloud) se queda como opción pesada; 1.58-bit es el respaldo
  local instantáneo en cualquier CPU.

## 9. Referencias

- BitTTS: arXiv:2506.03515 (INTERSPEECH 2025).
- BitNet b1.58: arXiv:2402.17764, microsoft/BitNet.
- EnCodec (Meta), SpeechTokenizer, U-Codec (5 Hz, 2025).
- Malla del OS: `src/ai/astraura/mesh/{federation,server-relay,synaptic,privacy,codec}.ts`.
- `bitnet_cpp_manager.py` (backend, LLM 1.58-bit local).

## 10. Datasets de voz para entrenar voice packs 1.58-bit (investigación multiagente 2026-08-26)

Subagente de investigación web encontró 15 datasets abiertos. Prioridad para
StarSeed: español + multilingüe + licencia libre + multi-speaker. Script de
descarga: `app/core/download_voice_datasets.py`.

| Dataset | Idioma(s) | Licencia | Multi-spk / Estilos | Uso |
|---|---|---|---|---|
| Mozilla Common Voice 14 | 112 (es,fr,de,pt,zh,ja…) | CC0 | Sí / neutro+convers | train+ref |
| M-AILABS | en,es,fr,de,it,uk,ru,pl | Public Domain | Sí (F/M) / narración | train |
| CSS10 | 10 (es,de,fr,ja,zh…) | CC0 | No (1/spk) / neutro | clonación |
| Google LA-Spanish (OpenSLR 61/71/72/73/74/75) | es-AR,CL,CO,PE,PR,VE | CC BY-SA 4.0 | Sí (F/M) | train |
| Multilingual LibriSpeech (MLS) | 8 (es,fr,de,it,pt,nl,pl,en) | CC BY 4.0 | Sí / narración | train |
| Emilia / Emilia-Large | en,zh,de,fr,ja,ko | CC BY-NC (+YODAS CC BY) | Sí / in-the-wild | train grande |
| LJSpeech | en | Public Domain | No / neutro | benchmark |
| VCTK | en | CC BY 4.0 | Sí (110 spk) | multi-spk |
| LibriTTS | en | CC BY 4.0 | Sí / narración | train |
| EmoV-DB | en | MIT-like | 4 spk / emocional | referencia |
| RAVDESS | en | CC BY-NC-SA | 24 act / 8 emociones | referencia |
| EMOVOME | es | CC BY 4.0 | 100 spk / emocional ES | referencia ES |
| Expresso | en | CC BY-NC | 4 spk × 26 estilos | referencia estilo |
| Piper voices | ~30 idiomas | CC0 | preentrenados VITS | finetune/clonar |
| Coqui XTTS-v2 | 17 idiomas | CPML (no-comercial) | zero-shot cloning | referencia |

**Recomendados para arrancar (B):**
1. Common Voice 14 (es) — CC0, masivo, base gratuita.
2. M-AILABS es_ES — 108h PD, F/M, voice pack ES.
3. Google LA-Spanish — dialectos ES multi-spk (CC BY-SA).
4. Multilingual LibriSpeech (es/fr/de/pt) — CC BY 4.0.
5. CSS10 es — CC0 single-spk, clonación de personalidad limpia.
6. Piper voices es_ES — VITS CC0 listos para finetune/clonar.
7. EMOVOME — emoción en ES (CC BY 4.0).
8. Emilia (YODAS CC BY) — escala masiva multilingüe.

Nota: Emilia/RAVDESS/Expresso son NC (no comercial) → solo experimentación
local; el micelio filtra su difusión si hay fines comerciales.

## 11. Estado de despliegue del micelio (2026-08-27)

### 11.1 Lo verificado en vivo ✅
- **Voice pack 1.58-bit REAL**: entrenado en GPU local (Apple M1, Metal/MPS),
  inferencia produce WAV 24 kHz mono válido (RMS activo). `voice_bridge`
  prioriza el pack 1.58-bit antes que piper; `/api/voice/synthesize` sirve el
  WAV cuantizado (HTTP 200, ~1.65 s).
- **Micelio de CONOCIMIENTO 1.58-bit GENERAL** (`app/core/knowledge_mycelium.py`):
  cubre voz + LLM + agentes + personalidades + cerebros, diferenciados por
  `kind`. El LLM participa vía `register_llm_delta()` cableado en
  `mesh_network.collect_federated_delta` (cada delta federado ternario del LLM
  se anuncia al micelio). Endpoints: `GET /api/knowledge-mycelium/status`,
  `POST /api/knowledge-mycelium/push` (difusión P2P entre neuronas).
- **Offline-first / soberano**: los packs se registran y anuncian localmente
  sin depender de servicios externos (diseño de privacidad del OS).

### 11.2 Bloqueo conocido: tabla `astraura_voice_mesh` en Supabase
La tabla del Neural Tissue **NO existe aún** en el proyecto Supabase del OS
(verificado: `GET /rest/v1/astraura_voice_mesh` → 404 PGRST205). Por eso los
`push_state` devolvían HTTP 200 pero eran no-op (la tabla no existía). El
descubrimiento cruzado EN LA NUBE requiere crear la tabla.

**Cómo crearla** (una vez, con service_role o en el dashboard):
- Script listo: `data/voice_mycelium/create_mesh_table.py` (intenta vía
  `/rest/v1/sql`; si el proyecto lo tiene deshabilitado, imprime el SQL para
  pegar en el SQL Editor de Supabase).
- O pegar este SQL en Supabase → SQL Editor → Run:

```sql
CREATE TABLE IF NOT EXISTS public.astraura_voice_mesh (
    id          text PRIMARY KEY,
    kind        text NOT NULL DEFAULT 'nt',
    node_id     text,
    speaker     text,
    version     int,
    mos         real,
    mb          real,
    hash        text,
    b64         text,
    meta        jsonb,
    updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS astraura_voice_mesh_kind_idx ON public.astraura_voice_mesh (kind);
ALTER TABLE public.astraura_voice_mesh ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS astraura_voice_mesh_anon_read ON public.astraura_voice_mesh;
CREATE POLICY astraura_voice_mesh_anon_read ON public.astraura_voice_mesh
    FOR SELECT TO anon, authenticated USING (true);
```

Una vez creada, el micelio se descubre automáticamente entre nodos en la nube
(`_pull_rows` lee todas las filas con service_role; `pull_knowledge_packs`
filtra por `kind`).

### 11.3 Difusión P2P (sin Supabase)
Mientras la tabla no exista, las neuronas se descubren vía
`POST /api/knowledge-mycelium/push` (cada neurona empuja su estado de micelio a
las demás por HTTP). El `mesh_network` ya gestiona nodos y heartbeats; el
micelio de conocimiento reusa ese canal para la señalización ligera.

