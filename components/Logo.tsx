/** Emblème Lightwess : carré violet en dégradé avec l'éclair blanc.
    (Le carré est en CSS pour éviter les conflits d'identifiants SVG quand l'emblème apparaît plusieurs fois.) */
export function Emblem({ className = "", title }: { className?: string; title?: string }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[22%] bg-[linear-gradient(135deg,#C7A4FF,#6B2FE0)] ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0)_50%)]" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <path d="M58 12 26 56h20l-9 32 37-46H54l11-30z" fill="#fff" />
      </svg>
    </span>
  );
}

/** Logo complet : emblème + LIGHTWESS + sous-titre. */
export function Logo({ sub = "COLLECTION", size = "md" }: { sub?: string; size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <span className="inline-flex items-center gap-2.5">
      <Emblem className={sm ? "h-8 w-8" : "h-10 w-10"} />
      <span className="leading-none">
        <span className={`block font-display font-bold tracking-[0.14em] text-white ${sm ? "text-[15px]" : "text-lg"}`}>LIGHTWESS</span>
        <span className={`mt-1 block font-display font-semibold tracking-[0.42em] text-[#A99BD6] ${sm ? "text-[9px]" : "text-[10px]"}`}>{sub}</span>
      </span>
    </span>
  );
}
