"""
Configuración del proyecto — Carga las variables de entorno desde .env

Todas las configuraciones sensibles (tokens, API keys, URLs) se leen
de las variables de entorno. Si alguna requerida falta, se lanza un error.
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Cargar el archivo .env desde la raíz del proyecto
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env')


def _require_env(name: str) -> str:
    """Obtiene una variable de entorno obligatoria. Lanza error si no existe."""
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


# ── Token del bot de Telegram ────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = _require_env("TELEGRAM_BOT_TOKEN")

# ── IDs de Telegram permitidos (lista blanca / whitelist) ────────────────────
TELEGRAM_ALLOWED_USER_IDS: list[int] = [
    int(uid.strip())
    for uid in _require_env("TELEGRAM_ALLOWED_USER_IDS").split(",")
    if uid.strip().isdigit()
]

# ── API Key de Groq (proveedor principal de LLM) ────────────────────────────
GROQ_API_KEY: str = _require_env("GROQ_API_KEY")

# ── Configuración de OpenRouter (proveedor de respaldo) ──────────────────────
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL: str = _require_env("OPENROUTER_MODEL") if OPENROUTER_API_KEY else ""

# ── Ruta al archivo JSON de credenciales de Firebase ─────────────────────────
GOOGLE_APPLICATION_CREDENTIALS: str = _require_env("GOOGLE_APPLICATION_CREDENTIALS")

# ── URL de conexión a PostgreSQL (para reportes técnicos) ────────────────────
POSTGRES_URL: str = _require_env("POSTGRES_URL")

# ── Configuración de MinIO (imagenes privadas de obras) ─────────────────────
MINIO_ENDPOINT: str = _require_env("MINIO_ENDPOINT")
MINIO_PORT: int = int(_require_env("MINIO_PORT"))
MINIO_USE_SSL: bool = _require_env("MINIO_USE_SSL").lower() == "true"
MINIO_ACCESS_KEY: str = _require_env("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY: str = _require_env("MINIO_SECRET_KEY")
MINIO_BUCKET_OBRAS: str = _require_env("MINIO_BUCKET_OBRAS")
