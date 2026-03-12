import { useCallback, useRef } from 'react';

const tg = window.Telegram?.WebApp;

export function useTelegram() {
  const mainButtonCbRef = useRef<(() => void) | null>(null);
  const backButtonCbRef = useRef<(() => void) | null>(null);

  const initTelegram = () => {
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1A1A1A');
    tg.setBackgroundColor('#1A1A1A');
  };

  const user = tg?.initDataUnsafe?.user;
  const initData = tg?.initData || '';

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (!tg) return;
    if (mainButtonCbRef.current) {
      tg.MainButton.offClick(mainButtonCbRef.current);
    }
    mainButtonCbRef.current = onClick;
    tg.MainButton.setParams({
      text,
      color: '#C0392B',
      text_color: '#FFFFFF',
      is_visible: true,
      is_active: true,
    });
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
  }, []);

  const hideMainButton = useCallback(() => {
    if (!tg) return;
    if (mainButtonCbRef.current) {
      tg.MainButton.offClick(mainButtonCbRef.current);
      mainButtonCbRef.current = null;
    }
    tg.MainButton.hide();
  }, []);

  const showBackButton = useCallback((onClick: () => void) => {
    if (!tg) return;
    if (backButtonCbRef.current) {
      tg.BackButton.offClick(backButtonCbRef.current);
    }
    backButtonCbRef.current = onClick;
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }, []);

  const hideBackButton = useCallback(() => {
    if (!tg) return;
    if (backButtonCbRef.current) {
      tg.BackButton.offClick(backButtonCbRef.current);
      backButtonCbRef.current = null;
    }
    tg.BackButton.hide();
  }, []);

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    tg?.HapticFeedback.impactOccurred(type);
  }, []);

  const hapticSuccess = useCallback(() => {
    tg?.HapticFeedback.notificationOccurred('success');
  }, []);

  const hapticError = useCallback(() => {
    tg?.HapticFeedback.notificationOccurred('error');
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!tg) {
        resolve(window.confirm(message));
        return;
      }
      try {
        tg.showConfirm(message, (confirmed: boolean) => resolve(confirmed));
      } catch {
        resolve(window.confirm(message));
      }
    });
  }, []);

  const requestContact = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!tg) {
        resolve(null);
        return;
      }
      tg.requestContact((shared: boolean, contact?: { phone_number: string }) => {
        resolve(shared && contact ? contact.phone_number : null);
      });
    });
  }, []);

  return {
    tg,
    user,
    initData,
    initTelegram,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    haptic,
    hapticSuccess,
    hapticError,
    showConfirm,
    requestContact,
  };
}
