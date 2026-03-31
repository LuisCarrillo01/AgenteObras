"""
Herramientas para consultar tecnicos y obras.

- check_technician: valida si el usuario de Telegram es un tecnico autorizado.
- list_constructions: lista obras activas o coincidencias por palabra clave.
- check_construction_status: consulta el estado de una obra, pero evita asumir una sola si hay ambiguedad.
"""

from db.pool import get_pool
from psycopg2.extras import RealDictCursor


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


LIST_CONSTRUCTIONS_DEF = {
    "name": "list_constructions",
    "description": "Lista las obras activas del sistema. Si se envia una palabra clave, devuelve las obras activas cuyo nombre coincida con esa palabra.",
    "parameters": {
        "type": "object",
        "properties": {
            "keyword": {
                "type": "string",
                "description": "Palabra opcional para filtrar obras por nombre (ej. 'Palmas')",
            }
        },
        "required": [],
    },
}


CHECK_CONSTRUCTION_DEF = {
    "name": "check_construction_status",
    "description": "Consulta el estado actual de una obra por palabras clave en su nombre. Si hay varias coincidencias, devuelve las obras candidatas para que no se asuma una incorrecta.",
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


def _get_pool_connection():
    pool = get_pool()
    if pool is None:
        return None, None
    conn = pool.getconn()
    return pool, conn


def _search_obras(cur, keyword: str | None = None, limit: int = 10) -> list[dict]:
    if keyword:
        normalized = keyword.strip()
        cur.execute(
            """
            SELECT id, nombre, estado, foto_referencia_url
            FROM obras
            WHERE estado = 'activa' AND nombre ILIKE %s
            ORDER BY
                CASE
                    WHEN LOWER(nombre) = LOWER(%s) THEN 0
                    WHEN nombre ILIKE %s THEN 1
                    ELSE 2
                END,
                nombre ASC
            LIMIT %s
            """,
            (f"%{normalized}%", normalized, f"{normalized}%", limit),
        )
    else:
        cur.execute(
            """
            SELECT id, nombre, estado, foto_referencia_url
            FROM obras
            WHERE estado = 'activa'
            ORDER BY nombre ASC
            LIMIT %s
            """,
            (limit,),
        )

    return [dict(row) for row in cur.fetchall()]


def check_technician_handler(args: dict) -> dict:
    """Verifica si un usuario de Telegram es tecnico autorizado."""
    pool, conn = _get_pool_connection()
    if pool is None or conn is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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


def list_constructions_handler(args: dict) -> dict:
    """Lista obras activas, opcionalmente filtradas por palabra clave."""
    pool, conn = _get_pool_connection()
    if pool is None or conn is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    keyword = str(args.get("keyword") or "").strip() or None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            obras = _search_obras(cur, keyword, 20)
            return {
                "keyword": keyword,
                "total": len(obras),
                "obras": obras,
            }
    except Exception as e:
        return {"error": f"Database error: {e}"}
    finally:
        pool.putconn(conn)


def check_construction_handler(args: dict) -> dict:
    """Consulta estado de una obra sin asumir una sola si hay ambiguedad."""
    pool, conn = _get_pool_connection()
    if pool is None or conn is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    keyword = str(args["keyword"]).strip()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            matches = _search_obras(cur, keyword, 5)
            if not matches:
                return {"error": "Obra no encontrada coincidente con: " + keyword}

            if len(matches) > 1:
                return {
                    "requires_selection": True,
                    "message": "Hay varias obras que coinciden con esa busqueda.",
                    "obras": matches,
                }

            obra_info = matches[0]

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
