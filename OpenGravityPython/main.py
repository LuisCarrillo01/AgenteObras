"""
OpenGravity — Punto de entrada del agente en Python
Equivalente a src/index.ts del proyecto original en TypeScript.
"""

import sys
import os

# Asegurar que la raíz del proyecto esté en el path de Python
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    print("[System] Starting OpenGravity...")

    # 1. Inicializar la base de datos de memoria (Firestore)
    #    Se usa para almacenar el historial de conversación del agente.
    from db.schema import initialize_database
    initialize_database()

    # 2. Inicializar la base de datos externa (PostgreSQL)
    #    Se usa para las tablas de técnicos, obras, reportes, etc.
    from db.pool import initialize_postgres
    initialize_postgres()

    # 3. Importar las herramientas para que se registren automáticamente
    #    Al importar el módulo, se ejecutan los print de registro.
    import tools.registry  # noqa: F401

    # 4. Iniciar el bot de Telegram (bloqueante — entra en loop de polling)
    from bot.telegram_bot import start_bot
    start_bot()

    print("[System] OpenGravity is now running and polling for messages.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[System] Fatal startup error: {e}", file=sys.stderr)
        sys.exit(1)
