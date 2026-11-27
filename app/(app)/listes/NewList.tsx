"use client";

import { motion } from "motion/react";
import Sheet from "@/components/Sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnGhost, btnPrimary, input, label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const IDEAS = ["Mon top 10", "Top jeux solo", "Mes pépites indé", "Jeux à faire en coop", "Les plus belles OST", "Mes jeux doudou"];

/** Bouton + petite fenêtre pour créer une liste. */
export default function NewList({ className = btnPrimary }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [ranked, setRanked] = useState(true);
  const [pub, setPub] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("lists").insert({ user_id: user!.id, title: title.trim().slice(0, 80), ranked, is_public: pub }).select("id").single();
    setBusy(false);
    if (error) return setMsg("Erreur : " + error.message);
    router.push(`/listes/${data.id}?nouvelle=1`);
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Nouvelle liste
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Nouvelle liste" className="max-w-lg">
        <form onSubmit={create} className="flex flex-col gap-4 overflow-y-auto p-5 pt-2 sm:p-6">
              <h2 className="text-2xl font-bold">Nouvelle liste</h2>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lt" className={label}>Titre</label>
                <input id="lt" className={input} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mon top 10 de tous les temps" />
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {IDEAS.map((i) => <button key={i} type="button" onClick={() => setTitle(i)} className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-ink2 hover:bg-white/5">{i}</button>)}
                </div>
              </div>
              <Toggle on={ranked} set={setRanked} title="Liste classée" desc="Les jeux sont numérotés (1, 2, 3…)" />
              <Toggle on={pub} set={setPub} title="Publique" desc={pub ? "Visible par tous les membres, sur ton profil" : "Visible seulement par toi"} />
              {msg && <p className="text-sm text-no">{msg}</p>}
              <div className="flex gap-2">
                <button className={btnPrimary} disabled={busy || !title.trim()}>{busy ? "Création…" : "Créer et ajouter des jeux"}</button>
                <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Annuler</button>
              </div>
            </form>
      </Sheet>
    </>
  );
}

export function Toggle({ on, set, title, desc }: { on: boolean; set: (v: boolean) => void; title: string; desc: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:bg-white/5">
      <span><b className="block">{title}</b><span className="text-sm text-mute">{desc}</span></span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-violet" : "bg-white/15"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${on ? "right-1" : "left-1"}`} />
      </span>
    </button>
  );
}
