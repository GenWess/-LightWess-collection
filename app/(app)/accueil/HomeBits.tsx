"use client";

import { motion, useReducedMotion } from "motion/react";

/** Image « à la une » qui avance très lentement (effet Ken Burns). */
export function HeroBackdrop({ src }: { src: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute inset-0 -z-20 h-full w-full object-cover"
      initial={{ scale: 1.12, opacity: 0 }}
      animate={reduce ? { opacity: 1, scale: 1.04 } : { opacity: 1, scale: [1.12, 1.02] }}
      transition={{ opacity: { duration: 0.8 }, scale: { duration: 18, ease: "easeOut" } }}
    />
  );
}

/** Pastille « dans 12 j » sur les jeux pas encore sortis. */
export function Countdown({ at }: { at: number }) {
  const days = Math.ceil((at * 1000 - Date.now()) / 86400000);
  if (days < 0) return null;
  const txt = days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : days < 60 ? `Dans ${days} j` : `Dans ${Math.round(days / 30)} mois`;
  return <span className="absolute left-2 top-2 z-[2] rounded-lg bg-violet/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur">{txt}</span>;
}
