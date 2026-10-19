"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  align?: "left" | "right";
}

export function Dropdown<T extends string>({ value, onChange, options, className = "", align = "right" }: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-full border border-white/[0.07] bg-[oklch(17%_0_0)] px-3.5 text-[12px] font-bold uppercase tracking-[0.04em] transition-colors hover:border-white/[0.14] sm:h-[52px] sm:px-5 sm:text-[14px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current?.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0 text-muted-foreground">
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`absolute top-[calc(100%+6px)] z-50 max-h-72 min-w-full overflow-y-auto rounded-2xl border border-white/10 bg-[oklch(19%_0_0)] p-1.5 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-4 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold uppercase tracking-[0.05em] transition-colors hover:bg-white/[0.06] ${
                    o.value === value ? "text-primary" : "text-foreground"
                  }`}
                >
                  {o.label}
                  {o.value === value && <Check size={14} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
