# Dockerfile.trainer — Neurona GPU de entrenamiento 1.58-bit (Cloud Run)
# ===========================================================================
# Entrena voice packs 1.58-bit reales (VITS tiny + QAT + weight indexing) y los
# publica en el micelio de la malla (astraura_voice_mesh). Servicio SEPARADO del
# backend principal: corre bajo demanda en GPU, produce el pack, y lo deja en el
# bucket/Supabase para que todas las neuronas lo integren.
#
# Build remoto (Cloud Build): no requiere Docker local.
#   gcloud run deploy astraura-voice-trainer \
#     --source . --dockerfile backend/Dockerfile.trainer \
#     --gpu=1 --gpu-type=nvidia-l4 --region us-central1 \
#     --no-cpu-throttling --min-instances=0 --max-instances=1 \
#     --allow-unauthenticated --port 8080 \
#     --set-env-vars=VOICE_TRAINER_ENABLED=1,SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive \
    VOICE_TRAINER_ENABLED=1

WORKDIR /app

# Torch CUDA (vía index de CUDA para que baje la build GPU).
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu121

# Dependencias del backend que el trainer reusa (supabase_sync, voice_mycelium).
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt || true

COPY backend/ ./backend/

# Descarga best-effort de un dataset recomendado (CSS10 es_CC0) en build-time
# para acelerar el cold start. Si falla, el entrypoint usa --dataset local.
RUN python -m pip install --no-cache-dir huggingface_hub 2>/dev/null || true

EXPOSE 8080

# Por defecto: entrena un voice pack demo y queda como servicio (puede re-entrenar
# vía POST /api/voice/train-gpu). El bucle de auto-mejora del micelio dispara
# re-entrenos cuando hay nuevas muestras en la malla.
CMD ["python", "backend/app/core/train_gpu_entry.py", "--dataset", "css10_es", "--speaker", "Speaker-0", "--epochs", "3"]
