"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { HabitDialog } from "@/components/HabitDialog";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Burst } from "@/components/ui/Burst";
import { Flame, IceCube } from "@/components/ui/Icons";
import { Ring } from "@/components/ui/Ring";
import { habitColor } from "@/lib/constants";
import { MONTHS, WEEKDAYS, fromKey, periodKey, todayKey } from "@/lib/dates";
import { currentStreak, freezeTokens, logKey, pct } from "@/lib/stats";
import { haptic, useStore } from "@/lib/store";
import type { Habit, LogStatus } from "@/lib/types";

export default function TodayPage() {
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.logs);
  const setLog = useStore((s) => s.setLog);
  const [dialog, setDialog] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const today = todayKey();
  const d = fromKey(today);
  const daily = useMemo(() => habits.filter((h) => h.frequency === "daily").sort((a, b) => a.position - b.position), [habits]);
  const weekly = habits.filter((h) => h.frequency === "weekly");
  const monthly = habits.filter((h) => h.frequency === "monthly");

  const doneCount = daily.filter((h) => logs[logKey(h.id, today)] === "done").length;
  const frozenCount = daily.filter((h) => logs[logKey(h.id, today)] === "frozen").length;
  const value = pct(doneCount, daily.length - frozenCount);
  const tokens = useMemo(() => freezeTokens(habits, logs, today), [habits, logs, today]);

  function toggle(h: Habit) {
    const p = periodKey(h.frequency, today);
    const cur = logs[logKey(h.id, p)];
    const next: LogStatus | null = cur === "done" ? null : "done";
    haptic(next ? 12 : 6);
    void setLog(h, p, next);
    if (next && h.frequency === "daily") {
      const willBe = doneCount + 1;
      if (willBe === daily.length - frozenCount && willBe > 0) {
        setTimeout(() => setCelebrate((c) => c + 1), 250);
        haptic(30);
      }
    }
  }

  function freeze(h: Habit) {
    const cur = logs[logKey(h.id, today)];
    if (cur === "frozen") return void setLog(h, today, null);
    if (tokens <= 0) return useStore.getState().toast("No freeze tokens left — earn more with perfect days.");
    haptic(10);
    void setLog(h, today, "frozen");
  }

  return (
    <div className="pt-2 md:pt-6">
      {/* Pierścień */}
      <section className="flex flex-col items-center">
        <div className="relative">
          <div className="hidden sm:block">
            <Ring value={value} size={256} stroke={17} glow>
              <RingLabel value={value} />
            </Ring>
          </div>
          <div className="sm:hidden">
            <Ring value={value} size={212} stroke={15} glow>
              <RingLabel value={value} />
            </Ring>
          </div>
          <Burst trigger={celebrate} count={28} spread={150} />
        </div>

        <h2 className="title mt-7 text-[18px] tracking-[-0.01em] sm:mt-9">
          {WEEKDAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]}
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {doneCount} / {daily.length} habits completed
        </p>

        <AnimatePresence mode="wait">
          {value === 100 && daily.length > 0 ? (
            <motion.div
              key="perfect"
              initial={{ opacity: 0, scale: 0.8, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-primary shadow-glow"
            >
              ✨ Perfect day
            </motion.div>
          ) : (
            <motion.div
              key="freeze"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/[0.07] px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-primary"
            >
              <IceCube size={16} /> {tokens} freeze {tokens === 1 ? "token" : "tokens"} available
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Nawyki */}
      {habits.length === 0 ? (
        <EmptyState onAdd={() => setDialog(true)} />
      ) : (
        <>
          <HabitList habits={daily} today={today} logs={logs} onToggle={toggle} onFreeze={freeze} showFreeze={tokens > 0} />
          {weekly.length > 0 && (
            <>
              <p className="label mx-1 mb-3 mt-10">This week</p>
              <HabitList habits={weekly} today={today} logs={logs} onToggle={toggle} compact />
            </>
          )}
          {monthly.length > 0 && (
            <>
              <p className="label mx-1 mb-3 mt-10">This month</p>
              <HabitList habits={monthly} today={today} logs={logs} onToggle={toggle} compact />
            </>
          )}
          <div className="mt-8 flex justify-center">
            <button onClick={() => setDialog(true)} className="btn-ghost h-11 gap-2 px-5 text-sm text-muted-foreground hover:text-foreground">
              <Plus size={16} /> New Habit
            </button>
          </div>
        </>
      )}

      <HabitDialog open={dialog} onClose={() => setDialog(false)} />
    </div>
  );
}

function RingLabel({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[50px] font-bold leading-none tracking-[-0.05em] sm:text-[58px]">
        <AnimatedNumber value={value} suffix="%" />
      </span>
      <span className="mt-2.5 text-[14px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[15px]">Today</span>
    </div>
  );
}

function HabitList({
  habits,
  today,
  logs,
  onToggle,
  onFreeze,
  showFreeze,
  compact,
}: {
  habits: Habit[];
  today: string;
  logs: Record<string, LogStatus>;
  onToggle: (h: Habit) => void;
  onFreeze?: (h: Habit) => void;
  showFreeze?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 sm:gap-5 md:grid-cols-2 ${compact ? "" : "mt-9 sm:mt-14"}`}>
      {habits.map((h, i) => (
        <HabitCard
          key={h.id}
          habit={h}
          index={i}
          status={logs[logKey(h.id, periodKey(h.frequency, today))]}
          streak={currentStreak(h, logs, today)}
          onToggle={() => onToggle(h)}
          onFreeze={onFreeze ? () => onFreeze(h) : undefined}
          showFreeze={showFreeze}
        />
      ))}
    </div>
  );
}

function HabitCard({
  habit,
  status,
  streak,
  onToggle,
  onFreeze,
  showFreeze,
  index,
}: {
  habit: Habit;
  status?: LogStatus;
  streak: number;
  onToggle: () => void;
  onFreeze?: () => void;
  showFreeze?: boolean;
  index: number;
}) {
  const [burst, setBurst] = useState(0);
  const done = status === "done";
  const frozen = status === "frozen";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={`group flex items-center gap-3.5 rounded-[1.35rem] border p-3 transition-colors duration-300 sm:gap-5 sm:p-[14px] ${
        frozen
          ? "border-ice/25 bg-[oklch(19%_0.03_235/0.45)]"
          : done
            ? "border-white/[0.05] bg-[oklch(15%_0.006_180)]"
            : "border-white/[0.05] bg-[oklch(14.5%_0.003_180)] hover:border-white/[0.09]"
      }`}
    >
      <motion.button
        onClick={() => {
          if (!done) setBurst((b) => b + 1);
          onToggle();
        }}
        whileTap={{ scale: 0.86 }}
        className={`relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[1rem] border transition-colors duration-200 sm:h-[60px] sm:w-[60px] sm:rounded-[1.1rem] ${
          done ? "border-transparent bg-primary" : frozen ? "border-ice/30 bg-ice/10" : "border-white/[0.13] bg-transparent hover:border-primary/50"
        }`}
        aria-label={done ? `Uncheck ${habit.name}` : `Check ${habit.name}`}
        aria-pressed={done}
      >
        <AnimatePresence>
          {done && (
            <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="var(--primary-foreground)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                />
              </svg>
            </motion.span>
          )}
          {frozen && (
            <motion.span key="f" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <IceCube size={24} />
            </motion.span>
          )}
        </AnimatePresence>
        <Burst trigger={burst} />
      </motion.button>

      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: habitColor(habit.color) }} />

      <span
        className={`min-w-0 flex-1 truncate text-[15px] font-semibold transition-colors duration-300 sm:text-[17px] ${
          done ? "text-muted-foreground line-through decoration-[1.5px]" : frozen ? "text-ice" : "text-foreground"
        }`}
      >
        {habit.name}
      </span>

      {onFreeze && !done && (showFreeze || frozen) && (
        <motion.button
          whileTap={{ scale: 0.8, rotate: -15 }}
          whileHover={{ scale: 1.12 }}
          onClick={onFreeze}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity ${frozen ? "bg-ice/15" : "opacity-90 hover:opacity-100"}`}
          aria-label={frozen ? "Unfreeze" : "Use freeze token"}
          title={frozen ? "Unfreeze" : "Use a freeze token"}
        >
          <IceCube size={19} />
        </motion.button>
      )}

      <span className="flex w-11 shrink-0 items-center justify-end gap-1 pr-1 sm:w-14 sm:pr-2">
        <motion.span key={streak} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
          <Flame size={16} dim={streak === 0} />
        </motion.span>
        <span className={`text-[15px] font-bold tabular-nums ${streak > 0 ? "text-primary" : "text-muted-foreground"}`}>{streak}</span>
      </span>
    </motion.div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card mx-auto mt-12 max-w-md p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Check size={26} />
      </div>
      <h3 className="title mt-4 text-lg">No habits yet</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Add your first habit and start building a streak.</p>
      <button onClick={onAdd} className="btn-primary mt-6 h-12 px-7">
        <Plus size={17} /> New Habit
      </button>
    </motion.div>
  );
}
