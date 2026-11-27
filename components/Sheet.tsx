"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect } from "react";

/**
 * Fenêtre commune du site.
 * - Téléphone : panneau qui monte du bas, avec une poignée ; on le ferme en le tirant vers le bas.
 * - Ordinateur : fenêtre centrée.
 * La page derrière ne défile plus tant qu'elle est ouverte. Échap ferme.
 */
export default function Sheet({ open, onClose, label, children, className = "max-w-2xl", handleArea }: {
  open: boolean; onClose: () => void; label: string; children: React.ReactNode; className?: string;
  /** Contenu du haut (titre…) : on peut aussi tirer le panneau depuis là. */
  handleArea?: React.ReactNode;
}) {
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { removeEventListener("keydown", k); html.style.overflow = prev; };
  }, [open, onClose]);

  const start = (e: React.PointerEvent) => { if (e.pointerType !== "mouse") controls.start(e); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-[6px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            drag="y" dragControls={controls} dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 650) onClose(); }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-night2 shadow-[0_-20px_60px_-20px_rgba(0,0,0,.8)] sm:max-h-[86dvh] sm:rounded-[28px] ${className}`}
          >
            <div onPointerDown={start} className="shrink-0 touch-none sm:touch-auto">
              <div className="flex justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true"><span className="h-1.5 w-11 rounded-full bg-white/25" /></div>
              {handleArea}
            </div>
            <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
