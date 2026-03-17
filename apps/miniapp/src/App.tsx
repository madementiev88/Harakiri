import { useEffect, useState, useRef } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useBookingStore, BookingStep } from './store/booking';
import { authenticate } from './api/queries';
import MastersPage from './pages/Masters';
import ServicesPage from './pages/Services';
import DateTimePage from './pages/DateTime';
import ConfirmPage from './pages/Confirm';
import SuccessPage from './pages/Success';
import MyBookingsPage from './pages/MyBookings';
import Toast from './components/Toast';

const STEP_ORDER: BookingStep[] = ['masters', 'services', 'datetime', 'confirm', 'success', 'mybookings'];

export default function App() {
  const { initTelegram, initData } = useTelegram();
  const step = useBookingStore((s) => s.step);
  const [loading, setLoading] = useState(true);
  const [animClass, setAnimClass] = useState('page-active');
  const [displayStep, setDisplayStep] = useState<BookingStep>(step);
  const prevStepRef = useRef<BookingStep>(step);

  useEffect(() => {
    initTelegram();

    async function auth() {
      try {
        let result;
        if (initData) {
          result = await authenticate(initData);
        } else if (import.meta.env.DEV) {
          result = await authenticate('dev');
        }
        // Pre-fill phone from saved user data
        if (result?.user?.phone) {
          useBookingStore.getState().setPhone(result.user.phone);
        }
      } catch (err) {
        console.error('Auth failed:', err);
      } finally {
        setLoading(false);
      }
    }

    auth();
  }, []);

  useEffect(() => {
    if (step === displayStep) return;

    const prevIdx = STEP_ORDER.indexOf(prevStepRef.current);
    const nextIdx = STEP_ORDER.indexOf(step);
    const isForward = nextIdx > prevIdx || step === 'mybookings';

    setAnimClass(isForward ? 'page-exit-left' : 'page-exit-right');

    const timer = setTimeout(() => {
      setDisplayStep(step);
      setAnimClass(isForward ? 'page-enter-right' : 'page-enter-left');
      prevStepRef.current = step;

      setTimeout(() => setAnimClass('page-active'), 20);
    }, 150);

    return () => clearTimeout(timer);
  }, [step, displayStep]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl font-bold font-display mb-2">ХАРАКИРИ</div>
          <div className="skeleton w-32 h-3 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  const pages: Record<BookingStep, JSX.Element> = {
    masters: <MastersPage />,
    services: <ServicesPage />,
    datetime: <DateTimePage />,
    confirm: <ConfirmPage />,
    success: <SuccessPage />,
    mybookings: <MyBookingsPage />,
  };

  return (
    <div className="min-h-screen bg-harakiri-bg overflow-hidden">
      <div className={`page-transition ${animClass}`}>
        {pages[displayStep] || <MastersPage />}
      </div>
      <Toast />
    </div>
  );
}
