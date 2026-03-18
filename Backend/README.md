# Backend Reportes Tecnicos

API REST en `JavaScript` para administrar usuarios, tecnicos, obras y consultar reportes, pendientes y metricas del dashboard.

## Caracteristicas

- Autenticacion con JWT.
- Passwords con `bcryptjs`.
- ORM con Prisma sobre PostgreSQL.
- CORS configurable por variables de entorno.
- Endpoints documentados para Postman en `ENDPOINTS_POSTMAN.md`.
- No toca el agente ubicado en `OpenGravity`.

## Variables de entorno

Copia `.env.example` a `.env` y configura:

```env
APP_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:password@host:5432/base_de_datos?schema=public
JWT_SECRET=cambia-este-secreto-seguro
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://tudominio.com,https://admin.tudominio.com
API_BASE_URL=https://api.tudominio.com
```

## Instalacion

```bash
npm install
npm run prisma:generate
npm start
```

## Calidad y pruebas

```bash
npm run lint
npm run test
```

- `lint` usa ESLint para revisar `src/` y `tests/`.
- `test` usa Vitest + Supertest para validar endpoints base sin levantar el servidor.

## Prisma

El archivo `prisma/schema.prisma` ya esta alineado al esquema definido en `db.sql`.

Si tu base ya existe, normalmente solo necesitas generar el cliente:

```bash
npm run prisma:generate
```

Si quieres empujar el esquema a una base vacia:

```bash
npm run prisma:push
```

## Seguridad

- `POST /api/auth/login` es publico.
- `POST /api/usuarios` permite crear el primer usuario sin token solo cuando la tabla `usuarios` esta vacia; ese primer usuario se guarda con rol `admin`.
- El resto de endpoints requieren `Authorization: Bearer TOKEN`.
- `POST /api/usuarios` y `PUT /api/usuarios/:id` requieren rol `admin`.

## Notas importantes

- `DELETE /api/tecnicos/:id` hace borrado logico: actualiza `activo = false`.
- `PUT /api/obras/:id/finalizar` cambia el estado a `finalizada` y asigna `fecha_fin`.
- `PUT /api/pendientes/:id/resolver` cambia el estado a `resuelto` y asigna `resuelto_en`.
- `PUT /api/pendientes/:id/reabrir` devuelve un pendiente resuelto al estado `pendiente` y limpia `resuelto_en`.
- La documentacion Postman usa variables `{{BASE_URL}}` y `{{TOKEN}}`; no hay URLs hardcodeadas.

## Docker

El proyecto incluye `Dockerfile` multi-stage y `.dockerignore` para levantar la API en contenedor.

```bash
docker build -t backend-reportes-tecnicos .
docker run --env-file .env -p 3000:3000 backend-reportes-tecnicos
```
