# Poner Astraura en línea gratis (sin tarjeta)

## Opción A — Hugging Face Spaces (recomendada: 2 vCPU, 16 GB RAM, gratis)
1. Crea una cuenta en https://huggingface.co (gratis, sin tarjeta).
2. New Space → nombre `astraura-nube` → **SDK: Docker** → Public.
3. En el Space: Settings → **Variables and secrets** → añade SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY y las claves de IA que quieras.
4. Sube el código:
   ```
   cd ~/Documents/"IA 1.58 bit"
   cp deploy/nube/Dockerfile.hf Dockerfile
   cp deploy/nube/README-Space.md README.md      # la cabecera YAML es obligatoria
   git remote add space https://huggingface.co/spaces/<tu-usuario>/astraura-nube
   git push space HEAD:main
   ```
   (o Settings → «Link a GitHub repo» y se despliega solo en cada push).
5. La URL queda `https://<tu-usuario>-astraura-nube.hf.space`.

## Opción B — Render (gratis, se duerme a los 15 min)
New → Blueprint → conecta `StarSeedSystem/astraura` → usa `deploy/nube/render.yaml`.

## Enlazarlo con el OS
En Vercel (proyecto starseed-os) → Settings → Environment Variables:
`ASTRAURA_CLOUD_URL = https://<tu-usuario>-astraura-nube.hf.space`
El OS la prefiere sobre el túnel local y, si la nube no responde, sigue solo con
las fuentes gratuitas (NVIDIA NIM, OpenRouter…), sin errores para el usuario.
