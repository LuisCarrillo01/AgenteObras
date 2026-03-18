const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseCorsOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const env = {
  APP_ENV: process.env.APP_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN || ''),
  API_BASE_URL: process.env.API_BASE_URL || ''
};

module.exports = { env };
