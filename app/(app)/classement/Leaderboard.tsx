"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { CATS, badgesFor, nameClass, rank, type CatKey, type LeaderRow } from "@/lib/ranking";

const MEDAL = ["#FFD45C", "#D8DEE9", "#E3955B"];

export default function Leaderboard({ rows, meId }: { rows: LeaderRow[]; meId: string }) {
  const [cat, setCat] = useState<CatKey>("hours");
  const c = CATS.find((x) => x.key === cat)!;
  const list = useMemo(() => rank(rows, cat), [rows, cat]);
  const tiers = useMemo(() => new Map(rows.map((r) => [r.id, badgesFor(r.id, rows).nameTier])), [rows]);
  const me = list.find((r) => r.id === meId);
  const podium = list.filter((r) => r.pos <= 3).slice(0, 3);
  const rest = list.slice(podium.length);

  const name = (r: LeaderRow) => <span className={nameClass(tiers.get(r.id) ?? null)}>{r.display_name || r.handle}</span>;

  return (
    <div>
      <LayoutGroup id="cats">
        <div className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Catégories">
          {CATS.map((x) => (
            <button key={x.key} role="tab" aria-selected={cat === x.key} onClick={() => setCat(x.key)}
              className="relative min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold">
              {cat === x.key && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className={`relative flex items-center gap-1.5 ${cat === x.key ? "text-night" : "text-ink2"}`}><span aria-hidden="true">{x.icon}</span>{x.label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {me && <p className="mb-5 rounded-2xl border border-violet/40 bg-violet/10 px-4 py-3 text-sm">Tu es <b>{me.pos}ᵉ</b> sur {list.length} · {c.unit(me[cat])}</p>}

      {!list.length ? (
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center text-mute">Personne n&apos;est encore classé ici.</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={cat} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {/* Podium */}
            <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[1, 0, 2].map((i) => {
                const r = podium[i];
                if (!r) return <div key={i} />;
                const h = i === 0 ? "h-28 sm:h-36" : i === 1 ? "h-20 sm:h-28" : "h-14 sm:h-20";
                return (
                  <Link key={r.id} href={`/u/${r.handle}`} className="group flex min-w-0 flex-col items-center gap-2 text-center">
                    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 + i * 0.08 }}
                      className="rounded-full p-[3px]" style={{ background: MEDAL[r.pos - 1] }}>
                      <Avatar profile={r} size={i === 0 ? 78 : 60} />
                    </motion.div>
                    <b className="w-full truncate text-sm sm:text-base">{name(r)}</b>
                    <span className="text-xs text-mute sm:text-sm">{c.unit(r[cat])}</span>
                    <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ type: "spring", stiffness: 160, damping: 20, delay: i * 0.08 }}
                      className={`grid w-full origin-bottom place-items-center rounded-t-2xl border border-b-0 border-white/10 ${h}`}
                      style={{ background: `linear-gradient(180deg, ${MEDAL[r.pos - 1]}33, transparent)` }}>
                      <span className="font-display text-3xl font-bold" style={{ color: MEDAL[r.pos - 1] }}>{r.pos}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {rest.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {rest.map((r, i) => (
                  <motion.li key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.025 }}>
                    <Link href={`/u/${r.handle}`} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition hover:bg-white/5 ${r.id === meId ? "border-violet/50 bg-violet/10" : "border-line bg-card/60"}`}>
                      <span className="w-8 text-center font-display font-bold text-mute">{r.pos}</span>
                      <Avatar profile={r} size={40} />
                      <span className="min-w-0 flex-1"><b className="block truncate">{name(r)}</b><span className="block truncate text-xs text-mute">@{r.handle}</span></span>
                      <b className="shrink-0 tabular-nums">{c.unit(r[cat])}</b>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
      )}
      <p className="mt-6 text-xs text-faint">Les joueurs dont la collection est en « Moi seul » n&apos;apparaissent pas. Le 1ᵉʳ en heures de jeu a son pseudo en or, les autres meilleurs l&apos;ont en violet.</p>
    </div>
  );
}
