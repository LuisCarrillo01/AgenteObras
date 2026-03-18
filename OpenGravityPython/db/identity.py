"""
Helpers de identidad de Telegram — Equivalente a las funciones de identidad de src/db/postgres.ts

Este módulo contiene las funciones para gestionar la tabla `tecnicos_telegram`
en PostgreSQL. Se usa para:
- Buscar si un usuario de Telegram ya está registrado
- Registrar/actualizar usuarios de Telegram (upsert)
- Vincular un número de teléfono con un usuario de Telegram y verificar si es técnico
"""

from __future__ import annotations
from typing import TypedDict
from db.pool import get_pool
from psycopg2.extras import RealDictCursor


class TelegramUserRecord(TypedDict, total=False):
    """Estructura de un registro de la tabla tecnicos_telegram."""
    id: int
    telegram_id: int
    tecnico_id: int | None
    telefono: str | None
    nombre: str | None
    username: str | None
    autorizado: bool


def find_telegram_user(telegram_id: int) -> TelegramUserRecord | None:
    """
    Busca un usuario de Telegram en la base de datos por su telegram_id.
    Retorna el registro completo o None si no existe.
    """
    pool = get_pool()
    if pool is None:
        return None
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM tecnicos_telegram WHERE telegram_id = %s",
                (telegram_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        pool.putconn(conn)


def upsert_telegram_user(
    telegram_id: int, nombre: str, username: str | None
) -> TelegramUserRecord:
    """
    Inserta o actualiza un usuario de Telegram en la base de datos.
    Si ya existe un registro con ese telegram_id, actualiza su nombre y username.
    Retorna el registro resultante.
    """
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO tecnicos_telegram (telegram_id, nombre, username)
                VALUES (%s, %s, %s)
                ON CONFLICT (telegram_id) DO UPDATE
                    SET nombre   = EXCLUDED.nombre,
                        username = EXCLUDED.username
                RETURNING *
                """,
                (telegram_id, nombre, username),
            )
            conn.commit()
            return dict(cur.fetchone())
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def link_phone_to_telegram_user(
    telegram_id: int, phone: str
) -> TelegramUserRecord:
    """
    Vincula un número de teléfono con un usuario de Telegram.

    El flujo es:
    1. Normalizar el teléfono (asegurar que empiece con +)
    2. Buscar en la tabla `tecnicos` si existe un técnico activo con ese teléfono
    3. Si lo encuentra, vincular el tecnico_id y autorizar al usuario
    4. Si no lo encuentra, guardar el teléfono pero dejar autorizado=false

    Retorna el registro actualizado de tecnicos_telegram.
    """
    pool = get_pool()
    conn = pool.getconn()

    # Normalizar teléfono: asegurar que empiece con +
    normalized_phone = phone if phone.startswith("+") else f"+{phone}"

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Buscar un técnico activo con ese número de teléfono
            cur.execute(
                "SELECT id, nombre FROM tecnicos WHERE telefono = %s AND activo = true",
                (normalized_phone,),
            )
            tecnico_row = cur.fetchone()
            tecnico_id = tecnico_row["id"] if tecnico_row else None
            autorizado = tecnico_id is not None

            # Actualizar el registro del usuario de Telegram con el teléfono y la autorización
            cur.execute(
                """
                UPDATE tecnicos_telegram
                SET telefono   = %s,
                    tecnico_id = %s,
                    autorizado = %s
                WHERE telegram_id = %s
                RETURNING *
                """,
                (normalized_phone, tecnico_id, autorizado, telegram_id),
            )
            conn.commit()
            return dict(cur.fetchone())
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
