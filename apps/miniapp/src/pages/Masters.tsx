import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMasters } from '../api/queries';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';
import Skeleton from '../components/Skeleton';
import type { Master } from '@harakiri/shared';

export default function MastersPage() {
  const setSelectedMaster = useBookingStore((s) => s.setSelectedMaster);
  const setStep = useBookingStore((s) => s.setStep);
  const { haptic, hideBackButton, hideMainButton } = useTelegram();

  useEffect(() => {
    hideBackButton();
    hideMainButton();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['masters'],
    queryFn: fetchMasters,
  });

  const selectMaster = (master: Master | null) => {
    haptic('medium');
    setSelectedMaster(master);
    setStep('services');
  };

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <h1 className="text-2xl font-bold font-display tracking-wide">ХАРАКИРИ</h1>
        <p className="text-harakiri-gray text-sm mt-1">Выберите мастера</p>
      </div>

      {/* "Any master" button */}
      <button
        onClick={() => selectMaster(null)}
        className="w-full bg-harakiri-card rounded-2xl p-4 mb-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-harakiri-red to-harakiri-red-dark flex items-center justify-center text-xl font-bold flex-shrink-0">
          ?
        </div>
        <div className="text-left">
          <div className="font-semibold">Любой мастер</div>
          <div className="text-harakiri-gray text-sm">Выберем наименее загруженного</div>
        </div>
      </button>

      {/* Error state */}
      {isError && (
        <div className="text-center py-8">
          <p className="text-harakiri-gray mb-3">Не удалось загрузить мастеров</p>
          <button onClick={() => refetch()} className="text-harakiri-red text-sm">
            Попробовать снова
          </button>
        </div>
      )}

      {/* Masters grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-harakiri-card rounded-2xl p-3">
              <Skeleton className="w-full aspect-square rounded-xl mb-3" />
              <Skeleton className="w-3/4 h-4 mb-2" />
              <Skeleton className="w-1/2 h-3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data?.masters.map((master) => (
            <button
              key={master.id}
              onClick={() => selectMaster(master)}
              className="bg-harakiri-card rounded-2xl p-3 text-left active:scale-[0.97] transition-transform"
            >
              {master.photo ? (
                <img
                  src={master.photo}
                  alt={master.name}
                  className="w-full aspect-square rounded-xl object-cover mb-3"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-3 text-3xl text-harakiri-gray">
                  {master.name.charAt(0)}
                </div>
              )}
              <div className="font-semibold text-sm">{master.name}</div>
              {master.specialization && (
                <div className="text-harakiri-gray text-xs mt-0.5">{master.specialization}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* My bookings link */}
      <button
        onClick={() => setStep('mybookings')}
        className="w-full mt-6 py-4 bg-harakiri-card rounded-2xl text-center text-harakiri-red text-base font-bold active:scale-[0.98] transition-transform"
      >
        Мои записи
      </button>
    </div>
  );
}
