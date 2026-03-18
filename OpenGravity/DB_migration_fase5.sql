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
