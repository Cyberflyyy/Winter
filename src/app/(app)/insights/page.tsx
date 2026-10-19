"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Swords, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConsistencyChart, type Series } from "@/components/ConsistencyChart";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Dropdown } from "@/components/ui/Dropdown";
import { Flame, MedalIcon } from "@/components/ui/Icons";
import { Segmented } from "@/components/ui/Segmented";
import { RIVAL_COLOR } from "@/lib/constants";
import { addDays, addMonths, monthStart, range, todayKey, weekStart } from "@/lib/dates";
import { currentStreak, dailyStats, habitRate, pct, sumStats } from "@/lib/stats";
import { haptic, useStore } from "@/lib/store";
import type { DayStat, Frequency } from "@/lib/types";

type RangeId = "7" | "30" | "90";
const ME_COLOR = "var(--primary)";

export default function InsightsPage() {
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.logs);
  const profiles = useStore((s) => s.profiles);
  const userId = useStore((s) => s.userId);
  const today = todayKey();

  const [rangeId, setRangeId] = useState<RangeId>("30");
  const [habitId, setHabitId] = useState<string>("overall");
  const [rivalId, setRivalId] = useState<string | null>(null);
  const [rivalStats, setRivalStats] = useState<DayStat[] | null>(null);
  const [rivalLoading, setRivalLoading] = useState(false);
  const [lb, setLb] = useState<Frequency>("daily");
  const [pickRival, setPickRival] = useState(false);

  const me = profiles.find((p) => p.id === userId);
  const others = profiles.filter((p) => p.id !== userId);
  const rival = others.find((p) => p.id === rivalId) ?? null;
  const vs = !!rival && habitId === "overall";

  const days = Number(rangeId);
  const from = addDays(today, -(days - 1));
  const dayKeys = useMemo(() => range(from, today), [from, today]);
  const thisWeekFrom = weekStart(today);
  const lastWeekFrom = addDays(thisWeekFrom, -7);
  const fetchFrom = from < lastWeekFrom ? from : lastWeekFrom;

  const myStats = useMemo(() => dailyStats(habits, logs, fetchFrom, today), [habits, logs, fetchFrom, today]);
  const myRange = myStats.filter((s) => s.day >= from);

  // Dane rywala (agregaty z funkcji SQL)
  useEffect(() => {
    if (!rivalId) return;
    let cancelled = false;
    setRivalLoading(true);
    void useStore
      .getState()
      .fetchDailyStats(rivalId, fetchFrom, today)
      .then((data) => {
        if (cancelled) return;
        setRivalLoading(false);
        if (data) setRivalStats(data);
      });
    return () => {
      cancelled = true;
    };
  }, [rivalId, fetchFrom, today]);

  const rivalRange = rivalStats?.filter((s) => s.day >= from) ?? [];

  // Wartości wykresu
  const toSeries = (stats: DayStat[]) => {
    const m = new Map(stats.map((s) => [s.day, s]));
    return dayKeys.map((d) => {
      const s = m.get(d);
      return s && s.total > 0 ? (s.done / s.total) * 100 : null;
    });
  };

  const selectedHabit = habits.find((h) => h.id === habitId);
  let myValues: (number | null)[];
  let headline: number;
  if (selectedHabit) {
    // Pojedynczy nawyk: krocząca średnia 7 dni
    myValues = dayKeys.map((d) => (d < selectedHabit.start_date ? null : habitRate(selectedHabit, logs, addDays(d, -6), d, today)));
    headline = habitRate(selectedHabit, logs, from, today, today);
  } else {
    myValues = toSeries(myRange);
    headline = sumStats(myRange);
  }
  const rivalHeadline = sumStats(rivalRange);

  const series: Series[] = [{ id: "me", label: me?.display_name ?? "You", color: ME_COLOR, values: myValues }];
  if (vs && rivalStats) series.push({ id: "rival", label: rival!.display_name, color: RIVAL_COLOR, values: toSeries(rivalRange) });

  // Kafelki
  const weekPct = (stats: DayStat[], a: string, b: string) => sumStats(stats.filter((s) => s.day >= a && s.day <= b));
  const thisWeek = weekPct(myStats, thisWeekFrom, today);
  const lastWeek = weekPct(myStats, lastWeekFrom, addDays(thisWeekFrom, -1));
  const rThisWeek = rivalStats ? weekPct(rivalStats, thisWeekFrom, today) : 0;
  const rLastWeek = rivalStats ? weekPct(rivalStats, lastWeekFrom, addDays(thisWeekFrom, -1)) : 0;

  const streaks = habits.map((h) => ({ h, n: currentStreak(h, logs, today) })).sort((a, b) => b.n - a.n);
  const bestStreakNow = streaks[0]?.n ?? 0;

  const dailyRates = habits
    .filter((h) => h.frequency === "daily")
    .map((h) => ({ h, r: habitRate(h, logs, addDays(today, -29), today, today) }))
    .sort((a, b) => a.r - b.r);
  const needsAttention = dailyRates[0]?.h.name ?? "—";

  const leaderboard = habits
    .filter((h) => h.frequency === lb)
    .map((h) => {
      const fromLb = lb === "daily" ? addDays(today, -29) : lb === "weekly" ? addDays(weekStart(today), -7 * 11) : addMonths(monthStart(today), -11);
      return { h, r: habitRate(h, logs, fromLb, today, today) };
    })
    .sort((a, b) => b.r - a.r);

  function toggleVs() {
    haptic(12);
    if (vs) {
      setRivalId(null);
      setRivalStats(null);
      return;
    }
    if (!others.length) {
      useStore.getState().toast("Nikt inny jeszcze nie ma konta — niech kolega się zarejestruje!");
      return;
    }
    if (habitId !== "overall") setHabitId("overall");
    if (others.length === 1) setRivalId(others[0].id);
    else setPickRival(true);
  }

  const habitOptions = [
    { value: "overall", label: "Overall" },
    ...habits.filter((h) => h.frequency === "daily").map((h) => ({ value: h.id, label: h.name })),
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Consistency */}
      <section className="card relative overflow-hidden p-5 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[90px] transition-colors duration-700"
          style={{ background: vs ? "oklch(75% 0.16 62 / 0.1)" : "oklch(78.8% 0.135 181.9 / 0.08)" }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label">{vs ? "Consistency · head to head" : "Overall consistency"}</p>
            <AnimatePresence mode="wait">
              {vs ? (
                <motion.div key="vs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-2 flex items-end gap-3 sm:gap-5">
                  <BigNumber value={headline} color="var(--foreground)" name={me?.display_name ?? "You"} dot={ME_COLOR} lead={headline > rivalHeadline} />
                  <span className="mb-6 text-[15px] font-bold text-muted-foreground sm:mb-8 sm:text-[18px]">VS</span>
                  <BigNumber value={rivalStats ? rivalHeadline : 0} color={RIVAL_COLOR} name={rival!.display_name} dot={RIVAL_COLOR} lead={rivalHeadline > headline} loading={rivalLoading && !rivalStats} />
                </motion.div>
              ) : (
                <motion.p key="solo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-1 text-[56px] font-bold leading-none tracking-[-0.055em] sm:text-[72px]">
                  <AnimatedNumber value={headline} suffix="%" />
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
            <Dropdown className="min-w-0 sm:w-[190px]" value={habitId} onChange={setHabitId} options={habitOptions} align="left" />
            <Dropdown
              className="min-w-0 sm:w-[190px]"
              value={rangeId}
              onChange={setRangeId}
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
            />
            <VsButton active={vs} onClick={toggleVs} />
          </div>
        </div>

        <div className="relative mt-4 sm:mt-2">
          <ConsistencyChart days={dayKeys} series={series} animKey={`${rangeId}-${habitId}-${vs ? "vs" : "solo"}`} />
        </div>
      </section>

      {/* Head to head */}
      <AnimatePresence>
        {vs && rivalStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <HeadToHead
              meName={me?.display_name ?? "You"}
              rivalName={rival!.display_name}
              mine={myRange}
              theirs={rivalRange}
              meThisWeek={thisWeek}
              rivalThisWeek={rThisWeek}
              rangeLabel={`last ${days} days`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kafelki */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Tile label="This week" i={0}>
          <AnimatedNumber value={thisWeek} suffix="%" />
          {vs && rivalStats && <RivalLine name={rival!.display_name} value={`${rThisWeek}%`} />}
        </Tile>
        <Tile label="Vs last week" i={1}>
          <span className={thisWeek - lastWeek > 0 ? "text-primary" : thisWeek - lastWeek < 0 ? "text-destructive" : ""}>
            <AnimatedNumber value={thisWeek - lastWeek} prefix={thisWeek - lastWeek > 0 ? "+" : ""} suffix="%" />
          </span>
          {vs && rivalStats && <RivalLine name={rival!.display_name} value={`${rThisWeek - rLastWeek > 0 ? "+" : ""}${rThisWeek - rLastWeek}%`} />}
        </Tile>
        <Tile label="Best streak" i={2}>
          <span className="flex items-center justify-center gap-2.5">
            <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
              <Flame size={30} dim={bestStreakNow === 0} />
            </motion.span>
            <AnimatedNumber value={bestStreakNow} />
          </span>
        </Tile>
        <Tile label="Needs attention" i={3} small>
          <span className="line-clamp-2">{needsAttention}</span>
        </Tile>
      </section>

      {/* Leaderboard + streaki */}
      <section className="grid gap-3 md:gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="label">Habit leaderboard</p>
            <Segmented
              id="lb"
              size="sm"
              value={lb}
              onChange={setLb}
              options={[
                { value: "daily", label: "D" },
                { value: "weekly", label: "W" },
                { value: "monthly", label: "M" },
              ]}
            />
          </div>
          <div className="mt-5 space-y-4">
            {leaderboard.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No {lb} habits yet.</p>}
            {leaderboard.map(({ h, r }, i) => (
              <motion.div key={h.id + lb} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4">
                <span className="grid w-5 shrink-0 place-items-center">
                  {i < 3 ? <MedalIcon rank={i} /> : <span className="text-[12px] font-bold text-muted-foreground">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold uppercase tracking-[0.01em]">{h.name}</span>
                    <span className="text-[14px] font-bold tabular-nums text-primary">{r}%</span>
                  </div>
                  <Bar value={r} delay={i * 0.05} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-7">
          <p className="label">Top streaks</p>
          <div className="mt-5 space-y-4">
            {streaks.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No habits yet.</p>}
            {streaks.slice(0, 6).map(({ h, n }, i) => (
              <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4">
                <span className="grid w-5 shrink-0 place-items-center">
                  {i < 3 ? <MedalIcon rank={i} /> : <span className="text-[12px] font-bold text-muted-foreground">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold uppercase tracking-[0.01em]">{h.name}</span>
                    <span className="text-[14px] font-bold tabular-nums text-primary">
                      {n}
                      {h.frequency === "daily" ? "d" : h.frequency === "weekly" ? "w" : "m"}
                    </span>
                  </div>
                  <Bar value={Math.min(100, (n / (h.frequency === "daily" ? 30 : 12)) * 100)} delay={i * 0.05} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Wybór rywala (gdy jest więcej niż 1 inna osoba) */}
      <AnimatePresence>
        {pickRival && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPickRival(false)}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <p className="title">Pick your rival</p>
                <button onClick={() => setPickRival(false)} className="btn-ghost h-8 w-8">
                  <X size={14} />
                </button>
              </div>
              {others.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setRivalId(p.id);
                    setPickRival(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.05]"
                >
                  <Avatar name={p.display_name} color={RIVAL_COLOR} /> <span className="font-semibold">{p.display_name}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VsButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      className={`relative col-span-2 flex h-11 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border px-4 text-[14px] font-extrabold uppercase tracking-[0.08em] transition-colors sm:h-[52px] sm:px-5 ${
        active ? "border-rival/60 bg-rival/15 text-rival" : "border-white/[0.07] bg-[oklch(17%_0_0)] text-foreground hover:border-rival/40"
      }`}
      aria-pressed={active}
    >
      {active ? <X size={15} strokeWidth={2.8} /> : <Swords size={16} strokeWidth={2.2} className="text-rival" />}
      <span className={active ? "" : "shine-text"}>VS</span>
    </motion.button>
  );
}

function BigNumber({ value, color, name, dot, lead, loading }: { value: number; color: string; name: string; dot: string; lead: boolean; loading?: boolean }) {
  return (
    <div>
      <p className="text-[44px] font-bold leading-none tracking-[-0.055em] sm:text-[64px]" style={{ color }}>
        {loading ? <span className="opacity-40">…</span> : <AnimatedNumber value={value} suffix="%" />}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="max-w-[110px] truncate">{name}</span>
        <AnimatePresence>
          {lead && (
            <motion.span initial={{ opacity: 0, scale: 0, rotate: -40 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14 }} className="text-warning">
              <Crown size={15} fill="currentColor" />
            </motion.span>
          )}
        </AnimatePresence>
      </p>
    </div>
  );
}

function Tile({ label, children, i, small }: { label: string; children: React.ReactNode; i: number; small?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="card flex min-h-[112px] flex-col items-center justify-center px-3 py-5 text-center sm:min-h-[118px]"
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">{label}</p>
      <div className={`mt-2 font-bold tracking-[-0.03em] ${small ? "text-[16px] tracking-[-0.01em] sm:text-[18px]" : "text-[28px] sm:text-[34px]"}`}>{children}</div>
    </motion.div>
  );
}

function RivalLine({ name, value }: { name: string; value: string }) {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-[12px] font-semibold tracking-normal text-rival">
      {name.split(" ")[0]} {value}
    </motion.p>
  );
}

function Bar({ value, delay = 0, color = "var(--primary)" }: { value: number; delay?: number; color?: string }) {
  return (
    <div className="mt-2 h-[9px] overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-black" style={{ background: color }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function HeadToHead({
  meName,
  rivalName,
  mine,
  theirs,
  meThisWeek,
  rivalThisWeek,
  rangeLabel,
}: {
  meName: string;
  rivalName: string;
  mine: DayStat[];
  theirs: DayStat[];
  meThisWeek: number;
  rivalThisWeek: number;
  rangeLabel: string;
}) {
  const t = new Map(theirs.map((s) => [s.day, s]));
  let myWins = 0;
  let theirWins = 0;
  let ties = 0;
  for (const s of mine) {
    const o = t.get(s.day);
    if (!o || s.total === 0 || o.total === 0) continue;
    const a = pct(s.done, s.total);
    const b = pct(o.done, o.total);
    if (a > b) myWins++;
    else if (b > a) theirWins++;
    else ties++;
  }
  const a = sumStats(mine);
  const b = sumStats(theirs);
  const diff = a - b;
  const share = a + b === 0 ? 50 : (a / (a + b)) * 100;
  const message =
    diff > 0 ? `You lead by ${diff} pts — keep the pressure on 🔥` : diff < 0 ? `${rivalName} leads by ${-diff} pts — time to catch up 💪` : "Dead even. Next check-in decides it ⚔️";

  return (
    <section className="card relative overflow-hidden p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Head to head · {rangeLabel}</p>
        <Swords size={16} className="text-rival" />
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={meName} color="var(--primary)" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{meName}</p>
            <p className="text-[12px] text-muted-foreground">{myWins} days won</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-[oklch(19%_0_0)] text-[13px] font-extrabold tracking-[0.06em]"
        >
          VS
        </motion.div>
        <div className="flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{rivalName}</p>
            <p className="text-[12px] text-muted-foreground">{theirWins} days won</p>
          </div>
          <Avatar name={rivalName} color={RIVAL_COLOR} />
        </div>
      </div>

      {/* Pasek przeciągania liny */}
      <div className="relative mt-5 flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div className="h-full bg-primary" initial={{ width: "50%" }} animate={{ width: `${share}%` }} transition={{ type: "spring", stiffness: 90, damping: 16 }} />
        <div className="h-full flex-1" style={{ background: RIVAL_COLOR }} />
        <motion.span className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" initial={{ left: "50%" }} animate={{ left: `${share}%` }} transition={{ type: "spring", stiffness: 90, damping: 16 }} />
      </div>
      <div className="mt-2 flex justify-between text-[13px] font-bold tabular-nums">
        <span className="text-primary">{a}%</span>
        <span className="text-muted-foreground">{ties > 0 ? `${ties} ties` : ""}</span>
        <span className="text-rival">{b}%</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">This week</p>
          <p className="mt-1 text-[17px] font-bold tabular-nums">
            <span className="text-primary">{meThisWeek}%</span> <span className="text-muted-foreground">·</span> <span className="text-rival">{rivalThisWeek}%</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Days won</p>
          <p className="mt-1 text-[17px] font-bold tabular-nums">
            <span className="text-primary">{myWins}</span> <span className="text-muted-foreground">–</span> <span className="text-rival">{theirWins}</span>
          </p>
        </div>
      </div>

      <motion.p key={message} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center text-[14px] font-semibold">
        {message}
      </motion.p>
    </section>
  );
}
