import { prisma } from '../../lib/prisma.js';
import { createModuleLogger } from '../../lib/logger.js';
import * as yclients from '../yclients/yclients.service.js';
import { getServiceDuration } from '../yclients/service-durations.js';
import { nowInTz, bookingToDate } from '../../lib/timezone.js';

const log = createModuleLogger('booking');

interface CreateBookingParams {
  telegramId: number;
  masterId: number;
  serviceIds: number[];
  date: string;
  time: string;
  phone?: string;
  comment?: string;
  pdConsent?: boolean;
  rescheduleBookingId?: string;
}

export async function createBooking(params: CreateBookingParams) {
  // Get user
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(params.telegramId) },
  });

  if (!user) throw new Error('User not found');

  // Get services info for the booking log
  const allServices = await yclients.getServices(params.masterId);
  const selectedServices = allServices
    .filter((s: any) => params.serviceIds.includes(s.id))
    .map((s: any) => ({
      serviceId: s.id,
      name: s.title,
      price: s.price_min || s.price,
      duration: getServiceDuration(s),
    }));

  const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + s.duration, 0);

  const phone = params.phone || user.phone || '';
  const fullname = [user.firstName, user.lastName].filter(Boolean).join(' ');

  // Create record in YCLIENTS
  const datetime = `${params.date} ${params.time}:00`;
  const yclientsRecord = await yclients.createRecord({
    phone,
    fullname,
    staffId: params.masterId,
    serviceIds: params.serviceIds,
    datetime,
    totalDuration,
    comment: params.comment,
  });

  // Save to local DB
  const booking = await prisma.bookingLog.create({
    data: {
      telegramId: BigInt(params.telegramId),
      yclientsRecordId: yclientsRecord.id || null,
      masterId: params.masterId,
      services: JSON.stringify(selectedServices),
      bookingDate: new Date(params.date),
      bookingTime: params.time,
      status: 'pending',
      totalPrice,
      totalDuration,
    },
  });

  // Update user phone and PD consent if needed
  const userUpdates: Record<string, any> = {};
  if (params.phone && !user.phone) userUpdates.phone = params.phone;
  if (params.pdConsent && !user.pdConsent) {
    userUpdates.pdConsent = true;
    userUpdates.pdConsentDate = new Date();
  }
  if (Object.keys(userUpdates).length > 0) {
    await prisma.user.update({
      where: { telegramId: BigInt(params.telegramId) },
      data: userUpdates,
    });
  }

  log.info({
    telegramId: params.telegramId,
    bookingId: booking.id,
    masterId: params.masterId,
    yclientsRecordId: yclientsRecord.id,
    rescheduleBookingId: params.rescheduleBookingId || null,
  }, 'Booking created');

  // Cancel old booking when rescheduling (skip 2-hour rule for reschedules)
  if (params.rescheduleBookingId) {
    try {
      const oldBooking = await prisma.bookingLog.findFirst({
        where: { id: params.rescheduleBookingId, telegramId: BigInt(params.telegramId) },
      });
      if (oldBooking && oldBooking.status !== 'cancelled' && oldBooking.status !== 'completed') {
        if (oldBooking.yclientsRecordId) {
          try {
            await yclients.deleteRecord(oldBooking.yclientsRecordId);
          } catch (delErr: any) {
            const status = delErr?.response?.status || delErr?.status;
            if (status !== 404) throw delErr;
            log.info({ yclientsRecordId: oldBooking.yclientsRecordId }, 'Old YCLIENTS record already deleted');
          }
        }
        await prisma.bookingLog.update({
          where: { id: params.rescheduleBookingId },
          data: { status: 'cancelled' },
        });
        log.info({ oldBookingId: params.rescheduleBookingId, newBookingId: booking.id }, 'Old booking cancelled (reschedule)');
      }
    } catch (err) {
      log.error({ err, rescheduleBookingId: params.rescheduleBookingId }, 'Failed to cancel old booking during reschedule');
    }
  }

  // Уведомления от бота отключены — салон использует wahelp
  // const servicesText = selectedServices.map((s: any) => s.name).join(', ');
  // sendBookingConfirmation(params.telegramId, { ... });

  return { booking, yclientsRecordId: yclientsRecord.id };
}

export async function getUserBookings(telegramId: number) {
  const bookings = await prisma.bookingLog.findMany({
    where: { telegramId: BigInt(telegramId) },
    orderBy: { bookingDate: 'desc' },
  });

  // Sync active bookings with YCLIENTS on-demand
  const activeWithYclients = bookings.filter(
    (b) => (b.status === 'pending' || b.status === 'confirmed') && b.yclientsRecordId
  );

  if (activeWithYclients.length > 0) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const records = await yclients.getRecords({ startDate: today });

      for (const booking of activeWithYclients) {
        const ycRecord = records.find((r: any) => r.id === booking.yclientsRecordId);
        // Not found = deleted from YCLIENTS, or found with deleted/attendance flags
        if (!ycRecord || ycRecord.deleted || ycRecord.attendance === -1) {
          await prisma.bookingLog.update({
            where: { id: booking.id },
            data: { status: 'cancelled' },
          });
          booking.status = 'cancelled';
          log.info({ bookingId: booking.id, found: !!ycRecord }, 'Booking synced as cancelled from YCLIENTS');
        }
      }
    } catch (err) {
      log.error({ err }, 'Failed to sync bookings on-demand');
    }
  }

  const active = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  );
  const past = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  return { active, past };
}

export async function cancelBooking(bookingId: string, telegramId: number) {
  const booking = await prisma.bookingLog.findFirst({
    where: { id: bookingId, telegramId: BigInt(telegramId) },
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw new Error('Cannot cancel this booking');
  }

  // Check 2-hour rule
  const bookingDateTime = bookingToDate(booking.bookingDate, booking.bookingTime);
  const twoHoursBefore = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);
  if (nowInTz() > twoHoursBefore) {
    throw new Error('Cannot cancel less than 2 hours before the appointment');
  }

  // Cancel in YCLIENTS (ignore 404 if already deleted by admin)
  if (booking.yclientsRecordId) {
    try {
      await yclients.deleteRecord(booking.yclientsRecordId);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 404) {
        log.info({ bookingId, yclientsRecordId: booking.yclientsRecordId }, 'YCLIENTS record already deleted');
      } else {
        throw err;
      }
    }
  }

  // Update local DB
  const updated = await prisma.bookingLog.update({
    where: { id: bookingId },
    data: { status: 'cancelled' },
  });

  log.info({ bookingId, telegramId }, 'Booking cancelled');

  // Уведомления от бота отключены — салон использует wahelp
  // sendCancellationNotice(...);

  return updated;
}
