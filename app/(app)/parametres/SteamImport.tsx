"use client";

import ImportCenter from "@/components/ImportCenter";
import { btnGhost, btnPrimary, panel } from "@/components/ui";

const NOTICE: Record<string, { text: string; ok: boolean }> = {
  ok: { text: "Compte Steam relié ✓ Tu peux maintenant choisir les jeux à importer.", ok: true },
  erreur: { text: "La connexion Steam n'a pas abouti. Réessaie, ou colle le lien de ton profil Steam dans la fenêtre d'import.", ok: false },
  "deja-lie": { text: "Ce compte Steam est déjà relié à un autre joueur.", ok: false },
};

export default function SteamImport({ steamId, notice }: { steamId: string | null; notice?: string }) {
  const n = notice ? NOTICE[notice] : undefined;
  return (
    <section id="steam" className={`${panel} flex flex-col gap-3`}>
      <h2 className="text-xl font-bold">Importer mes jeux</h2>
      <p className="text-sm text-mute">Steam : connexion automatique, puis tu coches les jeux à garder. PlayStation, Xbox, Epic, Nintendo : colle ta liste, on retrouve les jaquettes, tu choisis.</p>
      {n && <p className={`rounded-2xl px-3 py-2 text-sm ${n.ok ? "bg-ok/10 text-ok" : "bg-no/10 text-no"}`}>{n.text}</p>}
      {steamId ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-2xl bg-ok/10 px-3 py-2 text-sm text-ok">Compte Steam relié ({steamId})</p>
          <a href="/api/steam/login" className="text-sm text-mute underline-offset-2 hover:underline">Changer de compte</a>
        </div>
      ) : (
        <a href="/api/steam/login" className={`${btnGhost} self-start`}>Se connecter avec Steam</a>
      )}
      <ImportCenter steamId={steamId} className={`${btnPrimary} self-start`} label="Choisir les jeux à importer" />
    </section>
  );
}
