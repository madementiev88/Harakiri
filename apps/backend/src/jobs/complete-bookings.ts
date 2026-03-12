import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { createModuleLogger } from '../lib/logger.js';
import { nowInTz, bookingToDate } from '../lib/timezone.js';

const log = createModuleLogger('jobs:complete-bookings');

export function startCompleteBookingsJob() {
  // Every 15 minutes — move confirmed bookings to completed
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = nowInTz();

      // Find confirmed bookings where the appointment time + duration has passed
      const bookings = await prisma.bookingLog.findMany({
        where: {
          status: 'confirmed',
          bookingDate: {
            gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Last 2 days
          },
        },
      });

      let completedCount = 0;

      for (const booking of bookings) {
        const bookingEnd = bookingToDate(booking.bookingDate, booking.bookingTime);
        bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.totalDuration);

        if (now > bookingEnd) {
          await prisma.bookingLog.update({
            where: { id: booking.id },
            data: { status: 'completed' },
          });
          completedCount++;
        }
      }

      if (completedCount > 0) {
        log.info({ count: completedCount }, 'Bookings marked as completed');
      }
    } catch (err) {
      log.error({ err }, 'Error in complete bookings job');
    }
  });

  log.info('Complete bookings job started');
}
