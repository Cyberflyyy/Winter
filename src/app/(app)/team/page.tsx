"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, ChevronDown, ChevronLeft, ChevronRight, Inbox, Trash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Burst } from "@/components/ui/Burst";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { RIVAL_COLOR } from "@/lib/constants";
import { MONTHS_SEPT, WEEKDAYS, addDays, formatDayMonth, formatDMY, fromKey, toKey, todayKey, workWeekStart } from "@/lib/dates";
import { pct } from "@/lib/stats";
import { haptic, useStore } from "@/lib/store";
import { useTeam, type TeamTaskPatch } from "@/lib/team";
import type { TeamTask } from "@/lib/types";

const MEMBER_COLORS = ["var(--primary)", RIVAL_COLOR, "oklch(65% 0.2 300)", "oklch(68.5% 0.155 249)", "oklch(70% 0.19 350)"];

const byOrder = (a: TeamTask, b: TeamTask) => a.position - b.position || a.created_at.localeCompare(b.created_at);

function weekLabel(ws: string) {
  const a = fromKey(ws);
  const b = fromKey(addDays(ws, 6));
  return `${a.getDate()} ${MONTHS_SEPT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SEPT[b.getMonth()]} ${b.getFullYear()}`;
}

/** Nazwa, kolor i inicjał członka przestrzeni. */
function useMembers() {
  const profiles = useStore((s) => s.profiles);
  const members = useTeam((s) => s.members);
  return useMemo(() => {
    const info = (id: string | null) => {
      const i = id ? members.indexOf(id) : -1;
      const name = profiles.find((p) => p.id === id)?.display_name ?? "Member";
      return { id, name, initial: name.slice(0, 1).toUpperCase(), color: MEMBER_COLORS[Math.max(0, i) % MEMBER_COLORS.length] };
    };
    return { list: members.map(info), info };
  }, [members, profiles]);
}

export default function TeamPage() {
  const today = todayKey();
  const [ws, setWs] = useState(workWeekStart(today));
  const [tab, setTab] = useState<"week" | "backlog">("week");
  const [openId, setOpenId] = useState<string | null>(null);

  const status = useTeam((s) => s.status);
  const workspace = useTeam((s) => s.workspace);
  const tasks = useTeam((s) => s.tasks);
  const loaded = useTeam((s) => !!s.loadedWeeks[ws]);
  const { list: members } = useMembers();

  useEffect(() => {
    void useTeam.getState().load();
  }, []);

  useEffect(() => {
    if (workspace) void useTeam.getState().loadWeek(ws);
  }, [workspace, ws]);

  // Po powrocie do karty/aplikacji dociągamy zmiany (realtime mógł się rozłączyć w tle)
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void useTeam.getState().refresh(ws);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [ws]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);
  const byDay = useMemo(() => {
    const m: Record<string, TeamTask[]> = {};
    for (const d of days) m[d] = [];
    for (const t of tasks) if (t.date && m[t.date]) m[t.date].push(t);
    for (const k in m) m[k].sort(byOrder);
    return m;
  }, [tasks, days]);
  const backlog = useMemo(() => tasks.filter((t) => t.date === null).sort(byOrder), [tasks]);
  const openBacklog = backlog.filter((t) => !t.done).length;

  const total = days.reduce((s, d) => s + byDay[d].length, 0);
  const done = days.reduce((s, d) => s + byDay[d].filter((t) => t.done).length, 0);
  const isThisWeek = ws === workWeekStart(today);
  const openTask = tasks.find((t) => t.id === openId) ?? null;

  // Na telefonie przewiń do dzisiejszego dnia
  const todayRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!loaded || !isThisWeek || window.innerWidth >= 768) return;
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loaded, isThisWeek]);

  if (status !== "ready")
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <div className="app-loader-ring h-7 w-7" />
      </div>
    );
  if (!workspace) return <NoWorkspace />;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Nagłówek tygodnia */}
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="label">{workspace.name} · shared week</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={ws}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-2.5 inline-flex rounded-full bg-primary px-4 py-2 text-[15px] font-bold text-primary-foreground sm:text-[17px]"
              >
                {weekLabel(ws)}
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {members.map((m) => (
                  <Avatar key={m.id} member={m} size={26} ring />
                ))}
              </div>
              <span className="text-[14px] text-muted-foreground">
                {done} / {total} done this week
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWs((w) => addDays(w, -7))} className="btn-ghost h-11 w-11 sm:h-14 sm:w-14" aria-label="Previous week">
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setWs(workWeekStart(today))}
              className={`btn-ghost h-11 px-4 text-sm font-semibold sm:h-14 sm:px-5 sm:text-[15px] ${isThisWeek ? "text-foreground" : "text-primary"}`}
            >
              This week
            </button>
            <button onClick={() => setWs((w) => addDays(w, 7))} className="btn-ghost h-11 w-11 sm:h-14 sm:w-14" aria-label="Next week">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full sm:inset-x-6">
          <motion.div
            className="h-full rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${pct(done, total)}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </section>

      {/* Telefon: tydzień albo backlog */}
      <Segmented
        id="team-tab"
        className="lg:hidden"
        value={tab}
        onChange={(v) => {
          haptic(6);
          setTab(v);
        }}
        options={[
          { value: "week", label: "Week" },
          { value: "backlog", label: `Backlog${openBacklog ? ` · ${openBacklog}` : ""}` },
        ]}
      />

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
        <div className={`grid gap-3 md:grid-cols-2 md:gap-4 ${tab === "backlog" ? "max-lg:hidden" : ""}`}>
          {days.map((d, i) => (
            <DayCard
              key={d}
              ref={d === today ? todayRef : undefined}
              date={d}
              index={i}
              tasks={byDay[d]}
              isToday={d === today}
              past={d < today}
              loaded={loaded}
              onOpen={setOpenId}
            />
          ))}
        </div>

        <aside className={`lg:sticky lg:top-6 ${tab === "week" ? "max-lg:hidden" : ""}`}>
          <Backlog tasks={backlog} onOpen={setOpenId} />
        </aside>
      </div>

      <TaskModal task={openTask} onClose={() => setOpenId(null)} />
    </div>
  );
}

function NoWorkspace() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card mx-auto mt-12 max-w-md p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Building2 size={26} />
      </div>
      <h3 className="title mt-4 text-lg">No team access yet</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Add your account to the Inube workspace — ask to be added as a member.
      </p>
    </motion.div>
  );
}

function Avatar({ member, size = 22, ring }: { member: { name: string; initial: string; color: string }; size?: number; ring?: boolean }) {
  return (
    <span
      title={member.name}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-primary-foreground ${ring ? "ring-2 ring-surface" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.46, background: member.color }}
    >
      {member.initial}
    </span>
  );
}

function DayCard({
  ref,
  date,
  index,
  tasks,
  isToday,
  past,
  loaded,
  onOpen,
}: {
  ref?: React.Ref<HTMLElement>;
  date: string;
  index: number;
  tasks: TeamTask[];
  isToday: boolean;
  past: boolean;
  loaded: boolean;
  onOpen: (id: string) => void;
}) {
  const d = fromKey(date);
  const doneN = tasks.filter((t) => t.done).length;
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={`flex scroll-mt-20 flex-col rounded-[1.4rem] border p-4 sm:p-5 ${
        isToday
          ? "border-primary/45 bg-gradient-to-b from-[oklch(22%_0.04_180)] to-[oklch(16.5%_0.01_180)] shadow-[0_0_30px_-12px_var(--primary)]"
          : "border-white/[0.06] bg-surface"
      }`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className={`text-[18px] font-bold tracking-[-0.02em] ${past && !isToday ? "text-muted-foreground" : ""}`}>{WEEKDAYS[d.getDay()]}</h3>
          <span className="text-[13px] text-muted-foreground">{formatDayMonth(date)}</span>
          {isToday && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Today</span>}
        </div>
        {tasks.length > 0 && (
          <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
            <span className={doneN === tasks.length ? "text-primary" : "text-foreground"}>{doneN}</span>/{tasks.length}
          </span>
        )}
      </header>

      <div className="mt-3.5 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />
          ))}
        </AnimatePresence>
        {loaded && <QuickAdd date={date} />}
      </div>
    </motion.section>
  );
}

function Backlog({ tasks, onOpen }: { tasks: TeamTask[]; onOpen: (id: string) => void }) {
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => !t.done);
  const closed = tasks.filter((t) => t.done);
  return (
    <section className="card flex flex-col p-4 sm:p-5 lg:max-h-[calc(100dvh-3rem)]">
      <header className="flex items-center gap-2.5">
        <Inbox size={18} className="text-primary" />
        <h3 className="text-[18px] font-bold tracking-[-0.02em]">Backlog</h3>
        <span className="ml-auto text-[13px] font-semibold tabular-nums text-muted-foreground">{open.length} open</span>
      </header>
      <p className="mt-1 text-[13px] text-muted-foreground">No deadline yet — open a task to plan it on a day or assign it.</p>

      <div className="no-scrollbar -mx-1 mt-3.5 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 pb-1">
        <QuickAdd date={null} />
        <AnimatePresence initial={false}>
          {open.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />
          ))}
        </AnimatePresence>
        {open.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground/70">Nothing waiting. Nice.</p>}

        {closed.length > 0 && (
          <>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="mt-2 flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
            >
              <ChevronDown size={14} className={`transition-transform ${showDone ? "" : "-rotate-90"}`} /> Done · {closed.length}
            </button>
            <AnimatePresence initial={false}>
              {showDone && closed.map((t) => <TaskCard key={t.id} task={t} onOpen={() => onOpen(t.id)} />)}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}

function TaskCard({ task, onOpen }: { task: TeamTask; onOpen: () => void }) {
  const updateTask = useTeam((s) => s.updateTask);
  const { info } = useMembers();
  const [burst, setBurst] = useState(0);
  const assignee = task.assignee ? info(task.assignee) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 rounded-xl border border-transparent bg-white/[0.035] px-3 py-3 transition-colors hover:border-white/[0.08]"
    >
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => {
          if (!task.done) setBurst((b) => b + 1);
          haptic(task.done ? 6 : 12);
          void updateTask(task.id, { done: !task.done });
        }}
        className={`relative mt-[2px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-[6px] border transition-colors ${
          task.done ? "border-transparent bg-primary" : "border-white/25 hover:border-primary/70"
        }`}
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
      >
        <AnimatePresence>
          {task.done && (
            <motion.svg key="c" width="13" height="13" viewBox="0 0 24 24" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
        <Burst trigger={burst} count={8} spread={26} />
      </motion.button>

      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={`break-words text-[15px] font-semibold leading-[1.35] transition-colors ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.notes && (
          <p className={`mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[13.5px] leading-[1.5] ${task.done ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {task.notes}
          </p>
        )}
      </button>

      {assignee && <Avatar member={assignee} size={22} />}
    </motion.div>
  );
}

/** Pierwsza linia = tytuł, kolejne (Shift+Enter) = notatki. */
function QuickAdd({ date }: { date: string | null }) {
  const addTask = useTeam((s) => s.addTask);
  const [text, setText] = useState("");
  const lines = text.split("\n").length;

  function submit() {
    const [first, ...rest] = text.split("\n");
    const title = first.trim().slice(0, 200);
    if (!title) return;
    haptic(8);
    void addTask({ date, title, notes: rest.join("\n").trim() });
    setText("");
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-dashed border-white/[0.1] px-3 py-2.5 transition-colors focus-within:border-primary/50 focus-within:bg-white/[0.02]">
      <textarea
        value={text}
        rows={Math.min(8, lines)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={date ? "Add task… (Shift+Enter for details)" : "Add to backlog…"}
        className="min-w-0 flex-1 resize-none bg-transparent text-[14.5px] leading-[1.45] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <AnimatePresence>
        {text.trim() && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={submit}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
            aria-label="Add task"
          >
            <ArrowRight size={15} strokeWidth={2.6} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskModal({ task, onClose }: { task: TeamTask | null; onClose: () => void }) {
  const updateTask = useTeam((s) => s.updateTask);
  const deleteTask = useTeam((s) => s.deleteTask);
  const { list: members, info } = useMembers();
  const today = todayKey();
  const tomorrow = addDays(today, 1);

  // Zostawiamy ostatnie zadanie, żeby treść nie znikła w trakcie animacji zamykania
  const last = useRef<TeamTask | null>(null);
  if (task) last.current = task;
  const t = task ?? last.current;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskId = task?.id;
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes);
    setDate(task.date);
    setAssignee(task.assignee);
    setConfirmDelete(false);
    // Tylko przy otwarciu innego zadania — zmiany z realtime nie nadpisują edycji w toku
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    const tt = title.trim();
    if (!tt) return;
    const patch: TeamTaskPatch = {};
    if (tt !== task.title) patch.title = tt;
    if (notes.trim() !== task.notes) patch.notes = notes.trim();
    if (date !== task.date) patch.date = date;
    if (assignee !== task.assignee) patch.assignee = assignee;
    if (Object.keys(patch).length) void updateTask(task.id, patch);
    onClose();
  }

  const author = t?.created_by ? info(t.created_by).name : null;
  const chip = (active: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
      active ? "border-transparent bg-primary text-primary-foreground" : "border-white/[0.1] text-muted-foreground hover:border-white/25 hover:text-foreground"
    }`;
  const customDate = date && date !== today && date !== tomorrow ? date : null;

  return (
    <Modal open={!!task} onClose={onClose} title="Task" width={580}>
      {t && (
        <form onSubmit={save} className="space-y-5">
          <div>
            <p className="label mb-2">Title</p>
            <input className="field text-[16px] font-semibold" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <p className="label mb-2">Details</p>
            <textarea
              className="field min-h-[180px] resize-y leading-[1.55]"
              placeholder="Notes, links, steps, context…"
              value={notes}
              maxLength={5000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <p className="label mb-2">When</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setDate(null)} className={chip(date === null)}>
                <Inbox size={14} /> Backlog
              </button>
              <button type="button" onClick={() => setDate(today)} className={chip(date === today)}>
                Today
              </button>
              <button type="button" onClick={() => setDate(tomorrow)} className={chip(date === tomorrow)}>
                Tomorrow
              </button>
              <label className={`${chip(!!customDate)} relative cursor-pointer`}>
                {customDate ? `${WEEKDAYS[fromKey(customDate).getDay()].slice(0, 3)} ${formatDMY(customDate)}` : "Pick date"}
                <input
                  type="date"
                  value={date ?? ""}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Pick date"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="label mb-2">Assignee</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAssignee(null)} className={chip(assignee === null)}>
                Anyone
              </button>
              {members.map((m) => (
                <button type="button" key={m.id} onClick={() => setAssignee(m.id)} className={chip(assignee === m.id)}>
                  <Avatar member={m} size={20} /> {m.name}
                </button>
              ))}
            </div>
          </div>

          {author && (
            <p className="text-[12px] text-muted-foreground">
              Added by {author} · {formatDMY(toKey(new Date(t.created_at)))}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!task) return;
                if (!confirmDelete) return setConfirmDelete(true);
                haptic(10);
                void deleteTask(task.id);
                onClose();
              }}
              className={`btn-ghost h-12 gap-2 px-4 text-sm transition-colors ${confirmDelete ? "border-destructive/50 bg-destructive/15 text-destructive" : "text-destructive"}`}
            >
              <Trash size={15} /> {confirmDelete ? "Tap again to delete" : "Delete"}
            </button>
            <button type="submit" disabled={!title.trim()} className="btn-primary ml-auto h-12 px-7 text-[15px] disabled:opacity-40">
              Save
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
