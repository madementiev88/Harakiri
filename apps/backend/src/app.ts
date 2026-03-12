// Fix BigInt serialization for JSON responses
(BigInt.prototype as any).toJSON = function() {
  return Number(this);
};

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config, hasBotToken, hasPartnerToken, hasYclientsTokens } from './config.js';
import { createModuleLogger } from './lib/logger.js';
import { traceMiddleware } from './middleware/trace.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { yclientsRoutes } from './modules/yclients/yclients.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { initBot } from './modules/notifications/notification.service.js';
import { startReminderJobs } from './jobs/reminders.js';
import { startSyncBookingsJob } from './jobs/sync-bookings.js';
import { startCompleteBookingsJob } from './jobs/complete-bookings.js';

const log = createModuleLogger('app');

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Plugins
  await app.register(cors, {
    origin: [config.MINIAPP_URL],
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
  });

  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
  });

  // Middleware
  app.addHook('onRequest', traceMiddleware);
  app.setErrorHandler(errorHandler);

  // Routes
  await app.register(authRoutes);
  await app.register(yclientsRoutes);
  await app.register(bookingRoutes);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    yclients: hasYclientsTokens ? 'full' : hasPartnerToken ? 'read-only' : 'mock',
    bot: hasBotToken ? 'connected' : 'disabled',
  }));

  // Start Telegram Bot (only if token provided)
  if (hasBotToken) {
    const bot = initBot();
    bot.start();
    log.info('Telegram bot started');
  } else {
    log.warn('BOT_TOKEN not set — Telegram bot disabled');
  }

  // Start cron jobs
  startCompleteBookingsJob();
  if (hasYclientsTokens) {
    startSyncBookingsJob();
  } else {
    log.warn('YCLIENTS tokens not set — sync job disabled');
  }
  if (hasBotToken) {
    startReminderJobs();
  } else {
    log.warn('BOT_TOKEN not set — reminder jobs disabled');
  }

  // Start server
  const port = parseInt(config.PORT, 10);
  await app.listen({ port, host: '0.0.0.0' });
  const ycStatus = hasYclientsTokens ? 'full' : hasPartnerToken ? 'read-only' : 'mock';
  log.info({ port }, `Server started (YCLIENTS: ${ycStatus}, Bot: ${hasBotToken ? 'active' : 'disabled'})`);
}

bootstrap().catch((err) => {
  log.error({ err }, 'Failed to start server');
  process.exit(1);
});
