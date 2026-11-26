"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cover from "./Cover";
import { extractColor, setGlow } from "./Glow";
import { sfx } from "@/lib/sound";
import type { Game } from "@/lib/types";

/** Top 5 en éventail : la carte du milieu flotte et la lumière prend sa couleur. */
export default function TopFan({ games, mine }: { games: (Game | null)[]; mine: boolean }) {
  const slots = mine ? games : games.filter(Boolean);
  const [sel, setSel] = useState(Math.min(Math.max(0, games.findIndex(Boolean)), Math.max(0, slots.length - 1)));
  const [w, setW] = useState(800);
  const n = slots.length;

  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on(); addEventListener("resize", on); return () => removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const g = slots[sel];
    if (!g) return;
    let alive = true;
    if (g.dominant_color) setGlow(g.dominant_color);
    else if (g.cover_url) extractColor(g.cover_url).then((c) => alive && c && setGlow(c));
    return () => { alive = false; };
  }, [sel, slots]);

  useEffect(() => () => setGlow("#8b5cf6"), []);

  if (!n) return null;
  const spread = w < 640 ? 62 : 112;
  const move = (d: number) => { setSel((s) => (s + d + n) % n); sfx.flip(); };

  return (
    <div className="relative h-[300px] select-none sm:h-[340px]" data-nosound>
      <div aria-hidden="true" className="absolute bottom-8 left-1/2 h-1 w-56 -translate-x-1/2 rounded-full bg-violet-hi shadow-[0_0_24px_8px_var(--glow)]" />
      {slots.map((g, i) => {
        const o = i - sel, a = Math.abs(o);
        const style: React.CSSProperties = {
          transform: `translateX(-50%) translate(${o * spread}px, ${a * 16}px) rotate(${o * 12}deg) scale(${1 - a * 0.15})`,
          zIndex: 10 - a, opacity: a > 2 ? 0 : 1, filter: `brightness(${1 - a * 0.25})`,
        };
        const inner = g ? (
          <Cover game={g} className="shadow-[0_26px_44px_-18px_rgba(0,0,0,.9)] [--cover-fs:44px]">
            <span className="absolute left-2 top-2 z-[2] rounded-lg bg-black/70 px-2 py-0.5 font-display text-sm font-bold text-white">#{i + 1}</span>
          </Cover>
        ) : (
          <div className="grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed border-white/20 bg-card p-3 text-center text-sm font-semibold text-mute">
            N°{i + 1}<br />Choisis un jeu dans ta collection
          </div>
        );
        return (
          <div key={i} className="absolute left-1/2 top-4 w-[140px] transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] sm:w-[170px]" style={style}>
            {o === 0 ? (
              g ? <Link href={`/jeu/${g.id}`} className="block animate-[floaty_3.4s_ease-in-out_infinite]" aria-label={`Top ${i + 1} : ${g.name}`}>{inner}</Link>
                : <Link href="/collection" className="block">{inner}</Link>
            ) : (
              <button className="block w-full" onClick={() => { setSel(i); sfx.flip(); }} aria-label={g ? `Voir ${g.name}` : `Rang ${i + 1}`}>{inner}</button>
            )}
          </div>
        );
      })}
      {n > 1 && (
        <>
          <button onClick={() => move(-1)} className="absolute left-0 top-[120px] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/80 backdrop-blur" aria-label="Précédent">‹</button>
          <button onClick={() => move(1)} className="absolute right-0 top-[120px] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/80 backdrop-blur" aria-label="Suivant">›</button>
        </>
      )}
    </div>
  );
}
