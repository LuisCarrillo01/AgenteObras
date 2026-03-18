import { startBot } from './bot/telegram.js';
import { initializeDatabase } from './db/schema.js';
import { initializePostgres } from './db/postgres.js';

// Import tools to ensure they get auto-registered at startup
import './tools/get_current_time.js';
import './tools/get_technical_info.js';
import './tools/create_report.js';

async function main() {
    console.log('[System] Starting OpenGravity...');
    
    // Initialize Memory DB (Firestore)
    initializeDatabase();
    
    // Initialize External PostgreSQL DB
    initializePostgres();
    
    // Start Telegram Bot
    startBot();
    
    console.log('[System] OpenGravity is now running and polling for messages.');
}

main().catch(error => {
    console.error('[System] Fatal startup error:', error);
    process.exit(1);
});
