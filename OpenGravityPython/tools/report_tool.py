"""
Herramienta: create_tech_report — Equivalente a src/tools/create_report.ts

Permite al agente registrar un reporte técnico completo en la base de datos.
El reporte incluye las actividades realizadas y los nuevos pendientes detectados.
Usa el telegram_id del técnico para identificarlo automáticamente.
"""

from db.pool import get_pool
from psycopg2.extras import RealDictCursor


# Definición JSON-schema de la herramienta (se envía al LLM para que sepa cómo usarla)
TOOL_DEFINITION = {
    "name": "create_tech_report",
    "description": "Registra en la base de datos un reporte completo de trabajo incluyendo las actividades realizadas y los nuevos pendientes. Usa el telegram_id del técnico para identificarlo.",
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


def handler(args: dict) -> dict:
    """
    Ejecuta la creación del reporte técnico.

    Flujo:
    1. Buscar al técnico por su telegram_id en tecnicos_telegram
    2. Buscar la obra por nombre (búsqueda parcial con ILIKE)
    3. Insertar el reporte en la tabla reportes
    4. Insertar cada actividad en la tabla actividades
    5. Insertar cada pendiente nuevo en la tabla pendientes
    """
    pool = get_pool()
    if pool is None:
        return {"error": "Base de datos externa (PostgreSQL) no conectada."}

    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Resolver el tecnico_id a partir del telegram_id
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
                conn.rollback()
                return {"error": "Técnico no encontrado o no autorizado. Comparte tu número primero."}

            tecnico_id = tecnico_row["tecnico_id"]
            nombre_tecnico = tecnico_row["nombre"]

            # 2. Obtener el ID de la obra por nombre parcial
            cur.execute(
                "SELECT id, nombre FROM obras WHERE nombre ILIKE %s LIMIT 1",
                (f"%{args['obra_nombre']}%",),
            )
            obra_row = cur.fetchone()
            if not obra_row:
                conn.rollback()
                return {"error": f"Obra no encontrada: {args['obra_nombre']}"}

            obra_id = obra_row["id"]
            nombre_obra = obra_row["nombre"]

            # 3. Insertar el reporte en la tabla reportes
            cur.execute(
                "INSERT INTO reportes (tecnico_id, obra_id, mensaje_original) VALUES (%s, %s, %s) RETURNING id",
                (tecnico_id, obra_id, args["mensaje_original"]),
            )
            reporte_id = cur.fetchone()["id"]

            # 4. Insertar cada actividad realizada
            for actividad in args["actividades"]:
                cur.execute(
                    "INSERT INTO actividades (reporte_id, descripcion) VALUES (%s, %s)",
                    (reporte_id, actividad),
                )

            # 5. Insertar los nuevos pendientes detectados (si los hay)
            nuevos_pendientes = args.get("nuevos_pendientes") or []
            for pendiente in nuevos_pendientes:
                cur.execute(
                    "INSERT INTO pendientes (obra_id, descripcion) VALUES (%s, %s)",
                    (obra_id, pendiente),
                )

            conn.commit()

            return {
                "exito": True,
                "mensaje": "Registro guardado correctamente.",
                "detalles": {
                    "obra": nombre_obra,
                    "tecnico": nombre_tecnico,
                    "actividades": args["actividades"],
                    "pendientes": nuevos_pendientes,
                },
            }

    except Exception as e:
        conn.rollback()
        return {"error": f"Transaction failed: {e}"}
    finally:
        pool.putconn(conn)
