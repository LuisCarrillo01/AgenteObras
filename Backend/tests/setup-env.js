process.env.APP_ENV = process.env.APP_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
