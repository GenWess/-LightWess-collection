"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { copy, friendLink, groupLink } from "@/lib/social";
import { toast } from "@/lib/toast";
import { btnGhost } from "./ui";

/** Bouton « Copier mon lien d'ami » (ou lien de groupe) avec confirmation animée. */
export default function CopyLink({ handle, code, label, className = btnGhost }: { handle?: string; code?: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const url = () => (code ? groupLink(code) : friendLink(handle!));

  async function go() {
    const u = url();
    const ok = await copy(u);
    if (ok) { toast(code ? "Lien d'invitation au groupe copié" : "Lien d'ami copié : envoie-le à tes potes", "success"); }
    else toast(u, "info");
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={go} className={className}>
      <motion.span key={String(done)} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 26 }} className="inline-grid">
        {done ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>
        )}
      </motion.span>
      {done ? "Copié !" : label ?? (code ? "Copier le lien d'invitation" : "Copier mon lien d'ami")}
    </motion.button>
  );
}
