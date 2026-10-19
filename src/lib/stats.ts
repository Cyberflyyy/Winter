import { FREEZE_START, PERFECT_DAYS_PER_TOKEN } from "./constants";
import { addDays, addMonths, periodKey, prevPeriod, range } from "./dates";
import type { DayStat, Frequency, Habit, LogStatus } from "./types";

export type LogMap = Record<string, LogStatus>;

export const logKey = (habitId: string, date: string) => `${habitId}|${date}`;

export function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function nextPeriod(freq: Frequency, key: string): string {
  if (freq === "weekly") return addDays(key, 7);
  if (freq === "monthly") return addMonths(key, 1);
  return addDays(key, 1);
}

/** Aktualna seria — jeśli bieżący okres nie jest jeszcze odhaczony, liczy od poprzedniego. */
export function currentStreak(habit: Habit, logs: LogMap, today: string): number {
  const start = periodKey(habit.frequency, habit.start_date);
  let p = periodKey(habit.frequency, today);
  if (!logs[logKey(habit.id, p)]) p = prevPeriod(habit.frequency, p);
  let n = 0;
  while (p >= start && logs[logKey(habit.id, p)]) {
    if (logs[logKey(habit.id, p)] === "done") n++;
    p = prevPeriod(habit.frequency, p);
  }
  return n;
}

export function bestStreak(habit: Habit, logs: LogMap, today: string): number {
  const end = periodKey(habit.frequency, today);
  let best = 0;
  let run = 0;
  for (let p = periodKey(habit.frequency, habit.start_date); p <= end; p = nextPeriod(habit.frequency, p)) {
    const s = logs[logKey(habit.id, p)];
    if (s === "done") {
      run++;
      best = Math.max(best, run);
    } else if (!s) {
      run = 0;
    }
  }
  return best;
}

/** Procent wykonania nawyku w zakresie okresów [from, to] (przycięte do startu nawyku i dzisiaj). */
export function habitRate(habit: Habit, logs: LogMap, from: string, to: string, today: string): number {
  const f = habit.frequency;
  let p = periodKey(f, from > habit.start_date ? from : habit.start_date);
  const end = periodKey(f, to < today ? to : today);
  let done = 0;
  let total = 0;
  for (; p <= end; p = nextPeriod(f, p)) {
    const s = logs[logKey(habit.id, p)];
    if (s === "frozen") continue;
    total++;
    if (s === "done") done++;
  }
  return pct(done, total);
}

/** Dzienne statystyki (tylko nawyki dzienne) — ta sama definicja co funkcja SQL get_daily_stats. */
export function dailyStats(habits: Habit[], logs: LogMap, from: string, to: string): DayStat[] {
  const daily = habits.filter((h) => h.frequency === "daily");
  return range(from, to).map((day) => {
    let total = 0;
    let done = 0;
    for (const h of daily) {
      if (h.start_date > day) continue;
      const s = logs[logKey(h.id, day)];
      if (s === "frozen") continue;
      total++;
      if (s === "done") done++;
    }
    return { day, total, done };
  });
}

export function sumStats(stats: DayStat[]): number {
  let t = 0;
  let d = 0;
  for (const s of stats) {
    t += s.total;
    d += s.done;
  }
  return pct(d, t);
}

export function freezeTokens(habits: Habit[], logs: LogMap, today: string): number {
  const daily = habits.filter((h) => h.frequency === "daily");
  if (!daily.length) return FREEZE_START;
  const first = daily.reduce((m, h) => (h.start_date < m ? h.start_date : m), today);
  let perfect = 0;
  for (const day of range(first, today)) {
    const active = daily.filter((h) => h.start_date <= day);
    if (active.length && active.every((h) => logs[logKey(h.id, day)] === "done")) perfect++;
  }
  const used = Object.values(logs).filter((s) => s === "frozen").length;
  return Math.max(0, FREEZE_START + Math.floor(perfect / PERFECT_DAYS_PER_TOKEN) - used);
}
