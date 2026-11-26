"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Nombre qui « compte » jusqu'à sa valeur quand il apparaît à l'écran. */
export function CountUp({ value, decimals = 0, className = "" }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(decimals).replace(".", ","));
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] });
    return () => c.stop();
  }, [inView, value, mv]);
  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}

export type Slice = { label: string; value: number; color: string };

/** Anneau animé (répartition par statut, plateformes…), survol = détail au centre. */
export function Donut({ data, size = 190, label = "jeux" }: { data: Slice[]; size?: number; label?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let acc = 0;
  const h = hover != null ? data[hover] : null;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / .06)" strokeWidth="18" />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * c;
            const off = acc; acc += len;
            return (
              <motion.circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeLinecap="butt"
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`} initial={{ strokeDashoffset: c, strokeWidth: 18 }}
                animate={{ strokeDashoffset: -off, strokeWidth: hover === i ? 24 : 18, opacity: hover == null || hover === i ? 1 : 0.35 }}
                transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.06 }}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <b className="block font-display text-3xl leading-none">{h ? h.value : total}</b>
            <span className="text-xs text-mute">{h ? h.label : label}</span>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className={`flex cursor-default items-center gap-2 transition-opacity ${hover != null && hover !== i ? "opacity-40" : ""}`}>
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-ink2">{d.label}</span><b className="ml-auto pl-3">{d.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barres verticales animées avec info-bulle (répartition des notes, jeux par mois…). */
export function Columns({ data, color = "var(--color-violet)", height = 130, unit = "" }: { data: { label: string; value: number; hint?: string }[]; color?: string; height?: number; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div ref={ref} className="grid items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))`, height: height + 34 }}>
      {data.map((d, i) => (
        <div key={i} className="relative flex h-full flex-col items-center justify-end gap-1" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
          {hover === i && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-1 z-10 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-night">
              {d.hint ?? `${d.value}${unit}`}
            </motion.span>
          )}
          <motion.span className="block w-full rounded-t-md" style={{ background: color, opacity: hover == null || hover === i ? 1 : 0.45 }}
            initial={{ height: 0 }} animate={{ height: inView ? Math.max(3, (d.value / max) * height) : 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18, delay: i * 0.03 }} />
          <span className="text-[11px] text-mute">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Barres horizontales animées (genres, comparaisons). */
export function HBars({ data, color = "var(--color-violet)", format = (v: number) => String(v) }: { data: { label: string; value: number; color?: string; extra?: React.ReactNode }[]; color?: string; format?: (v: number) => string }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="grid grid-cols-[minmax(0,120px)_1fr_auto] items-center gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 truncate text-ink2">{d.extra}{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/[.06]">
            <motion.span layout className="block h-full rounded-full" style={{ background: d.color ?? color }}
              initial={{ width: 0 }} animate={{ width: inView ? `${(d.value / max) * 100}%` : 0 }} transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.05 }} />
          </span>
          <b className="tabular-nums">{format(d.value)}</b>
        </div>
      ))}
    </div>
  );
}
