import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Game, MiniProfile, UserGame } from "@/lib/types";
import SwipeDeck, { type Card } from "./SwipeDeck";

export const metadata: Metadata = { title: "Découvrir" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const me = user!.id;

  const [{ data: friends }, { data: mine }, { data: swiped }] = await Promise.all([
    supabase.rpc("my_friends"),
    supabase.from("user_games").select("game_id, game:games(igdb_id)").eq("user_id", me),
    supabase.from("swipes").select("game_id").eq("user_id", me),
  ]);
  const friendIds = ((friends ?? []) as { friend_id: string }[]).map((f) => f.friend_id);
  const excluded = new Set([...(mine ?? []).map((m) => m.game_id as string), ...(swiped ?? []).map((s) => s.game_id as string)]);
  const ownedIgdb = (mine ?? []).map((m) => (m.game as unknown as { igdb_id: number | null } | null)?.igdb_id).filter((x): x is number => x != null);

  let cards: Card[] = [];
  if (friendIds.length) {
    const { data } = await supabase
      .from("user_games")
      .select("*, game:games(*), profile:profiles(id,handle,display_name,avatar_url,accent_color)")
      .in("user_id", friendIds)
      .limit(1000);
    const rows = (data ?? []) as (UserGame & { game: Game; profile: MiniProfile })[];
    const byGame = new Map<string, Card>();
    for (const r of rows) {
      if (excluded.has(r.game_id)) continue;
      const liked = (r.rating != null && Number(r.rating) >= 3.5) || r.status === "en_cours" || r.status === "a_faire" || r.status === "platine";
      if (!liked && r.rating == null) continue;
      const c = byGame.get(r.game_id) ?? { key: r.game_id, gameId: r.game_id, igdbId: r.game.igdb_id, game: r.game, friends: [], source: "amis" as const };
      c.friends.push({ profile: r.profile, rating: r.rating != null ? Number(r.rating) : null, review: r.has_spoilers && !r.spoiler_text ? null : r.review, status: r.status, scores: r.scores ?? {} });
      byGame.set(r.game_id, c);
    }
    const score = (c: Card) => {
      const rs = c.friends.map((f) => f.rating).filter((x): x is number => x != null);
      const a = rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : 3.5;
      return a + c.friends.length * 0.4;
    };
    cards = [...byGame.values()].filter((c) => c.friends.some((f) => f.rating == null || f.rating >= 3.5)).sort((a, b) => score(b) - score(a)).slice(0, 60);
  }

  return <SwipeDeck initial={cards} ownedIgdb={ownedIgdb} hasFriends={friendIds.length > 0} />;
}
