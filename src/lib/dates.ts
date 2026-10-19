// Wszystkie daty w aplikacji to lokalne stringi "YYYY-MM-DD".

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(key: string, n: number): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);
}

/** Tydzień zaczyna się w niedzielę (jak w oryginale). */
export function weekStart(key: string): string {
  const d = fromKey(key);
  d.setDate(d.getDate() - d.getDay());
  return toKey(d);
}

/** Tydzień pracy (Inube) zaczyna się w poniedziałek. */
export function workWeekStart(key: string): string {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toKey(d);
}

export function monthStart(key: string): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function daysInMonth(key: string): number {
  const d = fromKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_SEPT = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Kolejność dni od poniedziałku (indeksy jak w Date.getDay). */
export const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function formatDMY(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDayMonth(key: string): string {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Klucz okresu dla nawyku o danej częstotliwości. */
export function periodKey(freq: "daily" | "weekly" | "monthly", key: string): string {
  if (freq === "weekly") return weekStart(key);
  if (freq === "monthly") return monthStart(key);
  return key;
}

export function prevPeriod(freq: "daily" | "weekly" | "monthly", key: string): string {
  if (freq === "weekly") return addDays(key, -7);
  if (freq === "monthly") return addMonths(key, -1);
  return addDays(key, -1);
}
