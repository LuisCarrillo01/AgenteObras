# Endpoints para Postman

## Variables recomendadas en Postman

- `BASE_URL` = URL base del backend, por ejemplo la que configures en despliegue.
- `TOKEN` = token obtenido en login.

## Health

### GET `{{BASE_URL}}/health`
- Auth: no
- Body: no aplica

Respuesta ejemplo:

```json
{
  "success": true,
  "message": "API operativa",
  "data": {
    "environment": "development"
  }
}
```

## Auth

### POST `{{BASE_URL}}/api/auth/login`
- Auth: no
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "email": "admin@empresa.com",
  "password": "tu-password"
}
```

Respuesta ejemplo:

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "jwt-token",
    "usuario": {
      "id": 1,
      "nombre": "Admin Sistema",
      "email": "admin@empresa.com",
      "rol": "admin",
      "activo": true
    }
  }
}
```

## Usuarios

### GET `{{BASE_URL}}/api/usuarios`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

### POST `{{BASE_URL}}/api/usuarios`
- Auth: no solo para bootstrap inicial cuando no existe ningun usuario; luego si, rol `admin`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}` (solo despues del primer usuario)
- Body:

```json
{
  "nombre": "Juan Perez",
  "email": "juan@empresa.com",
  "password": "Clave1234",
  "rol": "encargado"
}
```

### PUT `{{BASE_URL}}/api/usuarios/1`
- Auth: si, rol `admin`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}`
- Body:

```json
{
  "nombre": "Juan Perez Actualizado",
  "rol": "admin",
  "activo": true,
  "password": "NuevaClave123"
}
```

## Tecnicos

### GET `{{BASE_URL}}/api/tecnicos?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

Opcional:
- `includeInactive=true`

### POST `{{BASE_URL}}/api/tecnicos`
- Auth: si
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}`
- Body:

```json
{
  "nombre": "Carlos Perez",
  "telefono": "+593999999999"
}
```

### PUT `{{BASE_URL}}/api/tecnicos/1`
- Auth: si
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}`
- Body:

```json
{
  "nombre": "Carlos Perez Actualizado",
  "telefono": "+593999999998",
  "activo": true
}
```

### DELETE `{{BASE_URL}}/api/tecnicos/1`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`
- Body: no aplica

Nota: hace baja logica con `activo = false`.

## Obras

### GET `{{BASE_URL}}/api/obras?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

Opcional:
- `estado=activa`

### GET `{{BASE_URL}}/api/obras/activas`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

### POST `{{BASE_URL}}/api/obras`
- Auth: si
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}`
- Body:

```json
{
  "nombre": "Obra San Miguel",
  "direccion": "Av. Principal 123",
  "cliente": "Constructora ABC",
  "estado": "activa",
  "fecha_inicio": "2026-03-16"
}
```

### PUT `{{BASE_URL}}/api/obras/1`
- Auth: si
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{TOKEN}}`
- Body:

```json
{
  "nombre": "Obra San Miguel Fase 2",
  "direccion": "Av. Principal 123",
  "cliente": "Constructora ABC",
  "estado": "pausada",
  "fecha_inicio": "2026-03-16",
  "fecha_fin": null
}
```

### PUT `{{BASE_URL}}/api/obras/1/finalizar`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`
- Body: no aplica

### GET `{{BASE_URL}}/api/obras/1/resumen`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

Respuesta esperada:

```json
{
  "success": true,
  "message": "Resumen de obra obtenido correctamente",
  "data": {
    "obra": "San Miguel",
    "pendientes": 2,
    "ultima_actividad": "2026-03-16T00:00:00.000Z",
    "tecnicos": ["Carlos", "Luis"]
  }
}
```

## Reportes

### GET `{{BASE_URL}}/api/reportes?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

### GET `{{BASE_URL}}/api/reportes/obra/1?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

### GET `{{BASE_URL}}/api/reportes/tecnico/1?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

## Pendientes

### GET `{{BASE_URL}}/api/pendientes?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

Opcional:
- `estado=pendiente`
- `estado=resuelto`

### GET `{{BASE_URL}}/api/pendientes/obra/1?page=1&limit=10`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

### PUT `{{BASE_URL}}/api/pendientes/1/resolver`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`
- Body: no aplica

## Dashboard

### GET `{{BASE_URL}}/api/dashboard/resumen`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

Respuesta ejemplo:

```json
{
  "success": true,
  "message": "Resumen del dashboard obtenido correctamente",
  "data": {
    "obras_activas": 4,
    "pendientes": 7,
    "reportes_hoy": 12
  }
}
```

### GET `{{BASE_URL}}/api/dashboard/actividad-hoy`
- Auth: si
- Headers:
  - `Authorization: Bearer {{TOKEN}}`

## Flujo rapido de prueba

1. Ejecuta login y copia `data.token` a `{{TOKEN}}`.
2. Prueba `GET {{BASE_URL}}/api/dashboard/resumen`.
3. Crea un tecnico con `POST {{BASE_URL}}/api/tecnicos`.
4. Crea una obra con `POST {{BASE_URL}}/api/obras`.
5. Consulta reportes y pendientes.

## Bootstrap inicial

Si la tabla `usuarios` esta vacia, primero crea el usuario inicial con `POST {{BASE_URL}}/api/usuarios` sin token. La API guardara la password hasheada y forzara el rol del primer usuario a `admin`. Luego usa ese usuario en `POST {{BASE_URL}}/api/auth/login` para obtener `{{TOKEN}}`.
