"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Sparkle } from "@/components/ui/Icons";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function translateError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Nieprawidłowy email lub hasło.";
  if (/already registered/i.test(msg)) return "Ten email ma już konto — zaloguj się.";
  if (/password should be at least/i.test(msg)) return "Hasło musi mieć co najmniej 6 znaków.";
  if (/email not confirmed/i.test(msg)) return "Potwierdź email (link w skrzynce) albo wyłącz potwierdzanie w Supabase.";
  if (/rate limit/i.test(msg)) return "Za dużo prób — odczekaj chwilę.";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const sb = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/today");
        router.refresh();
      } else {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/today");
          router.refresh();
        } else {
          setInfo("Konto utworzone! Sprawdź skrzynkę i kliknij link potwierdzający.");
        }
      }
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      {/* ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
            className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-surface shadow-glow"
          >
            <Sparkle size={38} />
          </motion.div>
          <h1 className="title text-3xl">DashHabit</h1>
          <p className="text-sm text-muted-foreground">Build habits. Beat your friend. Repeat.</p>
        </div>

        <div className="card p-5 sm:p-7">
          <Segmented
            id="auth"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            options={[
              { value: "signin", label: "Sign in" },
              { value: "signup", label: "Sign up" },
            ]}
          />

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <label className="relative block">
                    <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input className="field pl-11" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="nickname" />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
            <label className="relative block">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="field pl-11" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="relative block">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="field pl-11 pr-12"
                type={show ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground" aria-label="Toggle password">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>

            <AnimatePresence>
              {(error || info) && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-xl px-3.5 py-2.5 text-sm ${error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                >
                  {error ?? info}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn-primary mt-2 h-12 w-full text-[15px] disabled:opacity-60">
              {loading ? <span className="app-loader-ring h-5 w-5 !border-primary-foreground/30 !border-t-primary-foreground" /> : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"} <ArrowUpRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
