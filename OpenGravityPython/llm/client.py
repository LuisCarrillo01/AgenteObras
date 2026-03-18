"""
Cliente LLM — Equivalente a src/llm/client.ts

Este módulo maneja las llamadas al modelo de lenguaje (LLM).
- Proveedor principal: Groq (llama-3.3-70b-versatile)
- Proveedor de respaldo: OpenRouter (vía HTTP) — se usa si Groq falla
"""

import json
import httpx
from groq import Groq
from config import settings

# Inicializar el cliente de Groq con la API key
_groq = Groq(api_key=settings.GROQ_API_KEY)

# Modelo por defecto a usar con Groq
DEFAULT_MODEL = "llama-3.3-70b-versatile"


def chat_completion(messages: list[dict], tools: list[dict] | None = None) -> dict:
    """
    Llama al LLM con los mensajes y las definiciones de herramientas opcionales.
    Retorna el mensaje del asistente como diccionario (puede incluir tool_calls).
    """
    try:
        # Construir las opciones de la petición
        options: dict = {
            "model": DEFAULT_MODEL,
            "messages": messages,
        }

        # Si hay herramientas disponibles, agregarlas a la petición
        if tools:
            options["tools"] = [
                {"type": "function", "function": t} for t in tools
            ]
            options["tool_choice"] = "auto"

        # Hacer la llamada al API de Groq
        response = _groq.chat.completions.create(**options)
        msg = response.choices[0].message

        # Normalizar la respuesta a un diccionario estándar
        result: dict = {
            "role": "assistant",
            "content": msg.content,
        }

        # Si el LLM quiere llamar herramientas, incluirlas en el resultado
        if msg.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]
        return result

    except Exception as e:
        print(f"[LLM] Primary provider (Groq) failed: {e}")

        # Si Groq falla y hay API key de OpenRouter, intentar con el respaldo
        if settings.OPENROUTER_API_KEY:
            print("[LLM] Falling back to OpenRouter...")
            return _openrouter_fallback(messages, tools)
        raise


def _openrouter_fallback(messages: list[dict], tools: list[dict] | None = None) -> dict:
    """
    Proveedor de respaldo usando OpenRouter vía HTTP directo.
    Se usa automáticamente cuando Groq falla y hay una API key configurada.
    """
    body: dict = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
    }

    # Agregar herramientas si están disponibles
    if tools:
        body["tools"] = [
            {"type": "function", "function": t} for t in tools
        ]

    # Hacer la petición HTTP a la API de OpenRouter
    resp = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://github.com/OpenGravity",
            "X-Title": "OpenGravity Agent",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=60,
    )

    if resp.status_code != 200:
        raise RuntimeError(
            f"OpenRouter fallback failed: {resp.status_code} - {resp.text}"
        )

    data = resp.json()
    return data["choices"][0]["message"]
