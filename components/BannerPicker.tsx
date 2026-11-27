"use client";

import { useRef, useState } from "react";
import { btnGhost, btnPrimary } from "./ui";

/**
 * Cadrage de la bannière : on fait glisser l'image (souris ou doigt) pour choisir
 * la partie visible, puis on enregistre. Les flèches du clavier marchent aussi.
 */
export default function BannerPicker({ url, x, y, accent, onSave, busy }: {
  url: string; x: number; y: number; accent: string; busy?: boolean;
  onSave: (pos: { banner_pos_x: number; banner_pos_y: number }) => void;
}) {
  const [pos, setPos] = useState({ x, y });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const changed = pos.x !== x || pos.y !== y;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, el = box.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    // Glisser l'image vers le bas montre le haut de l'image (comme sur Twitter/Discord).
    setPos({ x: clamp(d.x - ((e.clientX - d.px) / r.width) * 160), y: clamp(d.y - ((e.clientY - d.py) / r.height) * 160) });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3;
    const m: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    const v = m[e.key];
    if (!v) return;
    e.preventDefault();
    setPos((p) => ({ x: clamp(p.x + v[0]), y: clamp(p.y + v[1]) }));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Cadrage de la bannière (fais glisser l'image ou utilise les flèches)"
        aria-valuetext={`horizontal ${pos.x} %, vertical ${pos.y} %`}
        aria-valuenow={pos.y}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKey}
        className="group relative h-32 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-cover ring-violet/40 focus:outline-none focus-visible:ring-4 active:cursor-grabbing sm:h-36"
        style={{ backgroundColor: accent, backgroundImage: `url("${url}")`, backgroundPosition: `${pos.x}% ${pos.y}%` }}
      >
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white/90 opacity-90 transition group-active:opacity-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></svg>
          Fais glisser pour choisir la partie visible
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${btnPrimary} min-h-10 px-4 text-sm`} disabled={!changed || busy} onClick={() => onSave({ banner_pos_x: pos.x, banner_pos_y: pos.y })}>Enregistrer le cadrage</button>
        <button type="button" className={`${btnGhost} min-h-10 px-4 text-sm`} disabled={pos.x === 50 && pos.y === 50} onClick={() => setPos({ x: 50, y: 50 })}>Centrer</button>
      </div>
    </div>
  );
}
