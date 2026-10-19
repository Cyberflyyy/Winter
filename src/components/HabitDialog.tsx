"use client";

import { motion } from "framer-motion";
import { Check, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";
import { HABIT_COLORS } from "@/lib/constants";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setColor(habit?.color ?? HABIT_COLORS[Math.floor(Math.random() * 4)].id);
    setFrequency(habit?.frequency ?? defaultFrequency);
    setConfirmDelete(false);
  }, [open, habit, defaultFrequency]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (habit) void updateHabit(habit.id, { name: n, color, frequency });
    else void addHabit({ name: n, color, frequency });
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
