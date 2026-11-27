"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Cover from "./Cover";
import { extractColor, setGlow } from "./Glow";
import { btnGhost } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { Game, MiniProfile } from "@/lib/types";
import { GamePeek, type PeekRow } from "./GamePeek";

type Owned = { game: Game; status: string };

/**
 * Top 5 en éventail.
 * Deux modes strictement séparés :
 *  - « voir » : la carte du centre ouvre la fiche du jeu, les autres se mettent au centre ;
 *  - « choisir » (son propre profil) : toucher un emplacement ouvre la sélection, et toucher un jeu
 *    l'assigne immédiatement à cet emplacement, sans jamais quitter la page.
 */
export default function TopFan({ games, mine, collection = [], peek }: { peek?: { owner: MiniProfile; rows: Record<string, PeekRow> }; games: (Game | null)[]; mine: boolean; collection?: Owned[] }) {
  const router = useRouter();
  const [top, setTop] = useState<(Game | null)[]>(games);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [peeking, setPeeking] = useState<PeekRow | null>(null);
  const slots = mine ? top : top.filter(Boolean);
  const n = slots.length;
  const [sel, setSel] = useState(() => Math.max(0, games.findIndex(Boolean)));
  const [w, setW] = useState(900);

  useEffect(() => setTop(games), [games]);
  useEffect(() => { const on = () => setW(innerWidth); on(); addEventListener("resize", on); return () => removeEventListener("resize", on); }, []);
  useEffect(() => {
    const g = slots[sel];
    if (!g) return;
    let alive = true;
    if (g.dominant_color) setGlow(g.dominant_color);
    else if (g.cover_url) extractColor(g.cover_url).then((c) => alive && c && setGlow(c));
    return () => { alive = false; };
  }, [sel, slots]);
  useEffect(() => () => setGlow("#8b5cf6"), []);

  async function assign(rank: number, game: Game | null) {
    const before = top;
    // Mise à jour optimiste : l'éventail change tout de suite.
    setTop((t) => t.map((x, i) => (i === rank - 1 ? game : x && game && x.id === game.id ? null : x)));
    setPicking(null);
    setSel(rank - 1);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const r1 = await supabase.from("user_games").update({ top_rank: null }).eq("user_id", user.id).eq("top_rank", rank);
    let err = r1.error;
    if (game && !err) {
      const r2 = await supabase.from("user_games").update({ top_rank: null }).eq("user_id", user.id).eq("game_id", game.id);
      const r3 = await supabase.from("user_games").update({ top_rank: rank }).eq("user_id", user.id).eq("game_id", game.id);
      err = r2.error || r3.error;
    }
    if (err) { setTop(before); toast("Impossible d'enregistrer ton top 5", "error"); return; }
    toast(game ? `${game.name} est ton n°${rank}` : `Emplacement n°${rank} libéré`, "success");
    router.refresh();
  }

  if (!n) return null;
  const spread = w < 640 ? 62 : 118;
  const move = (d: number) => { setSel((s) => (s + d + n) % n); };

  return (
    <div>
      {peek && <GamePeek row={peeking} owner={peek.owner} onClose={() => setPeeking(null)} />}
      {mine && (
        <div className="mb-1 flex justify-end">
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => { setEditing((e) => !e); }} className={`${btnGhost} min-h-10 px-4 text-sm ${editing ? "border-violet bg-violet/20" : ""}`} aria-pressed={editing}>
            {editing ? "Terminé" : "Modifier mon top 5"}
          </motion.button>
        </div>
      )}
      <AnimatePresence>
        {editing && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-sm text-violet-hi">
            Touche un emplacement pour choisir le jeu qui y va.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="relative h-[300px] select-none sm:h-[350px]">
        <div aria-hidden="true" className="absolute bottom-8 left-1/2 h-1 w-56 -translate-x-1/2 rounded-full bg-violet-hi shadow-[0_0_28px_10px_var(--glow)] transition-shadow duration-700" />
        {slots.map((g, i) => {
          const o = i - sel, a = Math.abs(o);
          const onClick = () => {
            if (mine && (editing || !g)) { setPicking(i + 1); return; }
            if (o !== 0) { setSel(i); return; }
            if (g && peek?.rows[g.id]) { setPeeking(peek.rows[g.id]); return; }
            if (g) router.push(`/jeu/${g.id}`);
          };
          return (
            <motion.button
              key={i}
              type="button"
              onClick={onClick}
              aria-label={g ? (editing ? `Changer le n°${i + 1} (${g.name})` : o === 0 ? `Ouvrir ${g.name}` : `Voir ${g.name}`) : `Choisir le jeu n°${i + 1}`}
              className="absolute left-1/2 top-4 w-[140px] -ml-[70px] sm:w-[176px] sm:-ml-[88px]"
              animate={{ x: o * spread, y: a * 16 + (editing ? -4 : 0), rotate: o * 12, scale: 1 - a * 0.15, opacity: a > 2 ? 0 : 1, filter: `brightness(${1 - a * 0.25})` }}
              whileHover={{ y: a * 16 - 12, scale: 1 - a * 0.15 + 0.03 }}
              whileTap={{ scale: 1 - a * 0.15 - 0.04 }}
              transition={{ type: "spring", stiffness: 210, damping: 22 }}
              style={{ zIndex: 10 - a }}
            >
              <div className={o === 0 && !editing ? "animate-[floaty_3.4s_ease-in-out_infinite]" : ""}>
                {g ? (
                  <Cover game={g} className={`shadow-[0_26px_44px_-18px_rgba(0,0,0,.9)] [--cover-fs:44px] ${editing ? "ring-2 ring-violet-hi ring-offset-2 ring-offset-night" : ""}`}>
                    <span className="absolute left-2 top-2 z-[2] rounded-lg bg-black/70 px-2 py-0.5 font-display text-sm font-bold text-white">#{i + 1}</span>
                    {editing && <span className="absolute inset-x-2 bottom-2 z-[2] rounded-lg bg-violet px-2 py-1 text-center text-xs font-bold text-white">Changer</span>}
                  </Cover>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed border-white/25 bg-card/80 p-3 text-center text-sm font-semibold text-mute transition hover:border-violet-hi hover:text-ink">
                    <span><span className="block font-display text-3xl text-white/70">+</span>N°{i + 1}<br />Choisir un jeu</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
        {n > 1 && (
          <>
            <button onClick={() => move(-1)} className="absolute left-0 top-[130px] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/80 text-xl backdrop-blur" aria-label="Précédent">‹</button>
            <button onClick={() => move(1)} className="absolute right-0 top-[130px] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/80 text-xl backdrop-blur" aria-label="Suivant">›</button>
          </>
        )}
      </div>

      <AnimatePresence>
        {picking != null && (
          <Picker rank={picking} current={top[picking - 1]} collection={collection} onPick={(g) => assign(picking, g)} onClose={() => setPicking(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Picker({ rank, current, collection, onPick, onClose }: { rank: number; current: Game | null; collection: Owned[]; onPick: (g: Game | null) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const order: Record<string, number> = { platine: 0, termine: 1, en_cours: 2, abandonne: 3, a_faire: 4 };
    return collection.filter((c) => !t || c.game.name.toLowerCase().includes(t)).sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.game.name.localeCompare(b.game.name, "fr"));
  }, [q, collection]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={`Choisir le jeu n°${rank}`}>
      <motion.div initial={{ y: 60, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-night2 sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h2 className="text-xl font-bold">Ton n°{rank}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-mute hover:text-ink" aria-label="Fermer">✕</button>
        </div>
        <div className="p-4 pb-2">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans ta collection" aria-label="Chercher dans ta collection"
            className="min-h-12 w-full rounded-2xl border border-white/15 bg-night px-4 text-base focus:border-violet focus:outline-none" />
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-3 content-start gap-3 overflow-y-auto overscroll-contain p-4 pt-3 sm:grid-cols-5">
          {current && (
            <button onClick={() => onPick(null)} className="grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed border-no/50 p-2 text-center text-sm font-semibold text-no">Vider cet emplacement</button>
          )}
          {list.map((c, i) => (
            <motion.button key={c.game.id} onClick={() => onPick(c.game)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.015 }}
              whileHover={{ y: -4 }} whileTap={{ scale: 0.94 }} className={`text-left ${current?.id === c.game.id ? "opacity-50" : ""}`}>
              <Cover game={c.game} className="[--cover-fs:26px]" />
              <span className="mt-1 block truncate text-xs font-semibold">{c.game.name}</span>
            </motion.button>
          ))}
          {!list.length && <p className="col-span-full p-4 text-center text-mute">{collection.length ? "Aucun jeu ne correspond." : "Ajoute d'abord des jeux à ta collection."}</p>}
        </div>
        {!collection.length && <div className="p-4 pt-0 text-center"><Link href="/collection" className={btnGhost}>Aller à ma collection</Link></div>}
      </motion.div>
    </motion.div>
  );
}
