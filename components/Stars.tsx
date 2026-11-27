"use client";


const PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z";

function Star({ fill, size }: { fill: 0 | 0.5 | 1; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATH} fill="currentColor" className="text-white/20" />
      {fill > 0 && (
        <path d={PATH} fill="#FFD45C" style={fill === 0.5 ? { clipPath: "inset(0 50% 0 0)" } : undefined} />
      )}
    </svg>
  );
}

export function Stars({ value, size = 15 }: { value: number | null; size?: number }) {
  if (value == null) return null;
  const v = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex gap-0.5 align-middle" role="img" aria-label={`${v} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} fill={v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0} />)}
    </span>
  );
}

/** Saisie d'une note : un clic = étoile pleine, recliquer = demi-étoile, recliquer = pleine. */
export function StarInput({ value, onChange, label, size = 28 }: { value: number | null; onChange: (v: number | null) => void; label: string; size?: number }) {
  return (
    <span className="inline-flex" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value == null ? 0 : value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0;
        return (
          <button key={i} type="button" aria-label={`${label} : ${i} sur 5`} className="grid h-10 w-9 place-items-center transition active:scale-125"
            onClick={() => {
              const next = value === i ? i - 0.5 : i;
              onChange(next);
            }}>
            <Star fill={fill as 0 | 0.5 | 1} size={size} />
          </button>
        );
      })}
      {value != null && (
        <button type="button" onClick={() => onChange(null)} className="ml-1 self-center rounded-lg px-2 py-1 text-xs text-faint hover:text-ink" aria-label={`Effacer la note ${label}`}>✕</button>
      )}
    </span>
  );
}
