import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createBooking } from '../api/queries';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';
import PhoneInput from '../components/PhoneInput';
import { useToast } from '../components/Toast';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export default function ConfirmPage() {
  const { selectedMaster, cart, selectedDate, selectedTime, phone, setPhone, setStep, totalPrice, totalDuration } = useBookingStore();
  const { user, haptic, hapticSuccess, hapticError, showBackButton, hideMainButton, requestContact } = useTelegram();
  const toast = useToast();
  const [pdConsent, setPdConsent] = useState(false);
  const [phoneInput, setPhoneInput] = useState(phone || '');
  const [needsPhone, setNeedsPhone] = useState(!phone);

  useEffect(() => {
    hideMainButton();
    showBackButton(() => setStep('datetime'));
  }, []);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      hapticSuccess();
      setStep('success');
    },
    onError: (err: any) => {
      hapticError();
      const msg = err?.response?.data?.error?.message || 'Ошибка при создании записи';
      toast.show(msg, 'error');
    },
  });

  const handleRequestPhone = async () => {
    const contactPhone = await requestContact();
    if (contactPhone) {
      setPhone(contactPhone);
      setPhoneInput(contactPhone);
      setNeedsPhone(false);
    } else {
      setNeedsPhone(true);
    }
  };

  const isPhoneValid = () => {
    const digits = (phoneInput || phone || '').replace(/\D/g, '');
    return digits.length === 11;
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    if (!pdConsent) {
      toast.show('Необходимо согласие на обработку данных', 'error');
      return;
    }

    const finalPhone = phoneInput || phone;
    if (!finalPhone || !isPhoneValid()) {
      if (!needsPhone) {
        handleRequestPhone();
      } else {
        toast.show('Укажите номер телефона', 'error');
      }
      return;
    }

    haptic('heavy');
    mutation.mutate({
      masterId: selectedMaster?.id || 0,
      serviceIds: cart.map((item) => item.service.id),
      date: selectedDate,
      time: selectedTime,
      phone: finalPhone,
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} мин`;
    if (m === 0) return `${h}ч`;
    return `${h}ч ${m}мин`;
  };

  const canSubmit = pdConsent && isPhoneValid() && !mutation.isPending;

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold mb-4">Подтверждение</h1>

      {/* Booking summary card */}
      <div className="bg-harakiri-card rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-harakiri-gray text-sm">Мастер</span>
          <span className="font-medium text-sm">{selectedMaster?.name || 'Любой мастер'}</span>
        </div>

        <div className="border-t border-gray-700/50 pt-3">
          <span className="text-harakiri-gray text-sm block mb-2">Услуги</span>
          {cart.map((item) => (
            <div key={item.service.id} className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-300">{item.service.name}</span>
              <span className="font-medium">{item.service.price.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700/50 pt-3 flex justify-between items-center">
          <span className="text-harakiri-gray text-sm">Дата и время</span>
          <span className="font-medium text-sm">
            {selectedDate && formatDate(selectedDate)}, {selectedTime}
          </span>
        </div>

        <div className="border-t border-gray-700/50 pt-3 flex justify-between items-center">
          <span className="text-harakiri-gray text-sm">Длительность</span>
          <span className="font-medium text-sm">{formatDuration(totalDuration())}</span>
        </div>

        <div className="border-t border-gray-700/50 pt-3 flex justify-between items-center text-lg font-bold">
          <span>Итого</span>
          <span className="text-harakiri-red">{totalPrice().toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      {/* Client info */}
      <div className="bg-harakiri-card rounded-2xl p-4 mb-4">
        <div className="flex justify-between mb-3">
          <span className="text-harakiri-gray text-sm">Имя</span>
          <span className="text-sm">{user?.first_name} {user?.last_name || ''}</span>
        </div>

        {needsPhone ? (
          <div>
            <label className="text-harakiri-gray text-sm block mb-1.5">Телефон</label>
            <PhoneInput
              value={phoneInput}
              onChange={setPhoneInput}
              onRequestContact={handleRequestPhone}
            />
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-harakiri-gray text-sm">Телефон</span>
            <button onClick={() => setNeedsPhone(true)} className="text-sm text-harakiri-red">
              {phoneInput || phone || 'Указать'}
            </button>
          </div>
        )}
      </div>

      {/* PD Consent */}
      <button
        onClick={() => setPdConsent(!pdConsent)}
        className="flex items-start gap-3 mb-6 text-left w-full"
      >
        <div
          className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center checkbox-animate flex-shrink-0 ${
            pdConsent ? 'bg-harakiri-red border-harakiri-red' : 'border-gray-500'
          }`}
        >
          {pdConsent && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="text-xs text-harakiri-gray leading-relaxed">
          Я даю согласие на обработку персональных данных в соответствии с ФЗ-152
        </span>
      </button>

      {/* Submit button */}
      <button
        onClick={handleConfirm}
        disabled={!canSubmit}
        className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-200 ${
          canSubmit
            ? 'bg-harakiri-red text-white active:scale-[0.98] active:bg-harakiri-red-dark'
            : 'bg-gray-700 text-gray-500'
        }`}
      >
        {mutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Создаём запись...
          </span>
        ) : (
          'Подтвердить запись'
        )}
      </button>
    </div>
  );
}
