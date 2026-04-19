import dotenv from 'dotenv';
dotenv.config();



function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3003'), 10),

  db: {
    host: optionalEnv('DB_HOST', 'localhost'),
    port: parseInt(optionalEnv('DB_PORT', '5432'), 10),
    name: optionalEnv('DB_NAME', 'carguru'),
    user: optionalEnv('DB_USER', 'carguru_user'),
    password: optionalEnv('DB_PASSWORD', 'carguru_pass'),
    poolMax: parseInt(optionalEnv('DB_POOL_MAX', '10'), 10),
    idleTimeoutMs: parseInt(optionalEnv('DB_POOL_IDLE_TIMEOUT_MS', '30000'), 10),
    connectionTimeoutMs: parseInt(
      optionalEnv('DB_POOL_CONNECTION_TIMEOUT_MS', '2000'),
      10
    ),
  },

  cors: {
    origins: optionalEnv('CORS_ORIGINS', 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  },
} as const;
