"""
Inicialización de Firebase Firestore — Equivalente a src/db/firebase.ts

Este módulo crea la conexión con Firestore usando las credenciales del
archivo service-account.json. Exporta el objeto `db` que se usa en
todo el proyecto para leer/escribir el historial de chat del agente.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from config import settings

# Cargar las credenciales desde el archivo JSON de la cuenta de servicio
_cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)

# Inicializar la app de Firebase (solo se hace una vez)
firebase_admin.initialize_app(_cred)

# Crear el cliente de Firestore — se importa desde otros módulos como `db`
db = firestore.client()
print("[DB] Firebase Firestore initialized successfully.")
