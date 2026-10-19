"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { create } from "zustand";
import { addDays } from "./dates";
import { useStore } from "./store";
import { supabaseBrowser } from "./supabase/client";
import type { TeamTask, Workspace } from "./types";

const sb = () => supabaseBrowser();

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export type TeamTaskPatch = Partial<Pick<TeamTask, "title" | "notes" | "done" | "date" | "assignee">>;

interface TeamState {
  status: "idle" | "loading" | "ready";
  workspace: Workspace | null;
  members: string[];
  tasks: TeamTask[];
  loadedWeeks: Record<string, true>;

  load: () => Promise<void>;
  loadWeek: (weekStart: string) => Promise<void>;
  /** Po powrocie do karty: pobiera backlog i bieżący tydzień od nowa (realtime mógł się rozłączyć). */
  refresh: (weekStart: string) => Promise<void>;
  addTask: (t: { date: string | null; title: string; notes?: string }) => Promise<void>;
  updateTask: (id: string, patch: TeamTaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

/** Zastępuje zadania o tych samych id, resztę zostawia. */
function merge(prev: TeamTask[], rows: TeamTask[]): TeamTask[] {
  const ids = new Set(rows.map((t) => t.id));
  return [...prev.filter((t) => !ids.has(t.id)), ...rows];
}

export const useTeam = create<TeamState>((set, get) => {
  const fail = (e: unknown, rollback?: () => void) => {
    console.error(e);
    rollback?.();
    useStore.getState().toast("Nie udało się zapisać — sprawdź połączenie.");
  };

  const fetchWeek = (wsId: string, weekStart: string) =>
    sb().from("workspace_tasks").select("*").eq("workspace_id", wsId).gte("date", weekStart).lte("date", addDays(weekStart, 6));
  const fetchBacklog = (wsId: string) => sb().from("workspace_tasks").select("*").eq("workspace_id", wsId).is("date", null);

  function subscribe(wsId: string) {
    channel?.unsubscribe();
    type Payload = RealtimePostgresChangesPayload<TeamTask>;
    const upsert = (p: Payload) => set((s) => ({ tasks: merge(s.tasks, [p.new as TeamTask]) }));
    channel = sb()
      .channel(`workspace-${wsId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workspace_tasks", filter: `workspace_id=eq.${wsId}` }, upsert)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workspace_tasks", filter: `workspace_id=eq.${wsId}` }, upsert)
      // Zdarzeń DELETE nie da się filtrować — przychodzi samo id, usuwamy jeśli je mamy
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "workspace_tasks" }, (p: Payload) => {
        const id = (p.old as Partial<TeamTask>).id;
        if (id) set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      })
      .subscribe();
  }

  return {
    status: "idle",
    workspace: null,
    members: [],
    tasks: [],
    loadedWeeks: {},

    async load() {
      if (get().status !== "idle") return;
      set({ status: "loading" });
      const ws = await sb().from("workspaces").select("id,name").order("created_at").limit(1);
      if (ws.error) {
        set({ status: "idle" });
        return fail(ws.error);
      }
      const workspace = (ws.data?.[0] as Workspace | undefined) ?? null;
      if (!workspace) return set({ status: "ready", workspace: null });

      const [members, backlog] = await Promise.all([
        sb().from("workspace_members").select("user_id").eq("workspace_id", workspace.id).order("created_at"),
        fetchBacklog(workspace.id),
      ]);
      if (members.error || backlog.error) {
        set({ status: "idle" });
        return fail(members.error ?? backlog.error);
      }
      set((s) => ({
        status: "ready",
        workspace,
        members: (members.data as { user_id: string }[]).map((m) => m.user_id),
        tasks: merge(s.tasks, backlog.data as TeamTask[]),
      }));
      subscribe(workspace.id);
    },

    async loadWeek(weekStart) {
      const ws = get().workspace;
      if (!ws || get().loadedWeeks[weekStart]) return;
      set((s) => ({ loadedWeeks: { ...s.loadedWeeks, [weekStart]: true } }));
      const { data, error } = await fetchWeek(ws.id, weekStart);
      if (error) {
        set((s) => {
          const w = { ...s.loadedWeeks };
          delete w[weekStart];
          return { loadedWeeks: w };
        });
        return fail(error);
      }
      set((s) => ({ tasks: merge(s.tasks, data as TeamTask[]) }));
    },

    async refresh(weekStart) {
      const ws = get().workspace;
      if (!ws) return;
      const [week, backlog] = await Promise.all([fetchWeek(ws.id, weekStart), fetchBacklog(ws.id)]);
      if (week.error || backlog.error) return;
      set({ tasks: [...(backlog.data as TeamTask[]), ...(week.data as TeamTask[])], loadedWeeks: { [weekStart]: true } });
    },

    async addTask({ date, title, notes = "" }) {
      const ws = get().workspace;
      if (!ws) return;
      const same = get().tasks.filter((t) => t.date === date);
      const task: TeamTask = {
        id: uid(),
        workspace_id: ws.id,
        created_by: useStore.getState().userId,
        assignee: null,
        date,
        title,
        notes,
        done: false,
        position: same.length ? Math.max(...same.map((t) => t.position)) + 1 : 0,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ tasks: [...s.tasks, task] }));
      const { error } = await sb().from("workspace_tasks").insert(task);
      if (error) fail(error, () => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) })));
    },

    async updateTask(id, patch) {
      const prev = get().tasks.find((t) => t.id === id);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      const { error } = await sb().from("workspace_tasks").update(patch).eq("id", id);
      if (error && prev) fail(error, () => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) })));
    },

    async deleteTask(id) {
      const prev = get().tasks;
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      const { error } = await sb().from("workspace_tasks").delete().eq("id", id);
      if (error) fail(error, () => set({ tasks: prev }));
    },
  };
});
