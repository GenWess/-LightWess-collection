"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CountUp, Columns, Donut, HBars } from "./Charts";
import { genreFr, type Game, type UserGame } from "@/lib/types";

type Row = UserGame & { game: Game };
export const STATUS_COLORS: Record<string, string> = { termine: "#8B5CF6", platine: "#FFD45C", en_cours: "#3DDC97", a_faire: "#5B8CFF", abandonne: "#FF5C6C" };
const STATUS_TXT: Record<string, string> = { termine: "Terminés", platine: "Platine / 100 %", en_cours: "En cours", a_faire: "À faire", abandonne: "Abandonnés" };
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export default function ProfileStats({ rows }: { rows: Row[] }) {
  const done = rows.filter((r) => r.status === "termine" || r.status === "platine");
  const rated = rows.filter((r) => r.rating != null);
  const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
  const hours = rows.reduce((a, r) => a + Number(r.playtime_hours || 0), 0);
  const thisYear = new Date().getFullYear();
  // Toutes les années où au moins un jeu a été terminé, jusqu'à l'année en cours.
  const doneYears = done.map((r) => Number(r.finished_on?.slice(0, 4))).filter((y) => y > 1970);
  const firstYear = Math.min(thisYear, ...doneYears);
  const [year, setYear] = useState(thisYear);
  const yearCount = done.filter((r) => r.finished_on?.startsWith(String(year))).length;

  const status = Object.keys(STATUS_TXT).map((k) => ({ label: STATUS_TXT[k], value: rows.filter((r) => r.status === k).length, color: STATUS_COLORS[k] })).filter((s) => s.value);
  const notes = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => ({ label: String(v).replace(".5", "½"), value: rated.filter((r) => Number(r.rating) === v).length, hint: `${rated.filter((r) => Number(r.rating) === v).length} jeu(x) à ${String(v).replace(".", ",")}★` }));
  const months = MONTHS.map((m, i) => {
    const n = done.filter((r) => r.finished_on?.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`)).length;
    return { label: m, value: n, hint: `${n} terminé(s) en ${MONTHS_LONG[i]}` };
  });
  const genreCount = new Map<string, number>();
  done.forEach((r) => r.game.genres?.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const genres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label: genreFr(label), value }));
  const platCount = new Map<string, number>();
  rows.forEach((r) => r.platform && platCount.set(r.platform, (platCount.get(r.platform) ?? 0) + 1));
  const PCOL = ["#8B5CF6", "#5B8CFF", "#3DDC97", "#FFD45C", "#FF5C8A", "#2EB6E8", "#F28C38"];
  const plats = [...platCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value], i) => ({ label, value, color: PCOL[i] }));
  const mostPlayed = rows.filter((r) => r.playtime_hours).sort((a, b) => Number(b.playtime_hours) - Number(a.playtime_hours)).slice(0, 5)
    .map((r) => ({ label: r.game.name, value: Number(r.playtime_hours) }));

  const card = "rounded-3xl border border-line bg-card/80 p-5 backdrop-blur";
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([[rows.length, "jeux dans la collection", 0], [done.length, "jeux terminés", 0], [avg, "note moyenne", 1], [hours, "heures de jeu", 0]] as const).map(([v, l, d]) => (
          <div key={l} className={`${card} group relative overflow-hidden`}>
            <span aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[var(--glow)] opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-50" />
            <b className="block font-display text-[30px] leading-none">{v === 0 && d === 1 ? "–" : <CountUp value={Number(v)} decimals={d} />}</b>
            <span className="mt-1 block text-[13px] text-mute">{l}</span>
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={card}><h3 className="mb-4 font-bold">Ma collection</h3><Donut data={status} /></section>
          <section className={card}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-bold">Terminés en {year} <span className="font-normal text-mute">· {yearCount}</span></h3>
              <div className="flex items-center gap-1">
                <YearArrow dir={-1} disabled={year <= firstYear} onClick={() => setYear((y) => y - 1)} />
                <YearArrow dir={1} disabled={year >= thisYear} onClick={() => setYear((y) => y + 1)} />
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={year} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                <Columns data={months} />
              </motion.div>
            </AnimatePresence>
          </section>
          {rated.length > 0 && <section className={card}><h3 className="mb-2 font-bold">Mes notes</h3><Columns data={notes} color="#FFD45C" /></section>}
          {genres.length > 0 && <section className={card}><h3 className="mb-4 font-bold">Genres préférés</h3><HBars data={genres} /></section>}
          {plats.length > 0 && <section className={card}><h3 className="mb-4 font-bold">Plateformes</h3><Donut data={plats} size={160} label="jeux" /></section>}
          {mostPlayed.length > 0 && <section className={card}><h3 className="mb-4 font-bold">Les plus joués</h3><HBars data={mostPlayed} color="#3DDC97" format={(v) => `${Math.round(v)} h`} /></section>}
        </div>
      )}
    </div>
  );
}

function YearArrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? "Année précédente" : "Année suivante"}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-ink2 transition hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
