"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { btnGhost, btnPrimary, input, panel } from "@/components/ui";
import { setSoundOn, sfx, soundOn } from "@/lib/sound";

const NOTICE: Record<string, string> = {
  ok: "Compte Steam relié ✓ Tu peux importer ta bibliothèque.",
  erreur: "La connexion Steam n'a pas abouti. Réessaie.",
  "deja-lie": "Ce compte Steam est déjà relié à un autre joueur.",
};

export default function SteamAndSound({ steamId, notice }: { steamId: string | null; notice?: string }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(notice ? NOTICE[notice] ?? "" : "");
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundOn()), []);

  async function importSteam() {
    setBusy(true); setMsg("Import en cours… (ça peut prendre une minute pour les grosses bibliothèques)");
    const r = await fetch("/api/steam/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link.trim() ? { profile: link.trim() } : {}) });
    const j = await r.json().catch(() => ({ error: "Réponse illisible" }));
    setBusy(false);
    if (!r.ok) { sfx.err(); return setMsg(j.error); }
    sfx.match();
    setMsg(`${j.found} jeux trouvés sur Steam : ${j.added} ajoutés à ta collection${j.updated ? `, ${j.updated} temps de jeu mis à jour` : ""}.`);
    router.refresh();
  }

  return (
    <>
      <section id="steam" className={`${panel} flex flex-col gap-3`}>
        <h2 className="text-xl font-bold">Importer mes jeux Steam</h2>
        <p className="text-sm text-mute">Tous tes jeux Steam arrivent dans ta collection en « À faire », avec ton temps de jeu. Rien n&apos;est noté à ta place, et aucun doublon n&apos;est créé si tu relances l&apos;import.</p>
        {steamId ? (
          <p className="rounded-2xl bg-ok/10 px-3 py-2 text-sm text-ok">Compte Steam relié ({steamId})</p>
        ) : (
          <Link href="/api/steam/login" prefetch={false} className={`${btnGhost} self-start`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-10 9.2l5.4 2.2a2.8 2.8 0 0 1 1.6-.5h.2l2.4-3.5v-.1a3.8 3.8 0 1 1 3.8 3.8h-.1l-3.4 2.4v.1a2.8 2.8 0 0 1-5.6.4L2.4 14.5A10 10 0 1 0 12 2Zm-4.7 15.2-1.2-.5a2.1 2.1 0 1 0 1.2-2.9l1.3.5a1.6 1.6 0 1 1-1.3 2.9Zm9.8-7.9a2.5 2.5 0 1 0-2.5 2.5 2.5 2.5 0 0 0 2.5-2.5Zm-4.4 0a1.9 1.9 0 1 1 1.9 1.9 1.9 1.9 0 0 1-1.9-1.9Z" /></svg>
            Se connecter avec Steam
          </Link>
        )}
        {!steamId && <p className="text-sm text-mute">Ou colle le lien de ton profil Steam :</p>}
        {!steamId && <input className={input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://steamcommunity.com/id/tonpseudo" aria-label="Lien du profil Steam" />}
        <button className={`${btnPrimary} self-start`} onClick={importSteam} disabled={busy || (!steamId && !link.trim())} data-nosound>{busy ? "Import…" : "Importer ma bibliothèque"}</button>
        <p className="text-xs text-faint">Ton profil Steam et « Détails des jeux » doivent être en Public (Steam → Modifier le profil → Paramètres de confidentialité).</p>
        {msg && <p className="text-sm text-ink2" aria-live="polite">{msg}</p>}
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
