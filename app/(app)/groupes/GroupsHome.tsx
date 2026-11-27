"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { btnGhost, btnPrimary, input, label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { MiniProfile } from "@/lib/types";

export type GroupCard = { id: string; name: string; description: string | null; color: string; created_at: string; avatar_url?: string | null; banner_url?: string | null; role: string; members: number; avatars: MiniProfile[] };
const COLORS = ["#8B5CF6", "#F28C38", "#FF5C8A", "#5B8CFF", "#3DDC97", "#E5C14B", "#2EB6E8", "#FF4D3D"];

export default function GroupsHome({ groups }: { groups: GroupCard[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "create" | "join">(groups.length ? "none" : "create");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast("Donne un nom d'au moins 2 lettres", "error");
    setBusy(true);
    const { data, error } = await createClient().rpc("create_group", { p_name: name.trim(), p_description: desc.trim() || null, p_color: color });
    setBusy(false);
    if (error) { return toast(error.message, "error"); } toast(`Groupe « ${name.trim()} » créé !`, "match");
    router.push(`/groupes/${data}`);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const c = (code.trim().match(/rejoindre\/([a-z0-9]+)/i)?.[1] ?? code.trim()).toLowerCase();
    if (!c) return;
    setBusy(true);
    const { data, error } = await createClient().rpc("join_group", { p_code: c });
    setBusy(false);
    if (error) { return toast("Code invalide ou expiré", "error"); } toast("Bienvenue dans le groupe !", "match");
    router.push(`/groupes/${data}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mute">Ta bande, tes potes de Discord, ta classe…</p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Groupes</h1>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => setMode(mode === "join" ? "none" : "join")}>Rejoindre avec un code</button>
          <button className={btnPrimary} onClick={() => setMode(mode === "create" ? "none" : "create")}>Créer un groupe</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "create" && (
          <motion.form key="c" onSubmit={create} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="overflow-hidden">
            <div className="mb-6 grid gap-4 rounded-3xl border border-line bg-card/80 p-5 md:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label htmlFor="gn" className={label}>Nom du groupe</label><input id="gn" className={input} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Les Gamers du Nord" /></div>
                <div className="flex flex-col gap-1.5"><label htmlFor="gd" className={label}>Description (facultatif)</label><input id="gd" className={input} maxLength={280} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ex. Soirées RPG le vendredi" /></div>
                <div className="flex flex-wrap items-center gap-2"><span className={label}>Couleur</span>
                  {COLORS.map((c) => <motion.button whileTap={{ scale: 0.85 }} type="button" key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} aria-pressed={color === c} className="h-10 w-10 rounded-full border-[3px]" style={{ background: c, borderColor: color === c ? "#fff" : "transparent" }} />)}
                </div>
              </div>
              <div className="flex flex-col items-center justify-between gap-4">
                <motion.div layout className="grid h-28 w-28 place-items-center rounded-[30px] font-display text-5xl font-bold text-white shadow-2xl" style={{ background: `linear-gradient(135deg, ${color}, #1a1426)` }} animate={{ rotate: [0, -4, 0] }} transition={{ duration: 0.5 }} key={color}>
                  {(name.trim()[0] ?? "?").toUpperCase()}
                </motion.div>
                <button className={btnPrimary} disabled={busy}>{busy ? "Création…" : "Créer le groupe"}</button>
              </div>
            </div>
          </motion.form>
        )}
        {mode === "join" && (
          <motion.form key="j" onSubmit={join} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-6 flex flex-wrap gap-3 rounded-3xl border border-line bg-card/80 p-5">
              <input className={`${input} flex-1 basis-64`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Colle le lien ou le code d'invitation" aria-label="Lien ou code d'invitation" />
              <button className={btnPrimary} disabled={busy}>Rejoindre</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 24 }}>
              <Link href={`/groupes/${g.id}`} className="group relative block overflow-hidden rounded-[28px] border border-line bg-card p-5 transition hover:-translate-y-1 hover:border-white/20">
                {g.banner_url && <span aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${g.banner_url}")` }} />}
                <span aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70" style={{ background: g.color }} />
                <div className="relative flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cover bg-center font-display text-2xl font-bold text-white" style={{ background: g.avatar_url ? undefined : `linear-gradient(135deg, ${g.color}, #1a1426)`, backgroundImage: g.avatar_url ? `url("${g.avatar_url}")` : undefined }}>{g.avatar_url ? null : g.name[0].toUpperCase()}</span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{g.name}</h2>
                    <p className="text-sm text-mute">{g.members} membre{g.members > 1 ? "s" : ""}{g.role !== "member" ? ` · ${g.role === "owner" ? "créateur" : "admin"}` : ""}</p>
                  </div>
                </div>
                {g.description && <p className="relative mt-3 line-clamp-2 text-sm text-ink2">{g.description}</p>}
                <div className="relative mt-4 flex">{g.avatars.map((a, k) => <span key={a.id} className={k ? "-ml-2" : ""}><Avatar profile={a} size={30} /></span>)}</div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : mode === "none" && (
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
          <p className="text-xl font-bold">Aucun groupe pour l&apos;instant</p>
          <p className="mt-2 text-mute">Crée ton groupe, envoie le lien à tes amis et comparez vos collections.</p>
        </div>
      )}
    </div>
  );
}
