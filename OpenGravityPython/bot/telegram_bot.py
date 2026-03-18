"""
Bot de Telegram — Equivalente a src/bot/telegram.ts

Este módulo maneja toda la interacción con Telegram:
- Mensajes de texto: se procesan a través del bucle del agente
- Mensajes de voz/audio: se transcriben con Whisper y luego pasan al agente
- Contactos compartidos: se vincula el teléfono con la identidad del técnico

Usa python-telegram-bot v21+ (asíncrono).
"""

import os
import tempfile
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from telegram.ext import (
    ApplicationBuilder,
    MessageHandler,
    ContextTypes,
    filters,
)

from config import settings
from bot.middlewares import is_whitelisted, check_identity
from agent.loop import run_agent_loop
from llm.transcription import transcribe_audio
from db.identity import link_phone_to_telegram_user


# ── Manejador de contacto compartido ─────────────────────────────────────────

async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja cuando un usuario comparte su contacto — vincula su teléfono a Telegram."""
    user = update.effective_user
    contact = update.message.contact

    if not user:
        return

    # Verificar lista blanca
    if not is_whitelisted(user.id):
        return

    # Seguridad: solo permitir compartir el contacto PROPIO del usuario
    if contact.user_id != user.id:
        await update.message.reply_text("❌ Solo puedes compartir tu propio número de teléfono.")
        return

    try:
        # Vincular el teléfono con el registro de Telegram en PostgreSQL
        record = link_phone_to_telegram_user(user.id, contact.phone_number)

        if record.get("autorizado"):
            # El teléfono coincide con un técnico activo
            nombre = record.get("nombre", "")
            await update.message.reply_text(
                f"✅ *¡Bienvenido, {nombre}\\!*\n\n"
                "Tu identidad ha sido verificada correctamente\\. Ya puedes registrar reportes de obra\\.",
                parse_mode="MarkdownV2",
                reply_markup=ReplyKeyboardRemove(),
            )
        else:
            # El teléfono no está registrado como técnico
            phone = contact.phone_number
            await update.message.reply_text(
                f"⚠️ Tu número *{phone}* no está registrado en el sistema\\.\n\n"
                "Contacta al encargado para que te den de alta\\.",
                parse_mode="MarkdownV2",
                reply_markup=ReplyKeyboardRemove(),
            )
    except Exception as e:
        print(f"[Bot] Error linking phone: {e}")
        await update.message.reply_text("❌ Ocurrió un error al verificar tu identidad. Intenta de nuevo.")


# ── Manejador de mensajes de texto ───────────────────────────────────────────

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja mensajes de texto — los pasa por el bucle del agente."""
    user = update.effective_user
    if not user:
        return

    # 1. Verificar lista blanca
    if not is_whitelisted(user.id):
        print(f"[Whitelist] Ignored message from unauthorized user: {user.id} (@{user.username or 'unknown'})")
        return

    # 2. Verificar identidad (¿tiene teléfono vinculado y autorizado?)
    identity = await check_identity(
        user.id, user.first_name, user.last_name, user.username
    )

    if not identity["authorized"]:
        # El usuario no está autorizado — pedirle que comparta su número
        keyboard = ReplyKeyboardMarkup(
            [[KeyboardButton("📱 Compartir mi número", request_contact=True)]],
            one_time_keyboard=True,
            resize_keyboard=True,
        )
        nombre = user.first_name or "usuario"
        await update.message.reply_text(
            f"👋 Hola *{nombre}*\\. Para acceder al sistema de reportes necesito verificar tu identidad\\.\n\n"
            "Por favor comparte tu número de teléfono usando el botón de abajo\\.",
            parse_mode="MarkdownV2",
            reply_markup=keyboard,
        )
        return

    # 3. Ejecutar el bucle del agente con el texto del usuario
    text = update.message.text or ""
    try:
        # Mostrar indicador de "escribiendo..." en Telegram
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        reply = await run_agent_loop(user.id, text)

        if reply:
            await update.message.reply_text(reply)
        else:
            await update.message.reply_text(
                "_El agente no generó ninguna respuesta._", parse_mode="Markdown"
            )
    except Exception as e:
        print(f"[Bot] Error handling message: {e}")
        await update.message.reply_text(f"❌ Ocurrió un error en el agente:\n\n{e}")


# ── Manejador de voz / audio ────────────────────────────────────────────────

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja mensajes de voz y audio — los transcribe y luego pasa el texto al agente."""
    user = update.effective_user
    if not user:
        return

    # 1. Verificar lista blanca
    if not is_whitelisted(user.id):
        return

    # 2. Verificar identidad
    identity = await check_identity(
        user.id, user.first_name, user.last_name, user.username
    )

    if not identity["authorized"]:
        # Pedir que comparta su número
        keyboard = ReplyKeyboardMarkup(
            [[KeyboardButton("📱 Compartir mi número", request_contact=True)]],
            one_time_keyboard=True,
            resize_keyboard=True,
        )
        await update.message.reply_text(
            "👋 Para usar el bot necesito verificar tu identidad\\.\n\nComparte tu número con el botón\\.",
            parse_mode="MarkdownV2",
            reply_markup=keyboard,
        )
        return

    # 3. Descargar, transcribir y procesar el audio
    try:
        # Mostrar indicador de "escribiendo..."
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        status_msg = await update.message.reply_text(
            "🎧 _Escuchando audio..._", parse_mode="Markdown"
        )

        # Descargar el archivo de voz/audio desde Telegram
        voice = update.message.voice or update.message.audio
        file = await context.bot.get_file(voice.file_id)

        # Guardar en un archivo temporal
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp_path = tmp.name

        await file.download_to_drive(tmp_path)

        # Transcribir el audio usando Groq Whisper
        transcribed_text = transcribe_audio(tmp_path)

        # Eliminar el archivo temporal
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        # Actualizar el mensaje de estado con la transcripción
        await context.bot.edit_message_text(
            chat_id=update.effective_chat.id,
            message_id=status_msg.message_id,
            text=f"🎤 *Transcripción:*\n_{transcribed_text}_\n\n⏳ _Pensando..._",
            parse_mode="Markdown",
        )

        # Ejecutar el agente con el texto transcrito
        reply = await run_agent_loop(user.id, transcribed_text)

        if reply:
            await update.message.reply_text(reply)
        else:
            await update.message.reply_text(
                "_El agente no generó ninguna respuesta._", parse_mode="Markdown"
            )

    except Exception as e:
        print(f"[Bot] Error handling audio: {e}")
        await update.message.reply_text(f"❌ Ocurrió un error procesando el audio:\n\n{e}")


# ── Inicio del bot ──────────────────────────────────────────────────────────

def start_bot() -> None:
    """Construye la aplicación de Telegram y comienza a escuchar mensajes (polling)."""
    app = ApplicationBuilder().token(settings.TELEGRAM_BOT_TOKEN).build()

    # Manejador de contactos PRIMERO (antes del de texto, para capturar contactos compartidos)
    app.add_handler(MessageHandler(filters.CONTACT, handle_contact))

    # Manejador de mensajes de texto
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # Manejador de mensajes de voz / audio
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice))

    print("[Bot] Starting polling...")
    app.run_polling(drop_pending_updates=True)
