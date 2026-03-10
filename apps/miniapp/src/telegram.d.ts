interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    auth_date: number;
    hash: string;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  showPopup(params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (buttonId: string) => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  showAlert(message: string, callback?: () => void): void;
  requestContact(callback: (shared: boolean, contact?: { phone_number: string }) => void): void;
  sendData(data: string): void;
  openLink(url: string): void;
  CloudStorage: {
    setItem(key: string, value: string, callback?: (error: any, stored: boolean) => void): void;
    getItem(key: string, callback: (error: any, value: string) => void): void;
    removeItem(key: string, callback?: (error: any, removed: boolean) => void): void;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  platform: string;
  version: string;
}

interface Window {
  Telegram: {
    WebApp: TelegramWebApp;
  };
}
