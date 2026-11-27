"use client";

import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Cover from "./Cover";
import { STATUSES, type Game, type UserGame } from "@/lib/types";

const SHORT = Object.fromEntries(STATUSES.map((s) => [s.key, s.short]));

/**
 * Carte de jeu avec relief : elle s'incline vers la souris et un reflet de lumière glisse dessus.
 * (Sur téléphone et en « animations réduites », elle reste à plat.)
 */
export default function GameTile({ game, entry, sub, onSelect, selected, from }: {
  from?: string;
  game: Game; entry?: Pick<UserGame, "status" | "rating"> | null; sub?: string;
  onSelect?: () => void; selected?: boolean;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5), py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [9, -9]), { stiffness: 260, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-11, 11]), { stiffness: 260, damping: 22 });
  const gx = useTransform(px, (v) => `${v * 100}%`), gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,.35), transparent 55%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { px.set(0.5); py.set(0.5); };

  const body = (
    <motion.div onPointerMove={onMove} onPointerLeave={reset} style={{ rotateX: rx, rotateY: ry, transformPerspective: 700 }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="group relative">
      <Cover game={game} className={`shadow-[0_18px_30px_-18px_rgba(0,0,0,.85)] transition-shadow duration-300 group-hover:shadow-[0_28px_50px_-18px_var(--glow)] [--cover-fs:38px] ${selected ? "ring-[3px] ring-violet-hi ring-offset-2 ring-offset-night" : ""}`}>
        {entry && <span className="absolute left-1.5 top-1.5 z-[2] rounded-lg bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur sm:left-2 sm:top-2 sm:px-2 sm:text-[11px]">{SHORT[entry.status]}</span>}
        {entry?.rating != null && <span className="absolute bottom-1.5 right-1.5 z-[2] rounded-lg bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-[#FFD45C] backdrop-blur sm:bottom-auto sm:right-2 sm:top-2 sm:px-2 sm:text-[11px]">★ {Number(entry.rating).toFixed(1)}</span>}
        <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100" style={{ background: glare }} />
      </Cover>
    </motion.div>
  );

  const caption = (
    <>
      <p className="mt-2 truncate text-sm font-semibold">{game.name}</p>
      {sub && <p className="truncate text-xs text-mute">{sub}</p>}
    </>
  );

  // Mode « sélection » : un bouton, jamais un lien (aucune redirection possible).
  if (onSelect)
    return <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full min-w-0 text-left">{body}{caption}</button>;
  return <Link href={`/jeu/${game.id}${from ? `?de=${encodeURIComponent(from)}` : ""}`} className="block min-w-0">{body}{caption}</Link>;
}
