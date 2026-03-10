import { useEffect } from 'react';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export default function SuccessPage() {
  const { selectedMaster, cart, selectedDate, selectedTime, totalPrice, setStep, reset } = useBookingStore();
  const { hideBackButton, hideMainButton, hapticSuccess } = useTelegram();

  useEffect(() => {
    hideBackButton();
    hideMainButton();
    hapticSuccess();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-screen">
      {/* Success animation */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-harakiri-success flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16L13 23L26 9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-harakiri-success/30 animate-ping" />
      </div>

      <h1 className="text-2xl font-bold mb-1">Запись создана!</h1>
      <p className="text-harakiri-gray text-sm mb-8">Мы отправим напоминание</p>

      {/* Booking card */}
      <div className="bg-harakiri-card rounded-2xl p-4 w-full mb-8">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-harakiri-gray">Мастер</span>
            <span>{selectedMaster?.name || 'Любой мастер'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-harakiri-gray">Услуги</span>
            <span className="text-right max-w-[60%]">{cart.map((i) => i.service.name).join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-harakiri-gray">Дата</span>
            <span>{selectedDate && formatDate(selectedDate)}, {selectedTime}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-700/50">
            <span>Итого</span>
            <span className="text-harakiri-red">{totalPrice().toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={() => setStep('mybookings')}
          className="w-full py-3.5 bg-harakiri-card rounded-xl font-medium active:scale-[0.98] transition-transform"
        >
          Мои записи
        </button>
        <button
          onClick={() => reset()}
          className="w-full py-3 text-harakiri-gray text-sm active:opacity-70"
        >
          Записаться ещё
        </button>
      </div>
    </div>
  );
}
