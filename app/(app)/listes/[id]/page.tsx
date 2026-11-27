import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import type { GameList } from "@/lib/lists";
import type { Game, MiniProfile } from "@/lib/types";
import ListView, { type Item } from "./ListView";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nouvelle?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSessionProfile();
  const { data } = /^[0-9a-f-]{36}$/i.test(id) ? await supabase.from("lists").select("title").eq("id", id).maybeSingle() : { data: null };
  return { title: data?.title ?? "Liste" };
}

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { nouvelle } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getSessionProfile();

  const { data } = await supabase.from("lists").select("*, profile:profiles(id,handle,display_name,avatar_url,accent_color), items:list_items(game_id, position, note, game:games(*))").eq("id", id).maybeSingle();
  if (!data) notFound();
  const list = data as GameList & { profile: MiniProfile; items: { game_id: string; position: number; note: string | null; game: Game }[] };
  const isOwner = list.user_id === user!.id;
  const items: Item[] = list.items.filter((i) => i.game).sort((a, b) => a.position - b.position).map((i) => ({ game: i.game, note: i.note }));

  // Notes données par l'auteur à ces jeux (si sa collection est visible).
  const { data: ratings } = items.length
    ? await supabase.from("user_games").select("game_id, rating, status").eq("user_id", list.user_id).in("game_id", items.map((i) => i.game.id))
    : { data: [] };
  const authorRatings = Object.fromEntries(((ratings ?? []) as { game_id: string; rating: number | null }[]).map((r) => [r.game_id, r.rating]));

  // Pour ajouter des jeux : la collection du propriétaire.
  const { data: mine } = isOwner
    ? await supabase.from("user_games").select("status, game:games(id,name,cover_url,banner_url,dominant_color,release_year,igdb_id)").eq("user_id", user!.id)
    : { data: [] };

  return (
    <ListView
      list={{ id: list.id, title: list.title, description: list.description, ranked: list.ranked, is_public: list.is_public, updated_at: list.updated_at }}
      author={list.profile}
      items={items}
      authorRatings={authorRatings}
      isOwner={isOwner}
      startEditing={isOwner && (nouvelle === "1" || !items.length)}
      collection={((mine ?? []) as unknown as { game: Game }[]).map((m) => m.game).filter(Boolean)}
    />
  );
}
