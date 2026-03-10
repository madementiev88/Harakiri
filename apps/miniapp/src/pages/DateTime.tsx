import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAvailableDates, fetchSlots } from '../api/queries';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';
import Skeleton from '../components/Skeleton';

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export default function DateTimePage() {
  const selectedMaster = useBookingStore((s) => s.selectedMaster);
  const selectedDate = useBookingStore((s) => s.selectedDate);
  const selectedTime = useBookingStore((s) => s.selectedTime);
  const setSelectedDate = useBookingStore((s) => s.setSelectedDate);
  const setSelectedTime = useBookingStore((s) => s.setSelectedTime);
  const cart = useBookingStore((s) => s.cart);
  const totalDuration = useBookingStore((s) => s.totalDuration);
  const setStep = useBookingStore((s) => s.setStep);
  const { haptic, showBackButton, hideMainButton } = useTelegram();

  useEffect(() => {
    hideMainButton();
    showBackButton(() => setStep('services'));
  }, []);

  // Use masterId 0 for "any master" — backend handles this
  const masterId = selectedMaster?.id || 0;
  const serviceIds = cart.map((item) => item.service.id);

  const { data: datesData, isLoading: datesLoading } = useQuery({
    queryKey: ['available-dates', masterId],
    queryFn: () => fetchAvailableDates(masterId),
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', masterId, selectedDate, serviceIds],
    queryFn: () => fetchSlots(masterId, selectedDate!, serviceIds),
    enabled: !!selectedDate,
  });

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return {
      weekday: dateStr === today ? 'Сегодня' : dateStr === tomorrow ? 'Завтра' : WEEKDAYS[d.getDay()],
      day: d.getDate(),
      month: MONTHS[d.getMonth()],
    };
  };

  const handleDateSelect = (date: string) => {
    haptic('light');
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    haptic('medium');
    setSelectedTime(time);
    setStep('confirm');
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1">Дата и время</h1>
      <p className="text-harakiri-gray text-sm mb-1">
        {selectedMaster ? selectedMaster.name : 'Любой мастер'}
      </p>
      <p className="text-harakiri-gray text-xs mb-4">
        {cart.length} {cart.length === 1 ? 'услуга' : cart.length < 5 ? 'услуги' : 'услуг'}, ~{totalDuration()} мин
      </p>

      {/* Horizontal date picker */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
          {datesLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[64px] h-[72px] rounded-xl flex-shrink-0" />
            ))
          ) : (
            datesData?.dates.map(({ date, hasSlots }) => {
              const { weekday, day } = formatDateLabel(date);
              const isSelected = selectedDate === date;
              return (
                <button
                  key={date}
                  onClick={() => hasSlots && handleDateSelect(date)}
                  disabled={!hasSlots}
                  className={`min-w-[64px] py-2.5 px-3 rounded-xl flex flex-col items-center flex-shrink-0 transition-all duration-150 ${
                    isSelected
                      ? 'bg-harakiri-red text-white scale-105'
                      : hasSlots
                      ? 'bg-harakiri-card text-white active:scale-95'
                      : 'bg-harakiri-card/50 text-gray-600'
                  }`}
                >
                  <span className="text-[10px] leading-tight">{weekday}</span>
                  <span className="text-lg font-bold leading-tight mt-0.5">{day}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Time slots grid */}
      {selectedDate && (
        <div>
          <h2 className="text-sm text-harakiri-gray mb-3">
            {(() => {
              const { day, month } = formatDateLabel(selectedDate);
              return `Свободное время — ${day} ${month}`;
            })()}
          </h2>
          {slotsLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-xl" />
              ))}
            </div>
          ) : slotsData?.slots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-harakiri-gray text-sm">Нет свободных слотов</p>
              <p className="text-harakiri-gray text-xs mt-1">Попробуйте другую дату</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slotsData?.slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && handleTimeSelect(slot.time)}
                  disabled={!slot.available}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    selectedTime === slot.time
                      ? 'bg-harakiri-red text-white scale-105'
                      : slot.available
                      ? 'bg-harakiri-card text-white active:scale-95'
                      : 'bg-harakiri-card/50 text-gray-600'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint if no date selected */}
      {!selectedDate && !datesLoading && (
        <div className="text-center py-12">
          <p className="text-harakiri-gray text-sm">Выберите дату из списка выше</p>
        </div>
      )}
    </div>
  );
}
