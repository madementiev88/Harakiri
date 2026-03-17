import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.js';
import * as bookingService from './booking.service.js';
import { getMasters } from '../yclients/yclients.service.js';

const createBookingSchema = z.object({
  masterId: z.number(),
  serviceIds: z.array(z.number()).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  phone: z.string().optional(),
  comment: z.string().optional(),
  pdConsent: z.boolean().optional(),
  rescheduleBookingId: z.string().optional(),
});

export async function bookingRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  // POST /api/bookings
  app.post('/api/bookings', async (request, reply) => {
    const body = createBookingSchema.parse(request.body);
    const { telegramId } = request.user as { telegramId: string };

    try {
      const result = await bookingService.createBooking({
        telegramId: parseInt(telegramId, 10),
        ...body,
      });

      return {
        booking: await formatBooking(result.booking),
        yclientsRecordId: result.yclientsRecordId,
      };
    } catch (err: any) {
      if (err.message?.includes('slot')) {
        return reply.status(409).send({
          error: { code: 'SLOT_UNAVAILABLE', message: err.message },
        });
      }
      throw err;
    }
  });

  // GET /api/bookings
  app.get('/api/bookings', async (request) => {
    const { telegramId } = request.user as { telegramId: string };
    const result = await bookingService.getUserBookings(parseInt(telegramId, 10));

    const [active, past] = await Promise.all([
      Promise.all(result.active.map(formatBooking)),
      Promise.all(result.past.map(formatBooking)),
    ]);

    return { active, past };
  });

  // DELETE /api/bookings/:id
  app.delete('/api/bookings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { telegramId } = request.user as { telegramId: string };

    try {
      await bookingService.cancelBooking(id, parseInt(telegramId, 10));
      return { success: true };
    } catch (err: any) {
      if (err.message?.includes('2 hours')) {
        return reply.status(400).send({
          error: { code: 'BOOKING_CANCEL_TOO_LATE', message: err.message },
        });
      }
      throw err;
    }
  });
}

async function formatBooking(b: any) {
  let masterName = '';
  try {
    const masters = await getMasters();
    const master = masters.find((m: any) => m.id === b.masterId);
    masterName = master?.name || `Мастер #${b.masterId}`;
  } catch {
    masterName = `Мастер #${b.masterId}`;
  }

  return {
    id: b.id,
    masterId: b.masterId,
    masterName,
    services: typeof b.services === 'string' ? JSON.parse(b.services) : b.services,
    date: b.bookingDate instanceof Date ? b.bookingDate.toISOString().slice(0, 10) : b.bookingDate,
    time: b.bookingTime,
    status: b.status,
    totalPrice: b.totalPrice,
    totalDuration: b.totalDuration,
    yclientsRecordId: b.yclientsRecordId,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}
