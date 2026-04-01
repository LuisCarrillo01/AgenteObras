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
  API_BASE_URL: z.string().optional().default(''),
  MINIO_ENDPOINT: z.string().min(1, 'MINIO_ENDPOINT es requerido'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY es requerido'),
  MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY es requerido'),
  MINIO_BUCKET_OBRAS: z.string().min(1, 'MINIO_BUCKET_OBRAS es requerido'),
  MINIO_OBJECT_PREFIX: z.string().optional().default('obras'),
  MINIO_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  MINIO_ALLOWED_MIME_TYPES: z.string().optional().default('image/jpeg,image/png,image/webp')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const { fieldErrors } = parsedEnv.error.flatten();
  throw new Error(`Variables de entorno invalidas: ${JSON.stringify(fieldErrors)}`);
}

const env = {
  ...parsedEnv.data,
  CORS_ORIGIN: parseCorsOrigins(parsedEnv.data.CORS_ORIGIN),
  MINIO_ALLOWED_MIME_TYPES: parsedEnv.data.MINIO_ALLOWED_MIME_TYPES
    .split(',')
    .map((mime) => mime.trim())
    .filter(Boolean)
};

module.exports = { env };
