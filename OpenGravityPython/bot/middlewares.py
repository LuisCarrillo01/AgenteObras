"""
Middlewares del bot — Equivalente a src/bot/middlewares/whitelist.ts + identity.ts

Contiene las verificaciones que se hacen antes de procesar cualquier mensaje:
1. is_whitelisted: ¿El usuario está en la lista de IDs permitidos?
2. check_identity: ¿El usuario tiene su teléfono vinculado y está autorizado?
"""

from config import settings
from db.pool import get_pool
from db.identity import upsert_telegram_user


def is_whitelisted(user_id: int) -> bool:
    """Verifica si el ID de Telegram del usuario está en la lista de permitidos."""
    return user_id in settings.TELEGRAM_ALLOWED_USER_IDS


async def check_identity(telegram_id: int, first_name: str, last_name: str | None, username: str | None) -> dict:
    """
    Verificación de identidad — equivalente a identityMiddleware.

    Retorna: {"authorized": bool, "record": dict | None, "needs_phone": bool}

    Si PostgreSQL no está conectado, retorna authorized=True (modo desarrollo).
    """
    pool = get_pool()
    if pool is None:
        # Sin postgres → omitir verificación de identidad (modo desarrollo local)
        return {"authorized": True, "record": None, "needs_phone": False}

    # Combinar nombre y apellido del usuario de Telegram
    nombre = " ".join(filter(None, [first_name, last_name])) or "Desconocido"

    # Insertar o actualizar el registro del usuario en la base de datos
    record = upsert_telegram_user(telegram_id, nombre, username)

    if record.get("autorizado"):
        return {"authorized": True, "record": record, "needs_phone": False}

    # El usuario no está autorizado — necesita compartir su teléfono
    return {"authorized": False, "record": record, "needs_phone": True}
