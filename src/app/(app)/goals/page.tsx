"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Pin, Plus, Trash, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Burst } from "@/components/ui/Burst";
import { Modal } from "@/components/ui/Modal";
import { Ring } from "@/components/ui/Ring";
import { AREAS, areaOf } from "@/lib/constants";
import { diffDays, todayKey } from "@/lib/dates";
import { haptic, useStore } from "@/lib/store";
import type { Goal, Milestone } from "@/lib/types";

function goalProgress(g: Goal): number {
  if (g.status === "achieved") return 100;
  if (g.milestones?.length) return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100);
  return g.progress;
}

function daysLeftLabel(g: Goal): string {
  if (g.status === "achieved") return "Achieved 🎉";
  if (!g.deadline) return "No deadline";
  const n = diffDays(g.deadline, todayKey());
  if (n < 0) return `${-n} days overdue`;
  if (n === 0) return "Due today";
  return `${n} ${n === 1 ? "day" : "days"} left`;
}

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const [area, setArea] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });

  const achieved = goals.filter((g) => g.status === "achieved").length;
  const pinned = goals.filter((g) => g.pinned);
  const filtered = useMemo(
    () =>
      goals
        .filter((g) => !area || g.area === area)
        .sort((a, b) => Number(a.status === "achieved") - Number(b.status === "achieved") || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")),
    [goals, area],
  );

  const open = (goal: Goal | null) => setDialog({ open: true, goal });

  return (
    <div className="space-y-7 md:space-y-8">
      {/* Podsumowanie */}
      <section className="card flex items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Ring value={goals.length ? (achieved / goals.length) * 100 : 0} size={88} stroke={8}>
            <span className="text-[20px] font-bold tracking-[-0.04em]">
              {achieved}/{goals.length}
            </span>
          </Ring>
          <div>
            <p className="label">Goals achieved</p>
            <p className="mt-1 text-[15px] font-semibold sm:text-[16px]">Mastering {AREAS.length} areas</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.94 }} onClick={() => open(null)} className="btn-primary h-11 shrink-0 px-4 text-sm sm:h-12 sm:px-6 sm:text-[15px]">
          <Plus size={17} strokeWidth={2.6} /> <span className="hidden sm:inline">New Goal</span>
        </motion.button>
      </section>

      {/* Obszary */}
      <section>
        <p className="title mb-3.5 text-[14px] tracking-[0.02em] text-muted-foreground sm:text-[15px]">Areas of life</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {AREAS.map((a, i) => {
            const list = goals.filter((g) => g.area === a.id);
            const ach = list.filter((g) => g.status === "achieved").length;
            const active = area === a.id;
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2 }}
                onClick={() => {
                  haptic(6);
                  setArea(active ? null : a.id);
                }}
                className={`rounded-[1.2rem] border px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4 ${
                  active ? "border-primary/50 bg-primary/[0.08]" : "border-white/[0.07] bg-surface hover:border-white/[0.14]"
                }`}
              >
                <p className="flex items-center gap-2 truncate text-[14px] font-semibold sm:text-[16px]">
                  <span>{a.emoji}</span>
                  <span className="truncate">{a.label}</span>
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground sm:text-[14px]">
                  {list.length} goals · {ach} achieved
                </p>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Priorytety */}
      {pinned.length > 0 && (
        <section>
          <p className="title mb-3.5 text-[14px] tracking-[0.02em] text-muted-foreground sm:text-[15px]">Top priorities</p>
          <div className="space-y-3 sm:space-y-4">
            <AnimatePresence initial={false}>
              {pinned.map((g) => (
                <GoalCard key={g.id} goal={g} big onOpen={() => open(g)} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Wszystkie */}
      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <p className="title text-[14px] tracking-[0.02em] text-muted-foreground sm:text-[15px]">
            All goals {area && <span className="text-primary">· {areaOf(area).label}</span>}
          </p>
          {area && (
            <button onClick={() => setArea(null)} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
              <X size={13} /> Clear
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-muted-foreground">{area ? "No goals in this area yet." : "No goals yet — set your first one."}</p>
            <button onClick={() => open(null)} className="btn-primary mt-5 h-11 px-6 text-sm">
              <Plus size={16} /> New Goal
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {filtered.map((g) => (
                <GoalCard key={g.id} goal={g} onOpen={() => open(g)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <GoalDialog open={dialog.open} goal={dialog.goal} defaultArea={area} onClose={() => setDialog({ open: false, goal: null })} />
    </div>
  );
}

function GoalCard({ goal, big, onOpen }: { goal: Goal; big?: boolean; onOpen: () => void }) {
  const updateGoal = useStore((s) => s.updateGoal);
  const p = goalProgress(goal);
  const achieved = goal.status === "achieved";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      className={`group relative cursor-pointer rounded-[1.5rem] border border-white/[0.07] bg-surface transition-colors hover:border-white/[0.14] ${big ? "p-5 sm:p-7" : "p-5"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={`font-bold tracking-[-0.02em] ${big ? "text-[18px] sm:text-[20px]" : "text-[16px]"} ${achieved ? "text-muted-foreground" : ""}`}>{goal.title}</h3>
        <motion.button
          whileTap={{ scale: 0.75, rotate: -20 }}
          onClick={(e) => {
            e.stopPropagation();
            haptic(8);
            void updateGoal(goal.id, { pinned: !goal.pinned });
          }}
          className={`-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/[0.05] ${goal.pinned ? "text-[oklch(65%_0.22_10)]" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
          aria-label={goal.pinned ? "Unpin" : "Pin"}
        >
          <Pin size={17} fill={goal.pinned ? "currentColor" : "none"} className="rotate-45" />
        </motion.button>
      </div>
      <span
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
          achieved ? "bg-success/15 text-success" : "bg-primary/[0.12] text-primary"
        }`}
      >
        {achieved ? "Achieved" : "In progress"}
      </span>
      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {areaOf(goal.area).emoji} {areaOf(goal.area).label}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground/70">{daysLeftLabel(goal)}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className={`h-full rounded-full ${achieved ? "bg-success" : "bg-primary"}`}
            initial={{ width: 0 }}
            animate={{ width: `${p}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-muted-foreground">
          <AnimatedNumber value={p} suffix="%" />
        </span>
      </div>
    </motion.div>
  );
}

function GoalDialog({ open, goal, defaultArea, onClose }: { open: boolean; goal: Goal | null; defaultArea: string | null; onClose: () => void }) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [title, setTitle] = useState("");
  const [area, setArea] = useState("health");
  const [deadline, setDeadline] = useState("");
  const [progress, setProgress] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [achieved, setAchieved] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newStep, setNewStep] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? "");
    setArea(goal?.area ?? defaultArea ?? "health");
    setDeadline(goal?.deadline ?? "");
    setProgress(goal?.progress ?? 0);
    setPinned(goal?.pinned ?? false);
    setAchieved(goal?.status === "achieved");
    setMilestones(goal?.milestones ?? []);
    setNewStep("");
    setConfirmDelete(false);
  }, [open, goal, defaultArea]);

  function addStep() {
    const t = newStep.trim();
    if (!t) return;
    setMilestones((m) => [...m, { id: Math.random().toString(36).slice(2), title: t, done: false }]);
    setNewStep("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const data = {
      title: t,
      area,
      deadline: deadline || null,
      progress,
      pinned,
      status: achieved ? ("achieved" as const) : ("in_progress" as const),
      milestones,
    };
    if (goal) void updateGoal(goal.id, data);
    else void addGoal(data);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? "Edit Goal" : "New Goal"} width={520}>
      <form onSubmit={save} className="space-y-5">
        <div>
          <p className="label mb-2">Goal</p>
          <input autoFocus={!goal} className="field" placeholder="e.g. Run a 5K" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <p className="label mb-2">Area</p>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => setArea(a.id)}
                className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  area === a.id ? "border-primary/60 bg-primary/[0.12] text-foreground" : "border-white/[0.08] text-muted-foreground hover:text-foreground"
                }`}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label mb-2">Deadline</p>
            <input type="date" className="field [color-scheme:dark]" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <p className="label mb-2">Priority</p>
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              className={`field flex items-center justify-center gap-2 font-semibold ${pinned ? "!border-[oklch(65%_0.22_10/0.6)] text-[oklch(70%_0.2_10)]" : "text-muted-foreground"}`}
            >
              <Pin size={15} fill={pinned ? "currentColor" : "none"} className="rotate-45" /> {pinned ? "Pinned" : "Pin to top"}
            </button>
          </div>
        </div>

        <div>
          <p className="label mb-2">Milestones</p>
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {milestones.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2.5 rounded-xl bg-white/[0.035] px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setMilestones((list) => list.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition-colors ${m.done ? "border-transparent bg-primary" : "border-white/25"}`}
                  >
                    {m.done && <Check size={13} strokeWidth={3.2} className="text-primary-foreground" />}
                  </button>
                  <span className={`flex-1 text-[14px] ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</span>
                  <button type="button" onClick={() => setMilestones((list) => list.filter((x) => x.id !== m.id))} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="flex gap-2">
              <input
                className="field !py-2.5"
                placeholder="Add a milestone"
                value={newStep}
                maxLength={100}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep();
                  }
                }}
              />
              <button type="button" onClick={addStep} className="btn-ghost h-[46px] w-[46px] shrink-0" aria-label="Add milestone">
                <Plus size={17} />
              </button>
            </div>
          </div>
        </div>

        {milestones.length === 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label">Progress</p>
              <span className="text-sm font-bold tabular-nums text-primary">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--primary)]"
              style={{ background: `linear-gradient(to right, var(--primary) ${progress}%, oklch(100% 0 0 / 0.08) ${progress}%)` }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!achieved) {
              setBurst((b) => b + 1);
              haptic(30);
            }
            setAchieved((a) => !a);
          }}
          className={`relative flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-[15px] font-semibold transition-colors ${
            achieved ? "border-success/50 bg-success/15 text-success" : "border-white/[0.1] text-muted-foreground hover:text-foreground"
          }`}
        >
          <Check size={17} strokeWidth={2.6} /> {achieved ? "Achieved!" : "Mark as achieved"}
          <Burst trigger={burst} count={22} spread={110} />
        </button>

        <div className="flex items-center gap-2 pt-1">
          {goal && (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                void deleteGoal(goal.id);
                onClose();
              }}
              className={`btn-ghost h-12 gap-2 px-4 text-sm ${confirmDelete ? "border-destructive/50 bg-destructive/15 text-destructive" : "text-destructive"}`}
            >
              <Trash size={15} /> {confirmDelete ? "Tap again" : "Delete"}
            </button>
          )}
          <button type="submit" disabled={!title.trim()} className="btn-primary ml-auto h-12 px-7 text-[15px] disabled:opacity-40">
            {goal ? "Save" : "+ Add Goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
