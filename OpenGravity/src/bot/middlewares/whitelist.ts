import { Context, NextFunction } from 'grammy';
import { ENV } from '../../config/env.js';

export async function whitelistMiddleware(ctx: Context, next: NextFunction) {
    const userId = ctx.from?.id;
    
    if (!userId) {
        console.log('[Whitelist] Ignored message: No user ID provided by Telegram.');
        return; // drop silently
    }
    
    if (!ENV.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        console.log(`[Whitelist] Ignored message from unauthorized user: ${userId} (@${ctx.from?.username || 'unknown'})`);
        return; // drop silently
    }
    
    // User is allowed, proceed to next middleware/handler
    await next();
}
