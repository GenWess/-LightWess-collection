"use client";

import { useEffect, useState } from "react";
import { Emblem } from "./Logo";

/** Écran noir de lancement : emblème + LIGHTWESS + COLLECTION, une fois par session. */
export default function Splash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem("lw-splash", "1"); } catch {}
    const t = setTimeout(() => setGone(true), 3400);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  return (
    <div className="splash" onClick={() => setGone(true)} role="presentation">
      <div className="splash-mark">
        <Emblem className="splash-emblem" />
        <div>
          <div className="splash-word">LIGHTWESS</div>
          <div className="splash-sub">COLLECTION</div>
          <div className="splash-line" />
        </div>
      </div>
    </div>
  );
}
