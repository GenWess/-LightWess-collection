"use client";

import { useEffect, useState } from "react";
import ImportCenter from "@/components/ImportCenter";
import { btnGhost, btnPrimary, panel } from "@/components/ui";
import { setSoundOn, sfx, soundOn } from "@/lib/sound";

const NOTICE: Record<string, string> = {
  ok: "Compte Steam relié ✓ Tu peux maintenant choisir les jeux à importer.",
  erreur: "La connexion Steam n'a pas abouti. Réessaie.",
  "deja-lie": "Ce compte Steam est déjà relié à un autre joueur.",
};

export default function SteamAndSound({ steamId, notice }: { steamId: string | null; notice?: string }) {
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundOn()), []);

  return (
    <>
      <section id="steam" className={`${panel} flex flex-col gap-3`}>
        <h2 className="text-xl font-bold">Importer mes jeux</h2>
        <p className="text-sm text-mute">Steam : connexion automatique, puis tu coches les jeux à garder. PlayStation, Xbox, Epic, Nintendo : colle ta liste, on retrouve les jaquettes, tu choisis.</p>
        {notice && NOTICE[notice] && <p className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-ink2">{NOTICE[notice]}</p>}
        {steamId ? (
          <p className="rounded-2xl bg-ok/10 px-3 py-2 text-sm text-ok">Compte Steam relié ({steamId})</p>
        ) : (
          <a href="/api/steam/login" className={`${btnGhost} self-start`}>Se connecter avec Steam</a>
        )}
        <ImportCenter steamId={steamId} className={`${btnPrimary} self-start`} label="Choisir les jeux à importer" />
      </section>

      <section className={`${panel} flex flex-col gap-3`}>
        <h2 className="text-xl font-bold">Sons</h2>
        <label className="flex items-center justify-between gap-3">
          <span><b>Petits sons</b><span className="block text-sm text-mute">Clics, swipe, étoiles, matchs</span></span>
          <input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundOn(e.target.checked); if (e.target.checked) sfx.ok(); }} className="h-6 w-6 accent-violet-500" />
        </label>
      </section>
    </>
  );
}
