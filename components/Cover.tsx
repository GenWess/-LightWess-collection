"use client";

import { useEffect, useRef, useState } from "react";
import { colorFromText } from "@/lib/types";

type G = { name: string; cover_url: string | null; banner_url?: string | null; dominant_color?: string | null };

/**
 * Jaquette officielle (IGDB ou Steam). Si l'image manque ou ne charge pas,
 * on retombe sur la bannière, puis sur une jaquette typographique propre.
 */
export default function Cover({ game, className = "", sizes, priority, fill, children }: { game: G; className?: string; sizes?: string; priority?: boolean; fill?: boolean; children?: React.ReactNode }) {
  const sources = [game.cover_url, game.banner_url].filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[i];
  const ref = useRef<HTMLImageElement>(null);

  // L'image a pu finir de charger AVANT que la page soit prête (elle était déjà en cache) :
  // dans ce cas l'événement « chargé » est perdu et la jaquette restait invisible jusqu'au rechargement.
  // On vérifie donc tout de suite si elle est déjà là.
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setI((n) => n + 1);
  }, [src]);
  const c = game.dominant_color || colorFromText(game.name);
  const long = Math.max(...game.name.split(/\s+/).map((w) => w.length));

  return (
    <div className={`${fill ? "absolute inset-0" : "relative aspect-[3/4] rounded-2xl"} isolate overflow-hidden ${className}`} style={{ background: `radial-gradient(130% 85% at 18% 8%, color-mix(in srgb, ${c} 55%, white), ${c} 42%, #120e18 100%)` }}>
      <div aria-hidden="true" className="absolute -left-[6%] -right-[20%] top-[14%] rotate-[-11deg] break-words font-poster uppercase leading-[0.86] text-white/90"
        style={{ fontSize: `calc(var(--cover-fs, 46px) * ${Math.max(0.4, Math.min(1, 7.5 / long))})` }}>
        {game.name}
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={ref}
          src={src}
          alt=""
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(false); setI((n) => n + 1); }}
          className={`pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {children}
    </div>
  );
}
