import { Bot } from 'grammy';
import { hydrateFiles, FileFlavor } from '@grammyjs/files';
import { ENV } from '../config/env.js';
import { whitelistMiddleware } from './middlewares/whitelist.js';
import { identityMiddleware } from './middlewares/identity.js';
import { runAgentLoop } from '../agent/loop.js';
import { transcribeAudio } from '../llm/client.js';
import { linkPhoneToTelegramUser } from '../db/postgres.js';

type MyContext = FileFlavor<import('grammy').Context>;
export const bot = new Bot<MyContext>(ENV.TELEGRAM_BOT_TOKEN);

// Hydrate files plugin
bot.api.config.use(hydrateFiles(bot.token));

// 1. Apply strict whitelist middleware (blocks non-whitelisted IDs at the config level)
bot.use(whitelistMiddleware);

// ── Contact sharing handler ───────────────────────────────────────────────────
// This runs BEFORE identity middleware so the user can register without being blocked
bot.on('message:contact', async (ctx) => {
    const telegramId = ctx.from.id;
    const contact = ctx.message.contact;
    
    // Security: only allow users to share their OWN contact
    if (contact.user_id !== telegramId) {
        await ctx.reply('❌ Solo puedes compartir tu propio número de teléfono.');
        return;
    }
    
    try {
        const record = await linkPhoneToTelegramUser(telegramId, contact.phone_number);
        
        if (record.autorizado) {
            await ctx.reply(
                `✅ *¡Bienvenido, ${record.nombre}!*\n\nTu identidad ha sido verificada correctamente. Ya puedes registrar reportes de obra.`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                }
            );
        } else {
            await ctx.reply(
                `⚠️ Tu número *${contact.phone_number}* no está registrado en el sistema.\n\nContacta al encargado para que te den de alta.`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                }
            );
        }
    } catch (error: any) {
        console.error('[Bot] Error linking phone:', error);
        await ctx.reply('❌ Ocurrió un error al verificar tu identidad. Intenta de nuevo.');
    }
});

// 2. Identity middleware — gates agent access for authorized users only
bot.use(identityMiddleware);

// ── Agent handlers (only reached if authorized) ───────────────────────────────

// Handle text messages
bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    
    try {
        await ctx.replyWithChatAction('typing');
        const reply = await runAgentLoop(userId, text || '');
        
        if (reply) {
            await ctx.reply(reply);
        } else {
            await ctx.reply('_El agente no generó ninguna respuesta._', { parse_mode: 'Markdown' });
        }
    } catch (error: any) {
        console.error('[Bot] Error handling message:', error);
        await ctx.reply(`❌ Ocurrió un error en el agente:\n\n${error.message}`);
    }
});

// Handle voice and audio messages
bot.on(['message:voice', 'message:audio'], async (ctx) => {
    const userId = ctx.from.id;
    
    try {
        await ctx.replyWithChatAction('typing');
        const statusMsg = await ctx.reply('🎧 _Escuchando audio..._', { parse_mode: 'Markdown' });
        
        const file = await ctx.getFile();
        const tmpPath = await file.download();
        
        const transcribedText = await transcribeAudio(tmpPath);
        
        await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            `🎤 *Transcripción:* \n_${transcribedText}_\n\n⏳ _Pensando..._`,
            { parse_mode: 'Markdown' }
        );
        
        const reply = await runAgentLoop(userId, transcribedText);
        
        if (reply) {
            await ctx.reply(reply);
        } else {
            await ctx.reply('_El agente no generó ninguna respuesta._', { parse_mode: 'Markdown' });
        }
    } catch (error: any) {
        console.error('[Bot] Error handling audio:', error);
        await ctx.reply(`❌ Ocurrió un error procesando el audio:\n\n${error.message}`);
    }
});

export function startBot() {
    bot.start({
        onStart: (botInfo) => {
            console.log(`[Bot] Started successfully as @${botInfo.username}`);
        }
    });
}
