"use client";

import { create } from "zustand";
import { supabaseBrowser } from "./supabase/client";
import { addDays, todayKey } from "./dates";
import { logKey, type LogMap } from "./stats";
import type { DayStat, Frequency, Goal, Habit, HabitLog, LogStatus, Mindset, Profile, Task } from "./types";

const sb = () => supabaseBrowser();

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

interface Toast {
  id: string;
  text: string;
}

interface State {
  userId: string | null;
  profiles: Profile[];
  ready: boolean;
  habits: Habit[];
  logs: LogMap;
  tasks: Task[];
  loadedTaskRanges: Record<string, true>;
  mindset: Record<string, Mindset>;
  goals: Goal[];
  toasts: Toast[];

  init: (userId: string) => Promise<void>;
  toast: (text: string) => void;
  dismissToast: (id: string) => void;

  setLog: (habit: Habit, date: string, status: LogStatus | null) => Promise<void>;
  addHabit: (h: { name: string; color: string; frequency: Frequency }) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Pick<Habit, "name" | "color" | "frequency" | "start_date" | "position">>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  loadWeek: (weekStart: string) => Promise<void>;
  addTask: (date: string, title: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<Pick<Task, "title" | "done">>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  copyTasks: (fromDate: string, toDate: string) => Promise<void>;
  setMindset: (date: string, patch: Partial<Omit<Mindset, "date">>) => Promise<void>;

  addGoal: (g: Omit<Goal, "id" | "user_id" | "created_at">) => Promise<Goal | null>;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id" | "user_id" | "created_at">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  fetchDailyStats: (userId: string, from: string, to: string) => Promise<DayStat[] | null>;
}

async function fetchAllLogs(): Promise<HabitLog[]> {
  const out: HabitLog[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb()
      .from("habit_logs")
      .select("habit_id,date,status")
      .order("date", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw error;
    out.push(...(data as HabitLog[]));
    if (!data || data.length < page) break;
  }
  return out;
}

export const useStore = create<State>((set, get) => {
  const fail = (e: unknown, rollback?: () => void) => {
    console.error(e);
    rollback?.();
    get().toast("Nie udało się zapisać — sprawdź połączenie.");
  };

  return {
    userId: null,
    profiles: [],
    ready: false,
    habits: [],
    logs: {},
    tasks: [],
    loadedTaskRanges: {},
    mindset: {},
    goals: [],
    toasts: [],

    async init(userId) {
      if (get().userId === userId && get().ready) return;
      set({ userId });
      try {
        const [profiles, habits, logs, goals] = await Promise.all([
          sb().from("profiles").select("id,display_name").order("created_at"),
          sb().from("habits").select("*").order("position").order("created_at"),
          fetchAllLogs(),
          sb().from("goals").select("*").order("created_at"),
        ]);
        if (profiles.error) throw profiles.error;
        if (habits.error) throw habits.error;
        if (goals.error) throw goals.error;
        const map: LogMap = {};
        for (const l of logs) map[logKey(l.habit_id, l.date)] = l.status;
        set({
          profiles: profiles.data as Profile[],
          habits: habits.data as Habit[],
          logs: map,
          goals: goals.data as Goal[],
          ready: true,
        });
      } catch (e) {
        console.error(e);
        set({ ready: true });
        get().toast("Nie udało się wczytać danych. Sprawdź konfigurację Supabase.");
      }
    },

    toast(text) {
      const id = uid();
      set((s) => ({ toasts: [...s.toasts, { id, text }] }));
      setTimeout(() => get().dismissToast(id), 4000);
    },
    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    // ---------- NAWYKI ----------
    async setLog(habit, date, status) {
      const key = logKey(habit.id, date);
      const prev = get().logs[key];
      set((s) => {
        const logs = { ...s.logs };
        if (status) logs[key] = status;
        else delete logs[key];
        return { logs };
      });
      const rollback = () =>
        set((s) => {
          const logs = { ...s.logs };
          if (prev) logs[key] = prev;
          else delete logs[key];
          return { logs };
        });

      // Odhaczenie dnia sprzed startu nawyku przesuwa start (żeby procenty się zgadzały)
      if (status && date < habit.start_date) void get().updateHabit(habit.id, { start_date: date });

      const q = status
        ? sb().from("habit_logs").upsert({ habit_id: habit.id, user_id: get().userId, date, status }, { onConflict: "habit_id,date" })
        : sb().from("habit_logs").delete().match({ habit_id: habit.id, date });
      const { error } = await q;
      if (error) fail(error, rollback);
    },

    async addHabit({ name, color, frequency }) {
      const habits = get().habits;
      const temp: Habit = {
        id: uid(),
        user_id: get().userId!,
        name,
        color,
        frequency,
        position: habits.length ? Math.max(...habits.map((h) => h.position)) + 1 : 0,
        start_date: todayKey(),
        created_at: new Date().toISOString(),
      };
      set({ habits: [...habits, temp] });
      const { error } = await sb().from("habits").insert(temp);
      if (error) fail(error, () => set((s) => ({ habits: s.habits.filter((h) => h.id !== temp.id) })));
    },

    async updateHabit(id, patch) {
      const prev = get().habits.find((h) => h.id === id);
      set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
      const { error } = await sb().from("habits").update(patch).eq("id", id);
      if (error && prev) fail(error, () => set((s) => ({ habits: s.habits.map((h) => (h.id === id ? prev : h)) })));
    },

    async deleteHabit(id) {
      const prevHabits = get().habits;
      const prevLogs = get().logs;
      set((s) => {
        const logs: LogMap = {};
        for (const [k, v] of Object.entries(s.logs)) if (!k.startsWith(id + "|")) logs[k] = v;
        return { habits: s.habits.filter((h) => h.id !== id), logs };
      });
      const { error } = await sb().from("habits").delete().eq("id", id);
      if (error) fail(error, () => set({ habits: prevHabits, logs: prevLogs }));
    },

    // ---------- ZADANIA ----------
    async loadWeek(weekStart) {
      if (get().loadedTaskRanges[weekStart]) return;
      set((s) => ({ loadedTaskRanges: { ...s.loadedTaskRanges, [weekStart]: true } }));
      // Wczytujemy też sobotę z poprzedniego tygodnia (dla „Copy yesterday's list”)
      const from = addDays(weekStart, -1);
      const to = addDays(weekStart, 6);
      const [tasks, mindset] = await Promise.all([
        sb().from("tasks").select("*").gte("date", from).lte("date", to).order("position").order("created_at"),
        sb().from("mindset").select("date,energy,focus,motivation").gte("date", from).lte("date", to),
      ]);
      if (tasks.error || mindset.error) {
        set((s) => {
          const r = { ...s.loadedTaskRanges };
          delete r[weekStart];
          return { loadedTaskRanges: r };
        });
        return fail(tasks.error ?? mindset.error);
      }
      set((s) => {
        const ids = new Set((tasks.data as Task[]).map((t) => t.id));
        const m = { ...s.mindset };
        for (const row of mindset.data as Mindset[]) m[row.date] = row;
        return { tasks: [...s.tasks.filter((t) => !ids.has(t.id)), ...(tasks.data as Task[])], mindset: m };
      });
    },

    async addTask(date, title) {
      const sameDay = get().tasks.filter((t) => t.date === date);
      const task: Task = {
        id: uid(),
        user_id: get().userId!,
        date,
        title,
        done: false,
        position: sameDay.length ? Math.max(...sameDay.map((t) => t.position)) + 1 : 0,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ tasks: [...s.tasks, task] }));
      const { error } = await sb().from("tasks").insert(task);
      if (error) fail(error, () => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) })));
    },

    async updateTask(id, patch) {
      const prev = get().tasks.find((t) => t.id === id);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      const { error } = await sb().from("tasks").update(patch).eq("id", id);
      if (error && prev) fail(error, () => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) })));
    },

    async deleteTask(id) {
      const prev = get().tasks;
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      const { error } = await sb().from("tasks").delete().eq("id", id);
      if (error) fail(error, () => set({ tasks: prev }));
    },

    async copyTasks(fromDate, toDate) {
      const src = get().tasks.filter((t) => t.date === fromDate).sort((a, b) => a.position - b.position);
      if (!src.length) {
        get().toast("Wczoraj nie było żadnych zadań.");
        return;
      }
      const rows: Task[] = src.map((t, i) => ({
        id: uid(),
        user_id: get().userId!,
        date: toDate,
        title: t.title,
        done: false,
        position: i,
        created_at: new Date().toISOString(),
      }));
      set((s) => ({ tasks: [...s.tasks, ...rows] }));
      const { error } = await sb().from("tasks").insert(rows);
      const ids = new Set(rows.map((r) => r.id));
      if (error) fail(error, () => set((s) => ({ tasks: s.tasks.filter((t) => !ids.has(t.id)) })));
    },

    async setMindset(date, patch) {
      const prev = get().mindset[date];
      const next: Mindset = { ...{ energy: null, focus: null, motivation: null }, ...prev, ...patch, date };
      set((s) => ({ mindset: { ...s.mindset, [date]: next } }));
      const { error } = await sb()
        .from("mindset")
        .upsert({ user_id: get().userId, ...next }, { onConflict: "user_id,date" });
      if (error)
        fail(error, () =>
          set((s) => {
            const m = { ...s.mindset };
            if (prev) m[date] = prev;
            else delete m[date];
            return { mindset: m };
          }),
        );
    },

    // ---------- CELE ----------
    async addGoal(g) {
      const goal: Goal = { ...g, id: uid(), user_id: get().userId!, created_at: new Date().toISOString() };
      set((s) => ({ goals: [...s.goals, goal] }));
      const { error } = await sb().from("goals").insert(goal);
      if (error) {
        fail(error, () => set((s) => ({ goals: s.goals.filter((x) => x.id !== goal.id) })));
        return null;
      }
      return goal;
    },

    async updateGoal(id, patch) {
      const prev = get().goals.find((g) => g.id === id);
      set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      const { error } = await sb().from("goals").update(patch).eq("id", id);
      if (error && prev) fail(error, () => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? prev : g)) })));
    },

    async deleteGoal(id) {
      const prev = get().goals;
      set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
      const { error } = await sb().from("goals").delete().eq("id", id);
      if (error) fail(error, () => set({ goals: prev }));
    },

    async updateProfile(displayName) {
      const id = get().userId!;
      const prev = get().profiles;
      set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, display_name: displayName } : p)) }));
      const { error } = await sb().from("profiles").update({ display_name: displayName }).eq("id", id);
      if (error) fail(error, () => set({ profiles: prev }));
    },

    async fetchDailyStats(userId, from, to) {
      const { data, error } = await sb().rpc("get_daily_stats", { p_user: userId, p_from: from, p_to: to });
      if (error) {
        console.error(error);
        get().toast("Nie udało się pobrać danych rywala.");
        return null;
      }
      return (data ?? []) as DayStat[];
    },
  };
});

export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* brak wsparcia */
    }
  }
}
