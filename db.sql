-- ============================================================
-- SISTEMA DE REPORTES TÉCNICOS - BASE DE DATOS
-- Compatible con PostgreSQL 13+
-- ============================================================

-- Jerarquía de dependencias (sin ciclos):
--   usuarios        (sin dependencias)
--   tecnicos        (sin dependencias)
--   obras           (sin dependencias)
--   reportes        → tecnicos, obras
--   actividades     → reportes
--   pendientes      → obras          ← ya NO referencia reportes
--   fotos           → reportes

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL UNIQUE,
    password    TEXT          NOT NULL,
    rol         VARCHAR(50)   NOT NULL DEFAULT 'encargado',
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuarios_rol CHECK (rol IN ('encargado', 'admin'))
);

-- ============================================================
-- TABLA: tecnicos
-- ============================================================
CREATE TABLE tecnicos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    telefono    VARCHAR(20)   NOT NULL UNIQUE,
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: obras
-- ============================================================
CREATE TABLE obras (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(150)  NOT NULL,
    foto_referencia_url TEXT,
    direccion    TEXT,
    cliente      VARCHAR(150),
    estado       VARCHAR(50)   NOT NULL DEFAULT 'activa',
    fecha_inicio DATE,
    fecha_fin    DATE,
    creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_obras_estado CHECK (estado IN ('activa', 'pausada', 'finalizada'))
);

-- ============================================================
-- TABLA: reportes
--   depende de: tecnicos, obras
-- ============================================================
CREATE TABLE reportes (
    id               SERIAL PRIMARY KEY,
    tecnico_id       INT       NOT NULL REFERENCES tecnicos(id) ON DELETE RESTRICT,
    obra_id          INT       NOT NULL REFERENCES obras(id)    ON DELETE RESTRICT,
    mensaje_original TEXT      NOT NULL,
    fecha            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: actividades
--   depende de: reportes
-- ============================================================
CREATE TABLE actividades (
    id          SERIAL PRIMARY KEY,
    reporte_id  INT   NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
    descripcion TEXT  NOT NULL
);

-- ============================================================
-- TABLA: pendientes
--   depende de: obras  (solo obras, sin referencia a reportes)
--   El origen del pendiente queda registrado en el texto,
--   no en una FK que genera dependencia circular.
-- ============================================================
CREATE TABLE pendientes (
    id           SERIAL PRIMARY KEY,
    obra_id      INT         NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    descripcion  TEXT        NOT NULL,
    estado       VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    creado_en    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelto_en  TIMESTAMP,

    CONSTRAINT chk_pendientes_estado CHECK (estado IN ('pendiente', 'resuelto'))
);

-- ============================================================
-- TABLA: fotos
--   depende de: reportes
-- ============================================================
CREATE TABLE fotos (
    id          SERIAL PRIMARY KEY,
    reporte_id  INT   NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
    url         TEXT  NOT NULL,
    descripcion TEXT
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_reportes_tecnico  ON reportes   (tecnico_id);
CREATE INDEX idx_reportes_obra     ON reportes   (obra_id);
CREATE INDEX idx_reportes_fecha    ON reportes   (fecha);
CREATE INDEX idx_actividades_rep   ON actividades(reporte_id);
CREATE INDEX idx_pendientes_obra   ON pendientes (obra_id);
CREATE INDEX idx_pendientes_estado ON pendientes (estado);
CREATE INDEX idx_fotos_reporte     ON fotos      (reporte_id);

-- ============================================================
-- DATOS DE EJEMPLO
-- El orden de inserción respeta la jerarquía de dependencias
-- ============================================================

INSERT INTO usuarios (nombre, email, password, rol) VALUES
    ('Admin Sistema',  'admin@empresa.com', 'CAMBIAR_HASH', 'admin'),
    ('Juan Encargado', 'juan@empresa.com',  'CAMBIAR_HASH', 'encargado');

INSERT INTO tecnicos (nombre, telefono) VALUES
    ('Carlos Pérez', '+5219991234567'),
    ('Luis Ramírez',  '+5219997654321');

INSERT INTO obras (nombre, direccion, cliente, estado, fecha_inicio) VALUES
    ('Obra San Miguel',   'Av. Principal 123', 'Constructora ABC', 'activa',  '2025-01-10'),
    ('Residencial Norte', 'Calle Norte 456',   'Sr. García',       'activa',  '2025-02-01'),
    ('Edificio Central',  'Blvd. Central 789', 'Empresa XYZ',      'pausada', '2024-11-15');

INSERT INTO reportes (tecnico_id, obra_id, mensaje_original) VALUES
    (1, 1, 'Instalamos cableado en planta baja. Falta configurar el grabador y montar 3 cámaras en segundo piso.');

INSERT INTO actividades (reporte_id, descripcion) VALUES
    (1, 'Instalación de cableado para cámaras en planta baja'),
    (1, 'Revisión de tablero eléctrico');

-- Los pendientes se crean directamente sobre la obra, sin FK a reporte
INSERT INTO pendientes (obra_id, descripcion) VALUES
    (1, 'Configurar grabador DVR'),
    (1, 'Montar 3 cámaras en segundo piso');

-- ============================================================
-- CONSULTAS DEL DASHBOARD
-- ============================================================

-- Obras activas
-- SELECT id, nombre, cliente, fecha_inicio
-- FROM obras WHERE estado = 'activa';

-- Reportes del día
-- SELECT t.nombre AS tecnico, o.nombre AS obra, r.mensaje_original, r.fecha
-- FROM reportes r
-- JOIN tecnicos t ON r.tecnico_id = t.id
-- JOIN obras    o ON r.obra_id    = o.id
-- WHERE DATE(r.fecha) = CURRENT_DATE
-- ORDER BY r.fecha DESC;

-- Pendientes abiertos por obra
-- SELECT o.nombre AS obra, p.descripcion, p.creado_en
-- FROM pendientes p
-- JOIN obras o ON p.obra_id = o.id
-- WHERE p.estado = 'pendiente'
-- ORDER BY o.nombre, p.creado_en;

-- Resumen por obra
-- SELECT
--     o.nombre                                                        AS obra,
--     COUNT(DISTINCT a.id)                                            AS total_actividades,
--     COUNT(DISTINCT p.id) FILTER (WHERE p.estado = 'pendiente')     AS pendientes_abiertos
-- FROM obras o
-- LEFT JOIN reportes    r ON r.obra_id    = o.id
-- LEFT JOIN actividades a ON a.reporte_id = r.id
-- LEFT JOIN pendientes  p ON p.obra_id    = o.id
-- WHERE o.estado = 'activa'
-- GROUP BY o.id, o.nombre
-- ORDER BY o.nombre;



-- ============================================================
-- MIGRACIÓN FASE 5: Identidad de Telegram
-- Ejecutar DESPUÉS del esquema principal (DB.sql)
-- ============================================================

-- Tabla puente entre identidades de Telegram y técnicos del sistema
CREATE TABLE IF NOT EXISTS tecnicos_telegram (
    id           SERIAL    PRIMARY KEY,
    telegram_id  BIGINT    NOT NULL UNIQUE,
    tecnico_id   INT       REFERENCES tecnicos(id) ON DELETE SET NULL,   -- NULL = pendiente de vincular
    telefono     TEXT,
    nombre       TEXT,
    username     TEXT,
    autorizado   BOOLEAN   NOT NULL DEFAULT false,
    creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tecnicos_telegram_id ON tecnicos_telegram (telegram_id);
