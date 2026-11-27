"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import CatalogCard, { type CardGame } from "@/components/CatalogCard";
import { btnGhost } from "@/components/ui";
import type { Status } from "@/lib/types";

const SORTS = [
  { key: "popular", label: "Populaires" },
  { key: "rating", label: "Mieux notés" },
  { key: "recent", label: "Récents" },
  { key: "upcoming", label: "À venir" },
] as const;

const YEAR_NOW = new Date().getFullYear();
const PERIODS = [
  { key: "", label: "Toutes les années" },
  { key: `${YEAR_NOW}-${YEAR_NOW}`, label: String(YEAR_NOW) },
  { key: `${YEAR_NOW - 1}-${YEAR_NOW - 1}`, label: String(YEAR_NOW - 1) },
  { key: `2020-${YEAR_NOW}`, label: "Années 2020" },
  { key: "2010-2019", label: "Années 2010" },
  { key: "2000-2009", label: "Années 2000" },
  { key: "1990-1999", label: "Années 90" },
  { key: "1970-1989", label: "Rétro (avant 1990)" },
];

const sel = "min-h-11 rounded-2xl border border-white/15 bg-night2 px-3 text-sm text-ink transition focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/25";

export default function Explorer({ owned, genres, platforms, initialQ, initialGenre }: {
  owned: [number, Status][]; genres: { id: number; fr: string }[]; platforms: { id: number; label: string }[]; initialQ: string; initialGenre: number;
}) {
  const own = useMemo(() => new Map(owned), [owned]);
  const [q, setQ] = useState(initialQ);
  const [genre, setGenre] = useState(initialGenre);
  const [platform, setPlatform] = useState(0);
  const [period, setPeriod] = useState("");
  const [sort, setSort] = useState<string>("popular");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<CardGame[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [more, setMore] = useState(true);
  const [err, setErr] = useState("");
  const reqId = useRef(0);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim().length >= 2) p.set("q", q.trim());
    if (genre) p.set("genre", String(genre));
    if (platform) p.set("platform", String(platform));
    if (period) { const [a, b] = period.split("-"); p.set("from", a); p.set("to", b); }
    p.set("sort", sort);
    return p.toString();
  }, [q, genre, platform, period, sort]);

  // Nouvelle recherche dès qu'un filtre change (petite attente pendant la frappe).
  useEffect(() => {
    const id = ++reqId.current;
    setState("loading"); setPage(0);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/games/explore?${params}&page=0`).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : { error: "Pas de connexion internet ?" };
      if (id !== reqId.current) return;
      if (!r?.ok) { setState("error"); setErr(j.error || "Le catalogue ne répond pas."); return; }
      setItems(j.results); setMore(j.results.length >= 40); setState("idle");
    }, 280);
    return () => clearTimeout(t);
  }, [params]);

  async function loadMore() {
    const next = page + 1;
    setState("loading");
    const r = await fetch(`/api/games/explore?${params}&page=${next}`).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setState("idle"); return; }
    const seen = new Set(items.map((x) => x.igdb_id));
    setItems((xs) => [...xs, ...(j.results as CardGame[]).filter((x) => !seen.has(x.igdb_id))]);
    setMore(j.results.length >= 40); setPage(next); setState("idle");
  }

  const active = (genre ? 1 : 0) + (platform ? 1 : 0) + (period ? 1 : 0);
  const reset = () => { setGenre(0); setPlatform(0); setPeriod(""); };
  const searching = q.trim().length >= 2;

  return (
    <div>
      {/* Barre de recherche */}
      <div className="sticky top-[var(--mh,0px)] z-10 -mx-4 bg-night/80 px-4 pb-3 pt-2 backdrop-blur-xl transition-[top] duration-300 sm:mx-0 sm:px-0 lg:top-0">
        <label className="relative block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Elden Ring, Zelda, Hades, Final Fantasy…" aria-label="Chercher un jeu"
            className="min-h-14 w-full rounded-2xl border border-white/15 bg-card pl-12 pr-4 text-[17px] text-ink placeholder:text-faint transition focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/25" />
        </label>
      </div>

      {/* Genres */}
      <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Genre">
        {[{ id: 0, fr: "Tous les genres" }, ...genres].map((g) => (
          <button key={g.id} onClick={() => setGenre(g.id)} aria-pressed={genre === g.id}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${genre === g.id ? "border-transparent bg-ink text-night" : "border-white/15 text-ink2 hover:bg-white/5"}`}>
            {g.fr}
          </button>
        ))}
      </div>

      {/* Plateforme, période, tri */}
      <div className="mt-2 flex flex-wrap items-center gap-2 max-sm:[&>select]:flex-1">
        <select value={platform} onChange={(e) => setPlatform(Number(e.target.value))} className={sel} aria-label="Plateforme">
          <option value={0}>Toutes les plateformes</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={sel} aria-label="Année de sortie">
          {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {active > 0 && <button onClick={reset} className="px-2 text-sm font-semibold text-mute hover:text-ink">Effacer ({active})</button>}

        {!searching && (
          <LayoutGroup id="sort">
            <div className="no-scrollbar flex w-full overflow-x-auto rounded-full border border-white/10 bg-card p-1 sm:ml-auto sm:w-auto" role="tablist" aria-label="Trier">
              {SORTS.map((s) => (
                <button key={s.key} role="tab" aria-selected={sort === s.key} onClick={() => setSort(s.key)} className="relative min-h-9 flex-1 shrink-0 rounded-full px-3 text-sm font-semibold">
                  {sort === s.key && <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-full bg-violet" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${sort === s.key ? "text-white" : "text-mute"}`}>{s.label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* Résultats */}
      <div className="mt-6">
        {state === "error" ? (
          <p className="rounded-3xl border border-line bg-card/70 p-6 text-center text-mute">{err}</p>
        ) : state === "loading" && !items.length ? (
          <Grid>{Array.from({ length: 12 }, (_, i) => <div key={i}><div className="skeleton aspect-[3/4] rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} /><div className="skeleton mt-2 h-4 w-3/4 rounded" /></div>)}</Grid>
        ) : items.length ? (
          <>
            <Grid dim={state === "loading" && page === 0}>
              <AnimatePresence initial={false}>
                {items.map((g, i) => (
                  <motion.div key={g.igdb_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i % 48, 20) * 0.015 }}>
                    <CatalogCard g={g} status={own.get(g.igdb_id)} sub={sort === "upcoming" || sort === "recent" ? "date" : "rating"} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Grid>
            {more && !searching && (
              <div className="mt-8 flex justify-center">
                <button onClick={loadMore} disabled={state === "loading"} className={btnGhost}>{state === "loading" ? "Chargement…" : "Voir plus de jeux"}</button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
            <p className="text-xl font-bold">Aucun jeu trouvé</p>
            <p className="mt-2 text-mute">Essaie un autre nom ou enlève un filtre.</p>
            {active > 0 && <button onClick={reset} className={`${btnGhost} mt-4`}>Effacer les filtres</button>}
          </div>
        )}
      </div>
      <p className="mt-10 text-center text-[11px] text-faint">Catalogue et jaquettes : IGDB.com · le « + » ajoute un jeu à ta liste « À faire »</p>
    </div>
  );
}

function Grid({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return <div className={`grid grid-cols-3 gap-3 transition-opacity sm:grid-cols-4 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6 ${dim ? "opacity-50" : ""}`}>{children}</div>;
}
