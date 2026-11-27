"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import Cover from "./Cover";
import GameTile from "./GameTile";
import ReviewText from "./ReviewText";
import { Stars } from "./Stars";
import { btnGhost, btnPrimary } from "./ui";
import { CATEGORIES, STATUS_LABEL, genreFr, type Game, type MiniProfile, type UserGame } from "@/lib/types";

export type PeekRow = UserGame & { game: Game };
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const STATUS_COLOR: Record<string, string> = { termine: "#8B5CF6", platine: "#FFD45C", en_cours: "#3DDC97", a_faire: "#5B8CFF", abandonne: "#FF5C6C" };

/**
 * Fiche « avis » d'un joueur sur un jeu, ouverte directement sur son profil :
 * note, notes par catégorie, temps, dates, avis (spoilers floutés).
 */
export function GamePeek({ row: current, owner, onClose }: { row: PeekRow | null; owner: MiniProfile; onClose: () => void }) {
  // On garde la dernière fiche affichée pendant l'animation de fermeture.
  const last = useRef<PeekRow | null>(current);
  if (current) last.current = current;
  const row = current ?? last.current;

  return (
    <Sheet open={!!current} onClose={onClose} label={row ? `Avis de ${owner.handle} sur ${row.game.name}` : "Avis"}
      handleArea={row && (
            <div className="relative isolate overflow-hidden px-5 pb-4 pt-2 sm:pt-5">
              {row.game.banner_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.game.banner_url} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50" />
              )}
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night2 via-night2/80 to-night2/30" />
              <button onClick={onClose} className="absolute right-4 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-ink2 backdrop-blur hover:text-ink sm:top-4" aria-label="Fermer">✕</button>
              <div className="flex items-end gap-4">
                <Cover game={row.game} className="w-24 shrink-0 shadow-2xl sm:w-28 [--cover-fs:22px]" />
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-semibold text-ink2">{[row.game.release_year, row.game.genres?.slice(0, 2).map(genreFr).join(", ")].filter(Boolean).join(" · ")}</p>
                  <h2 className="text-balance text-[clamp(22px,4vw,30px)] font-bold leading-tight">{row.game.name}</h2>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold" style={{ borderColor: STATUS_COLOR[row.status] + "88", color: STATUS_COLOR[row.status], background: STATUS_COLOR[row.status] + "1a" }}>
                    {STATUS_LABEL[row.status]}{row.top_rank ? ` · n°${row.top_rank} de son top 5` : ""}
                  </span>
                </div>
              </div>
            </div>
      )}>
      {row && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Avatar profile={owner} size={36} />
                <span className="min-w-0 flex-1"><span className="block text-xs text-mute">L&apos;avis de</span><b className="block truncate">{owner.display_name || `@${owner.handle}`}</b></span>
                {row.rating != null ? (
                  <span className="flex items-center gap-2"><Stars value={Number(row.rating)} size={20} /><b className="font-display text-3xl">{Number(row.rating).toFixed(1)}</b></span>
                ) : <span className="text-sm text-mute">Pas encore noté</span>}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {row.playtime_hours != null && <Fact t="Temps de jeu" v={`${row.playtime_hours} h`} />}
                {row.difficulty != null && <Fact t="Difficulté" v={`${Number(row.difficulty).toFixed(1)} / 5`} />}
                {row.platform && <Fact t="Plateforme" v={row.platform} />}
                {row.started_on && <Fact t="Commencé le" v={fmt(row.started_on)} />}
                {row.finished_on && <Fact t={row.status === "abandonne" ? "Abandonné le" : "Terminé le"} v={fmt(row.finished_on)} />}
              </dl>

              {Object.keys(row.scores ?? {}).length > 0 && (
                <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-line bg-card/60 p-4">
                  {CATEGORIES.filter((c) => typeof row.scores?.[c.key] === "number").map((c, i) => (
                    <div key={c.key} className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-sm">
                      <span className="text-mute">{c.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-white/8">
                        <motion.span className="block h-full rounded-full" style={{ background: owner.accent_color || "#8b5cf6" }} initial={{ width: 0 }} animate={{ width: `${(row.scores[c.key] / 5) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.1 + i * 0.05 }} />
                      </span>
                      <b className="text-right">{row.scores[c.key].toFixed(1)}</b>
                    </div>
                  ))}
                </div>
              )}

              <ReviewText r={row} className="mt-4 text-[15px]" />
              {!row.review && !row.spoiler_text && <p className="mt-4 text-sm text-mute">Pas d&apos;avis écrit pour ce jeu.</p>}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/jeu/${row.game.id}?de=${encodeURIComponent(owner.handle ?? "")}`} className={btnPrimary}>Voir la fiche du jeu</Link>
                <button onClick={onClose} className={btnGhost}>Fermer</button>
              </div>
            </div>
      )}
    </Sheet>
  );
}

function Fact({ t, v }: { t: string; v: string }) {
  return <div className="rounded-2xl bg-white/[.04] px-3 py-2"><dt className="text-[11px] text-mute">{t}</dt><dd className="truncate font-semibold">{v}</dd></div>;
}

/** Jaquette qui ouvre l'avis du joueur au lieu de quitter son profil. */
export default function PeekTile({ row, owner, sub }: { row: PeekRow; owner: MiniProfile; sub?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GameTile game={row.game} entry={row} sub={sub} onSelect={() => setOpen(true)} />
      <GamePeek row={open ? row : null} owner={owner} onClose={() => setOpen(false)} />
    </>
  );
}
