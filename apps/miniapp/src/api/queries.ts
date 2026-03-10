import apiClient, { setAuthToken } from './client';
import type {
  AuthResponse,
  MastersResponse,
  MasterDetailResponse,
  ServicesResponse,
  SlotsResponse,
  BookingsListResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  AvailableDate,
} from '@harakiri/shared';

export async function authenticate(initData: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth', { initData });
  setAuthToken(data.token);
  return data;
}

export async function fetchMasters(): Promise<MastersResponse> {
  const { data } = await apiClient.get<MastersResponse>('/masters');
  return data;
}

export async function fetchMasterDetail(id: number): Promise<MasterDetailResponse> {
  const { data } = await apiClient.get<MasterDetailResponse>(`/masters/${id}`);
  return data;
}

export async function fetchServices(masterId?: number): Promise<ServicesResponse> {
  const params = masterId ? { master_id: masterId } : {};
  const { data } = await apiClient.get<ServicesResponse>('/services', { params });
  return data;
}

export async function fetchSlots(masterId: number, date: string, serviceIds: number[]): Promise<SlotsResponse> {
  const { data } = await apiClient.get<SlotsResponse>('/slots', {
    params: { master_id: masterId, date, service_ids: serviceIds.join(',') },
  });
  return data;
}

export async function fetchAvailableDates(masterId: number): Promise<{ dates: AvailableDate[] }> {
  const { data } = await apiClient.get<{ dates: AvailableDate[] }>('/available-dates', {
    params: { master_id: masterId },
  });
  return data;
}

export async function createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
  const { data } = await apiClient.post<CreateBookingResponse>('/bookings', params);
  return data;
}

export async function fetchBookings(): Promise<BookingsListResponse> {
  const { data } = await apiClient.get<BookingsListResponse>('/bookings');
  return data;
}

export async function cancelBooking(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/bookings/${id}`);
  return data;
}
