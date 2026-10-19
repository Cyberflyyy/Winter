"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HabitDialog } from "@/components/HabitDialog";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Flame, IceCube, StarIcon } from "@/components/ui/Icons";
import { Segmented } from "@/components/ui/Segmented";
import { habitColor } from "@/lib/constants";
import { MONTHS, MONTHS_SHORT, addDays, addMonths, daysInMonth, fromKey, monthStart, periodKey, todayKey, weekStart } from "@/lib/dates";
import { bestStreak, currentStreak, logKey, pct, type LogMap } from "@/lib/stats";
import { haptic, useStore } from "@/lib/store";
import type { Frequency, Habit } from "@/lib/types";

interface Col {
  key: string;
  label: string;
  sub?: string;
  current: boolean;
  future: boolean;
}

function buildColumns(freq: Frequency, cursor: string, today: string): Col[] {
  if (freq === "daily") {
    const n = daysInMonth(cursor);
    return Array.from({ length: n }, (_, i) => {
      const key = addDays(cursor, i);
      return { key, label: String(i + 1), current: key === today, future: key > today };
    });
  }
  if (freq === "weekly") {
    const end = addDays(cursor, daysInMonth(cursor) - 1);
    const cols: Col[] = [];
    const curWeek = weekStart(today);
    for (let w = weekStart(cursor), i = 1; w <= end; w = addDays(w, 7), i++) {
      const d = fromKey(w);
      cols.push({ key: w, label: `W${i}`, sub: `${d.getDate()}/${d.getMonth() + 1}`, current: w === curWeek, future: w > curWeek });
    }
    return cols;
  }
  const y = fromKey(cursor).getFullYear();
  const curMonth = monthStart(today);
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${y}-${String(i + 1).padStart(2, "0")}-01`;
    return { key, label: MONTHS_SHORT[i], current: key === curMonth, future: key > curMonth };
  });
}

function rowRate(h: Habit, cols: Col[], logs: LogMap): number {
  const start = periodKey(h.frequency, h.start_date);
  let done = 0;
  let total = 0;
  for (const c of cols) {
    if (c.future || c.key < start) continue;
    const s = logs[logKey(h.id, c.key)];
    if (s === "frozen") continue;
    total++;
    if (s === "done") done++;
  }
  return pct(done, total);
}

export default function HabitsPage() {
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.logs);
  const setLog = useStore((s) => s.setLog);
  const today = todayKey();

  const [tab, setTab] = useState<Frequency>("daily");
  const [cursor, setCursor] = useState(monthStart(today));
  const [dialog, setDialog] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });

  const rows = useMemo(() => habits.filter((h) => h.frequency === tab).sort((a, b) => a.position - b.position), [habits, tab]);
  const cols = useMemo(() => buildColumns(tab, cursor, today), [tab, cursor, today]);

  const trend = cols.map((c) => {
    if (c.future) return 0;
    let total = 0;
    let done = 0;
    for (const h of rows) {
      if (periodKey(h.frequency, h.start_date) > c.key) continue;
      const s = logs[logKey(h.id, c.key)];
      if (s === "frozen") continue;
      total++;
      if (s === "done") done++;
    }
    return pct(done, total);
  });
  const past = cols.map((c, i) => (c.future ? null : trend[i])).filter((v): v is number => v !== null);
  const avg = past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : 0;

  // Podsumowanie bieżącego okresu
  const nowKey = periodKey(tab, today);
  const doneNow = rows.filter((h) => logs[logKey(h.id, nowKey)] === "done").length;
  const frozenNow = rows.filter((h) => logs[logKey(h.id, nowKey)] === "frozen").length;
  const nowPct = pct(doneNow, rows.length - frozenNow);
  const periodWord = tab === "daily" ? "today" : tab === "weekly" ? "this week" : "this month";

  const c = fromKey(cursor);
  const headerLabel = tab === "monthly" ? String(c.getFullYear()) : `${MONTHS[c.getMonth()]} ${c.getFullYear()}`;
  const step = (dir: number) => {
    haptic(6);
    setCursor((k) => (tab === "monthly" ? `${fromKey(k).getFullYear() + dir}-01-01` : addMonths(k, dir)));
  };
  const atLatest = tab === "monthly" ? c.getFullYear() >= fromKey(today).getFullYear() : cursor >= monthStart(today);

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Nagłówek okresu */}
      <section className="card relative overflow-hidden rounded-[1.5rem] px-5 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.p key={headerLabel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="label">
                {headerLabel}
              </motion.p>
            </AnimatePresence>
            <p className="mt-1 text-[15px] font-semibold">
              {doneNow}/{rows.length} habits done {periodWord}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => step(-1)} className="btn-ghost h-11 w-11 sm:h-[52px] sm:w-[52px]" aria-label="Previous">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => step(1)} disabled={atLatest} className="btn-ghost h-11 w-11 disabled:opacity-30 sm:h-[52px] sm:w-[52px]" aria-label="Next">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full sm:inset-x-6">
          <motion.div
            className="h-full rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${nowPct}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </section>

      {/* Zakładki + nowy nawyk */}
      <section className="flex items-stretch gap-3 sm:gap-5">
        <Segmented
          id="habits-tab"
          className="flex-1"
          value={tab}
          onChange={(v) => {
            haptic(6);
            setTab(v);
            setCursor(v === "monthly" ? `${fromKey(today).getFullYear()}-01-01` : monthStart(today));
          }}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setDialog({ open: true, habit: null })}
          className="btn-primary shrink-0 px-4 text-[15px] sm:px-6 sm:text-[17px]"
        >
          <Plus size={18} strokeWidth={2.6} />
          <span className="hidden sm:inline">New Habit</span>
        </motion.button>
      </section>

      {/* Siatka */}
      <AnimatePresence mode="wait">
        <motion.section
          key={tab + cursor}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {rows.length === 0 ? (
            <div className="card grid place-items-center px-6 py-16 text-center">
              <p className="title text-lg">No {tab} habits yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Create one to start filling this grid.</p>
              <button onClick={() => setDialog({ open: true, habit: null })} className="btn-primary mt-6 h-11 px-6 text-sm">
                <Plus size={16} /> New Habit
              </button>
            </div>
          ) : (
            <Grid
              cols={cols}
              rows={rows}
              logs={logs}
              trend={trend}
              avg={avg}
              today={today}
              onEdit={(h) => setDialog({ open: true, habit: h })}
              onToggle={(h, key) => {
                const cur = logs[logKey(h.id, key)];
                haptic(cur ? 6 : 12);
                void setLog(h, key, cur ? null : "done");
              }}
            />
          )}
        </motion.section>
      </AnimatePresence>

      <HabitDialog open={dialog.open} habit={dialog.habit} defaultFrequency={tab} onClose={() => setDialog({ open: false, habit: null })} />
    </div>
  );
}

function Grid({
  cols,
  rows,
  logs,
  trend,
  avg,
  today,
  onEdit,
  onToggle,
}: {
  cols: Col[];
  rows: Habit[];
  logs: LogMap;
  trend: number[];
  avg: number;
  today: string;
  onEdit: (h: Habit) => void;
  onToggle: (h: Habit, key: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const n = cols.length;
  const wide = n <= 12;
  const template = `var(--side) repeat(${n}, minmax(${wide ? "3.25rem" : "var(--cell)"}, 1fr)) var(--stats)`;

  // Na telefonie przewiń do bieżącej kolumny
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const idx = cols.findIndex((c) => c.current);
    if (idx < 0 || el.scrollWidth <= el.clientWidth) return;
    const cell = el.querySelector<HTMLElement>(`[data-col="${idx}"]`);
    if (cell) el.scrollTo({ left: Math.max(0, cell.offsetLeft - el.clientWidth / 2), behavior: "smooth" });
  }, [cols]);

  const curIdx = cols.findIndex((c) => c.current);

  return (
    <div className="card overflow-hidden rounded-[1.6rem] [--cell:2.6rem] [--side:8rem] [--stats:8.5rem] sm:[--side:9.25rem] sm:[--stats:9rem] lg:[--cell:2.05rem]">
      <div ref={scroller} className="no-scrollbar overflow-x-auto overscroll-x-contain">
        <div className="grid min-w-max lg:min-w-0" style={{ gridTemplateColumns: template }}>
          {/* Trend */}
          <div className="sticky left-0 z-20 flex items-center gap-2 border-b border-white/[0.05] bg-[oklch(16%_0.012_180)] px-4 py-5 sm:px-5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trend</span>
          </div>
          <div className="relative border-b border-white/[0.05] bg-gradient-to-b from-[oklch(18%_0.02_180)] to-[oklch(16.5%_0.008_180)]" style={{ gridColumn: `span ${n}` }}>
            <TrendLine values={trend} cols={cols} />
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5 border-b border-white/[0.05] bg-[oklch(16.5%_0.008_180)] py-4">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Avg</span>
            <span className="grid h-11 min-w-[3.6rem] place-items-center rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 text-[17px] font-bold text-primary shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_18%,transparent)]">
              <AnimatedNumber value={avg} suffix="%" />
            </span>
          </div>

          {/* Nagłówki kolumn */}
          <div className="sticky left-0 z-20 flex items-center bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:px-5">Habit</div>
          {cols.map((c, i) => (
            <div key={c.key} data-col={i} className={`relative flex flex-col items-center justify-center py-3 ${i === curIdx ? "bg-primary/[0.04]" : ""}`}>
              {c.current && <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />}
              <span className={`text-[13px] font-semibold tabular-nums ${c.current ? "text-primary" : "text-muted-foreground/70"}`}>{c.label}</span>
              {c.sub && <span className="text-[10px] text-muted-foreground/60">{c.sub}</span>}
            </div>
          ))}
          <div className="flex items-center justify-end px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stats</div>

          {/* Wiersze */}
          {rows.map((h, ri) => {
            const cur = currentStreak(h, logs, today);
            const best = bestStreak(h, logs, today);
            const rate = rowRate(h, cols, logs);
            return (
              <Row key={h.id} habit={h} ri={ri} cols={cols} curIdx={curIdx} logs={logs} onEdit={onEdit} onToggle={onToggle} rate={rate} cur={cur} best={best} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({
  habit,
  ri,
  cols,
  curIdx,
  logs,
  onEdit,
  onToggle,
  rate,
  cur,
  best,
}: {
  habit: Habit;
  ri: number;
  cols: Col[];
  curIdx: number;
  logs: LogMap;
  onEdit: (h: Habit) => void;
  onToggle: (h: Habit, key: string) => void;
  rate: number;
  cur: number;
  best: number;
}) {
  return (
    <>
      <button
        onClick={() => onEdit(habit)}
        className="group sticky left-0 z-10 flex items-center gap-2 bg-surface px-3 py-2 text-left sm:gap-2.5 sm:px-5"
        title="Edit habit"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: habitColor(habit.color) }} />
        <span className="line-clamp-2 text-[11px] font-bold uppercase leading-[1.25] tracking-[0.04em] text-muted-foreground transition-colors [overflow-wrap:anywhere] group-hover:text-foreground sm:text-[12.5px]">
          {habit.name}
        </span>
      </button>
      {cols.map((c, i) => (
        <div key={c.key} className={`grid place-items-center py-2.5 ${i === curIdx ? "bg-primary/[0.04]" : ""}`}>
          <Cell status={logs[logKey(habit.id, c.key)]} current={c.current} future={c.future} delay={ri * 0.025 + i * 0.006} onClick={() => onToggle(habit, c.key)} />
        </div>
      ))}
      <div className="flex items-center justify-end gap-2.5 pr-4 text-[13px] font-semibold tabular-nums sm:gap-3 sm:pr-5 sm:text-[14px]">
        <span className="w-10 text-right">{rate}%</span>
        <span className="flex items-center gap-0.5 text-[oklch(75%_0.16_55)]">
          <Flame size={13} /> {cur}
        </span>
        <span className="flex items-center gap-0.5 text-warning">
          <StarIcon size={13} /> {best}
        </span>
      </div>
    </>
  );
}

function Cell({ status, current, future, delay, onClick }: { status?: string; current: boolean; future: boolean; delay: number; onClick: () => void }) {
  const done = status === "done";
  const frozen = status === "frozen";
  return (
    <motion.button
      disabled={future}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(delay, 0.5), type: "spring", stiffness: 380, damping: 24 }}
      whileTap={future ? undefined : { scale: 0.8 }}
      whileHover={future ? undefined : { scale: 1.1 }}
      className={`relative grid h-[30px] w-[30px] place-items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200 xl:h-[32px] xl:w-[32px] ${
        done
          ? `border-transparent bg-primary ${current ? "glow-cell" : ""}`
          : frozen
            ? "border-ice/40 bg-ice/10"
            : future
              ? "cursor-default border-white/[0.06]"
              : current
                ? "border-primary/40 hover:border-primary"
                : "border-white/[0.12] hover:border-primary/60"
      }`}
      aria-label={done ? "Done" : frozen ? "Frozen" : "Not done"}
    >
      <AnimatePresence>
        {done && (
          <motion.svg key="ck" width="15" height="15" viewBox="0 0 24 24" fill="none" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--primary-foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
        {frozen && (
          <motion.span key="fz" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <IceCube size={14} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function TrendLine({ values, cols }: { values: number[]; cols: Col[] }) {
  const n = values.length;
  const W = n * 100;
  const H = 100;
  const top = 18;
  const bottom = 82;
  const pts = values.map((v, i) => ({ x: (i + 0.5) * 100, y: bottom - (v / 100) * (bottom - top), future: cols[i].future }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[n - 1].x},${H} L${pts[0].x},${H} Z`;
  return (
    <div className="relative h-full min-h-[86px] w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {pts.map((p, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.02 }}
          className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-primary bg-[oklch(16%_0.01_180)]"
          style={{ left: `${(p.x / W) * 100}%`, top: `${p.y}%` }}
          title={`${values[i]}%`}
        />
      ))}
    </div>
  );
}
