"use client";

import { useEffect } from "react";

/** Teinte la lumière d'ambiance du site avec la couleur du jeu (extraite de sa jaquette si besoin). */
export function setGlow(c: string) {
  document.documentElement.style.setProperty("--glow", c);
}

export function extractColor(src: string): Promise<string | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 40; c.height = 54;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, 40, 54);
        const d = x.getImageData(0, 0, 40, 54).data;
        let best = [139, 92, 246], score = -1;
        for (let i = 0; i < d.length; i += 4 * 3) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const s = (mx - mn) * (mx > 70 ? 1 : 0.2);
          if (s > score) { score = s; best = [r, g, b]; }
        }
        res(`rgb(${best.join(" ")})`);
      } catch { res(null); }
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}

export default function Glow({ color, image }: { color?: string | null; image?: string | null }) {
  useEffect(() => {
    let alive = true;
    if (color) setGlow(color);
    else if (image) extractColor(image).then((c) => alive && c && setGlow(c));
    return () => { alive = false; setGlow("#8b5cf6"); };
  }, [color, image]);
  return null;
}
