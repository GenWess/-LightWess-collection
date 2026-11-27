"use client";

import AddGame from "@/components/AddGame";
import ImportCenter from "@/components/ImportCenter";
import GameBrowser from "@/components/GameBrowser";
import type { Game, UserGame } from "@/lib/types";

type Row = UserGame & { game: Game };

export default function CollectionView({ rows, steamId }: { rows: Row[]; steamId: string | null }) {
  const done = rows.filter((r) => r.status === "termine" || r.status === "platine").length;

  return (
    <div className="fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mute">{rows.length} jeux · {done} terminés</p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Ma collection</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportCenter steamId={steamId} />
          <AddGame ownedIgdbIds={rows.map((r) => r.game.igdb_id).filter((x): x is number => x != null)} />
        </div>
      </div>

      {rows.length ? (
        <GameBrowser rows={rows} removable searchLabel="Chercher dans ma collection" />
      ) : (
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
          <p className="text-xl font-bold">Ta collection est vide</p>
          <p className="mx-auto mt-2 max-w-md text-mute">Ajoute un jeu en le cherchant, ou importe toute ta bibliothèque Steam d&apos;un coup.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2"><ImportCenter steamId={steamId} /><AddGame /></div>
        </div>
      )}
    </div>
  );
}
