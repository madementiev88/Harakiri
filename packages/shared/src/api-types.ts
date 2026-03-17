// === Auth ===
export interface AuthRequest {
  initData: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

// === User ===
export interface User {
  telegramId: number;
  firstName: string;
  lastName?: string;
  phone?: string;
  pdConsent: boolean;
}

// === Master ===
export interface Master {
  id: number;
  name: string;
  photo: string;
  specialization: string;
}

// === Service ===
export interface Service {
  id: number;
  name: string;
  price: number;
  duration: number; // minutes
  categoryId: number;
}

export interface ServiceCategory {
  id: number;
  name: string;
  services: Service[];
}

// === Slots ===
export interface TimeSlot {
  time: string; // "HH:MM"
  available: boolean;
}

export interface AvailableDate {
  date: string; // "YYYY-MM-DD"
  hasSlots: boolean;
}

export interface SlotsResponse {
  slots: TimeSlot[];
  totalDuration: number;
}

// === Booking ===
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface BookingService {
  serviceId: number;
  name: string;
  price: number;
  duration: number;
}

export interface Booking {
  id: string;
  masterId: number;
  masterName: string;
  services: BookingService[];
  date: string;
  time: string;
  status: BookingStatus;
  totalPrice: number;
  totalDuration: number;
  yclientsRecordId?: number;
  createdAt: string;
}

export interface CreateBookingRequest {
  masterId: number;
  serviceIds: number[];
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  phone?: string;
  comment?: string;
  rescheduleBookingId?: string;
}

export interface CreateBookingResponse {
  booking: Booking;
  yclientsRecordId: number;
}

export interface BookingsListResponse {
  active: Booking[];
  past: Booking[];
}

// === API Error ===
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'SLOT_UNAVAILABLE'
  | 'MASTER_UNAVAILABLE'
  | 'YCLIENTS_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'BOOKING_CANCEL_TOO_LATE';

// === Masters API ===
export interface MastersResponse {
  masters: Master[];
}

export interface MasterDetailResponse {
  master: Master;
  services: Service[];
}

// === Services API ===
export interface ServicesResponse {
  categories: ServiceCategory[];
}
