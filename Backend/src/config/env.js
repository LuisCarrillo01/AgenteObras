const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseCorsOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerido'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  CORS_ORIGIN: z.string().optional().default(''),
  API_BASE_URL: z.string().optional().default('')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const { fieldErrors } = parsedEnv.error.flatten();
  throw new Error(`Variables de entorno invalidas: ${JSON.stringify(fieldErrors)}`);
}

const env = {
  ...parsedEnv.data,
  CORS_ORIGIN: parseCorsOrigins(parsedEnv.data.CORS_ORIGIN)
};

module.exports = { env };
