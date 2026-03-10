import axios, { AxiosInstance } from 'axios';
import { config, hasYclientsTokens } from '../../config.js';
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
    cfg.headers['Authorization'] = `Bearer ${config.YCLIENTS_PARTNER_TOKEN}, User ${_userToken}`;
    return cfg;
  });

  _api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        log.warn('YCLIENTS token expired, attempting refresh');
      }
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

  const { data } = await getApi().get(`/staff/${salonId}`);
  const masters = data.data || data;
  setCache(cacheKey, masters, CACHE_TTL.MASTERS);
  log.info({ count: masters.length }, 'Masters fetched from YCLIENTS');
  return masters;
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

  const { data } = await getApi().get(`/services/${salonId}`, { params });
  const services = data.data || data;
  setCache(cacheKey, services, CACHE_TTL.SERVICES);
  log.info({ count: services.length }, 'Services fetched from YCLIENTS');
  return services;
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

  const params: Record<string, any> = { staff_id: masterId, date };
  if (serviceIds?.length) params.service_id = serviceIds[0];

  const { data } = await getApi().get(`/timetable/${salonId}`, { params });
  const slots = data.data || data;
  setCache(cacheKey, slots, CACHE_TTL.SLOTS);
  log.info({ masterId, date, count: slots.length }, 'Slots fetched from YCLIENTS');
  return slots;
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

  const { data } = await getApi().get(`/schedule/${salonId}`, { params: { staff_id: masterId } });
  const schedule = data.data || data;
  setCache(cacheKey, schedule, CACHE_TTL.SCHEDULE);
  return schedule;
}

export async function createRecord(params: {
  phone: string;
  fullname: string;
  staffId: number;
  serviceIds: number[];
  datetime: string;
  comment?: string;
}): Promise<any> {
  if (!hasYclientsTokens) {
    log.info({ staffId: params.staffId, datetime: params.datetime }, 'Mock record created');
    return createMockRecord({
      appointments: [{ staff_id: params.staffId, services: params.serviceIds, datetime: params.datetime }],
    });
  }

  const salonId = config.YCLIENTS_SALON_ID;
  const { data } = await getApi().post(`/records/${salonId}`, {
    phone: params.phone,
    fullname: params.fullname,
    email: '',
    type: 1,
    comment: params.comment || 'Запись через Telegram Mini App',
    appointments: [
      { id: 1, services: params.serviceIds, staff_id: params.staffId, datetime: params.datetime },
    ],
  });

  log.info({ staffId: params.staffId, datetime: params.datetime }, 'Record created in YCLIENTS');
  return data.data || data;
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
