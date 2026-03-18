# Analisis del proyecto OpenGravity

## Que hace este proyecto

OpenGravity es un agente de IA que funciona a traves de Telegram y esta orientado a tecnicos de obra. Su objetivo principal es recibir mensajes de texto o audio, interpretar lo que el tecnico reporta y, cuando corresponde, registrar reportes de trabajo en una base de datos externa.

En la practica, el sistema hace estas cosas:

- recibe mensajes desde un bot de Telegram;
- valida si el usuario esta permitido por whitelist;
- verifica la identidad del tecnico usando su numero de telefono y PostgreSQL;
- transcribe audios a texto con Groq Whisper;
- envia el contexto y el historial a un modelo LLM;
- permite que el modelo use herramientas para consultar datos o guardar reportes;
- guarda el historial conversacional en Firebase Firestore.

## Stack tecnologico

- `TypeScript` + `Node.js`
- `grammy` para el bot de Telegram
- `groq-sdk` para chat y transcripcion de audio
- `firebase-admin` para memoria conversacional en Firestore
- `pg` para integracion con PostgreSQL
- `dotenv` para configuracion por variables de entorno

## Flujo general del sistema

El punto de entrada es `src/index.ts`.

Al iniciar, la aplicacion:

1. carga las variables de entorno;
2. inicializa Firestore para guardar historial;
3. inicializa PostgreSQL para identidad y reportes tecnicos;
4. registra las herramientas disponibles para el agente;
5. levanta el bot de Telegram en modo polling.

Luego, cuando llega un mensaje:

1. pasa por una whitelist de IDs de Telegram;
2. si PostgreSQL esta activo, se verifica si el usuario esta vinculado a un tecnico autorizado;
3. si no esta autorizado, se le pide compartir su numero de telefono;
4. si envia texto, el texto va directo al agente;
5. si envia audio, primero se transcribe y luego se envia al agente;
6. el agente consulta historial, llama al LLM y, si hace falta, ejecuta herramientas;
7. la respuesta final vuelve al usuario en Telegram.

## Modulos principales

### `src/index.ts`

Coordina el arranque completo del sistema.

### `src/bot/telegram.ts`

Contiene la logica del bot:

- crea la instancia del bot;
- habilita descarga de archivos de Telegram;
- procesa contacto compartido para vincular telefono;
- atiende mensajes de texto;
- atiende mensajes de voz y audio.

### `src/bot/middlewares/whitelist.ts`

Bloquea silenciosamente cualquier usuario cuyo `telegram_id` no este en `TELEGRAM_ALLOWED_USER_IDS`.

### `src/bot/middlewares/identity.ts`

Controla el acceso funcional al agente:

- si no hay PostgreSQL, deja pasar todo (modo local o desarrollo);
- si el usuario ya esta autorizado, deja pasar;
- si no lo esta, crea o actualiza su registro y le pide compartir telefono.

### `src/agent/loop.ts`

Es el corazon del agente. Hace un bucle de hasta 5 iteraciones donde:

- guarda el mensaje del usuario;
- recupera historial reciente desde Firestore;
- construye el prompt del sistema con el `telegram_id` del tecnico;
- llama al modelo;
- detecta si el modelo quiere usar herramientas;
- ejecuta herramientas y reinyecta resultados al modelo;
- devuelve la respuesta final al usuario.

El prompt esta preparado para que el agente trabaje en espanol y use directamente el `telegram_id` actual al registrar reportes.

### `src/llm/client.ts`

Encapsula la conexion con el modelo:

- proveedor principal: Groq con `llama-3.3-70b-versatile`;
- fallback opcional: OpenRouter si Groq falla y existe API key;
- transcripcion de audio: `whisper-large-v3`.

### `src/db/firebase.ts` y `src/db/schema.ts`

Se usan como memoria conversacional:

- cada usuario tiene una coleccion de mensajes;
- se guardan mensajes de usuario, asistente y herramientas;
- el historial se lee en orden cronologico para alimentar al LLM.

### `src/db/postgres.ts`

Maneja la integracion con PostgreSQL. Tiene dos roles principales:

- identidad de usuarios de Telegram contra tecnicos reales;
- soporte de operaciones para reportes tecnicos y consultas del sistema.

Funciones importantes:

- `initializePostgres`: abre la conexion;
- `findTelegramUser`: busca usuario por `telegram_id`;
- `upsertTelegramUser`: crea o actualiza el usuario Telegram;
- `linkPhoneToTelegramUser`: vincula telefono y tecnico autorizado.

## Herramientas del agente

Las herramientas se registran en `src/tools/registry.ts` y el modelo puede invocarlas automaticamente.

### `get_current_time`

Devuelve fecha y hora actual.

### `check_technician`

Verifica si el usuario de Telegram esta registrado y autorizado como tecnico.

### `check_construction_status`

Busca una obra por nombre y devuelve:

- datos basicos de la obra;
- pendientes abiertos;
- ultimos reportes asociados.

### `create_tech_report`

Es la pieza clave del negocio. Registra un reporte tecnico en PostgreSQL y ademas:

- resuelve el tecnico a partir del `telegram_id`;
- ubica la obra por nombre aproximado;
- inserta el reporte original;
- inserta actividades realizadas;
- crea nuevos pendientes detectados;
- usa transaccion SQL para mantener consistencia.

## Modelo de datos inferido

Por el codigo y las consultas SQL, el proyecto parece apoyarse en estas tablas principales en PostgreSQL:

- `tecnicos`
- `tecnicos_telegram`
- `obras`
- `reportes`
- `actividades`
- `pendientes`

El archivo `DB_migration_fase5.sql` agrega la tabla `tecnicos_telegram`, que sirve como puente entre Telegram y los tecnicos del sistema.

## Variables de entorno importantes

En `src/config/env.ts` se observan estas variables clave:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `DB_PATH`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `POSTGRES_URL`

## En resumen

OpenGravity es un asistente de campo para tecnicos de obra que usa Telegram como interfaz, IA para entender mensajes y dos almacenamientos distintos:

- `Firestore` para memoria conversacional;
- `PostgreSQL` para identidad, obras, reportes, actividades y pendientes.

El valor principal del proyecto esta en convertir mensajes naturales o audios de un tecnico en reportes estructurados dentro del sistema de obras.

## Observaciones utiles

- `DB.sql` esta vacio en el estado actual del proyecto, asi que el esquema principal no esta documentado ahi.
- Hay archivos sensibles presentes como `.env` y `service-account.json`; conviene no versionarlos en un repositorio publico.
- El `package.json` menciona SQLite en la descripcion, pero el codigo actual usa Firestore para historial y PostgreSQL para datos operativos.
