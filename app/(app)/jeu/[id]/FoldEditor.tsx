"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { btnPrimary } from "@/components/ui";

/** Quand on vient voir l'avis d'un ami, le formulaire « ajouter à ma collection » reste replié. */
export default function FoldEditor({ folded, gameName, children }: { folded: boolean; gameName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(!folded);
  return (
    <div>
      {!open && (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-card/80 p-5">
          <p className="text-ink2">Tu as aussi joué à <b className="text-ink">{gameName}</b>, ou tu veux y jouer ?</p>
          <button className={btnPrimary} onClick={() => setOpen(true)}>Ajouter à ma collection</button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
