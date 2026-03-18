import { config } from 'dotenv';
import { resolve } from 'path';

// Parse the environment variables from the .env file
config({ path: resolve(process.cwd(), '.env') });

function requireEnv(name: string): string {
    const val = process.env[name];
    if (!val) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return val;
}

export const ENV = {
    TELEGRAM_BOT_TOKEN: requireEnv('TELEGRAM_BOT_TOKEN'),
    // Parse comma-separated user IDs into an array of numbers
    TELEGRAM_ALLOWED_USER_IDS: requireEnv('TELEGRAM_ALLOWED_USER_IDS')
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id)),
    GROQ_API_KEY: requireEnv('GROQ_API_KEY'),
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
    DB_PATH: process.env.DB_PATH || './memory.db',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
    POSTGRES_URL: process.env.POSTGRES_URL || '',
};
