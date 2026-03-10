import { useState, useCallback } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onRequestContact?: () => void;
}

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';

  let result = '+7';
  if (d.length > 1) result += ` (${d.slice(1, 4)}`;
  if (d.length > 4) result += `) ${d.slice(4, 7)}`;
  if (d.length > 7) result += `-${d.slice(7, 9)}`;
  if (d.length > 9) result += `-${d.slice(9, 11)}`;
  return result;
}

function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function PhoneInput({ value, onChange, onRequestContact }: PhoneInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = extractDigits(raw);

    // Ensure starts with 7
    const normalized = digits.startsWith('7') ? digits : digits.startsWith('8') ? '7' + digits.slice(1) : '7' + digits;
    onChange(formatPhone(normalized));
  }, [onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (!value) onChange('+7');
  }, [value, onChange]);

  const isValid = extractDigits(value).length === 11;

  return (
    <div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="+7 (XXX) XXX-XX-XX"
        className={`w-full bg-harakiri-bg rounded-lg px-3 py-2.5 text-white border transition-colors ${
          value && !isValid ? 'border-red-500' : 'border-gray-700 focus:border-harakiri-red'
        }`}
      />
      {onRequestContact && (
        <button
          onClick={onRequestContact}
          className="text-harakiri-red text-sm mt-2 active:opacity-70"
        >
          Поделиться контактом из Telegram
        </button>
      )}
    </div>
  );
}
