import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { createModuleLogger } from '../lib/logger.js';
import * as yclients from '../modules/yclients/yclients.service.js';

const log = createModuleLogger('jobs:sync-bookings');

export function startSyncBookingsJob() {
  // Every 30 minutes — sync booking statuses with YCLIENTS
  cron.schedule('*/30 * * * *', async () => {
    try {
      log.info('Starting bookings sync');

      const activeBookings = await prisma.bookingLog.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          yclientsRecordId: { not: null },
        },
      });

      if (activeBookings.length === 0) return;

      // Fetch records from YCLIENTS
      const today = new Date().toISOString().slice(0, 10);
      let yclientsRecords: any[];
      try {
        yclientsRecords = await yclients.getRecords({ startDate: today });
      } catch (err) {
        log.error({ err }, 'Failed to fetch records from YCLIENTS');
        return;
      }

      for (const booking of activeBookings) {
        const ycRecord = yclientsRecords.find(
          (r: any) => r.id === booking.yclientsRecordId
        );

        if (!ycRecord) continue;

        // Map YCLIENTS status to our status
        let newStatus: 'confirmed' | 'cancelled' | null = null;
        if (ycRecord.deleted || ycRecord.attendance === -1) {
          newStatus = 'cancelled';
        } else if (ycRecord.confirmed === 1 && booking.status === 'pending') {
          newStatus = 'confirmed';
        }

        if (newStatus && newStatus !== booking.status) {
          await prisma.bookingLog.update({
            where: { id: booking.id },
            data: { status: newStatus },
          });
          log.info({
            bookingId: booking.id,
            oldStatus: booking.status,
            newStatus,
          }, 'Booking status synced');
        }
      }

      log.info({ count: activeBookings.length }, 'Bookings sync completed');
    } catch (err) {
      log.error({ err }, 'Error in sync bookings job');
    }
  });

  log.info('Sync bookings job started');
}
