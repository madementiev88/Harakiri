import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { createModuleLogger } from '../lib/logger.js';
import { sendReminder } from '../modules/notifications/notification.service.js';
import { nowInTz, toDateStringTz, bookingToDate } from '../lib/timezone.js';

const log = createModuleLogger('jobs:reminders');

function parseServices(services: unknown): string {
  const arr = typeof services === 'string' ? JSON.parse(services) : services as any[];
  return arr.map((s: any) => s.name).join(' + ');
}

export function startReminderJobs() {
  // Every 5 minutes — check for 24h reminders
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = nowInTz();
      const todayStr = toDateStringTz(now);
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in24hStr = toDateStringTz(in24h);

      const bookings = await prisma.bookingLog.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminder24hSent: false,
          bookingDate: {
            gte: new Date(todayStr),
            lte: new Date(in24hStr),
          },
        },
        include: { user: true },
      });

      for (const booking of bookings) {
        const bookingDateTime = bookingToDate(booking.bookingDate, booking.bookingTime);
        const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil <= 24 && hoursUntil > 2) {
          await sendReminder(Number(booking.telegramId), {
            masterName: `\u041c\u0430\u0441\u0442\u0435\u0440 #${booking.masterId}`,
            services: parseServices(booking.services),
            date: toDateStringTz(booking.bookingDate),
            time: booking.bookingTime,
            hoursLeft: 24,
          });

          await prisma.bookingLog.update({
            where: { id: booking.id },
            data: { reminder24hSent: true },
          });

          log.info({ bookingId: booking.id }, '24h reminder sent');
        }
      }
    } catch (err) {
      log.error({ err }, 'Error in 24h reminder job');
    }
  });

  // Every 5 minutes — check for 2h reminders
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = nowInTz();
      const todayStr = toDateStringTz(now);

      const bookings = await prisma.bookingLog.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminder2hSent: false,
          bookingDate: new Date(todayStr),
        },
        include: { user: true },
      });

      for (const booking of bookings) {
        const bookingDateTime = bookingToDate(booking.bookingDate, booking.bookingTime);
        const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntil <= 2 && hoursUntil > 0) {
          await sendReminder(Number(booking.telegramId), {
            masterName: `\u041c\u0430\u0441\u0442\u0435\u0440 #${booking.masterId}`,
            services: parseServices(booking.services),
            date: toDateStringTz(booking.bookingDate),
            time: booking.bookingTime,
            hoursLeft: 2,
          });

          await prisma.bookingLog.update({
            where: { id: booking.id },
            data: { reminder2hSent: true },
          });

          log.info({ bookingId: booking.id }, '2h reminder sent');
        }
      }
    } catch (err) {
      log.error({ err }, 'Error in 2h reminder job');
    }
  });

  log.info('Reminder jobs started');
}
