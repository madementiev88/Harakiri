import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { createModuleLogger } from '../../lib/logger.js';

const log = createModuleLogger('auth');

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    const data = new URLSearchParams(initData);
    const hash = data.get('hash');
    if (!hash) return null;

    data.delete('hash');

    const dataCheckString = [...data.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      log.warn('Invalid initData hash');
      return null;
    }

    const userStr = data.get('user');
    if (!userStr) return null;

    return JSON.parse(userStr) as TelegramUser;
  } catch (err) {
    log.error({ err }, 'Error verifying initData');
    return null;
  }
}

export async function findOrCreateUser(telegramUser: TelegramUser) {
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(telegramUser.id) },
    update: {
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name || null,
      lastVisit: new Date(),
    },
    create: {
      telegramId: BigInt(telegramUser.id),
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name || null,
      lastVisit: new Date(),
    },
  });

  log.info({ telegramId: telegramUser.id }, 'User authenticated');
  return user;
}
