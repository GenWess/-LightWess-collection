"use client";

import { useEffect } from "react";
import { sfx } from "@/lib/sound";

/** Petit « tac » sur chaque bouton ou lien (sauf ceux qui ont leur propre son). */
export default function SoundClicks() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest("button, a, [role=radio], [role=tab]");
      if (el && !el.closest("[data-nosound]")) sfx.tick();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);
  return null;
}
