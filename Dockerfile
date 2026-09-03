# =========================================================================
# ASTRAURA 1.58-BIT — backend en Cloud Run (edición económica, 2026-09-03)
# Dos etapas: los compiladores se quedan en la etapa de construcción, así la
# imagen final es slim y ocupa poco en Artifact Registry (lo único que cobra
# de verdad si se acumulan versiones). Sin modelos dentro: los pesos viven en
# cada neurona; la nube es orquestación, estado y puente con Supabase.
# Escala a CERO: con min-instances=0 no se paga por estar encendida.
# Los secretos llegan por variables de entorno del servicio, nunca en la imagen.
# =========================================================================
FROM python:3.11-slim AS build
ENV PIP_NO_CACHE_DIR=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential gcc g++ libxml2-dev libxslt-dev libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /w
COPY backend/requirements.txt .
RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --upgrade pip \
 && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    ASTRAURA_MODE=nube \
    PORT=8080
RUN apt-get update && apt-get install -y --no-install-recommends \
      libxml2 libxslt1.1 libjpeg62-turbo curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 astraura
COPY --from=build /opt/venv /opt/venv
WORKDIR /app
COPY --chown=astraura backend ./backend
# `backend/app/core/config.py` crea estas carpetas al importarse (rutas fijas
# relativas al repo). En Cloud Run el contenedor corre como usuario sin
# privilegios, así que se crean aquí y se le dan al usuario: sin esto el
# arranque muere con «PermissionError: /app/data». Van vacías: los datos de
# verdad viven en Supabase y en cada neurona.
RUN mkdir -p /app/data/vector_store /app/data/knowledge_graph /app/data/uploads \
             /app/backend/models \
 && chown -R astraura:astraura /app
USER astraura
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
