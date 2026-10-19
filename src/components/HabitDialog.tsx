"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";
import { HABIT_COLORS } from "@/lib/constants";
import { MON_FIRST, WEEKDAYS_SHORT } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Frequency, Habit } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
  defaultFrequency?: Frequency;
}

export function HabitDialog({ open, onClose, habit, defaultFrequency = "daily" }: Props) {
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency);
  const [days, setDays] = useState<number[]>(MON_FIRST);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setColor(habit?.color ?? HABIT_COLORS[Math.floor(Math.random() * 4)].id);
    setFrequency(habit?.frequency ?? defaultFrequency);
    setDays(habit?.days?.length ? habit.days : MON_FIRST);
    setConfirmDelete(false);
  }, [open, habit, defaultFrequency]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const d = frequency === "daily" && days.length < 7 ? [...days].sort((a, b) => a - b) : null;
    if (habit) void updateHabit(habit.id, { name: n, color, frequency, days: d });
    else void addHabit({ name: n, color, frequency, days: d });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? "Edit Habit" : "New Habit"}>
      <form onSubmit={save} className="space-y-5">
        <div>
          <p className="label mb-2">Name</p>
          <input autoFocus className="field" placeholder="e.g. Read 10 pages" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <p className="label mb-2.5">Color</p>
          <div className="flex flex-wrap gap-2.5">
            {HABIT_COLORS.map((c) => (
              <motion.button
                type="button"
                key={c.id}
                whileTap={{ scale: 0.85 }}
                onClick={() => setColor(c.id)}
                className="relative grid h-9 w-9 place-items-center rounded-full"
                style={{ background: c.value }}
                aria-label={c.label}
              >
                {color === c.id && (
                  <motion.span layoutId="color-ring" className="absolute -inset-1 rounded-full border-2" style={{ borderColor: c.value }} />
                )}
                {color === c.id && <Check size={16} strokeWidth={3} className="text-black/70" />}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">Frequency</p>
          <Segmented
            id="freq"
            size="md"
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>

        <AnimatePresence initial={false}>
          {frequency === "daily" && (
            <motion.div
              key="days"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <p className="label">Days</p>
                <span className="text-[12px] text-muted-foreground">{days.length === 7 ? "Every day" : `${days.length}× a week`}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {MON_FIRST.map((wd) => {
                  const on = days.includes(wd);
                  return (
                    <motion.button
                      type="button"
                      key={wd}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => {
                        // Co najmniej jeden dzień musi zostać
                        if (on && days.length === 1) return;
                        setDays(on ? days.filter((x) => x !== wd) : [...days, wd]);
                      }}
                      aria-pressed={on}
                      className={`h-11 rounded-xl border text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                        on ? "border-transparent bg-primary text-primary-foreground" : "border-white/[0.1] text-muted-foreground hover:border-white/25 hover:text-foreground"
                      }`}
                    >
                      {WEEKDAYS_SHORT[wd]}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 pt-1">
          {habit && (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                void deleteHabit(habit.id);
                onClose();
              }}
              className={`btn-ghost h-12 gap-2 px-4 text-sm transition-colors ${confirmDelete ? "border-destructive/50 bg-destructive/15 text-destructive" : "text-destructive"}`}
            >
              <Trash size={15} /> {confirmDelete ? "Tap again to delete" : "Delete"}
            </button>
          )}
          <button type="submit" disabled={!name.trim()} className="btn-primary ml-auto h-12 px-7 text-[15px] disabled:opacity-40">
            {habit ? "Save" : "+ Add Habit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
