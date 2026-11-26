"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import AddGame from "@/components/AddGame";
import ImportCenter from "@/components/ImportCenter";
import GameTile from "@/components/GameTile";
import { input } from "@/components/ui";
import { STATUSES, type Game, type Status, type UserGame } from "@/lib/types";

type Row = UserGame & { game: Game };
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const SORTS: Record<string, { label: string; fn: (a: Row, b: Row) => number }> = {
  recent: { label: "Modifiés récemment", fn: (a, b) => b.updated_at.localeCompare(a.updated_at) },
  fin: { label: "Date de fin", fn: (a, b) => (b.finished_on ?? "").localeCompare(a.finished_on ?? "") },
  note: { label: "Mieux notés", fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  temps: { label: "Plus joués", fn: (a, b) => (b.playtime_hours ?? 0) - (a.playtime_hours ?? 0) },
  dur: { label: "Plus durs", fn: (a, b) => (b.difficulty ?? -1) - (a.difficulty ?? -1) },
  nom: { label: "Nom (A → Z)", fn: (a, b) => a.game.name.localeCompare(b.game.name, "fr") },
};

export default function CollectionView({ rows, steamId }: { rows: Row[]; steamId: string | null }) {
  const [status, setStatus] = useState<Status | "tous">("tous");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");

  const count = (s: Status | "tous") => rows.filter((r) => s === "tous" || r.status === s).length;
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => (status === "tous" || r.status === status) && (!n || r.game.name.toLowerCase().includes(n))).sort(SORTS[sort].fn);
  }, [rows, status, q, sort]);

  const done = count("termine") + count("platine");

  return (
    <div className="fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mute">{rows.length} jeux · {done} terminés</p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Ma collection</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportCenter steamId={steamId} />
          <AddGame ownedIgdbIds={rows.map((r) => r.game.igdb_id).filter((x): x is number => x != null)} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {[{ key: "tous" as const, label: "Tous" }, ...STATUSES].map((s) => (
          <button key={s.key} aria-pressed={status === s.key} onClick={() => setStatus(s.key)}
            className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${status === s.key ? "border-transparent bg-ink text-night" : "border-white/15 text-ink2 hover:bg-white/5"}`}>
            {s.label} <span className="opacity-60">{count(s.key)}</span>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans ma collection" aria-label="Chercher dans ma collection" className={`${input} min-h-11 flex-1 basis-60`} />
        <label className="sr-only" htmlFor="sort">Trier</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className={`${input} min-h-11 w-auto`}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {list.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
          <AnimatePresence initial={false}>
            {list.map((r, i) => (
              <motion.div key={r.id} layout initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 300, damping: 28, delay: Math.min(i, 18) * 0.012 }}>
                <GameTile game={r.game} entry={r}
                  sub={r.finished_on ? `Fini le ${fmt(r.finished_on)}` : r.playtime_hours ? `${r.playtime_hours} h jouées` : r.game.release_year ? String(r.game.release_year) : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
          <p className="text-xl font-bold">{rows.length ? "Aucun jeu ne correspond" : "Ta collection est vide"}</p>
          <p className="mx-auto mt-2 max-w-md text-mute">{rows.length ? "Change de filtre ou de recherche." : "Ajoute un jeu en le cherchant, ou importe toute ta bibliothèque Steam d'un coup."}</p>
          {!rows.length && <div className="mt-5 flex flex-wrap justify-center gap-2"><ImportCenter steamId={steamId} /><AddGame /></div>}
        </div>
      )}
    </div>
  );
}
