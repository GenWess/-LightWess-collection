import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Game, UserGame } from "@/lib/types";
import CollectionView from "./CollectionView";

export const metadata: Metadata = { title: "Ma collection" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const { data } = await supabase.from("user_games").select("*, game:games(*)").eq("user_id", user!.id).order("updated_at", { ascending: false });
  const rows = (data ?? []) as (UserGame & { game: Game })[];
  return <CollectionView rows={rows} />;
}
