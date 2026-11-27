"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Fine barre lumineuse en haut de l'écran dès qu'on touche un lien :
 * on voit tout de suite que ça charge, même si la page met un instant à arriver.
 */
function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/games/open")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      // Petit délai : si la page est déjà prête (préchargée), la barre n'apparaît même pas.
      timer.current = setTimeout(() => setOn(true), 90);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setOn(false);
  }, [path, search]);

  return (
    <AnimatePresence>
      {on && (
        <motion.div key="bar" className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-[3px] origin-left"
          style={{ background: "linear-gradient(90deg, #c7a4ff, #8b5cf6)", boxShadow: "0 0 12px #8b5cf6" }}
          initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: [0, 0.6, 0.85, 0.95], transition: { duration: 6, times: [0, 0.1, 0.4, 1], ease: "easeOut" } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.25 } }} />
      )}
    </AnimatePresence>
  );
}

export default function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
