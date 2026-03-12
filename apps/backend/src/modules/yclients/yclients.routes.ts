import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.js';
import * as yclients from './yclients.service.js';
import { getServiceDuration } from './service-durations.js';

export async function yclientsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  // GET /api/masters
  app.get('/api/masters', async () => {
    const rawMasters = await yclients.getMasters();
    const masters = rawMasters
      .filter((m: any) => m.bookable && !m.fired && !m.hidden)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        photo: m.avatar || m.avatar_big || '',
        specialization: m.specialization || '',
      }));
    return { masters };
  });

  // GET /api/masters/:id
  app.get('/api/masters/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const masterId = parseInt(id, 10);

    const [rawMasters, rawServices] = await Promise.all([
      yclients.getMasters(),
      yclients.getServices(masterId),
    ]);

    const master = rawMasters.find((m: any) => m.id === masterId && m.bookable && !m.fired && !m.hidden);
    if (!master) {
      return reply.status(404).send({
        error: { code: 'MASTER_UNAVAILABLE', message: 'Master not found' },
      });
    }

    const services = mapServices(rawServices);

    return {
      master: { id: master.id, name: master.name, photo: master.avatar || '', specialization: master.specialization || '' },
      services,
    };
  });

  // GET /api/services
  app.get('/api/services', async (request) => {
    const { master_id } = request.query as { master_id?: string };
    const masterId = master_id ? parseInt(master_id, 10) : undefined;

    // masterId=0 means "any master" — fetch all services
    const rawServices = await yclients.getServices(masterId && masterId > 0 ? masterId : undefined);

    // Group by category
    const categoryMap = new Map<number, { id: number; name: string; services: any[] }>();
    for (const s of rawServices) {
      const catId = s.category_id || 0;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { id: catId, name: s.category?.title || 'Другое', services: [] });
      }
      categoryMap.get(catId)!.services.push({
        id: s.id,
        name: s.title,
        price: s.price_min || s.price,
        duration: getServiceDuration(s),
        categoryId: catId,
      });
    }

    return { categories: Array.from(categoryMap.values()) };
  });

  // GET /api/slots
  app.get('/api/slots', async (request) => {
    const query = request.query as { master_id: string; date: string; service_ids?: string };
    const masterId = parseInt(query.master_id, 10);
    const serviceIds = query.service_ids?.split(',').map(Number) || [];

    let slots: any[];

    if (masterId === 0) {
      // "Any master" — get slots from all masters, merge and deduplicate
      const rawMasters = await yclients.getMasters();
      const allSlots = await Promise.all(
        rawMasters.filter((m: any) => m.bookable && !m.fired && !m.hidden).map((m: any) =>
          yclients.getAvailableSlots(m.id, query.date, serviceIds).catch(() => [])
        )
      );
      // Merge: keep unique times, mark as available
      const timeSet = new Set<string>();
      for (const masterSlots of allSlots) {
        if (Array.isArray(masterSlots)) {
          for (const s of masterSlots) {
            const time = s.time || s.datetime?.slice(11, 16);
            if (time) timeSet.add(time);
          }
        }
      }
      slots = Array.from(timeSet)
        .sort()
        .map((time) => ({ time, available: true }));
    } else {
      const rawSlots = await yclients.getAvailableSlots(masterId, query.date, serviceIds);
      slots = Array.isArray(rawSlots)
        ? rawSlots.map((s: any) => ({ time: s.time || s.datetime?.slice(11, 16), available: true }))
        : [];
    }

    // Calculate total duration from services cache
    let totalDuration = 0;
    if (serviceIds.length > 0) {
      try {
        const allServices = await yclients.getServices(masterId > 0 ? masterId : undefined);
        totalDuration = allServices
          .filter((s: any) => serviceIds.includes(s.id))
          .reduce((sum: number, s: any) => sum + getServiceDuration(s), 0);
      } catch {
        totalDuration = serviceIds.length * 30;
      }
    }

    return { slots, totalDuration };
  });

  // GET /api/available-dates
  app.get('/api/available-dates', async (request) => {
    const { master_id } = request.query as { master_id: string };
    const masterId = parseInt(master_id, 10);

    if (masterId === 0) {
      // "Any master" — all days in next 14 days are potentially available
      const dates: { date: string; hasSlots: boolean }[] = [];
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push({ date: d.toISOString().slice(0, 10), hasSlots: true });
      }
      return { dates };
    }

    const schedule = await yclients.getSchedule(masterId);

    const dates: { date: string; hasSlots: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const hasSlots = Array.isArray(schedule)
        ? schedule.some((s: any) => s.date === dateStr)
        : true;
      dates.push({ date: dateStr, hasSlots });
    }

    return { dates };
  });
}

function mapServices(rawServices: any[]) {
  return rawServices.map((s: any) => ({
    id: s.id,
    name: s.title,
    price: s.price_min || s.price,
    duration: getServiceDuration(s),
    categoryId: s.category_id || 0,
  }));
}
