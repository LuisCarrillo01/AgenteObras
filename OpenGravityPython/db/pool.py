"""
Pool de conexiones a PostgreSQL — Equivalente a src/db/postgres.ts (solo la parte del pool)

Este módulo administra un pool de conexiones reutilizables a PostgreSQL.
Se usa para todas las operaciones de la base de datos externa: técnicos,
obras, reportes, pendientes, etc. Los helpers de identidad están en db/identity.py.
"""

import psycopg2
from psycopg2 import pool as pg_pool
from config import settings

# Variable global que almacena el pool de conexiones (None si no se conectó)
_pool: pg_pool.ThreadedConnectionPool | None = None


def initialize_postgres() -> None:
    """
    Crea el pool de conexiones a PostgreSQL.
    Se llama una sola vez al iniciar la aplicación en main.py.
    Si no hay URL de Postgres configurada, se omite silenciosamente.
    """
    global _pool

    if not settings.POSTGRES_URL:
        print("[DB] POSTGRES_URL not found in environment. Tech reports will not be available.")
        return

    try:
        # Crear el pool con mínimo 1 y máximo 10 conexiones
        _pool = pg_pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.POSTGRES_URL,
        )
        # Verificación rápida de conectividad
        conn = _pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
            print("[DB] PostgreSQL connected successfully for Technical Reports.")
        finally:
            _pool.putconn(conn)
    except Exception as e:
        print(f"[DB] PostgreSQL Connection Error: {e}")
        _pool = None


def get_pool() -> pg_pool.ThreadedConnectionPool | None:
    """Retorna el pool de conexiones o None si no se inicializó."""
    return _pool
