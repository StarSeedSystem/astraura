import os
import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    # Cloud Run / contenedores inyectan PORT; local usa settings.port.
    port = int(os.environ.get("PORT", settings.port))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
