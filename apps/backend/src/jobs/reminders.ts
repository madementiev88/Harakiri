import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { createModuleLogger } from '../lib/logger.js';
import { sendReminder } from '../modules/notifications/notification.service.js';

const log = createModuleLogger('jobs:reminders');

export function startReminderJobs() {
  // Every 5 minutes — check for 24h reminders
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const bookings = await prisma.bookingLog.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminder24hSent: false,
          bookingDate: {
            gte: new Date(now.toISOString().slice(0, 10)),
            lte: new Date(in24h.toISOString().slice(0, 10)),
          },
        },
        include: { user: true },
      });

      for (const booking of bookings) {
        const bookingDateTime = new Date(
          `${booking.bookingDate.toISOString().slice(0, 10)}T${booking.bookingTime}:00`
        );
        const diff = bookingDateTime.getTime() - now.getTime();
        const hoursUntil = diff / (1000 * 60 * 60);

        if (hoursUntil <= 24 && hoursUntil > 2) {
          const services = (typeof booking.services === 'string' ? JSON.parse(booking.services) : booking.services as any[]).map((s: any) => s.name).join(' + ');
          await sendReminder(Number(booking.telegramId), {
            masterName: `\u041c\u0430\u0441\u0442\u0435\u0440 #${booking.masterId}`,
            services,
            date: booking.bookingDate.toISOString().slice(0, 10),
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
      const now = new Date();

      const bookings = await prisma.bookingLog.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminder2hSent: false,
          bookingDate: new Date(now.toISOString().slice(0, 10)),
        },
        include: { user: true },
      });

      for (const booking of bookings) {
        const bookingDateTime = new Date(
          `${booking.bookingDate.toISOString().slice(0, 10)}T${booking.bookingTime}:00`
        );
        const diff = bookingDateTime.getTime() - now.getTime();
        const hoursUntil = diff / (1000 * 60 * 60);

        if (hoursUntil <= 2 && hoursUntil > 0) {
          const services = (typeof booking.services === 'string' ? JSON.parse(booking.services) : booking.services as any[]).map((s: any) => s.name).join(' + ');
          await sendReminder(Number(booking.telegramId), {
            masterName: `\u041c\u0430\u0441\u0442\u0435\u0440 #${booking.masterId}`,
            services,
            date: booking.bookingDate.toISOString().slice(0, 10),
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
