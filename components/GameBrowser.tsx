"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import GameTile from "./GameTile";
import PeekTile from "./GamePeek";
import { btnGhost, input } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { STATUSES, genreFr, type Game, type MiniProfile, type Status, type UserGame } from "@/lib/types";

type Row = UserGame & { game: Game };
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const PAGE = 48;

const SORTS: Record<string, { label: string; fn: (a: Row, b: Row) => number }> = {
  recent: { label: "Modifiés récemment", fn: (a, b) => b.updated_at.localeCompare(a.updated_at) },
  fin: { label: "Date de fin", fn: (a, b) => (b.finished_on ?? "").localeCompare(a.finished_on ?? "") },
  note: { label: "Mieux notés", fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  noteBas: { label: "Moins bien notés", fn: (a, b) => (a.rating ?? 99) - (b.rating ?? 99) },
  temps: { label: "Plus joués", fn: (a, b) => (b.playtime_hours ?? 0) - (a.playtime_hours ?? 0) },
  court: { label: "Plus courts", fn: (a, b) => (a.playtime_hours ?? 1e9) - (b.playtime_hours ?? 1e9) },
  dur: { label: "Plus durs", fn: (a, b) => (b.difficulty ?? -1) - (a.difficulty ?? -1) },
  facile: { label: "Plus faciles", fn: (a, b) => (a.difficulty ?? 99) - (b.difficulty ?? 99) },
  sortie: { label: "Date de sortie", fn: (a, b) => (b.game.release_year ?? 0) - (a.game.release_year ?? 0) },
  nom: { label: "Nom (A → Z)", fn: (a, b) => a.game.name.localeCompare(b.game.name, "fr") },
};

const RATINGS = [{ v: 0, l: "Toutes les notes" }, { v: 4.5, l: "4,5 ★ et plus" }, { v: 4, l: "4 ★ et plus" }, { v: 3, l: "3 ★ et plus" }, { v: -1, l: "Pas encore noté" }];

const chip = (on: boolean) => `min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${on ? "border-transparent bg-ink text-night" : "border-white/15 text-ink2 hover:bg-white/5"}`;

/** Grille de jeux avec recherche, statuts, tri et filtres (plateforme, année, note, genre). */
export default function GameBrowser({ rows: all, searchLabel = "Chercher un jeu", emptyText, removable = false, peekOwner }: { rows: Row[]; searchLabel?: string; emptyText?: string; removable?: boolean; peekOwner?: MiniProfile }) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const rows = useMemo(() => all.filter((r) => !gone.has(r.id)), [all, gone]);

  async function remove(r: Row) {
    setGone((g) => new Set(g).add(r.id));
    const { error } = await createClient().from("user_games").delete().eq("id", r.id);
    if (error) {
      setGone((g) => { const n = new Set(g); n.delete(r.id); return n; });
      return toast("Impossible de retirer ce jeu", "error");
    }
    toast(`${r.game.name} retiré de ta collection`, "info");
    router.refresh();
  }

  const [status, setStatus] = useState<Status | "tous">("tous");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [platform, setPlatform] = useState("");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState(0);
  const [genre, setGenre] = useState("");
  const [more, setMore] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const options = useMemo(() => {
    const count = (vals: (string | null | undefined)[]) => {
      const m = new Map<string, number>();
      vals.forEach((v) => v && m.set(v, (m.get(v) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      platforms: count(rows.map((r) => r.platform)),
      years: [...new Set(rows.map((r) => r.finished_on?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
      genres: count(rows.flatMap((r) => r.game.genres ?? [])),
    };
  }, [rows]);

  const count = (s: Status | "tous") => rows.filter((r) => s === "tous" || r.status === s).length;
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        (status === "tous" || r.status === status) &&
        (!n || r.game.name.toLowerCase().includes(n)) &&
        (!platform || r.platform === platform) &&
        (!year || r.finished_on?.startsWith(year)) &&
        (!genre || r.game.genres?.includes(genre)) &&
        (rating === 0 || (rating === -1 ? r.rating == null : Number(r.rating ?? 0) >= rating)))
      .sort(SORTS[sort].fn);
  }, [rows, status, q, sort, platform, year, genre, rating]);

  const active = [platform, year, genre].filter(Boolean).length + (rating ? 1 : 0);
  const reset = () => { setPlatform(""); setYear(""); setGenre(""); setRating(0); };
  const sel = "min-h-11 rounded-2xl border border-white/15 bg-night2 px-3 text-sm text-ink transition focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/25";

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrer par statut">
        {[{ key: "tous" as const, label: "Tous" }, ...STATUSES].map((s) => (
          <button key={s.key} aria-pressed={status === s.key} onClick={() => { setStatus(s.key); setLimit(PAGE); }} className={chip(status === s.key)}>
            {s.label} <span className="opacity-60">{count(s.key)}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={searchLabel} aria-label={searchLabel} className={`${input} min-h-11 flex-1 basis-60`} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel} aria-label="Trier">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={`${btnGhost} min-h-11 ${active ? "border-violet bg-violet/15" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filtres{active ? ` (${active})` : ""}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {more && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-card/60 p-3">
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={sel} aria-label="Plateforme">
                <option value="">Toutes les plateformes</option>
                {options.platforms.map(([p, n]) => <option key={p} value={p}>{p} ({n})</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={sel} aria-label="Année de fin">
                <option value="">Toutes les années</option>
                {options.years.map((y) => <option key={y} value={y}>Terminés en {y}</option>)}
              </select>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={sel} aria-label="Note">
                {RATINGS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
              {options.genres.length > 0 && (
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className={sel} aria-label="Genre">
                  <option value="">Tous les genres</option>
                  {options.genres.map(([g, n]) => <option key={g} value={g}>{genreFr(g)} ({n})</option>)}
                </select>
              )}
              {active > 0 && <button onClick={reset} className="text-sm font-semibold text-mute hover:text-ink">Effacer les filtres</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mb-4 text-sm text-mute">{list.length} jeu{list.length > 1 ? "x" : ""}</p>

      {list.length ? (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
            <AnimatePresence initial={false} mode="popLayout">
              {list.slice(0, limit).map((r, i) => (
                <motion.div key={r.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(i, 18) * 0.01 }}>
                  <div className="group/rm relative">
                    {peekOwner ? <PeekTile row={r} owner={peekOwner} sub={r.finished_on ? `Fini le ${fmt(r.finished_on)}` : r.playtime_hours ? `${r.playtime_hours} h jouées` : r.game.release_year ? String(r.game.release_year) : undefined} /> : <GameTile game={r.game} entry={r}
                      sub={r.finished_on ? `Fini le ${fmt(r.finished_on)}` : r.playtime_hours ? `${r.playtime_hours} h jouées` : r.game.release_year ? String(r.game.release_year) : undefined} />}
                    {removable && <RemoveButton name={r.game.name} onConfirm={() => remove(r)} />}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {list.length > limit && <div className="mt-6 flex justify-center"><button onClick={() => setLimit((l) => l + PAGE)} className={btnGhost}>Voir plus ({list.length - limit} restants)</button></div>}
        </>
      ) : (
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
          <p className="text-xl font-bold">{rows.length ? "Aucun jeu ne correspond" : "Aucun jeu"}</p>
          <p className="mx-auto mt-2 max-w-md text-mute">{rows.length ? "Change de filtre ou de recherche." : emptyText}</p>
          {rows.length > 0 && active > 0 && <button onClick={reset} className={`${btnGhost} mt-4`}>Effacer les filtres</button>}
        </div>
      )}
    </div>
  );
}

/** Petite croix discrète en haut à droite d'une jaquette, avec confirmation sur la carte. */
function RemoveButton({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button onClick={() => setAsk(true)} aria-label={`Retirer ${name} de ma collection`} title="Retirer de ma collection"
        className="absolute -right-1.5 -top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white/70 opacity-60 backdrop-blur transition hover:bg-no/80 hover:text-white hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/rm:opacity-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <AnimatePresence>
        {ask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 z-20 flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl bg-black/80 p-2 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold">Retirer ce jeu ?</p>
            <div className="flex gap-1.5">
              <button onClick={onConfirm} className="min-h-9 rounded-xl bg-no px-3 text-sm font-semibold text-white">Retirer</button>
              <button onClick={() => setAsk(false)} className="min-h-9 rounded-xl bg-white/15 px-3 text-sm font-semibold">Non</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
