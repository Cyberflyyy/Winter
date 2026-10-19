"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Burst } from "@/components/ui/Burst";
import { Modal } from "@/components/ui/Modal";
import { Ring } from "@/components/ui/Ring";
import { MONTHS_SEPT, WEEKDAYS, WEEKDAYS_SHORT, addDays, formatDMY, fromKey, todayKey, weekStart } from "@/lib/dates";
import { pct } from "@/lib/stats";
import { haptic, useStore } from "@/lib/store";
import type { Mindset, Task } from "@/lib/types";

const MINDSET_SERIES = [
  { key: "energy", label: "Energy", color: "oklch(63.7% 0.208 25.33)" },
  { key: "focus", label: "Focus", color: "oklch(78.8% 0.135 181.9)" },
  { key: "motivation", label: "Motivation", color: "oklch(65% 0.2 300)" },
] as const;

function weekLabel(ws: string) {
  const a = fromKey(ws);
  const b = fromKey(addDays(ws, 6));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(a.getDate())} ${MONTHS_SEPT[a.getMonth()]} – ${p(b.getDate())} ${MONTHS_SEPT[b.getMonth()]} ${b.getFullYear()}`;
}

export default function TasksPage() {
  const today = todayKey();
  const [ws, setWs] = useState(weekStart(today));
  const loadWeek = useStore((s) => s.loadWeek);
  const allTasks = useStore((s) => s.tasks);
  const mindset = useStore((s) => s.mindset);
  const loaded = useStore((s) => !!s.loadedTaskRanges[ws]);

  useEffect(() => {
    void loadWeek(ws);
  }, [ws, loadWeek]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);
  const byDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const d of [addDays(ws, -1), ...days]) m[d] = [];
    for (const t of allTasks) if (m[t.date]) m[t.date].push(t);
    for (const k in m) m[k].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    return m;
  }, [allTasks, days, ws]);

  const total = days.reduce((s, d) => s + byDay[d].length, 0);
  const done = days.reduce((s, d) => s + byDay[d].filter((t) => t.done).length, 0);
  const isThisWeek = ws === weekStart(today);

  // Na telefonie przewiń karuzelę do dzisiejszego dnia
  const carousel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = carousel.current;
    if (!el || !loaded || el.scrollWidth <= el.clientWidth) return;
    const idx = days.indexOf(today);
    const card = el.children[Math.max(0, idx)] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
  }, [loaded, days, today]);

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* Przegląd tygodnia */}
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label">Week starting</p>
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
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWs((w) => addDays(w, -7))} className="btn-ghost h-11 w-11 text-lg sm:h-14 sm:w-14" aria-label="Previous week">
                &lt;
              </button>
              <button
                onClick={() => setWs(weekStart(today))}
                className={`btn-ghost h-11 px-4 text-sm font-semibold sm:h-14 sm:px-5 sm:text-[15px] ${isThisWeek ? "text-foreground" : "text-primary"}`}
              >
                This week
              </button>
              <button onClick={() => setWs((w) => addDays(w, 7))} className="btn-ghost h-11 w-11 text-lg sm:h-14 sm:w-14" aria-label="Next week">
                &gt;
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4 sm:gap-6">
            <div>
              <p className="title mb-4 text-center text-[15px] tracking-[0.01em] sm:text-[16px]">Overall progress</p>
              <WeekBars days={days} byDay={byDay} today={today} />
            </div>
            <div className="flex flex-col items-center pb-1">
              <div className="hidden sm:block">
                <Ring value={pct(done, total)} size={158} stroke={14}>
                  <span className="text-[30px] font-bold tracking-[-0.04em]">
                    <AnimatedNumber value={pct(done, total)} suffix="%" />
                  </span>
                </Ring>
              </div>
              <div className="sm:hidden">
                <Ring value={pct(done, total)} size={104} stroke={10}>
                  <span className="text-[21px] font-bold tracking-[-0.04em]">
                    <AnimatedNumber value={pct(done, total)} suffix="%" />
                  </span>
                </Ring>
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground sm:text-[15px]">
                {done} / {total} completed
              </p>
            </div>
          </div>
        </section>

        {/* Mindset */}
        <section className="card flex flex-col p-5 sm:p-6">
          <p className="title text-center text-[15px] tracking-[0.01em] sm:text-[16px]">Mindset tracker</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {MINDSET_SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
          <MindsetChart days={days} mindset={mindset} />
        </section>
      </div>

      {/* Karty dni */}
      <div
        ref={carousel}
        className="no-scrollbar -mx-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-1 pt-1.5 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 xl:mx-0 xl:grid xl:grid-cols-7 xl:gap-3 xl:overflow-visible xl:px-0"
      >
        {days.map((d, i) => (
          <DayCard key={d} date={d} index={i} tasks={byDay[d]} yesterday={byDay[addDays(d, -1)] ?? []} mindset={mindset[d]} isToday={d === today} loaded={loaded} />
        ))}
      </div>
    </div>
  );
}

function WeekBars({ days, byDay, today }: { days: string[]; byDay: Record<string, Task[]>; today: string }) {
  const max = Math.max(1, ...days.map((d) => byDay[d].length));
  return (
    <div className="flex h-[150px] items-end justify-between gap-1.5 sm:h-[170px] sm:gap-3">
      {days.map((d, i) => {
        const t = byDay[d].length;
        const dn = byDay[d].filter((x) => x.done).length;
        return (
          <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-2.5">
            <div className="relative flex w-full max-w-[46px] flex-1 items-end">
              {t === 0 ? (
                <div className="h-[3px] w-full rounded-full bg-white/10" />
              ) : (
                <motion.div
                  className="relative w-full overflow-hidden rounded-[0.8rem] bg-white/[0.06]"
                  initial={{ height: 0 }}
                  animate={{ height: `${(t / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="absolute inset-x-0 bottom-0 rounded-[0.8rem] bg-primary"
                    initial={{ height: 0 }}
                    animate={{ height: `${(dn / t) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.div>
              )}
            </div>
            <span className={`text-[12px] sm:text-[13px] ${d === today ? "font-semibold text-primary" : "text-muted-foreground"}`}>{WEEKDAYS_SHORT[fromKey(d).getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

function MindsetChart({ days, mindset }: { days: string[]; mindset: Record<string, Mindset> }) {
  const W = 700;
  const H = 200;
  const padX = 40;
  const top = 20;
  const bottom = 160;
  const x = (i: number) => padX + (i * (W - padX * 2)) / 6;
  const y = (v: number) => bottom - ((v - 1) / 9) * (bottom - top);
  const hasAny = days.some((d) => mindset[d]);

  return (
    <div className="relative mt-3 min-h-[180px] flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
        {[top, (top + bottom) / 2, bottom].map((gy) => (
          <line key={gy} x1={0} x2={W} y1={gy} y2={gy} stroke="white" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
        ))}
        {MINDSET_SERIES.map((s, si) => {
          const pts = days
            .map((d, i) => ({ i, v: mindset[d]?.[s.key] ?? null }))
            .filter((p): p is { i: number; v: number } => p.v !== null);
          if (!pts.length) return null;
          const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
          return (
            <g key={s.key}>
              <motion.path
                key={d}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: si * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>
          );
        })}
      </svg>
      {/* kropki jako HTML (żeby nie były rozciągnięte) */}
      {MINDSET_SERIES.map((s) =>
        days.map((d, i) => {
          const v = mindset[d]?.[s.key];
          if (v == null) return null;
          return (
            <span
              key={s.key + d}
              className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(v) / H) * 100}%`, background: s.color }}
            />
          );
        }),
      )}
      <div className="absolute inset-x-0 bottom-0 flex">
        {days.map((d, i) => (
          <span key={d} className="absolute -translate-x-1/2 text-[12px] text-muted-foreground sm:text-[13px]" style={{ left: `${(x(i) / W) * 100}%`, bottom: 0 }}>
            {WEEKDAYS_SHORT[i]}
          </span>
        ))}
      </div>
      {!hasAny && (
        <p className="absolute inset-0 grid place-items-center pb-6 text-center text-sm text-muted-foreground/70">Log your mindset with the + on each day</p>
      )}
    </div>
  );
}

function DayCard({
  date,
  index,
  tasks,
  yesterday,
  mindset,
  isToday,
  loaded,
}: {
  date: string;
  index: number;
  tasks: Task[];
  yesterday: Task[];
  mindset?: Mindset;
  isToday: boolean;
  loaded: boolean;
}) {
  const addTask = useStore((s) => s.addTask);
  const copyTasks = useStore((s) => s.copyTasks);
  const [text, setText] = useState("");
  const [mindOpen, setMindOpen] = useState(false);
  const d = fromKey(date);
  const doneN = tasks.filter((t) => t.done).length;
  const value = pct(doneN, tasks.length);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    haptic(8);
    void addTask(date, t);
    setText("");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`flex w-[78vw] max-w-[300px] shrink-0 snap-start scroll-ml-3.5 flex-col rounded-[1.4rem] border p-4 sm:w-[260px] sm:scroll-ml-6 md:scroll-ml-10 xl:w-auto xl:max-w-none xl:p-3.5 ${
        isToday
          ? "border-primary/45 bg-gradient-to-b from-[oklch(22%_0.04_180)] to-[oklch(16.5%_0.01_180)] shadow-[0_0_30px_-12px_var(--primary)]"
          : "border-white/[0.06] bg-surface"
      }`}
    >
      <div className="text-center">
        <h3 className="text-[19px] font-bold tracking-[-0.02em]">{WEEKDAYS[d.getDay()]}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{formatDMY(date)}</p>
      </div>

      <div className="mt-4 flex justify-center">
        <Ring value={value} size={118} stroke={11} delay={index * 0.05}>
          <span className="text-[21px] font-bold tracking-[-0.03em]">
            <AnimatedNumber value={value} suffix="%" />
          </span>
        </Ring>
      </div>

      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tasks</p>

      <div className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </AnimatePresence>

        <form onSubmit={submit}>
          <label className="flex items-center gap-1.5 rounded-xl border border-dashed border-white/[0.1] px-3 py-2.5 text-[14px] text-muted-foreground transition-colors focus-within:border-primary/50 focus-within:bg-white/[0.02]">
            <Plus size={14} className="shrink-0" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add task" maxLength={200} className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
        </form>

        {loaded && tasks.length === 0 && yesterday.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              haptic(10);
              void copyTasks(addDays(date, -1), date);
            }}
            className="mx-auto mt-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <Copy size={12} /> Copy yesterday&apos;s list
          </motion.button>
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mindset</span>
            <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={() => setMindOpen(true)} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" aria-label="Log mindset">
              <Plus size={15} />
            </motion.button>
          </div>
          {mindset && (mindset.energy || mindset.focus || mindset.motivation) ? (
            <div className="mt-2 flex gap-1.5">
              {MINDSET_SERIES.map((s) => (
                <span key={s.key} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/[0.03] py-1 text-[12px] font-semibold tabular-nums" style={{ color: s.color }}>
                  {s.label[0]} {mindset[s.key] ?? "–"}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 space-y-1 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-bold text-primary tabular-nums">{doneN}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Not completed</span>
              <span className="font-bold tabular-nums">{tasks.length - doneN}</span>
            </div>
          </div>
        </div>
      </div>

      <MindsetModal open={mindOpen} onClose={() => setMindOpen(false)} date={date} value={mindset} />
    </motion.section>
  );
}

function TaskItem({ task }: { task: Task }) {
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);
  const [burst, setBurst] = useState(0);

  function commit() {
    setEditing(false);
    const v = val.trim();
    if (!v) return setVal(task.title);
    if (v !== task.title) void updateTask(task.id, { title: v });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <div className="relative flex items-start gap-2.5 rounded-xl bg-white/[0.035] px-3 py-2.5">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => {
            if (!task.done) setBurst((b) => b + 1);
            haptic(task.done ? 6 : 12);
            void updateTask(task.id, { done: !task.done });
          }}
          className={`relative mt-[1px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-[6px] border transition-colors ${
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

        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setVal(task.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[15px] leading-[1.35] outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setVal(task.title);
              setEditing(true);
            }}
            className={`min-w-0 flex-1 break-words text-left text-[14.5px] leading-[1.35] transition-colors ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}
          >
            {task.title}
          </button>
        )}

        <button
          onClick={() => {
            haptic(8);
            void deleteTask(task.id);
          }}
          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[oklch(22%_0_0)] text-muted-foreground opacity-0 shadow transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100 max-lg:opacity-70"
          aria-label="Delete task"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

function MindsetModal({ open, onClose, date, value }: { open: boolean; onClose: () => void; date: string; value?: Mindset }) {
  const setMindset = useStore((s) => s.setMindset);
  const d = fromKey(date);
  return (
    <Modal open={open} onClose={onClose} title={`Mindset · ${WEEKDAYS[d.getDay()]}`} width={420}>
      <div className="space-y-6">
        {MINDSET_SERIES.map((s) => {
          const v = value?.[s.key] ?? null;
          return (
            <div key={s.key}>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                </span>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: s.color }}>
                  {v ?? "–"}
                  <span className="text-muted-foreground">/10</span>
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const on = v !== null && n <= v;
                  return (
                    <motion.button
                      key={n}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => {
                        haptic(6);
                        void setMindset(date, { [s.key]: v === n ? null : n });
                      }}
                      className="h-9 rounded-lg border transition-colors duration-150"
                      style={{
                        background: on ? s.color : "oklch(100% 0 0 / 0.03)",
                        borderColor: on ? "transparent" : "oklch(100% 0 0 / 0.08)",
                        opacity: on ? 0.55 + (n / 10) * 0.45 : 1,
                      }}
                      aria-label={`${s.label} ${n}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <button onClick={onClose} className="btn-primary h-12 w-full">
          Done
        </button>
      </div>
    </Modal>
  );
}
