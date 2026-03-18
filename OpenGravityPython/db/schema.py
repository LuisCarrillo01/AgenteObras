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
