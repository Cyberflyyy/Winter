"use client";

import { motion } from "framer-motion";

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  glow?: boolean;
  delay?: number;
}

export function Ring({ value, size = 120, stroke = 10, color = "var(--primary)", track = "oklch(24% 0 0)", children, glow, delay = 0 }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: v === 0 ? c : c * (1 - v / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
          style={glow ? { filter: `drop-shadow(0 0 10px color-mix(in oklab, ${color} 45%, transparent))` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
