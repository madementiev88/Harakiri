import { config } from '../config.js';

/**
 * Get current date/time in the configured timezone (default: Europe/Moscow).
 */
export function nowInTz(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: config.TZ })
  );
}

/**
 * Format a Date as YYYY-MM-DD in the configured timezone.
 */
export function toDateStringTz(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: config.TZ });
}

/**
 * Build a Date from booking date + time (HH:MM), interpreted in the configured timezone.
 */
export function bookingToDate(bookingDate: Date, bookingTime: string): Date {
  const dateStr = toDateStringTz(bookingDate);
  // Parse as local time in server TZ (TZ env var must be set in Docker)
  return new Date(`${dateStr}T${bookingTime}:00`);
}
