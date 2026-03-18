# API para Frontend React

Este documento resume los endpoints del backend que debe consumir el frontend en React.

## Base URL

- Desarrollo local: `http://localhost:3000`
- Prefijo API: `/api`
- Base completa esperada: `http://localhost:3000/api`

## Autenticacion

- `POST /api/auth/login` es publico.
- `POST /api/usuarios` es publico solo si la tabla `usuarios` esta vacia para crear el primer usuario.
- El resto de endpoints requiere header `Authorization: Bearer <token>`.
- El token JWT se obtiene en el login y debe guardarse en el frontend para las siguientes peticiones.

Ejemplo de headers autenticados:

```http
Authorization: Bearer TU_JWT
Content-Type: application/json
```

## Formato general de respuestas

### Respuesta exitosa

```json
{
  "success": true,
  "message": "Mensaje descriptivo",
  "data": {}
}
```

### Respuesta con error controlado

```json
{
  "success": false,
  "message": "Mensaje de error",
  "details": null
}
```

### Error de validacion con Zod

```json
{
  "success": false,
  "message": "Datos invalidos",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "email": ["Invalid email"],
      "password": ["String must contain at least 6 character(s)"]
    }
  }
}
```

## Convenciones utiles para React

- Los listados paginados responden con `data.items` y `data.meta`.
- `meta.page`: pagina actual.
- `meta.limit`: cantidad pedida por pagina.
- `meta.total`: total de registros.
- En los `GET`, no se envia body.
- Los `PUT` requieren solo los campos a editar.
- Fechas vienen como `string` ISO desde la API.

---

## 1. Health

### GET `/health`

- Auth: no
- Uso en frontend: chequeo de estado del backend
- Query params: ninguno
- Body request: no aplica

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

---

## 2. Auth

### GET `/api/auth/bootstrap-status`

- Auth: no
- Uso en frontend: deteccion automatica para saber si debe mostrarse `login` o `setup`
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Estado de bootstrap obtenido correctamente",
  "data": {
    "hasUsers": false,
    "requiresSetup": true
  }
}
```

### POST `/api/auth/login`

- Auth: no
- Uso en frontend: pantalla de login

Body request:

```json
{
  "email": "admin@empresa.com",
  "password": "Clave123456"
}
```

Validaciones:

- `email`: obligatorio, formato email
- `password`: obligatoria

Respuesta exitosa:

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

Errores comunes:

- `401`: credenciales invalidas
- `400`: datos invalidos

Ejemplo error 401:

```json
{
  "success": false,
  "message": "Credenciales invalidas",
  "details": null
}
```

---

## 3. Usuarios

### Estructura de usuario en respuestas

```json
{
  "id": 1,
  "nombre": "Admin Sistema",
  "email": "admin@empresa.com",
  "rol": "admin",
  "activo": true,
  "creadoEn": "2026-03-17T14:00:00.000Z"
}
```

### GET `/api/usuarios`

- Auth: si
- Rol: cualquier usuario autenticado
- Uso en frontend: tabla/lista de usuarios
- Query params: ninguno
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Usuarios obtenidos correctamente",
  "data": [
    {
      "id": 1,
      "nombre": "Admin Sistema",
      "email": "admin@empresa.com",
      "rol": "admin",
      "activo": true,
      "creadoEn": "2026-03-17T14:00:00.000Z"
    },
    {
      "id": 2,
      "nombre": "Supervisor",
      "email": "supervisor@empresa.com",
      "rol": "encargado",
      "activo": true,
      "creadoEn": "2026-03-18T09:30:00.000Z"
    }
  ]
}
```

### POST `/api/usuarios`

- Auth: no solo para bootstrap inicial cuando no existe ningun usuario; luego si
- Rol requerido despues del primer usuario: `admin`
- Uso en frontend: formulario de crear usuario

Body request:

```json
{
  "nombre": "Juan Perez",
  "email": "juan@empresa.com",
  "password": "Clave1234",
  "rol": "encargado"
}
```

Validaciones:

- `nombre`: obligatorio, minimo 2 caracteres
- `email`: obligatorio, formato email
- `password`: obligatoria, minimo 6 caracteres
- `rol`: opcional, valores permitidos `admin` o `encargado`

Notas importantes:

- Si la tabla `usuarios` esta vacia, este endpoint crea el primer usuario sin token.
- El primer usuario se fuerza como `admin` aunque en el body se envie otro rol.
- La password se guarda hasheada en backend.

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Usuario creado correctamente",
  "data": {
    "id": 3,
    "nombre": "Juan Perez",
    "email": "juan@empresa.com",
    "rol": "encargado",
    "activo": true,
    "creadoEn": "2026-03-18T10:00:00.000Z"
  }
}
```

Errores comunes:

- `400`: ya existe un usuario con ese email
- `400`: datos invalidos
- `401`: token no proporcionado o invalido cuando ya existen usuarios
- `403`: usuario autenticado sin rol `admin`

### PUT `/api/usuarios/:id`

- Auth: si
- Rol requerido: `admin`
- Uso en frontend: editar usuario

Params:

- `id`: id numerico del usuario

Body request ejemplo:

```json
{
  "nombre": "Juan Perez Actualizado",
  "email": "juan.actualizado@empresa.com",
  "rol": "admin",
  "activo": true,
  "password": "NuevaClave123"
}
```

Todos los campos son opcionales, pero debe enviarse al menos uno.

Validaciones:

- `nombre`: minimo 2 caracteres
- `email`: formato email
- `password`: minimo 6 caracteres
- `rol`: `admin` o `encargado`
- `activo`: booleano

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Usuario actualizado correctamente",
  "data": {
    "id": 3,
    "nombre": "Juan Perez Actualizado",
    "email": "juan.actualizado@empresa.com",
    "rol": "admin",
    "activo": true,
    "creadoEn": "2026-03-18T10:00:00.000Z"
  }
}
```

---

## 4. Tecnicos

### Estructura de tecnico en respuestas

```json
{
  "id": 1,
  "nombre": "Carlos Perez",
  "telefono": "+593999999999",
  "activo": true,
  "creadoEn": "2026-03-18T11:00:00.000Z"
}
```

### GET `/api/tecnicos`

- Auth: si
- Uso en frontend: listado de tecnicos

Query params opcionales:

- `page`: numero de pagina. Default `1`
- `limit`: cantidad por pagina. Default `10`, maximo `100`
- `includeInactive`: `true` para incluir inactivos; si no se envia, solo lista activos

Ejemplo:

`/api/tecnicos?page=1&limit=10&includeInactive=true`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Tecnicos obtenidos correctamente",
  "data": {
    "items": [
      {
        "id": 1,
        "nombre": "Carlos Perez",
        "telefono": "+593999999999",
        "activo": true,
        "creadoEn": "2026-03-18T11:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

### POST `/api/tecnicos`

- Auth: si
- Uso en frontend: crear tecnico

Body request:

```json
{
  "nombre": "Carlos Perez",
  "telefono": "+593999999999"
}
```

Validaciones:

- `nombre`: obligatorio, minimo 2 caracteres
- `telefono`: obligatorio, minimo 7 caracteres

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Tecnico creado correctamente",
  "data": {
    "id": 1,
    "nombre": "Carlos Perez",
    "telefono": "+593999999999",
    "activo": true,
    "creadoEn": "2026-03-18T11:00:00.000Z"
  }
}
```

### PUT `/api/tecnicos/:id`

- Auth: si
- Uso en frontend: editar tecnico

Body request ejemplo:

```json
{
  "nombre": "Carlos Perez Actualizado",
  "telefono": "+593999999998",
  "activo": true
}
```

Todos los campos son opcionales, pero debe enviarse al menos uno.

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Tecnico actualizado correctamente",
  "data": {
    "id": 1,
    "nombre": "Carlos Perez Actualizado",
    "telefono": "+593999999998",
    "activo": true,
    "creadoEn": "2026-03-18T11:00:00.000Z"
  }
}
```

### DELETE `/api/tecnicos/:id`

- Auth: si
- Uso en frontend: desactivar tecnico
- Nota: no elimina fisicamente; hace baja logica con `activo = false`
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Tecnico desactivado correctamente",
  "data": {
    "id": 1,
    "nombre": "Carlos Perez",
    "telefono": "+593999999999",
    "activo": false,
    "creadoEn": "2026-03-18T11:00:00.000Z"
  }
}
```

---

## 5. Obras

### Estructura de obra en respuestas

```json
{
  "id": 1,
  "nombre": "Obra San Miguel",
  "direccion": "Av. Principal 123",
  "cliente": "Constructora ABC",
  "estado": "activa",
  "fechaInicio": "2026-03-16T00:00:00.000Z",
  "fechaFin": null,
  "creadoEn": "2026-03-18T12:00:00.000Z"
}
```

### GET `/api/obras`

- Auth: si
- Uso en frontend: listado general de obras

Query params opcionales:

- `page`: default `1`
- `limit`: default `10`, maximo `100`
- `estado`: `activa`, `pausada` o `finalizada`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Obras obtenidas correctamente",
  "data": {
    "items": [
      {
        "id": 1,
        "nombre": "Obra San Miguel",
        "direccion": "Av. Principal 123",
        "cliente": "Constructora ABC",
        "estado": "activa",
        "fechaInicio": "2026-03-16T00:00:00.000Z",
        "fechaFin": null,
        "creadoEn": "2026-03-18T12:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

### GET `/api/obras/activas`

- Auth: si
- Uso en frontend: selects, filtros, formularios o dashboard
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Obras activas obtenidas correctamente",
  "data": [
    {
      "id": 1,
      "nombre": "Obra San Miguel",
      "direccion": "Av. Principal 123",
      "cliente": "Constructora ABC",
      "estado": "activa",
      "fechaInicio": "2026-03-16T00:00:00.000Z",
      "fechaFin": null,
      "creadoEn": "2026-03-18T12:00:00.000Z"
    }
  ]
}
```

### POST `/api/obras`

- Auth: si
- Uso en frontend: crear obra

Body request:

```json
{
  "nombre": "Obra San Miguel",
  "direccion": "Av. Principal 123",
  "cliente": "Constructora ABC",
  "estado": "activa",
  "fecha_inicio": "2026-03-16"
}
```

Validaciones:

- `nombre`: obligatorio, minimo 2 caracteres
- `direccion`: opcional, puede ser `null`
- `cliente`: opcional, puede ser `null`
- `estado`: opcional, `activa`, `pausada`, `finalizada`
- `fecha_inicio`: opcional, string de fecha o `null`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Obra creada correctamente",
  "data": {
    "id": 1,
    "nombre": "Obra San Miguel",
    "direccion": "Av. Principal 123",
    "cliente": "Constructora ABC",
    "estado": "activa",
    "fechaInicio": "2026-03-16T00:00:00.000Z",
    "fechaFin": null,
    "creadoEn": "2026-03-18T12:00:00.000Z"
  }
}
```

### PUT `/api/obras/:id`

- Auth: si
- Uso en frontend: editar obra

Body request ejemplo:

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

Todos los campos son opcionales, pero debe enviarse al menos uno.

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Obra actualizada correctamente",
  "data": {
    "id": 1,
    "nombre": "Obra San Miguel Fase 2",
    "direccion": "Av. Principal 123",
    "cliente": "Constructora ABC",
    "estado": "pausada",
    "fechaInicio": "2026-03-16T00:00:00.000Z",
    "fechaFin": null,
    "creadoEn": "2026-03-18T12:00:00.000Z"
  }
}
```

### PUT `/api/obras/:id/finalizar`

- Auth: si
- Uso en frontend: accion rapida para cerrar obra
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Obra finalizada correctamente",
  "data": {
    "id": 1,
    "nombre": "Obra San Miguel",
    "direccion": "Av. Principal 123",
    "cliente": "Constructora ABC",
    "estado": "finalizada",
    "fechaInicio": "2026-03-16T00:00:00.000Z",
    "fechaFin": "2026-03-18T13:00:00.000Z",
    "creadoEn": "2026-03-18T12:00:00.000Z"
  }
}
```

### GET `/api/obras/:id/resumen`

- Auth: si
- Uso en frontend: detalle/resumen de una obra
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Resumen de obra obtenido correctamente",
  "data": {
    "obra": "Obra San Miguel",
    "pendientes": 2,
    "ultima_actividad": "2026-03-18T13:15:00.000Z",
    "tecnicos": ["Carlos Perez", "Luis Mena"]
  }
}
```

---

## 6. Reportes

### Estructura de reporte en respuestas

```json
{
  "id": 1,
  "tecnicoId": 1,
  "obraId": 1,
  "mensajeOriginal": "Se realizo instalacion de cableado",
  "fecha": "2026-03-18T14:00:00.000Z",
  "tecnico": {
    "id": 1,
    "nombre": "Carlos Perez",
    "telefono": "+593999999999"
  },
  "obra": {
    "id": 1,
    "nombre": "Obra San Miguel",
    "cliente": "Constructora ABC",
    "estado": "activa"
  },
  "actividades": [
    {
      "id": 1,
      "reporteId": 1,
      "descripcion": "Instalacion de cable principal"
    }
  ],
  "fotos": [
    {
      "id": 1,
      "reporteId": 1,
      "url": "https://servidor.com/foto1.jpg",
      "descripcion": "Area de trabajo"
    }
  ]
}
```

### GET `/api/reportes`

- Auth: si
- Uso en frontend: listado general de reportes

Query params opcionales:

- `page`: default `1`
- `limit`: default `10`, maximo `100`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Reportes obtenidos correctamente",
  "data": {
    "items": [
      {
        "id": 1,
        "tecnicoId": 1,
        "obraId": 1,
        "mensajeOriginal": "Se realizo instalacion de cableado",
        "fecha": "2026-03-18T14:00:00.000Z",
        "tecnico": {
          "id": 1,
          "nombre": "Carlos Perez",
          "telefono": "+593999999999"
        },
        "obra": {
          "id": 1,
          "nombre": "Obra San Miguel",
          "cliente": "Constructora ABC",
          "estado": "activa"
        },
        "actividades": [],
        "fotos": []
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

### GET `/api/reportes/obra/:id`

- Auth: si
- Uso en frontend: listado de reportes filtrado por obra

Params:

- `id`: id de la obra

Query params opcionales:

- `page`
- `limit`

Respuesta: misma estructura de `GET /api/reportes`, filtrada por `obraId`.

### GET `/api/reportes/tecnico/:id`

- Auth: si
- Uso en frontend: historial de reportes por tecnico

Params:

- `id`: id del tecnico

Query params opcionales:

- `page`
- `limit`

Respuesta: misma estructura de `GET /api/reportes`, filtrada por `tecnicoId`.

---

## 7. Pendientes

### Estructura de pendiente en respuestas

```json
{
  "id": 1,
  "obraId": 1,
  "descripcion": "Falta instalar luminarias",
  "estado": "pendiente",
  "creadoEn": "2026-03-18T15:00:00.000Z",
  "resueltoEn": null,
  "obra": {
    "id": 1,
    "nombre": "Obra San Miguel",
    "cliente": "Constructora ABC",
    "estado": "activa"
  }
}
```

### GET `/api/pendientes`

- Auth: si
- Uso en frontend: listado global de pendientes

Query params opcionales:

- `page`: default `1`
- `limit`: default `10`, maximo `100`
- `estado`: `pendiente` o `resuelto`

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Pendientes obtenidos correctamente",
  "data": {
    "items": [
      {
        "id": 1,
        "obraId": 1,
        "descripcion": "Falta instalar luminarias",
        "estado": "pendiente",
        "creadoEn": "2026-03-18T15:00:00.000Z",
        "resueltoEn": null,
        "obra": {
          "id": 1,
          "nombre": "Obra San Miguel",
          "cliente": "Constructora ABC",
          "estado": "activa"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

### GET `/api/pendientes/obra/:id`

- Auth: si
- Uso en frontend: pendientes de una obra especifica

Params:

- `id`: id de la obra

Query params opcionales:

- `page`
- `limit`

Respuesta: misma estructura de `GET /api/pendientes`, filtrada por `obraId`.

### PUT `/api/pendientes/:id/resolver`

- Auth: si
- Uso en frontend: accion para marcar un pendiente como resuelto
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Pendiente resuelto correctamente",
  "data": {
    "id": 1,
    "obraId": 1,
    "descripcion": "Falta instalar luminarias",
    "estado": "resuelto",
    "creadoEn": "2026-03-18T15:00:00.000Z",
    "resueltoEn": "2026-03-18T15:30:00.000Z",
    "obra": {
      "id": 1,
      "nombre": "Obra San Miguel"
    }
  }
}
```

### PUT `/api/pendientes/:id/reabrir`

- Auth: si
- Uso en frontend: accion para devolver un pendiente resuelto a estado pendiente
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Pendiente reabierto correctamente",
  "data": {
    "id": 1,
    "obraId": 1,
    "descripcion": "Falta instalar luminarias",
    "estado": "pendiente",
    "creadoEn": "2026-03-18T15:00:00.000Z",
    "resueltoEn": null,
    "obra": {
      "id": 1,
      "nombre": "Obra San Miguel"
    }
  }
}
```

---

## 8. Dashboard

### GET `/api/dashboard/resumen`

- Auth: si
- Uso en frontend: tarjetas resumen del dashboard
- Body request: no aplica

Respuesta exitosa:

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

### GET `/api/dashboard/actividad-hoy`

- Auth: si
- Uso en frontend: timeline o tabla de actividad del dia
- Body request: no aplica

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Actividad del dia obtenida correctamente",
  "data": [
    {
      "id": 1,
      "mensajeOriginal": "Se realizo instalacion de cableado",
      "fecha": "2026-03-18T16:00:00.000Z",
      "tecnico": {
        "id": 1,
        "nombre": "Carlos Perez"
      },
      "obra": {
        "id": 1,
        "nombre": "Obra San Miguel"
      }
    }
  ]
}
```

---

## 9. Errores comunes que debe manejar React

### 400 Bad Request

- datos invalidos
- email duplicado
- telefono duplicado

Ejemplo:

```json
{
  "success": false,
  "message": "Ya existe un tecnico con ese telefono",
  "details": null
}
```

### 401 Unauthorized

- token no proporcionado
- token invalido o expirado
- credenciales invalidas

Ejemplo:

```json
{
  "success": false,
  "message": "Token invalido o expirado",
  "details": null
}
```

### 403 Forbidden

- usuario autenticado sin permisos de admin

Ejemplo:

```json
{
  "success": false,
  "message": "No tienes permisos para realizar esta accion",
  "details": null
}
```

### 404 Not Found

- usuario, tecnico, obra o pendiente no encontrado

Ejemplo:

```json
{
  "success": false,
  "message": "Obra no encontrada",
  "details": null
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error interno del servidor"
}
```

---

## 10. Recomendacion de capas para React

Para el frontend conviene separar asi:

- `authApi`: login y manejo de token
- `usersApi`: usuarios
- `techniciansApi`: tecnicos
- `worksApi`: obras
- `reportsApi`: reportes
- `pendingApi`: pendientes
- `dashboardApi`: dashboard

Tambien conviene crear un cliente HTTP base que:

- agregue el token JWT automaticamente
- redirija al login si recibe `401`
- normalice errores usando `message` y `details`
- permita usar query params para paginacion y filtros

## 11. Flujo sugerido para el frontend

### Bootstrap inicial

1. Si no existe ningun usuario, usar `POST /api/usuarios` sin token.
2. Luego hacer login con `POST /api/auth/login`.
3. Guardar `token` y `usuario` en estado global.

### Flujo normal

1. Login
2. Obtener resumen de dashboard
3. Cargar catalogos y listados
4. Usar formularios de creacion/edicion
5. Manejar expiracion de token y errores por permisos
