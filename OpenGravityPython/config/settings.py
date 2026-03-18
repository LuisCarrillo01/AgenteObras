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
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openrouter/free")

# ── Ruta al archivo JSON de credenciales de Firebase ─────────────────────────
GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS", "./service-account.json"
)

# ── URL de conexión a PostgreSQL (para reportes técnicos) ────────────────────
POSTGRES_URL: str = os.getenv("POSTGRES_URL", "")
