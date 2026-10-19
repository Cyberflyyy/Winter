"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { IceCube } from "./ui/Icons";
import { FREEZE_START, PERFECT_DAYS_PER_TOKEN } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SettingsModal({ open, onClose, email }: { open: boolean; onClose: () => void; email: string }) {
  const userId = useStore((s) => s.userId);
  const profiles = useStore((s) => s.profiles);
  const updateProfile = useStore((s) => s.updateProfile);
  const me = profiles.find((p) => p.id === userId);
  const [name, setName] = useState(me?.display_name ?? "");

  useEffect(() => {
    if (open) setName(me?.display_name ?? "");
  }, [open, me?.display_name]);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <p className="label mb-2">Display name</p>
          <div className="flex gap-2">
            <input className="field" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
            <button
              className="btn-primary shrink-0 px-5 text-sm disabled:opacity-40"
              disabled={!name.trim() || name.trim() === me?.display_name}
              onClick={() => updateProfile(name.trim())}
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Visible to your rival in the VS comparison.</p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 font-semibold">
            <IceCube size={18} /> Freeze tokens
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            You start with {FREEZE_START}. Every {PERFECT_DAYS_PER_TOKEN} perfect days (all daily habits done) earn you one more. Freezing a habit
            keeps your streak alive on a day you can&apos;t do it — and it won&apos;t count against your consistency.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="min-w-0">
            <p className="label">Signed in as</p>
            <p className="mt-1 truncate text-sm">{email}</p>
          </div>
          <button onClick={signOut} className="btn-ghost shrink-0 gap-2 px-4 py-2.5 text-sm text-destructive">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </Modal>
  );
}
