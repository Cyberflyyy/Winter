"use client";

import { useEffect, useState } from "react";

const COLORS = ["var(--primary)", "var(--cat-health)", "var(--warning)", "var(--cat-personal)", "var(--cat-mind)"];

/** Mały wybuch konfetti — zmień `trigger`, żeby odpalić. */
export function Burst({ trigger, count = 12, spread = 46 }: { trigger: number; count?: number; spread?: number }) {
  const [dots, setDots] = useState<{ id: string; dx: number; dy: number; c: string; s: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const batch = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = spread * (0.6 + Math.random() * 0.6);
      return {
        id: `${trigger}-${i}`,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d,
        c: COLORS[i % COLORS.length],
        s: 4 + Math.random() * 4,
      };
    });
    setDots(batch);
    const t = setTimeout(() => setDots([]), 750);
    return () => clearTimeout(t);
  }, [trigger, count, spread]);

  if (!dots.length) return null;
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible" aria-hidden>
      {dots.map((d) => (
        <span
          key={d.id}
          className="confetti-dot absolute rounded-full"
          style={{ width: d.s, height: d.s, background: d.c, ["--dx" as string]: `${d.dx}px`, ["--dy" as string]: `${d.dy}px` }}
        />
      ))}
    </span>
  );
}
