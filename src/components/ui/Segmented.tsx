"use client";

import { motion } from "framer-motion";

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id: string;
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({ value, onChange, options, id, className = "", size = "md" }: Props<T>) {
  return (
    <div className={`flex rounded-full bg-[oklch(17%_0_0)] p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-full font-semibold uppercase tracking-[0.08em] transition-colors ${
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "py-3.5 text-[13px] sm:py-4"
            } ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
