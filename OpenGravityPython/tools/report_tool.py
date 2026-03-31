"""
Herramienta y helpers para preparar y guardar reportes técnicos.

El flujo es obligatorio en dos pasos:
1. El agente prepara un borrador con lo detectado.
2. El técnico confirma o modifica el borrador antes de guardar.
"""

from db.pool import get_pool
from db.schema import (
    clear_report_draft_sync,
    get_report_draft_sync,
    save_report_draft_sync,
    update_report_draft_sync,
)
from psycopg2.extras import RealDictCursor


TOOL_DEFINITION = {
    "name": "create_tech_report",
    "description": "Prepara un borrador de reporte técnico para validación obligatoria del técnico antes de guardar en la base de datos.",
    "parameters": {
        "type": "object",
        "properties": {
            "telegram_id": {
                "type": "number",
                "description": "El telegram_id del técnico que envía el reporte",
            },
            "obra_nombre": {
                "type": "string",
                "description": "Nombre o palabra clave de la obra (ej: 'San Miguel')",
            },
            "mensaje_original": {
                "type": "string",
                "description": "El texto completo y limpio de lo que el técnico comunicó",
            },
            "actividades": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de actividades realizadas extraídas del mensaje",
            },
            "nuevos_pendientes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de pendientes detectados en el mensaje",
            },
        },
        "required": ["telegram_id", "obra_nombre", "mensaje_original", "actividades"],
    },
}


def _clean_items(items: list[str] | None) -> list[str]:
    cleaned: list[str] = []
    for item in items or []:
        value = str(item).strip()
        if value:
            cleaned.append(value)
    return cleaned


def _resolve_context(args: dict) -> dict:
    pool = get_pool()
    if pool is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT tt.tecnico_id, t.nombre
                FROM tecnicos_telegram tt
                JOIN tecnicos t ON t.id = tt.tecnico_id
                WHERE tt.telegram_id = %s AND tt.autorizado = true
                """,
                (args["telegram_id"],),
            )
            tecnico_row = cur.fetchone()
            if not tecnico_row:
                return {"error": "Técnico no encontrado o no autorizado. Comparte tu número primero."}

            return {
                "tecnico_id": tecnico_row["tecnico_id"],
                "tecnico": tecnico_row["nombre"],
            }
    finally:
        pool.putconn(conn)


def _find_matching_obras(query: str) -> list[dict]:
    pool = get_pool()
    if pool is None:
        return []

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, nombre, foto_referencia_url
                FROM obras
                WHERE estado = 'activa' AND nombre ILIKE %s
                ORDER BY
                    CASE
                        WHEN LOWER(nombre) = LOWER(%s) THEN 0
                        WHEN nombre ILIKE %s THEN 1
                        ELSE 2
                    END,
                    nombre ASC
                LIMIT 5
                """,
                (f"%{query}%", query, f"{query}%"),
            )
            return [dict(row) for row in cur.fetchall()]
    finally:
        pool.putconn(conn)


def _build_confirmation_draft(context: dict, args: dict, obra: dict) -> dict:
    actividades = _clean_items(args.get("actividades"))
    pendientes = _clean_items(args.get("nuevos_pendientes"))
    draft = {
        "status": "pending_confirmation",
        "telegram_id": args["telegram_id"],
        "tecnico_id": context["tecnico_id"],
        "tecnico": context["tecnico"],
        "obra_id": obra["id"],
        "obra": obra["nombre"],
        "mensaje_original": str(args.get("mensaje_original", "")).strip(),
        "actividades": actividades,
        "pendientes": pendientes,
    }
    draft["preview"] = build_report_preview_text(draft)
    return draft


def build_report_preview_text(draft: dict) -> str:
    """Formatea un borrador para mostrarlo al técnico antes de confirmar."""
    actividades = draft.get("actividades") or []
    pendientes = draft.get("pendientes") or []

    lines = [
        "📋 Borrador de reporte",
        "",
        "🏗️ Obra",
        draft.get("obra", "Sin obra"),
        "",
        "👷 Técnico",
        draft.get("tecnico", "Sin técnico"),
        "",
        "✅ Actividades a guardar",
    ]

    if actividades:
        lines.extend([f"• {item}" for item in actividades])
    else:
        lines.append("• Ninguna")

    lines.extend([
        "",
        "⚠️ Pendientes a crear",
    ])
    if pendientes:
        lines.extend([f"• {item}" for item in pendientes])
    else:
        lines.append("• Ninguno")

    lines.extend([
        "",
        "Confirma o modifica el reporte con los botones.",
    ])
    return "\n".join(lines)


def handler(args: dict) -> dict:
    """Prepara un borrador de reporte pendiente de validación."""
    context = _resolve_context(args)
    if context.get("error"):
        return context

    actividades = _clean_items(args.get("actividades"))
    if not actividades:
        return {"error": "No se detectaron actividades válidas para preparar el reporte."}

    matches = _find_matching_obras(str(args.get("obra_nombre", "")).strip())
    if not matches:
        return {"error": f"Obra no encontrada: {args['obra_nombre']}"}

    if len(matches) > 1:
        selection_state = {
            "status": "pending_work_selection",
            "telegram_id": args["telegram_id"],
            "tecnico_id": context["tecnico_id"],
            "tecnico": context["tecnico"],
            "obra_query": str(args.get("obra_nombre", "")).strip(),
            "report_input": {
                "mensaje_original": str(args.get("mensaje_original", "")).strip(),
                "actividades": actividades,
                "pendientes": _clean_items(args.get("nuevos_pendientes")),
            },
            "obra_candidates": matches,
        }
        save_report_draft_sync(args["telegram_id"], selection_state)
        return {
            "exito": True,
            "requires_work_selection": True,
            "mensaje": "Se encontraron varias obras parecidas. Selecciona la correcta.",
            "candidates": matches,
        }

    draft = _build_confirmation_draft(context, args, matches[0])
    save_report_draft_sync(args["telegram_id"], draft)

    return {
        "exito": True,
        "requires_confirmation": True,
        "mensaje": "Borrador preparado. Falta validación del técnico antes de guardar.",
        "detalles": draft,
        "preview": draft["preview"],
        "preview_telegram": draft["preview"],
    }


def build_draft_from_selected_work(user_id: int, obra_id: int) -> dict:
    """Convierte una seleccion de obra en un borrador listo para confirmar."""
    state = get_report_draft_sync(user_id)
    if not state or state.get("status") != "pending_work_selection":
        return {"error": "No hay una selección de obra pendiente."}

    selected = None
    for obra in state.get("obra_candidates") or []:
        if obra.get("id") == obra_id:
            selected = obra
            break

    if not selected:
        return {"error": "La obra seleccionada ya no está disponible."}

    args = {
        "telegram_id": user_id,
        "obra_nombre": selected["nombre"],
        "mensaje_original": state.get("report_input", {}).get("mensaje_original", ""),
        "actividades": state.get("report_input", {}).get("actividades") or [],
        "nuevos_pendientes": state.get("report_input", {}).get("pendientes") or [],
    }

    context = {
        "tecnico_id": state.get("tecnico_id"),
        "tecnico": state.get("tecnico"),
    }
    draft = _build_confirmation_draft(context, args, selected)
    save_report_draft_sync(user_id, draft)

    return {
        "exito": True,
        "requires_confirmation": True,
        "mensaje": "Obra seleccionada. Revisa el borrador antes de guardar.",
        "detalles": draft,
        "preview": draft["preview"],
        "preview_telegram": draft["preview"],
    }


def mark_report_draft_for_edit(user_id: int) -> dict:
    """Marca el borrador actual como editable."""
    draft = get_report_draft_sync(user_id)
    if not draft:
        return {"error": "No hay un borrador pendiente para modificar."}

    update_report_draft_sync(user_id, {"status": "editing"})
    draft["status"] = "editing"
    return {
        "exito": True,
        "mensaje": "Envía el reporte corregido y volveré a mostrarte la vista previa antes de guardar.",
        "detalles": draft,
    }


def save_confirmed_report(user_id: int) -> dict:
    """Guarda en PostgreSQL el borrador confirmado por el técnico."""
    draft = get_report_draft_sync(user_id)
    if not draft:
        return {"error": "No hay un borrador pendiente para guardar."}

    if draft.get("status") not in {"pending_confirmation", "confirmed"}:
        return {"error": "El borrador actual primero debe revisarse y quedar listo para confirmación."}

    pool = get_pool()
    if pool is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO reportes (tecnico_id, obra_id, mensaje_original) VALUES (%s, %s, %s) RETURNING id",
                (draft["tecnico_id"], draft["obra_id"], draft["mensaje_original"]),
            )
            reporte_id = cur.fetchone()["id"]

            for actividad in draft.get("actividades") or []:
                cur.execute(
                    "INSERT INTO actividades (reporte_id, descripcion) VALUES (%s, %s)",
                    (reporte_id, actividad),
                )

            for pendiente in draft.get("pendientes") or []:
                cur.execute(
                    "INSERT INTO pendientes (obra_id, descripcion) VALUES (%s, %s)",
                    (draft["obra_id"], pendiente),
                )

            conn.commit()
    except Exception as e:
        conn.rollback()
        return {"error": f"Transaction failed: {e}"}
    finally:
        pool.putconn(conn)

    clear_report_draft_sync(user_id)

    return {
        "exito": True,
        "mensaje": "Reporte guardado correctamente.",
        "detalles": {
            "obra": draft["obra"],
            "tecnico": draft["tecnico"],
            "mensaje_original": draft["mensaje_original"],
            "actividades": draft.get("actividades") or [],
            "pendientes": draft.get("pendientes") or [],
        },
    }


def build_saved_report_text(result: dict) -> str:
    """Formatea la confirmación final con el detalle de lo guardado."""
    detalles = result.get("detalles") or {}
    actividades = detalles.get("actividades") or []
    pendientes = detalles.get("pendientes") or []

    lines = [
        "✅ Reporte guardado correctamente",
        "",
        "🏗️ Obra",
        detalles.get("obra", "Sin obra"),
        "",
        "👷 Técnico",
        detalles.get("tecnico", "Sin técnico"),
        "",
        "✅ Actividades guardadas",
    ]

    if actividades:
        lines.extend([f"• {item}" for item in actividades])
    else:
        lines.append("• Ninguna")

    lines.extend([
        "",
        "⚠️ Pendientes creados",
    ])
    if pendientes:
        lines.extend([f"• {item}" for item in pendientes])
    else:
        lines.append("• Ninguno")

    return "\n".join(lines)
