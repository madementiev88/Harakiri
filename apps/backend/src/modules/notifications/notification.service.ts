import { Bot } from 'grammy';
import { config, isDev } from '../../config.js';
import { createModuleLogger } from '../../lib/logger.js';

const log = createModuleLogger('notifications');

let bot: Bot | null = null;

const isHttps = config.MINIAPP_URL.startsWith('https://');
const isPublicUrl = isHttps && !config.MINIAPP_URL.includes('localhost');

// Cache-busting: append version to force Telegram WebView to reload
const APP_VERSION = '2';
const miniAppUrl = `${config.MINIAPP_URL}${config.MINIAPP_URL.includes('?') ? '&' : '?'}v=${APP_VERSION}`;

function webAppMarkup() {
  if (!isPublicUrl) return undefined;
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Записаться', web_app: { url: miniAppUrl } }],
      ],
    },
  };
}

export function initBot(): Bot {
  bot = new Bot(config.BOT_TOKEN);

  bot.catch((err) => {
    log.error({ err: err.error, update: err.ctx?.update?.update_id }, 'Bot error');
  });

  bot.command('start', async (ctx) => {
    const text = isPublicUrl
      ? 'Добро пожаловать в Харакири Барбершоп!\n\nНажмите кнопку ниже, чтобы записаться к мастеру.'
      : 'Добро пожаловать в Харакири Барбершоп!\n\nБот работает в dev-режиме. Откройте Mini App по ссылке:\n' + config.MINIAPP_URL;
    await ctx.reply(text, webAppMarkup());
  });

  bot.command('mybookings', async (ctx) => {
    const text = isPublicUrl
      ? 'Откройте приложение, чтобы увидеть ваши записи:'
      : 'Мои записи — откройте Mini App:\n' + config.MINIAPP_URL;
    await ctx.reply(text, webAppMarkup());
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Харакири Барбершоп\n\n' +
      'Доступные команды:\n' +
      '/start — Записаться к мастеру\n' +
      '/mybookings — Мои записи\n' +
      '/help — Помощь'
    );
  });

  return bot;
}

export function getBot(): Bot | null {
  return bot;
}

export async function sendBookingConfirmation(telegramId: number, booking: {
  masterName: string;
  services: string;
  date: string;
  time: string;
  totalPrice: number;
}) {
  if (!bot) return;

  const message =
    `Харакири Барбершоп\n\n` +
    `Запись подтверждена!\n\n` +
    `Мастер: ${booking.masterName}\n` +
    `Услуги: ${booking.services}\n` +
    `Дата: ${booking.date}, ${booking.time}\n` +
    `Стоимость: ${booking.totalPrice} руб.\n` +
    `Адрес: г. Уфа, ул. Аксакова, д. 79`;

  try {
    await bot.api.sendMessage(telegramId, message);
    log.info({ telegramId }, 'Booking confirmation sent');
  } catch (err) {
    log.error({ err, telegramId }, 'Failed to send booking confirmation');
  }
}

export async function sendReminder(telegramId: number, booking: {
  masterName: string;
  services: string;
  date: string;
  time: string;
  hoursLeft: number;
}) {
  if (!bot) return;

  const timeLabel = booking.hoursLeft === 24 ? 'завтра' : 'через 2 часа';

  const message =
    `Харакири Барбершоп\n\n` +
    `Напоминание: ${timeLabel} у вас запись!\n\n` +
    `Мастер: ${booking.masterName}\n` +
    `Услуги: ${booking.services}\n` +
    `Дата: ${booking.date}, ${booking.time}\n` +
    `Адрес: г. Уфа, ул. Аксакова, д. 79`;

  try {
    await bot.api.sendMessage(telegramId, message);
    log.info({ telegramId, hoursLeft: booking.hoursLeft }, 'Reminder sent');
  } catch (err) {
    log.error({ err, telegramId }, 'Failed to send reminder');
  }
}

export async function sendCancellationNotice(telegramId: number, booking: {
  masterName: string;
  date: string;
  time: string;
}) {
  if (!bot) return;

  const message =
    `Харакири Барбершоп\n\n` +
    `Запись отменена\n\n` +
    `Мастер: ${booking.masterName}\n` +
    `Была: ${booking.date}, ${booking.time}\n\n` +
    `Хотите записаться снова?`;

  try {
    const markup = isPublicUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Записаться заново', web_app: { url: miniAppUrl } }],
        ],
      },
    } : undefined;
    await bot.api.sendMessage(telegramId, message, markup);
    log.info({ telegramId }, 'Cancellation notice sent');
  } catch (err) {
    log.error({ err, telegramId }, 'Failed to send cancellation notice');
  }
}
