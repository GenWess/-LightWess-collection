import type { Metadata } from "next";
import { GENRES, PLATFORMS_IGDB } from "@/lib/catalog";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Status } from "@/lib/types";
import Explorer from "./Explorer";

export const metadata: Metadata = { title: "Explorer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; genre?: string }> }) {
  const { supabase, user } = await getSessionProfile();
  const sp = await searchParams;
  const { data } = await supabase.from("user_games").select("status, game:games(igdb_id)").eq("user_id", user!.id);
  const owned = ((data ?? []) as unknown as { status: Status; game: { igdb_id: number | null } | null }[])
    .filter((r) => r.game?.igdb_id).map((r) => [r.game!.igdb_id!, r.status] as [number, Status]);
  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Tout le catalogue, toutes les plateformes</p>
      <h1 className="mb-5 text-[clamp(28px,4vw,40px)] font-bold">Explorer</h1>
      <Explorer owned={owned} genres={GENRES.map(({ id, fr }) => ({ id, fr }))} platforms={PLATFORMS_IGDB} initialQ={sp.q ?? ""} initialGenre={Number(sp.genre) || 0} />
    </div>
  );
}
