import { prisma } from '../../lib/prisma.js';
import { createModuleLogger } from '../../lib/logger.js';
import * as yclients from '../yclients/yclients.service.js';
import { getServiceDuration } from '../yclients/service-durations.js';
import { sendBookingConfirmation, sendCancellationNotice } from '../notifications/notification.service.js';
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
  }, 'Booking created');

  // Send confirmation notification (non-blocking)
  let masterName = `Мастер #${params.masterId}`;
  try {
    const masters = await yclients.getMasters();
    const master = masters.find((m: any) => m.id === params.masterId);
    if (master?.name) masterName = master.name;
  } catch {}

  const servicesText = selectedServices.map((s: any) => s.name).join(', ');
  sendBookingConfirmation(params.telegramId, {
    masterName,
    services: servicesText,
    date: params.date,
    time: params.time,
    totalPrice,
  }).catch((err) => log.error({ err }, 'Failed to send booking confirmation'));

  return { booking, yclientsRecordId: yclientsRecord.id };
}

export async function getUserBookings(telegramId: number) {
  const now = new Date();

  const bookings = await prisma.bookingLog.findMany({
    where: { telegramId: BigInt(telegramId) },
    orderBy: { bookingDate: 'desc' },
  });

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

  // Cancel in YCLIENTS
  if (booking.yclientsRecordId) {
    await yclients.deleteRecord(booking.yclientsRecordId);
  }

  // Update local DB
  const updated = await prisma.bookingLog.update({
    where: { id: bookingId },
    data: { status: 'cancelled' },
  });

  log.info({ bookingId, telegramId }, 'Booking cancelled');

  // Send cancellation notification (non-blocking)
  let masterName = `Мастер #${booking.masterId}`;
  try {
    const masters = await yclients.getMasters();
    const master = masters.find((m: any) => m.id === booking.masterId);
    if (master?.name) masterName = master.name;
  } catch {}

  sendCancellationNotice(telegramId, {
    masterName,
    date: booking.bookingDate.toISOString().slice(0, 10),
    time: booking.bookingTime,
  }).catch((err) => log.error({ err }, 'Failed to send cancellation notice'));

  return updated;
}
