"""
Herramientas: check_technician y check_construction_status
Equivalente a src/tools/get_technical_info.ts

check_technician: Verifica si un usuario de Telegram es un técnico autorizado.
check_construction_status: Consulta el estado de una obra (pendientes y reportes recientes).
"""

from db.pool import get_pool
from psycopg2.extras import RealDictCursor


# ── check_technician ──────────────────────────────────────────────────────────
# Definición JSON-schema para que el LLM sepa cómo usar esta herramienta

CHECK_TECHNICIAN_DEF = {
    "name": "check_technician",
    "description": "Verifica si el usuario de Telegram está registrado como técnico autorizado en el sistema, usando su telegram_id.",
    "parameters": {
        "type": "object",
        "properties": {
            "telegram_id": {
                "type": "number",
                "description": "El ID numérico de Telegram del usuario (siempre disponible en el contexto del mensaje)",
            }
        },
        "required": ["telegram_id"],
    },
}


def check_technician_handler(args: dict) -> dict:
    """
    Verifica si un usuario de Telegram es técnico autorizado.
    Busca en tecnicos_telegram y hace JOIN con tecnicos para obtener los datos.
    """
    pool = get_pool()
    if pool is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Buscar al usuario de Telegram y sus datos de técnico (si tiene)
            cur.execute(
                """
                SELECT tt.telegram_id, tt.autorizado, tt.nombre, tt.telefono,
                       t.id as tecnico_id, t.nombre as nombre_tecnico
                FROM tecnicos_telegram tt
                LEFT JOIN tecnicos t ON t.id = tt.tecnico_id
                WHERE tt.telegram_id = %s
                """,
                (args["telegram_id"],),
            )
            row = cur.fetchone()

            if not row:
                return {"isRegistered": False, "message": "Usuario no encontrado en el sistema."}

            if not row["autorizado"]:
                return {"isRegistered": True, "autorizado": False, "message": "El usuario existe pero no está autorizado aún."}

            return {
                "isRegistered": True,
                "autorizado": True,
                "tecnico": {
                    "id": row["tecnico_id"],
                    "nombre": row["nombre_tecnico"],
                    "telefono": row["telefono"],
                },
            }
    except Exception as e:
        return {"error": f"Database error: {e}"}
    finally:
        pool.putconn(conn)


# ── check_construction_status ─────────────────────────────────────────────────
# Definición JSON-schema para consultar el estado de una obra

CHECK_CONSTRUCTION_DEF = {
    "name": "check_construction_status",
    "description": "Consulta el estado actual de una obra por palabras clave en su nombre. Devuelve la lista de pendientes abiertos y reportes recientes.",
    "parameters": {
        "type": "object",
        "properties": {
            "keyword": {
                "type": "string",
                "description": "Palabra clave o nombre de la obra (ej. 'San Miguel')",
            }
        },
        "required": ["keyword"],
    },
}


def check_construction_handler(args: dict) -> dict:
    """
    Consulta el estado de una obra: pendientes abiertos y últimos reportes.
    Busca la obra por nombre parcial (ILIKE) con la palabra clave proporcionada.
    """
    pool = get_pool()
    if pool is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Buscar la obra por nombre parcial
            cur.execute(
                "SELECT id, nombre, estado FROM obras WHERE nombre ILIKE %s LIMIT 1",
                (f"%{args['keyword']}%",),
            )
            obra_row = cur.fetchone()
            if not obra_row:
                return {"error": "Obra no encontrada coincidente con: " + args["keyword"]}

            obra_info = dict(obra_row)

            # Obtener los pendientes abiertos de la obra
            cur.execute(
                """
                SELECT descripcion, creado_en
                FROM pendientes
                WHERE obra_id = %s AND estado = 'pendiente'
                ORDER BY creado_en ASC
                """,
                (obra_info["id"],),
            )
            pendientes = [dict(r) for r in cur.fetchall()]

            # Obtener los últimos 5 reportes de la obra
            cur.execute(
                """
                SELECT t.nombre, r.mensaje_original, r.fecha
                FROM reportes r
                JOIN tecnicos t ON r.tecnico_id = t.id
                WHERE r.obra_id = %s
                ORDER BY r.fecha DESC
                LIMIT 5
                """,
                (obra_info["id"],),
            )
            reportes = [dict(r) for r in cur.fetchall()]

            return {
                "obra": obra_info,
                "pendientes_abiertos": pendientes,
                "ultimos_reportes": reportes,
            }
    except Exception as e:
        return {"error": f"Database error: {e}"}
    finally:
        pool.putconn(conn)
