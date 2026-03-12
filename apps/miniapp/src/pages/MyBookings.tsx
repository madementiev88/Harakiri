import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBookings, cancelBooking } from '../api/queries';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import type { Booking } from '@harakiri/shared';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: 'Ожидает', color: 'text-yellow-400' },
  confirmed: { text: 'Подтверждена', color: 'text-harakiri-success' },
  cancelled: { text: 'Отменена', color: 'text-red-400' },
  completed: { text: 'Завершена', color: 'text-harakiri-gray' },
};

export default function MyBookingsPage() {
  const { setStep, setSelectedMaster, setRescheduleBookingId, reset } = useBookingStore();
  const { showBackButton, hideMainButton, showConfirm, haptic } = useTelegram();
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    hideMainButton();
    showBackButton(() => reset());
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.show('Запись отменена', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || 'Не удалось отменить запись';
      toast.show(msg, 'error');
    },
  });

  const handleCancel = (booking: Booking) => {
    showConfirm('Вы уверены, что хотите отменить запись?').then((confirmed) => {
      if (confirmed) {
        haptic('heavy');
        cancelMutation.mutate(booking.id);
      }
    });
  };

  const handleReschedule = (booking: Booking) => {
    haptic('medium');
    setRescheduleBookingId(booking.id);
    setSelectedMaster({
      id: booking.masterId,
      name: booking.masterName || `Мастер #${booking.masterId}`,
      photo: '',
      specialization: '',
    });
    setStep('services');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  const canModify = (booking: Booking) => {
    const dt = new Date(`${booking.date}T${booking.time}:00`);
    const twoHoursBefore = new Date(dt.getTime() - 2 * 60 * 60 * 1000);
    return new Date() < twoHoursBefore;
  };

  const renderBooking = (booking: Booking, showActions: boolean) => {
    const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
    return (
      <div key={booking.id} className="bg-harakiri-card rounded-2xl p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-semibold text-sm">{booking.masterName || `Мастер #${booking.masterId}`}</div>
            <div className="text-sm text-harakiri-gray">
              {formatDate(booking.date)}, {booking.time}
            </div>
          </div>
          <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
        </div>

        <div className="text-sm text-harakiri-gray mb-3">
          {booking.services.map((s) => s.name).join(', ')}
        </div>

        <div className="flex justify-between items-center">
          <span className="font-bold">{booking.totalPrice.toLocaleString('ru-RU')} ₽</span>

          {showActions && canModify(booking) && (
            <div className="flex gap-2">
              <button
                onClick={() => handleReschedule(booking)}
                className="px-3 py-1.5 text-xs bg-harakiri-bg rounded-lg text-harakiri-gray active:bg-gray-600 transition-colors"
              >
                Перенести
              </button>
              <button
                onClick={() => handleCancel(booking)}
                disabled={cancelMutation.isPending}
                className="px-3 py-1.5 text-xs bg-red-900/30 rounded-lg text-red-400 active:bg-red-900/50 transition-colors"
              >
                Отменить
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">Мои записи</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="w-full h-32 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-harakiri-gray mb-3">Не удалось загрузить записи</p>
          <button onClick={() => refetch()} className="text-harakiri-red text-sm">
            Попробовать снова
          </button>
        </div>
      ) : (
        <>
          {/* Active bookings */}
          {data?.active && data.active.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-sm text-harakiri-gray mb-3">Активные</h2>
              {data.active.map((b) => renderBooking(b, true))}
            </div>
          ) : (
            <div className="text-center py-12 mb-6">
              <div className="text-4xl mb-3 opacity-30">✂️</div>
              <p className="text-harakiri-gray mb-4">У вас нет активных записей</p>
              <button
                onClick={() => reset()}
                className="bg-harakiri-red text-white px-6 py-3 rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Записаться
              </button>
            </div>
          )}

          {/* Past bookings */}
          {data?.past && data.past.length > 0 && (
            <div>
              <h2 className="text-sm text-harakiri-gray mb-3">Архив</h2>
              {data.past.map((b) => renderBooking(b, false))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
