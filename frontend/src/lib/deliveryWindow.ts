/**
 * Default delivery windows.
 *
 * The booking form used to hardcode `10:00`–`18:00` regardless of the time of
 * day. Placed after 18:00, that window was already expired at the moment of
 * booking, so on-time analytics could never score the delivery as on-time and
 * the fleet manager's tier breakdown sat pinned at zero. A window that has
 * already passed is not a preference, it is a defect in the form.
 *
 * Everything here is wall-clock local time, which is what the customer reads
 * off their own clock and what the depot compares against — the API stores
 * timestamps in UTC but treats these two fields as IST wall-clock (see
 * `schedule_engine.IST_OFFSET`).
 */

export interface Window {
  start: string;
  end: string;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${pad(m / 60)}:${pad(m % 60)}`;
}

/**
 * A window that starts soon and stays open for a realistic run.
 *
 * Rounds up to the next whole hour so the value is never in the past, keeps at
 * least an hour of lead time, and gives a 6-hour run — long enough to absorb a
 * batch, short enough that the customer's expectation stays meaningful.
 */
export function defaultDeliveryWindow(now: Date = new Date()): Window {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = Math.min(nowMin + 60, 22 * 60);
  // Round up to the hour.
  const rounded = Math.ceil(start / 60) * 60;
  const end = rounded + 6 * 60;
  return { start: toHHMM(rounded), end: toHHMM(end) };
}

/** Minutes past midnight for an `HH:MM` string, or null if unparseable. */
export function windowMinutes(value: string): number | null {
  if (!value || !value.includes(':')) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Whether a window still has time left on the clock.
 *
 * Wraps past midnight, so a 22:00–02:00 window is open at 23:30.
 */
export function isWindowStillOpen(w: Window, now: Date = new Date()): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = windowMinutes(w.start);
  const end = windowMinutes(w.end);
  if (start === null || end === null) return true;
  if (start <= end) return nowMin <= end;
  return nowMin <= end || nowMin >= start;
}

/** Minutes until the window closes; 0 once it has passed. */
export function minutesUntilClose(w: Window, now: Date = new Date()): number {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const end = windowMinutes(w.end);
  const start = windowMinutes(w.start);
  if (end === null || start === null) return 0;
  if (start <= end) return Math.max(0, end - nowMin);
  // Wrapped window: either it has not closed yet tonight, or it closed earlier.
  return nowMin <= end ? Math.max(0, end - nowMin) : 0;
}