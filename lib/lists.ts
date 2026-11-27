import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game, MiniProfile } from "./types";

export type GameList = {
  id: string; user_id: string; title: string; description: string | null; ranked: boolean; is_public: boolean;
  created_at: string; updated_at: string;
};
export type ListSummary = GameList & { profile: MiniProfile; count: number; covers: Pick<Game, "id" | "name" | "cover_url" | "banner_url" | "dominant_color">[] };

/** Charge des listes avec leur auteur, leur nombre de jeux et les 5 premières jaquettes. */
export async function loadLists(supabase: SupabaseClient, filter: { userId?: string; userIds?: string[]; publicOnly?: boolean; limit?: number }): Promise<ListSummary[]> {
  let q = supabase.from("lists").select("*, profile:profiles(id,handle,display_name,avatar_url,accent_color), items:list_items(position, game:games(id,name,cover_url,banner_url,dominant_color))").order("updated_at", { ascending: false }).limit(filter.limit ?? 60);
  if (filter.userId) q = q.eq("user_id", filter.userId);
  if (filter.userIds) q = q.in("user_id", filter.userIds.length ? filter.userIds : ["00000000-0000-0000-0000-000000000000"]);
  if (filter.publicOnly) q = q.eq("is_public", true);
  const { data, error } = await q;
  if (error) return [];
  return ((data ?? []) as unknown as (GameList & { profile: MiniProfile; items: { position: number; game: ListSummary["covers"][number] }[] })[]).map(({ items, ...l }) => ({
    ...l,
    count: items.length,
    covers: items.sort((a, b) => a.position - b.position).slice(0, 5).map((i) => i.game).filter(Boolean),
  }));
}
