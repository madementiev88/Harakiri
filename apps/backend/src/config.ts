import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  BOT_TOKEN: z.string().default(''),
  YCLIENTS_PARTNER_TOKEN: z.string().default(''),
  YCLIENTS_USER_TOKEN: z.string().default(''),
  YCLIENTS_SALON_ID: z.string().default('1178599'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  MINIAPP_URL: z.string().default('http://localhost:5173'),
  TZ: z.string().default('Asia/Yekaterinburg'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;

export const isDev = config.NODE_ENV === 'development';
export const hasPartnerToken = !!config.YCLIENTS_PARTNER_TOKEN;
export const hasYclientsTokens = hasPartnerToken && !!config.YCLIENTS_USER_TOKEN;
export const hasBotToken = !!config.BOT_TOKEN;
