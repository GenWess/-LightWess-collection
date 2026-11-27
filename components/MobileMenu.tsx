"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavLinks, { type NavLink } from "./NavLinks";

/** Menu complet sur téléphone (toutes les pages qui ne tiennent pas dans la barre du bas). */
export default function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  const badge = links.some((l) => l.badge);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Menu" aria-expanded={open} className="relative grid h-9 w-9 place-items-center rounded-full border border-white/15 text-ink2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {badge && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-violet" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
            <motion.nav initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }} aria-label="Menu"
              className="absolute inset-y-0 right-0 flex w-[min(300px,85vw)] flex-col gap-1 overflow-y-auto border-l border-line bg-night2 p-4 pt-[calc(16px+env(safe-area-inset-top))]">
              <div className="mb-2 flex justify-end"><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-mute" aria-label="Fermer">✕</button></div>
              <NavLinks links={links} variant="side" />
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
