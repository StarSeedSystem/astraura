# =========================================================================
# ASTRAURA 1.58-BIT — BACKEND FASTAPI → GOOGLE CLOUD RUN
# Imagen ligera (python:3.11-slim) con el backend y sus dependencias.
# Las credenciales (Supabase/R2) se inyectan vía env vars en Cloud Run.
# El backend sincroniza su estado con Supabase al arrancar (pull_all).
# =========================================================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip && pip install -r backend/requirements.txt

# Copiar el backend completo
COPY backend/ ./backend/

# Puerto que inyecta Cloud Run (run_backend.py usa $PORT)
ENV PORT=8080
EXPOSE 8080

# Datos efímeros: se repueblan desde Supabase al arrancar
CMD ["python", "backend/run_backend.py"]
