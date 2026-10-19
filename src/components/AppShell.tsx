"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChartNoAxesColumn, Grid3x3, House, Settings, SquareCheck, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SettingsModal } from "./SettingsModal";
import { Sparkle } from "./ui/Icons";
import { useStore } from "@/lib/store";

export const NAV = [
  { href: "/today", label: "Today", title: "Today", icon: House },
  { href: "/habits", label: "Habits", title: "Habits", icon: Grid3x3 },
  { href: "/tasks", label: "Tasks", title: "Task Tracker", icon: SquareCheck },
  { href: "/goals", label: "Goals", title: "Goals", icon: Target },
  { href: "/insights", label: "Insights", title: "Insights", icon: ChartNoAxesColumn },
];

export function AppShell({ userId, email, children }: { userId: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    void init(userId);
  }, [init, userId]);

  const current = NAV.find((n) => pathname.startsWith(n.href)) ?? NAV[0];

  return (
    <div className="min-h-dvh">
      {/* Nagłówek */}
      <header className="sticky top-0 z-40 bg-page/80 backdrop-blur-xl max-md:pt-[env(safe-area-inset-top)] md:static md:bg-transparent md:backdrop-blur-none">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 sm:px-6 md:grid-cols-[1fr_auto_1fr] md:px-10 md:py-6">
          <AnimatePresence mode="wait">
            <motion.h1
              key={current.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="title text-[22px] leading-none md:text-[24px]"
            >
              {current.title}
            </motion.h1>
          </AnimatePresence>

          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-[oklch(15.5%_0_0)] p-1.5 md:flex">
            {NAV.map((item) => {
              const active = item === current;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.045]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={19} strokeWidth={1.8} className="relative" />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex justify-end">
            <motion.button
              whileTap={{ scale: 0.9, rotate: 45 }}
              whileHover={{ rotate: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              onClick={() => setSettings(true)}
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Settings"
            >
              <Settings size={21} strokeWidth={1.6} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-3.5 pb-32 sm:px-6 md:px-10 md:pb-16">
        {ready ? (
          children
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <div className="flex flex-col items-center gap-4">
              <Sparkle size={34} className="animate-pulse" />
              <div className="app-loader-ring h-7 w-7" />
            </div>
          </div>
        )}
      </main>

      {/* Dolna nawigacja (telefon) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.6rem] border border-white/[0.08] bg-[oklch(15.5%_0_0/0.86)] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,.55)] backdrop-blur-xl">
          {NAV.map((item) => {
            const active = item === current;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center gap-1 rounded-[1.2rem] py-2">
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-[1.2rem] bg-primary/[0.12]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.85 }} className={`relative ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon size={21} strokeWidth={active ? 2.1 : 1.7} />
                </motion.span>
                <span className={`relative text-[10.5px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Toasts />
      <SettingsModal open={settings} onClose={() => setSettings(false)} email={email} />
    </div>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[120] flex flex-col items-center gap-2 px-4 md:bottom-8">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto rounded-2xl border border-white/10 bg-[oklch(20%_0_0)] px-4 py-3 text-sm shadow-xl"
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
