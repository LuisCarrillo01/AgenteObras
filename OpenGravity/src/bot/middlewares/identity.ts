import { Context, NextFunction } from 'grammy';
import { getPgPool, findTelegramUser, upsertTelegramUser } from '../../db/postgres.js';

/**
 * Middleware that gates access to the agent behind PostgreSQL identity verification.
 * 
 * Flow:
 *  1. If Postgres is not connected → pass through (development mode, no db).
 *  2. If user is already authorized → pass through.
 *  3. If user is not known or not authorized → ask them to share their phone.
 */
export async function identityMiddleware(ctx: Context, next: NextFunction) {
    const pool = getPgPool();
    
    // If postgres isn't connected, skip identity check (local dev mode)
    if (!pool) {
        await next();
        return;
    }
    
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await next();
        return;
    }
    
    const nombre = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Desconocido';
    const username = ctx.from.username ?? null;
    
    // Create or fetch user record
    const record = await upsertTelegramUser(telegramId, nombre, username);
    
    if (record.autorizado) {
        // All good, proceed to agent
        await next();
        return;
    }
    
    // User not authorized yet → request phone number
    await ctx.reply(
        `👋 Hola *${nombre}*\\. Para acceder al sistema de reportes necesito verificar tu identidad\\.\n\nPor favor comparte tu número de teléfono usando el botón de abajo\\.`,
        {
            parse_mode: 'MarkdownV2',
            reply_markup: {
                keyboard: [[{ text: '📱 Compartir mi número', request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        }
    );
    
    // DO NOT call next() — block the request.
}
