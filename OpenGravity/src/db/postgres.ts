import pkg from 'pg';
const { Pool } = pkg;

import { ENV } from '../config/env.js';

let pool: any = null;

export function initializePostgres() {
    if (!ENV.POSTGRES_URL) {
        console.warn('[DB] POSTGRES_URL not found in environment. Tech reports will not be available.');
        return;
    }
    
    pool = new Pool({
        connectionString: ENV.POSTGRES_URL,
        ssl: ENV.POSTGRES_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    pool.query('SELECT NOW()', (err: any) => {
        if (err) {
            console.error('[DB] PostgreSQL Connection Error:', err.message);
        } else {
            console.log('[DB] PostgreSQL connected successfully for Technical Reports.');
        }
    });
}

export function getPgPool() {
    return pool;
}

// ── Telegram Identity Helpers ─────────────────────────────────────────────────

export interface TelegramUserRecord {
    id: number;
    telegram_id: number;
    tecnico_id: number | null;
    telefono: string | null;
    nombre: string | null;
    username: string | null;
    autorizado: boolean;
}

/**
 * Finds a telegram user in PostgreSQL. Returns null if postgres is not connected.
 */
export async function findTelegramUser(telegramId: number): Promise<TelegramUserRecord | null> {
    if (!pool) return null;
    const res = await pool.query(
        'SELECT * FROM tecnicos_telegram WHERE telegram_id = $1',
        [telegramId]
    );
    return res.rows[0] ?? null;
}

/**
 * Creates a new unverified entry for a Telegram user if they don't exist yet.
 */
export async function upsertTelegramUser(telegramId: number, nombre: string, username: string | null): Promise<TelegramUserRecord> {
    const res = await pool.query(`
        INSERT INTO tecnicos_telegram (telegram_id, nombre, username)
        VALUES ($1, $2, $3)
        ON CONFLICT (telegram_id) DO UPDATE
            SET nombre   = EXCLUDED.nombre,
                username = EXCLUDED.username
        RETURNING *
    `, [telegramId, nombre, username ?? null]);
    return res.rows[0];
}

/**
 * Called when user shares their phone. Tries to link the phone to an existing tecnico.
 * Returns the updated record.
 */
export async function linkPhoneToTelegramUser(telegramId: number, phone: string): Promise<TelegramUserRecord> {
    // Normalize phone: remove spaces, ensure +
    const normalizedPhone = phone.startsWith('+') ? phone : '+' + phone;
    
    // Try to find a matching tecnico by phone
    const tecnicoRes = await pool.query(
        "SELECT id, nombre FROM tecnicos WHERE telefono = $1 AND activo = true",
        [normalizedPhone]
    );
    
    const tecnicoId = tecnicoRes.rows[0]?.id ?? null;
    const autorizado = tecnicoId !== null;
    
    const res = await pool.query(`
        UPDATE tecnicos_telegram
        SET telefono   = $1,
            tecnico_id = $2,
            autorizado = $3
        WHERE telegram_id = $4
        RETURNING *
    `, [normalizedPhone, tecnicoId, autorizado, telegramId]);
    
    return res.rows[0];
}
