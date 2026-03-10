import { create } from 'zustand';
import type { Master, Service, BookingService } from '@harakiri/shared';

export type BookingStep = 'masters' | 'services' | 'datetime' | 'confirm' | 'success' | 'mybookings';

interface CartItem {
  service: Service;
}

interface BookingState {
  // Navigation
  step: BookingStep;
  setStep: (step: BookingStep) => void;

  // Selected master
  selectedMaster: Master | null;
  setSelectedMaster: (master: Master | null) => void;

  // Cart (services)
  cart: CartItem[];
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: number) => void;
  clearCart: () => void;
  isInCart: (serviceId: number) => boolean;
  totalPrice: () => number;
  totalDuration: () => number;

  // Date & Time
  selectedDate: string | null;
  selectedTime: string | null;
  setSelectedDate: (date: string | null) => void;
  setSelectedTime: (time: string | null) => void;

  // Phone
  phone: string | null;
  setPhone: (phone: string | null) => void;

  // Reschedule
  rescheduleBookingId: string | null;
  setRescheduleBookingId: (id: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  step: 'masters' as BookingStep,
  selectedMaster: null as Master | null,
  cart: [] as CartItem[],
  selectedDate: null as string | null,
  selectedTime: null as string | null,
  phone: null as string | null,
  rescheduleBookingId: null as string | null,
};

export const useBookingStore = create<BookingState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setSelectedMaster: (master) => set({ selectedMaster: master }),

  addToCart: (service) => {
    const { cart } = get();
    if (!cart.find((item) => item.service.id === service.id)) {
      set({ cart: [...cart, { service }] });
    }
  },

  removeFromCart: (serviceId) => {
    set({ cart: get().cart.filter((item) => item.service.id !== serviceId) });
  },

  clearCart: () => set({ cart: [] }),

  isInCart: (serviceId) => get().cart.some((item) => item.service.id === serviceId),

  totalPrice: () => get().cart.reduce((sum, item) => sum + item.service.price, 0),

  totalDuration: () => get().cart.reduce((sum, item) => sum + item.service.duration, 0),

  setSelectedDate: (date) => set({ selectedDate: date, selectedTime: null }),

  setSelectedTime: (time) => set({ selectedTime: time }),

  setPhone: (phone) => set({ phone }),

  setRescheduleBookingId: (id) => set({ rescheduleBookingId: id }),

  reset: () => set(initialState),
}));
