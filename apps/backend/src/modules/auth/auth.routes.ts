import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyTelegramInitData, findOrCreateUser } from './auth.service.js';
import { config, isDev } from '../../config.js';
import { createModuleLogger } from '../../lib/logger.js';

const log = createModuleLogger('auth');

const authBodySchema = z.object({
  initData: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth', async (request, reply) => {
    const body = authBodySchema.parse(request.body);

    // Try real Telegram verification first
    const telegramUser = verifyTelegramInitData(body.initData, config.BOT_TOKEN);

    if (telegramUser) {
      const user = await findOrCreateUser(telegramUser);
      const isNewUser = !user.phone;

      const token = app.jwt.sign(
        { telegramId: telegramUser.id.toString(), firstName: telegramUser.first_name },
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return { token, user: formatUser(user), isNewUser };
    }

    // Dev mode fallback — accept any initData
    if (isDev) {
      log.warn('Dev mode: bypassing Telegram verification');
      const devUser = await findOrCreateUser({
        id: 123456789,
        first_name: 'Dev',
        last_name: 'User',
      });

      const token = app.jwt.sign(
        { telegramId: '123456789', firstName: 'Dev' },
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return { token, user: formatUser(devUser), isNewUser: !devUser.phone };
    }

    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid Telegram data' },
    });
  });
}

function formatUser(user: any) {
  return {
    telegramId: Number(user.telegramId),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    pdConsent: user.pdConsent,
  };
}
