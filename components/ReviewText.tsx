"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type R = { review: string | null; spoiler_text?: string | null; has_spoilers: boolean };

/**
 * Texte d'un avis : la partie sans spoilers est lisible directement,
 * seule la partie « spoilers » est floutée jusqu'au clic.
 * (Les anciens avis entièrement marqués « spoilers » restent floutés en entier.)
 */
export default function ReviewText({ r, className = "" }: { r: R; className?: string }) {
  const legacy = r.has_spoilers && !r.spoiler_text;
  const open = legacy ? null : r.review;
  const hidden = legacy ? r.review : r.spoiler_text;
  if (!open && !hidden) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {open && <p className="whitespace-pre-line leading-relaxed text-ink2">{open}</p>}
      {hidden && <Spoiler text={hidden} />}
    </div>
  );
}

function Spoiler({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-no/25 bg-no/[.06]">
      <p className="flex items-center gap-1.5 px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-no/90">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17.5v.01" /></svg>
        Spoilers
        {shown && <button onClick={() => setShown(false)} className="ml-auto font-semibold normal-case tracking-normal text-mute hover:text-ink">Masquer</button>}
      </p>
      <div className="relative">
        <p aria-hidden={!shown} className={`whitespace-pre-line px-3 pb-3 pt-1 leading-relaxed text-ink2 transition duration-300 ${shown ? "" : "select-none blur-[7px]"}`}>{text}</p>
        <AnimatePresence>
          {!shown && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShown(true)}
              className="absolute inset-0 grid place-items-center text-sm font-semibold text-ink">
              <span className="rounded-full border border-white/15 bg-night/80 px-4 py-2 backdrop-blur">Afficher les spoilers</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
