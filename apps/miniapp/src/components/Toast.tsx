import { useEffect, useState } from 'react';
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 3000);
  },
  hide: () => set({ message: null }),
}));

export default function Toast() {
  const { message, type } = useToast();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setExiting(false);
    } else if (visible) {
      setExiting(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  const colors = {
    success: 'bg-harakiri-success',
    error: 'bg-red-600',
    info: 'bg-harakiri-card border border-gray-600',
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] flex justify-center">
      <div
        className={`${colors[type]} rounded-xl px-4 py-3 text-sm text-white shadow-lg max-w-sm ${
          exiting ? 'toast-exit' : 'toast-enter'
        }`}
      >
        {message}
      </div>
    </div>
  );
}
