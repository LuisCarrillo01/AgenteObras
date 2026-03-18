"""
Transcripción de audio con Groq Whisper — Equivalente a transcribeAudio de src/llm/client.ts

Usa el modelo whisper-large-v3 de Groq para convertir archivos de audio
(como notas de voz de Telegram) en texto.
"""

from groq import Groq
from config import settings

# Inicializar el cliente de Groq para transcripción
_groq = Groq(api_key=settings.GROQ_API_KEY)


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe un archivo de audio usando el modelo whisper-large-v3 de Groq.

    Parámetros:
        file_path: Ruta al archivo de audio (generalmente .ogg de Telegram)

    Retorna:
        El texto transcrito del audio.
    """
    try:
        with open(file_path, "rb") as f:
            transcription = _groq.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3",
                response_format="text",
            )
        return str(transcription)
    except Exception as e:
        print(f"[LLM] Transcription failed: {e}")
        raise
