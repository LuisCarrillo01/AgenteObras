"""
Herramienta: get_current_time — Equivalente a src/tools/get_current_time.ts

Retorna la fecha y hora actual del servidor. El agente la usa cuando el
usuario pregunta por la hora o la fecha.
"""

from datetime import datetime


# Definición JSON-schema de la herramienta (se envía al LLM)
TOOL_DEFINITION = {
    "name": "get_current_time",
    "description": "Returns the current local date and time. Use this when the user asks for the time or date.",
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}


def handler(_args: dict | None = None) -> dict:
    """Retorna la fecha y hora actual en múltiples formatos."""
    now = datetime.now()
    return {
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "timezoneOffset": now.utcoffset().total_seconds() // 60 if now.utcoffset() else 0,
        "iso": now.isoformat(),
    }
