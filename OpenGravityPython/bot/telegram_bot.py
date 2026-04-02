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
from telegram import (
    Update,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputFile,
)
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from config import settings
from bot.middlewares import is_whitelisted, check_identity
from agent.loop import run_agent_loop
from llm.transcription import transcribe_audio
from db.identity import link_phone_to_telegram_user
from db.schema import clear_report_draft, get_report_draft, update_report_draft
from tools.report_tool import (
    build_report_preview_text,
    build_saved_report_text,
    build_draft_from_selected_work,
    mark_report_draft_for_edit,
    save_confirmed_report,
)
from storage.minio_client import get_object_bytes


REPORT_CONFIRM_CALLBACK = "report_confirm"
REPORT_EDIT_CALLBACK = "report_edit"
REPORT_DISCARD_CALLBACK = "report_discard"
WORK_SELECT_CALLBACK = "work_select"


def _build_report_actions() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Confirmar", callback_data=REPORT_CONFIRM_CALLBACK)],
        [InlineKeyboardButton("✏️ Modificar", callback_data=REPORT_EDIT_CALLBACK)],
        [InlineKeyboardButton("🗑️ Descartar", callback_data=REPORT_DISCARD_CALLBACK)],
    ])


def _build_work_select_action(obra_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Seleccionar", callback_data=f"{WORK_SELECT_CALLBACK}:{obra_id}")],
    ])


def _compose_editing_input(draft: dict, new_text: str) -> str:
    actividades = draft.get("actividades") or []
    pendientes = draft.get("pendientes") or []
    return (
        "Estas actualizando un borrador de reporte ya existente. "
        "Reemplaza el borrador anterior con la nueva version corregida y vuelve a preparar la vista previa.\n\n"
        f"Borrador actual:\n"
        f"- Obra: {draft.get('obra', 'Sin obra')}\n"
        f"- Mensaje original: {draft.get('mensaje_original', 'Sin mensaje')}\n"
        f"- Actividades actuales: {', '.join(actividades) if actividades else 'Ninguna'}\n"
        f"- Pendientes actuales: {', '.join(pendientes) if pendientes else 'Ninguno'}\n\n"
        f"Correccion del tecnico:\n{new_text}"
    )


async def _reply_with_report_preview(update: Update, text: str) -> None:
    message = update.message
    if not message:
        return
    await message.reply_text(text)
    await message.reply_text("Selecciona una acción:", reply_markup=_build_report_actions())


async def _send_pending_draft_warning(update: Update, draft: dict) -> None:
    """Impide seguir chateando mientras el tecnico no confirme o modifique."""
    message = update.message
    if not message:
        return

    preview_text = draft.get("preview") or build_report_preview_text(draft)
    obra_name = draft.get("obra") or "Sin obra definida"
    warning_text = (
        "Tienes un borrador pendiente.\n\n"
        f"Obra actual: {obra_name}\n\n"
        "Primero elige una acción para continuar: confirmar, modificar o descartar."
    )
    await message.reply_text(warning_text)
    await message.reply_text(preview_text)
    await message.reply_text("Selecciona una acción:", reply_markup=_build_report_actions())


async def _send_work_selection_prompt(update: Update, draft: dict) -> None:
    """Muestra cada obra candidata en un mensaje separado con imagen y boton."""
    message = update.message
    chat = update.effective_chat
    if not message or not chat:
        return

    await message.reply_text("Selecciona la obra correcta para continuar.")

    for obra in draft.get("obra_candidates") or []:
        caption = obra.get("nombre") or "Obra sin nombre"
        reply_markup = _build_work_select_action(int(obra["id"]))
        photo_key = obra.get("foto_referencia_key")
        photo_name = obra.get("foto_referencia_nombre") or f"obra-{obra.get('id', 'sin-id')}.jpg"

        if photo_key:
            try:
                photo_bytes = get_object_bytes(photo_key)
                photo_bytes.name = photo_name
                await message.reply_photo(
                    photo=InputFile(photo_bytes, filename=photo_name),
                    caption=caption,
                    reply_markup=reply_markup,
                )
                continue
            except Exception as error:
                print(
                    f"[Bot] Error sending work image for obra={obra.get('id')} key={photo_key}: {error}"
                )

        await message.reply_text(caption, reply_markup=reply_markup)


def _extract_report_preview(agent_result: dict) -> str | None:
    """Busca el resultado del tool de reporte para renderizar la confirmación."""
    for tool_result in reversed(agent_result.get("tool_results") or []):
        if tool_result.get("name") != "create_tech_report":
            continue
        result = tool_result.get("result") or {}
        if result.get("requires_confirmation"):
            return result.get("preview_telegram") or result.get("preview")
    return None


def _extract_work_selection(agent_result: dict) -> list[dict] | None:
    """Busca si el tool pidio seleccion manual de obra."""
    for tool_result in reversed(agent_result.get("tool_results") or []):
        if tool_result.get("name") != "create_tech_report":
            continue
        result = tool_result.get("result") or {}
        if result.get("requires_work_selection"):
            return result.get("candidates") or []
    return None


async def _send_agent_reply(update: Update, user_id: int, agent_result: dict) -> None:
    message = update.message
    if not message:
        return

    work_candidates = _extract_work_selection(agent_result)
    if work_candidates is not None:
        await _send_work_selection_prompt(update, {"obra_candidates": work_candidates})
        return

    preview_text = _extract_report_preview(agent_result)
    if preview_text:
        await _reply_with_report_preview(update, preview_text)
        return

    draft = await get_report_draft(user_id)
    if draft and draft.get("status") == "pending_work_selection":
        await _send_work_selection_prompt(update, draft)
        return

    if draft and draft.get("status") == "pending_confirmation":
        preview_text = draft.get("preview") or build_report_preview_text(draft)
        await _reply_with_report_preview(update, preview_text)
        return

    reply = agent_result.get("reply") or ""

    if reply:
        await message.reply_text(reply)
    else:
        await message.reply_text(
            "_El agente no generó ninguna respuesta._", parse_mode="Markdown"
        )


async def handle_report_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja los botones para confirmar o modificar el borrador del reporte."""
    query = update.callback_query
    user = update.effective_user
    chat = update.effective_chat
    if not query or not user or not chat:
        return

    if not is_whitelisted(user.id):
        await query.answer("No autorizado", show_alert=True)
        return

    await query.answer()

    if query.data == REPORT_CONFIRM_CALLBACK:
        result = save_confirmed_report(user.id)
        if result.get("error"):
            await query.edit_message_reply_markup(reply_markup=None)
            await context.bot.send_message(chat_id=chat.id, text=f"❌ {result['error']}")
            return

        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(chat_id=chat.id, text=build_saved_report_text(result))
        return

    if query.data == REPORT_DISCARD_CALLBACK:
        await clear_report_draft(user.id)
        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(chat_id=chat.id, text="🗑️ Borrador descartado. Ya puedes enviar un nuevo reporte.")
        return

    if query.data and query.data.startswith(f"{WORK_SELECT_CALLBACK}:"):
        obra_id = int(query.data.split(":", 1)[1])
        result = build_draft_from_selected_work(user.id, obra_id)
        if result.get("error"):
            await query.answer(result["error"], show_alert=True)
            return

        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(chat_id=chat.id, text=result.get("preview_telegram") or result.get("preview") or "")
        await context.bot.send_message(chat_id=chat.id, text="Selecciona una acción:", reply_markup=_build_report_actions())
        return

    if query.data == REPORT_EDIT_CALLBACK:
        result = mark_report_draft_for_edit(user.id)
        if result.get("error"):
            await query.edit_message_reply_markup(reply_markup=None)
            await context.bot.send_message(chat_id=chat.id, text=f"❌ {result['error']}")
            return

        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(chat_id=chat.id, text=result["mensaje"])


# ── Manejador de contacto compartido ─────────────────────────────────────────

async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja cuando un usuario comparte su contacto — vincula su teléfono a Telegram."""
    user = update.effective_user
    message = update.message
    if not user or not message or not message.contact:
        return

    contact = message.contact

    del context

    # Verificar lista blanca
    if not is_whitelisted(user.id):
        return

    # Seguridad: solo permitir compartir el contacto PROPIO del usuario
    if contact.user_id != user.id:
        await message.reply_text("❌ Solo puedes compartir tu propio número de teléfono.")
        return

    try:
        # Vincular el teléfono con el registro de Telegram en PostgreSQL
        record = link_phone_to_telegram_user(user.id, contact.phone_number)

        if record.get("autorizado"):
            # El teléfono coincide con un técnico activo
            nombre = record.get("nombre", "")
            await message.reply_text(
                f"✅ *¡Bienvenido, {nombre}\\!*\n\n"
                "Tu identidad ha sido verificada correctamente\\. Ya puedes registrar reportes de obra\\.",
                parse_mode="MarkdownV2",
                reply_markup=ReplyKeyboardRemove(),
            )
        else:
            # El teléfono no está registrado como técnico
            phone = contact.phone_number
            await message.reply_text(
                f"⚠️ Tu número *{phone}* no está registrado en el sistema\\.\n\n"
                "Contacta al encargado para que te den de alta\\.",
                parse_mode="MarkdownV2",
                reply_markup=ReplyKeyboardRemove(),
            )
    except Exception as e:
        print(f"[Bot] Error linking phone: {e}")
        await message.reply_text("❌ Ocurrió un error al verificar tu identidad. Intenta de nuevo.")


# ── Manejador de mensajes de texto ───────────────────────────────────────────

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja mensajes de texto — los pasa por el bucle del agente."""
    user = update.effective_user
    message = update.message
    if not user or not message:
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
        await message.reply_text(
            f"👋 Hola *{nombre}*\\. Para acceder al sistema de reportes necesito verificar tu identidad\\.\n\n"
            "Por favor comparte tu número de teléfono usando el botón de abajo\\.",
            parse_mode="MarkdownV2",
            reply_markup=keyboard,
        )
        return

    # 3. Ejecutar el bucle del agente con el texto del usuario
    draft = await get_report_draft(user.id)
    if draft and draft.get("status") == "pending_work_selection":
        await _send_work_selection_prompt(update, draft)
        return

    if draft and draft.get("status") == "pending_confirmation":
        await _send_pending_draft_warning(update, draft)
        return

    text = message.text or ""
    if draft and draft.get("status") == "editing":
        text = _compose_editing_input(draft, text)
        await update_report_draft(user.id, {"status": "processing_edit"})

    try:
        # Mostrar indicador de "escribiendo..." en Telegram
        chat = update.effective_chat
        if not chat:
            return
        await context.bot.send_chat_action(chat_id=chat.id, action="typing")
        agent_result = await run_agent_loop(user.id, text)
        await _send_agent_reply(update, user.id, agent_result)
    except Exception as e:
        print(f"[Bot] Error handling message: {e}")
        await message.reply_text(f"❌ Ocurrió un error en el agente:\n\n{e}")


# ── Manejador de voz / audio ────────────────────────────────────────────────

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja mensajes de voz y audio — los transcribe y luego pasa el texto al agente."""
    user = update.effective_user
    message = update.message
    if not user or not message:
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
        await message.reply_text(
            "👋 Para usar el bot necesito verificar tu identidad\\.\n\nComparte tu número con el botón\\.",
            parse_mode="MarkdownV2",
            reply_markup=keyboard,
        )
        return

    draft = await get_report_draft(user.id)
    if draft and draft.get("status") == "pending_work_selection":
        await _send_work_selection_prompt(update, draft)
        return

    if draft and draft.get("status") == "pending_confirmation":
        await _send_pending_draft_warning(update, draft)
        return

    # 3. Descargar, transcribir y procesar el audio
    try:
        # Mostrar indicador de "escribiendo..."
        chat = update.effective_chat
        if not chat:
            return
        await context.bot.send_chat_action(chat_id=chat.id, action="typing")
        status_msg = await message.reply_text(
            "🎧 _Escuchando audio..._", parse_mode="Markdown"
        )

        # Descargar el archivo de voz/audio desde Telegram
        voice = message.voice or message.audio
        if not voice:
            await message.reply_text("❌ No se encontró un archivo de audio válido.")
            return
        file = await context.bot.get_file(voice.file_id)

        # Guardar en un archivo temporal
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp_path = tmp.name

        await file.download_to_drive(tmp_path)

        # Transcribir el audio usando Groq Whisper
        transcribed_text = transcribe_audio(tmp_path)

        agent_input = transcribed_text
        if draft and draft.get("status") == "editing":
            agent_input = _compose_editing_input(draft, transcribed_text)
            await update_report_draft(user.id, {"status": "processing_edit"})

        # Eliminar el archivo temporal
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        # Actualizar el mensaje de estado con la transcripción
        await context.bot.edit_message_text(
            chat_id=chat.id,
            message_id=status_msg.message_id,
            text=f"🎤 *Transcripción:*\n_{transcribed_text}_\n\n⏳ _Pensando..._",
            parse_mode="Markdown",
        )

        # Ejecutar el agente con el texto transcrito
        agent_result = await run_agent_loop(user.id, agent_input)
        await _send_agent_reply(update, user.id, agent_result)

    except Exception as e:
        print(f"[Bot] Error handling audio: {e}")
        await message.reply_text(f"❌ Ocurrió un error procesando el audio:\n\n{e}")


# ── Inicio del bot ──────────────────────────────────────────────────────────

def start_bot() -> None:
    """Construye la aplicación de Telegram y comienza a escuchar mensajes (polling)."""
    app = ApplicationBuilder().token(settings.TELEGRAM_BOT_TOKEN).build()

    # Manejador de contactos PRIMERO (antes del de texto, para capturar contactos compartidos)
    app.add_handler(MessageHandler(filters.CONTACT, handle_contact))

    # Manejador de botones para confirmar/modificar reportes
    app.add_handler(CallbackQueryHandler(handle_report_callback))

    # Manejador de mensajes de texto
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # Manejador de mensajes de voz / audio
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice))

    print("[Bot] Starting polling...")
    app.run_polling(drop_pending_updates=True)
