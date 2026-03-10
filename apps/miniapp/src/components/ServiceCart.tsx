import { useBookingStore } from '../store/booking';

export default function ServiceCart() {
  const cart = useBookingStore((s) => s.cart);
  const totalPrice = useBookingStore((s) => s.totalPrice);
  const totalDuration = useBookingStore((s) => s.totalDuration);
  const setStep = useBookingStore((s) => s.setStep);

  if (cart.length === 0) return null;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} мин`;
    if (m === 0) return `${h}ч`;
    return `${h}ч ${m}мин`;
  };

  const plural = (n: number) => {
    if (n === 1) return 'услуга';
    if (n >= 2 && n <= 4) return 'услуги';
    return 'услуг';
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-harakiri-card/95 backdrop-blur-lg border-t border-gray-700/50 p-4 z-50 cart-enter"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-harakiri-gray">
            {cart.length} {plural(cart.length)} · {formatDuration(totalDuration())}
          </div>
          <div className="text-lg font-bold">{totalPrice().toLocaleString('ru-RU')} ₽</div>
        </div>
        <button
          onClick={() => setStep('datetime')}
          className="bg-harakiri-red text-white px-6 py-3 rounded-xl font-semibold active:scale-[0.97] transition-transform whitespace-nowrap flex-shrink-0"
        >
          Далее
        </button>
      </div>
    </div>
  );
}
