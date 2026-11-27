import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Game, UserGame } from "@/lib/types";
import { withFixedCovers } from "@/lib/steam-repair";
import CollectionView from "./CollectionView";

export const metadata: Metadata = { title: "Ma collection" };

export default async function Page() {
  const { supabase, user, profile } = await getSessionProfile();
  const { data } = await supabase.from("user_games").select("*, game:games(*)").eq("user_id", user!.id).order("updated_at", { ascending: false });
  const rows = await withFixedCovers(supabase, (data ?? []) as (UserGame & { game: Game })[]);
  return <CollectionView rows={rows} steamId={profile?.steam_id ?? null} />;
}
