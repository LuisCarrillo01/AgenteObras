"""
Memoria de chat con Firestore — Equivalente a src/db/schema.ts

Este módulo maneja el almacenamiento del historial de conversación en Firestore.
Cada usuario tiene su propia sub-colección de mensajes organizada por timestamp.
La estructura en Firestore es: users/{user_id}/messages/{auto_id}
"""

from datetime import datetime, timezone
from db.firebase import db
import json


def initialize_database() -> None:
    """
    No-op para Firestore (las colecciones se crean automáticamente).
    Solo imprime un mensaje de confirmación.
    """
    print("[DB] Firebase connected. Using collections for storage.")


async def save_message(
    user_id: int,
    role: str,
    content: str | None = None,
    tool_calls: str | None = None,
    tool_call_id: str | None = None,
) -> None:
    """
    Guarda un mensaje en el historial de Firestore.

    Parámetros:
        user_id: ID de Telegram del usuario
        role: Rol del mensaje ('user', 'assistant', o 'tool')
        content: Contenido del mensaje (texto o resultado de herramienta)
        tool_calls: JSON string con las llamadas a herramientas (si aplica)
        tool_call_id: ID de la llamada a herramienta (para mensajes de tipo 'tool')
    """
    # Referencia a la sub-colección de mensajes del usuario
    messages_ref = db.collection("users").document(str(user_id)).collection("messages")
    messages_ref.add({
        "user_id": user_id,
        "role": role,
        "content": content,
        "tool_calls": tool_calls,
        "tool_call_id": tool_call_id,
        "timestamp": datetime.now(timezone.utc),
    })


async def get_history(user_id: int, limit: int = 20) -> list[dict]:
    """
    Obtiene los últimos N mensajes del historial de un usuario desde Firestore.
    Los mensajes se retornan en orden cronológico (del más viejo al más reciente).

    Parámetros:
        user_id: ID de Telegram del usuario
        limit: Cantidad máxima de mensajes a recuperar (por defecto 20)
    """
    messages_ref = db.collection("users").document(str(user_id)).collection("messages")

    # Consultar los últimos mensajes ordenados por fecha descendente
    query = messages_ref.order_by("timestamp", direction="DESCENDING").limit(limit)
    docs = [doc.to_dict() for doc in query.stream()]

    # Invertir para que queden en orden cronológico (el LLM necesita esto)
    docs.reverse()

    # Convertir los documentos de Firestore al formato que espera el LLM
    result = []
    for row in docs:
        msg: dict = {"role": row["role"], "content": row.get("content")}
        if row.get("tool_calls"):
            msg["tool_calls"] = json.loads(row["tool_calls"])
        if row.get("tool_call_id"):
            msg["tool_call_id"] = row["tool_call_id"]
        result.append(msg)
    return result


def _draft_ref(user_id: int):
    """Retorna la referencia al documento del borrador actual del usuario."""
    return db.collection("users").document(str(user_id)).collection("state").document("report_draft")


def save_report_draft_sync(user_id: int, draft: dict) -> None:
    """Guarda o reemplaza el borrador actual del reporte del usuario."""
    _draft_ref(user_id).set({
        **draft,
        "updated_at": datetime.now(timezone.utc),
    })


async def save_report_draft(user_id: int, draft: dict) -> None:
    """Guarda o reemplaza el borrador actual del reporte del usuario."""
    save_report_draft_sync(user_id, draft)


def get_report_draft_sync(user_id: int) -> dict | None:
    """Obtiene el borrador actual del usuario si existe."""
    snapshot = _draft_ref(user_id).get()
    if not snapshot.exists:
        return None
    return snapshot.to_dict()


async def get_report_draft(user_id: int) -> dict | None:
    """Obtiene el borrador actual del usuario si existe."""
    return get_report_draft_sync(user_id)


def update_report_draft_sync(user_id: int, updates: dict) -> None:
    """Actualiza parcialmente el borrador actual del usuario."""
    _draft_ref(user_id).set({
        **updates,
        "updated_at": datetime.now(timezone.utc),
    }, merge=True)


async def update_report_draft(user_id: int, updates: dict) -> None:
    """Actualiza parcialmente el borrador actual del usuario."""
    update_report_draft_sync(user_id, updates)


def clear_report_draft_sync(user_id: int) -> None:
    """Elimina el borrador actual del usuario."""
    _draft_ref(user_id).delete()


async def clear_report_draft(user_id: int) -> None:
    """Elimina el borrador actual del usuario."""
    clear_report_draft_sync(user_id)
