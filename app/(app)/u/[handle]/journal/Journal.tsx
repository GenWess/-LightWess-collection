"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import Cover from "@/components/Cover";
import { Stars } from "@/components/Stars";
import { btnGhost } from "@/components/ui";
import type { Game, UserGame } from "@/lib/types";

export type Entry = { key: string; date: string; kind: "fini" | "platine" | "debut" | "abandon"; row: UserGame & { game: Game } };

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const KIND = {
  fini: { label: "Terminé", color: "#8B5CF6" },
  platine: { label: "Platiné 🏆", color: "#FFD45C" },
  debut: { label: "Commencé", color: "#3DDC97" },
  abandon: { label: "Abandonné", color: "#FF5C6C" },
} as const;

/** Journal façon carnet : on remonte le temps année par année, mois par mois. */
export default function Journal({ entries, from, isMe, initialYear }: { entries: Entry[]; from?: string; isMe: boolean; initialYear?: number }) {
  const years = useMemo(() => [...new Set(entries.map((e) => Number(e.date.slice(0, 4))))].sort((a, b) => b - a), [entries]);
  const [year, setYear] = useState<number | null>(initialYear && years.includes(initialYear) ? initialYear : years[0] ?? null);
  const [onlyDone, setOnlyDone] = useState(false);

  const list = entries.filter((e) => year != null && e.date.startsWith(String(year)) && (!onlyDone || e.kind === "fini" || e.kind === "platine"));
  const byMonth = new Map<number, Entry[]>();
  list.forEach((e) => { const m = Number(e.date.slice(5, 7)) - 1; byMonth.set(m, [...(byMonth.get(m) ?? []), e]); });
  const yDone = entries.filter((e) => year != null && e.date.startsWith(String(year)) && (e.kind === "fini" || e.kind === "platine"));
  const yHours = yDone.reduce((a, e) => a + Number(e.row.playtime_hours || 0), 0);
  const rated = yDone.filter((e) => e.row.rating != null);
  const yAvg = rated.length ? rated.reduce((a, e) => a + Number(e.row.rating), 0) / rated.length : null;
  const best = rated.slice().sort((a, b) => Number(b.row.rating) - Number(a.row.rating))[0];
  const idx = year != null ? years.indexOf(year) : -1;
  const q = from ? `?de=${encodeURIComponent(from)}` : "";

  if (!years.length)
    return (
      <div className="mt-6 rounded-3xl border border-line bg-card/70 p-10 text-center">
        <p className="text-xl font-bold">Le journal est vide</p>
        <p className="mx-auto mt-2 max-w-md text-mute">{isMe ? "Indique la date de début ou de fin sur la fiche de tes jeux : ils apparaîtront ici, rangés dans le temps." : "Aucune date de jeu renseignée pour l'instant."}</p>
        {isMe && <Link href="/collection" className={`${btnGhost} mt-5`}>Aller à ma collection</Link>}
      </div>
    );

  return (
    <div className="mt-6">
      {/* Choix de l'année */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Arrow dir={-1} disabled={idx >= years.length - 1} onClick={() => setYear(years[idx + 1])} />
          <AnimatePresence mode="wait">
            <motion.b key={year} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="w-24 text-center font-display text-4xl tabular-nums">{year}</motion.b>
          </AnimatePresence>
          <Arrow dir={1} disabled={idx <= 0} onClick={() => setYear(years[idx - 1])} />
        </div>
        <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y)} aria-pressed={y === year} className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition ${y === year ? "bg-ink text-night" : "text-mute hover:bg-white/5"}`}>{y}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} className="h-5 w-5 accent-violet-500" />Seulement les jeux finis</label>
      </div>

      {/* Bilan de l'année */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v={String(yDone.length)} l={`jeu${yDone.length > 1 ? "x" : ""} fini${yDone.length > 1 ? "s" : ""}`} />
        <Stat v={yHours ? `${Math.round(yHours)} h` : "–"} l="de jeu (jeux finis)" />
        <Stat v={yAvg ? yAvg.toFixed(1).replace(".", ",") : "–"} l="note moyenne" />
        <Stat v={best ? best.row.game.name : "–"} l="coup de cœur" small />
      </div>

      {/* Mois par mois */}
      <AnimatePresence mode="wait">
        <motion.div key={`${year}-${onlyDone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-8 flex flex-col gap-8">
          {[...byMonth.entries()].sort((a, b) => b[0] - a[0]).map(([m, es]) => (
            <section key={m} className="grid gap-3 sm:grid-cols-[120px_1fr] sm:gap-6">
              <h2 className="sm:sticky sm:top-6 sm:self-start">
                <span className="block font-display text-2xl font-bold">{MONTHS[m]}</span>
                <span className="text-sm text-mute">{es.length} entrée{es.length > 1 ? "s" : ""}</span>
              </h2>
              <ol className="relative flex flex-col gap-2 border-l border-line pl-5">
                {es.map((e, i) => {
                  const k = KIND[e.kind];
                  return (
                    <motion.li key={e.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative">
                      <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-night" style={{ background: k.color }} />
                      <Link href={`/jeu/${e.row.game.id}${q}`} className="group flex items-center gap-4 rounded-2xl border border-transparent p-2 transition hover:border-line hover:bg-card/80">
                        <span className="w-10 shrink-0 text-center"><b className="block font-display text-2xl leading-none">{Number(e.date.slice(8, 10))}</b><span className="text-[10px] uppercase text-faint">{MONTHS[m].slice(0, 3)}</span></span>
                        <Cover game={e.row.game} className="w-12 shrink-0 rounded-lg shadow-lg transition group-hover:scale-105 [--cover-fs:11px]" />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate">{e.row.game.name}</b>
                          <span className="flex flex-wrap items-center gap-x-2 text-xs">
                            <span className="font-semibold" style={{ color: k.color }}>{k.label}</span>
                            {e.kind !== "debut" && e.row.rating != null && <span className="flex items-center gap-1"><Stars value={Number(e.row.rating)} size={11} /></span>}
                            {e.kind !== "debut" && e.row.playtime_hours ? <span className="text-mute">{e.row.playtime_hours} h</span> : null}
                            {e.row.platform && <span className="text-faint">{e.row.platform}</span>}
                          </span>
                          {e.kind !== "debut" && e.row.review && !(e.row.has_spoilers && !e.row.spoiler_text) && <span className="mt-0.5 line-clamp-1 block text-sm text-ink2">« {e.row.review} »</span>}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          ))}
          {!list.length && <p className="rounded-3xl border border-line bg-card/70 p-6 text-center text-mute">Rien en {year} avec ce filtre.</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Stat({ v, l, small }: { v: string; l: string; small?: boolean }) {
  return (
    <div className="rounded-3xl border border-line bg-card/80 p-4">
      <b className={`block truncate font-display leading-tight ${small ? "text-lg" : "text-[28px]"}`}>{v}</b>
      <span className="text-[13px] text-mute">{l}</span>
    </div>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? "Année précédente" : "Année suivante"}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-ink2 transition hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-30">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} /></svg>
    </button>
  );
}
