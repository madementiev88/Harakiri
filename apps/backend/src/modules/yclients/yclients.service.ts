import axios, { AxiosInstance } from 'axios';
import { config, hasPartnerToken, hasYclientsTokens } from '../../config.js';
import { createModuleLogger } from '../../lib/logger.js';
import { getCache, setCache, CACHE_TTL } from '../../lib/cache.js';
import { mockMasters, mockServices, generateMockSlots, generateMockSchedule, createMockRecord } from './yclients.mock.js';

const log = createModuleLogger('yclients');

const YCLIENTS_BASE_URL = 'https://api.yclients.com/api/v1';

let _api: AxiosInstance | null = null;
let _userToken: string;

function getApi(): AxiosInstance {
  if (_api) return _api;

  _userToken = config.YCLIENTS_USER_TOKEN;

  _api = axios.create({
    baseURL: YCLIENTS_BASE_URL,
    headers: {
      'Accept': 'application/vnd.yclients.v2+json',
      'Content-Type': 'application/json',
    },
  });

  _api.interceptors.request.use((cfg) => {
    cfg.headers['Authorization'] = _userToken
      ? `Bearer ${config.YCLIENTS_PARTNER_TOKEN}, User ${_userToken}`
      : `Bearer ${config.YCLIENTS_PARTNER_TOKEN}`;
    return cfg;
  });

  _api.interceptors.response.use(
    (response) => response,
    async (error) => {
      log.warn({
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.meta?.message || error.message,
      }, 'YCLIENTS API request failed');
      throw error;
    }
  );

  return _api;
}

export async function getMasters(): Promise<any[]> {
  const salonId = config.YCLIENTS_SALON_ID;
  const cacheKey = `masters_${salonId}`;
  const cached = getCache<any[]>(cacheKey);
  if (cached) return cached;

  if (!hasYclientsTokens) {
    log.debug('Using mock masters (no YCLIENTS tokens)');
    setCache(cacheKey, mockMasters, CACHE_TTL.MASTERS);
    return mockMasters;
  }

  try {
    const { data } = await getApi().get(`/book_staff/${salonId}`);
    const masters = data.data || data;
    setCache(cacheKey, masters, CACHE_TTL.MASTERS);
    log.info({ count: masters.length }, 'Masters fetched from YCLIENTS');
    return masters;
  } catch (err: any) {
    log.warn({ err: err.message, status: err.response?.status }, 'YCLIENTS getMasters failed, using mock data');
    setCache(cacheKey, mockMasters, CACHE_TTL.MASTERS);
    return mockMasters;
  }
}

export async function getServices(masterId?: number): Promise<any[]> {
  const salonId = config.YCLIENTS_SALON_ID;
  const cacheKey = masterId ? `services_${salonId}_${masterId}` : `services_${salonId}`;
  const cached = getCache<any[]>(cacheKey);
  if (cached) return cached;

  if (!hasYclientsTokens) {
    log.debug('Using mock services (no YCLIENTS tokens)');
    setCache(cacheKey, mockServices, CACHE_TTL.SERVICES);
    return mockServices;
  }

  const params: Record<string, any> = {};
  if (masterId) params.staff_id = masterId;

  try {
    const { data } = await getApi().get(`/book_services/${salonId}`, { params });
    const raw = data.data || data;
    // book_services returns { services: [], category: [] } or flat array
    const services = Array.isArray(raw) ? raw : (raw.services || []);
    // Merge category titles into services
    if (!Array.isArray(raw) && raw.category) {
      const catMap = new Map(raw.category.map((c: any) => [c.id, c.title]));
      for (const s of services) {
        if (s.category_id && !s.category) {
          s.category = { id: s.category_id, title: catMap.get(s.category_id) || 'Другое' };
        }
      }
    }
    setCache(cacheKey, services, CACHE_TTL.SERVICES);
    log.info({ count: services.length }, 'Services fetched from YCLIENTS');
    return services;
  } catch (err: any) {
    log.warn({ err: err.message, status: err.response?.status }, 'YCLIENTS getServices failed, using mock data');
    setCache(cacheKey, mockServices, CACHE_TTL.SERVICES);
    return mockServices;
  }
}

export async function getAvailableSlots(masterId: number, date: string, serviceIds?: number[]): Promise<any[]> {
  const salonId = config.YCLIENTS_SALON_ID;
  const cacheKey = `slots_${salonId}_${masterId}_${date}_${(serviceIds || []).join(',')}`;
  const cached = getCache<any[]>(cacheKey);
  if (cached) return cached;

  if (!hasYclientsTokens) {
    const slots = generateMockSlots(date);
    setCache(cacheKey, slots, CACHE_TTL.SLOTS);
    return slots;
  }

  const params: Record<string, any> = {};
  if (serviceIds?.length) params.service_ids = serviceIds;

  try {
    const { data } = await getApi().get(`/book_times/${salonId}/${masterId}/${date}`, { params });
    const slots = data.data || data;
    setCache(cacheKey, slots, CACHE_TTL.SLOTS);
    log.info({ masterId, date, count: slots.length }, 'Slots fetched from YCLIENTS');
    return slots;
  } catch (err: any) {
    log.warn({ err: err.message, status: err.response?.status }, 'YCLIENTS getAvailableSlots failed, using mock data');
    const fallback = generateMockSlots(date);
    setCache(cacheKey, fallback, CACHE_TTL.SLOTS);
    return fallback;
  }
}

export async function getSchedule(masterId: number): Promise<any[]> {
  const salonId = config.YCLIENTS_SALON_ID;
  const cacheKey = `schedule_${salonId}_${masterId}`;
  const cached = getCache<any[]>(cacheKey);
  if (cached) return cached;

  if (!hasYclientsTokens) {
    const schedule = generateMockSchedule();
    setCache(cacheKey, schedule, CACHE_TTL.SCHEDULE);
    return schedule;
  }

  try {
    const { data } = await getApi().get(`/book_dates/${salonId}`, { params: { staff_id: masterId } });
    const raw = data.data || data;
    // book_dates returns { booking_dates: ["2026-03-13", ...], booking_days: {...} }
    const schedule = Array.isArray(raw) ? raw
      : (raw.booking_dates || []).map((d: string) => ({ date: d }));
    setCache(cacheKey, schedule, CACHE_TTL.SCHEDULE);
    return schedule;
  } catch (err: any) {
    log.warn({ err: err.message, status: err.response?.status }, 'YCLIENTS getSchedule failed, using mock data');
    const fallback = generateMockSchedule();
    setCache(cacheKey, fallback, CACHE_TTL.SCHEDULE);
    return fallback;
  }
}

export async function createRecord(params: {
  phone: string;
  fullname: string;
  staffId: number;
  serviceIds: number[];
  datetime: string;
  totalDuration?: number;
  comment?: string;
}): Promise<any> {
  if (!hasYclientsTokens) {
    log.info({ staffId: params.staffId, datetime: params.datetime }, 'Mock record created');
    return createMockRecord({
      appointments: [{ staff_id: params.staffId, services: params.serviceIds, datetime: params.datetime }],
    });
  }

  const salonId = config.YCLIENTS_SALON_ID;
  const seanceLength = (params.totalDuration || 60) * 60; // convert minutes to seconds
  const body = {
    staff_id: params.staffId,
    services: params.serviceIds.map(id => ({ id })),
    client: {
      phone: params.phone,
      name: params.fullname,
    },
    datetime: params.datetime,
    seance_length: seanceLength,
    save_if_busy: false,
    comment: params.comment || 'Запись через Telegram Mini App',
  };

  try {
    const { data } = await getApi().post(`/records/${salonId}`, body);
    log.info({ staffId: params.staffId, datetime: params.datetime }, 'Record created in YCLIENTS');
    return data.data || data;
  } catch (err: any) {
    log.error({
      status: err.response?.status,
      responseData: err.response?.data,
      body,
    }, 'YCLIENTS createRecord failed');
    throw err;
  }
}

export async function deleteRecord(recordId: number): Promise<any> {
  if (!hasYclientsTokens) {
    log.info({ recordId }, 'Mock record deleted');
    return { success: true };
  }

  const salonId = config.YCLIENTS_SALON_ID;
  const { data } = await getApi().delete(`/record/${salonId}/${recordId}`);
  log.info({ recordId }, 'Record deleted in YCLIENTS');
  return data;
}

export async function getRecords(params?: { clientId?: number; startDate?: string; endDate?: string }): Promise<any[]> {
  if (!hasYclientsTokens) return [];

  const salonId = config.YCLIENTS_SALON_ID;
  const { data } = await getApi().get(`/records/${salonId}`, { params });
  return data.data || data;
}

export async function createYclientsClient(params: { name: string; phone: string }): Promise<any> {
  if (!hasYclientsTokens) {
    return { id: Date.now(), name: params.name, phone: params.phone };
  }

  const salonId = config.YCLIENTS_SALON_ID;
  const { data } = await getApi().post(`/clients/${salonId}`, {
    name: params.name,
    phone: params.phone,
  });
  log.info({ phone: params.phone }, 'Client created in YCLIENTS');
  return data.data || data;
}
