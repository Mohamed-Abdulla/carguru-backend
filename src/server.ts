import { app } from './app';
import { env } from './config/env';
import { checkDbConnection } from './db/pool';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    // Verify DB connectivity before accepting traffic
    await checkDbConnection();

    app.listen(env.PORT, () => {
      logger.info(`🚗  CarGuru backend running`, {
        port: env.PORT,
        env: env.NODE_ENV,
        url: `http://localhost:${env.PORT}`,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully');
  process.exit(0);
});

bootstrap();
