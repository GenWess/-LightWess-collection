"use client";

import { motion } from "motion/react";
import { useRef, useState } from "react";
import Cover from "./Cover";
import { toast } from "@/lib/toast";
import { STATUS_LABEL, type Status } from "@/lib/types";

export type CardGame = {
  igdb_id: number; name: string; cover_url: string | null; banner_url?: string | null;
  release_year: number | null; release_date?: number | null; rating?: number | null; genres?: string[];
};

const fmtDay = (s: number) => new Date(s * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/**
 * Jaquette d'un jeu du catalogue (pas encore forcément dans la base du site).
 * Clic = ouvre sa fiche. Petit « + » discret = l'ajouter à « À faire » sans quitter la page.
 */
export default function CatalogCard({ g, status, sub, badge }: { g: CardGame; status?: Status | null; sub?: "date" | "year" | "rating"; badge?: React.ReactNode }) {
  const [mine, setMine] = useState<Status | null>(status ?? null);
  const [busy, setBusy] = useState(false);

  async function addTodo(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (mine || busy) return;
    setBusy(true);
    const r = await fetch("/api/games/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ igdbId: g.igdb_id, status: "a_faire" }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return toast("Impossible d'ajouter ce jeu", "error");
    setMine("a_faire");
    toast(`${g.name} ajouté à « À faire »`, "success");
  }

  const line = sub === "date" && g.release_date ? fmtDay(g.release_date) : sub === "rating" && g.rating ? `★ ${g.rating.toFixed(1)} · ${g.release_year ?? ""}` : g.release_year ? String(g.release_year) : "";

  return (
    <a href={`/api/games/open/${g.igdb_id}`} className="group block min-w-0" title={g.name}>
      <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 340, damping: 24 }} className="relative">
        <Cover game={{ name: g.name, cover_url: g.cover_url, banner_url: g.banner_url ?? null }} className="shadow-[0_18px_30px_-18px_rgba(0,0,0,.85)] transition-shadow duration-300 group-hover:shadow-[0_26px_44px_-18px_rgba(139,92,246,.6)] [--cover-fs:34px]">
          {badge}
          {mine ? (
            <span className="absolute bottom-2 left-2 z-[2] rounded-lg bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{STATUS_LABEL[mine]}</span>
          ) : (
            <button onClick={addTodo} disabled={busy} aria-label={`Ajouter ${g.name} à « À faire »`} title="Ajouter à « À faire »"
              className="absolute bottom-2 right-2 z-[2] grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/55 text-white opacity-80 backdrop-blur transition hover:scale-110 hover:bg-violet sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </Cover>
      </motion.div>
      <p className="mt-2 truncate text-sm font-semibold">{g.name}</p>
      {line && <p className="truncate text-xs text-mute">{line}</p>}
    </a>
  );
}

/** Rangée horizontale qui défile, avec flèches sur ordinateur. */
export function Rail({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight">{title}</h2>
          {hint && <p className="text-sm text-mute">{hint}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <div className="hidden gap-1 sm:flex">
            {[-1, 1].map((d) => (
              <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Précédent" : "Suivant"} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-ink2 transition hover:bg-white/10 active:scale-90">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} /></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={ref} className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:none] sm:-mx-1 sm:gap-4 sm:px-1 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

export const railItem = "w-[38%] shrink-0 snap-start sm:w-[150px] lg:w-[168px]";
