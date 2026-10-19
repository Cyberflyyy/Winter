"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MONTHS_SHORT, fromKey } from "@/lib/dates";

export interface Series {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
}

interface Pt {
  x: number;
  y: number;
}

/** Monotoniczna krzywa (jak d3.curveMonotoneX) — gładka, bez wychodzenia poza 0–100%. */
function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (!n) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const m: number[] = [];
  const dx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function fmt(key: string) {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function ConsistencyChart({ days, series, animKey }: { days: string[]; series: Series[]; animKey: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = days.length;
  const H = w < 640 ? 250 : 330;
  const top = w < 640 ? 64 : 78;
  const bottom = H - 40;
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => top + (1 - v / 100) * (bottom - top);

  const paths = series.map((s) => {
    const pts: Pt[] = [];
    s.values.forEach((v, i) => v !== null && pts.push({ x: x(i), y: y(v) }));
    const line = monotonePath(pts);
    const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].x},${bottom} L${pts[0].x},${bottom} Z` : "";
    return { s, line, area };
  });

  const tickCount = w < 640 ? 4 : 8;
  const ticks = n ? Array.from(new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (n - 1)) / (tickCount - 1))))) : [];

  function onMove(e: React.PointerEvent) {
    const rect = wrap.current!.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }

  const hx = hover !== null ? x(hover) : 0;
  const hoverVals = hover !== null ? series.map((s) => ({ s, v: s.values[hover] })) : [];
  const anchor = hoverVals.find((h) => h.v !== null);
  const tipLeft = Math.max(60, Math.min(w - 60, hx));

  return (
    <div ref={wrap} className="relative w-full touch-pan-y select-none" style={{ height: H }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={H} className="absolute inset-0 overflow-visible">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.id} id={`area-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity={series.length === 1 ? 0.42 : s.id === "me" ? 0.2 : 0.07} />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {paths.map(({ s, area }) => (
            <motion.path key={`a-${s.id}-${animKey}`} d={area} fill={`url(#area-${s.id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }} />
          ))}
          {paths.map(({ s, line }, i) => (
            <motion.path
              key={`l-${s.id}-${animKey}`}
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={2.4}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
          {hover !== null && (
            <>
              <line x1={hx} x2={hx} y1={top - 8} y2={bottom} stroke="var(--primary)" strokeOpacity="0.5" strokeDasharray="3 4" />
              {hoverVals.map(({ s, v }) =>
                v === null ? null : <circle key={s.id} cx={hx} cy={y(v)} r={6} fill="oklch(16% 0 0)" stroke={s.color} strokeWidth={2.4} />,
              )}
            </>
          )}
        </svg>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hover !== null && anchor && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-2xl border border-white/10 bg-[oklch(17%_0.01_180/0.92)] px-3.5 py-2 text-center shadow-xl backdrop-blur"
            style={{ left: tipLeft, top: 0 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{fmt(days[hover])}</p>
            <div className="mt-0.5 flex items-center justify-center gap-3">
              {hoverVals.map(({ s, v }) => (
                <span key={s.id} className="text-[19px] font-bold tabular-nums" style={{ color: s.color }}>
                  {v === null ? "–" : `${Math.round(v)}%`}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oś X */}
      {w > 0 &&
        ticks.map((i) => (
          <span
            key={i}
            className="absolute bottom-0 whitespace-nowrap text-[12px] text-muted-foreground sm:text-[13px]"
            style={{ left: x(i), transform: `translateX(${i === 0 ? "0" : i === n - 1 ? "-100%" : "-50%"})` }}
          >
            {fmt(days[i])}
          </span>
        ))}
    </div>
  );
}
