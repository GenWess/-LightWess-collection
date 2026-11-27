import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Game, MiniProfile, UserGame } from "@/lib/types";
import GroupView, { type GroupData } from "./GroupView";
import type { Msg } from "./GroupChat";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Groupe" };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getSessionProfile();

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  if (!group) notFound();

  const { data: mem } = await supabase.from("group_members").select("role, joined_at, profile:profiles(id,handle,display_name,avatar_url,accent_color)").eq("group_id", id);
  const members = ((mem ?? []) as unknown as { role: "owner" | "admin" | "member"; joined_at: string; profile: MiniProfile }[]).filter((m) => m.profile);
  const ids = members.map((m) => m.profile.id);

  const { data: rows } = ids.length
    ? await supabase.from("user_games").select("user_id, status, rating, scores, playtime_hours, finished_on, updated_at, game:games(id,name,cover_url,banner_url,dominant_color,genres,release_year)").in("user_id", ids).limit(5000)
    : { data: [] };

  // Discussion (80 derniers messages) et amis que je peux ajouter.
  const [{ data: msgs }, { data: fr }] = await Promise.all([
    supabase.from("group_messages").select("*").eq("group_id", id).order("created_at", { ascending: false }).limit(80),
    supabase.rpc("my_friends"),
  ]);
  const friendIds = ((fr ?? []) as { friend_id: string }[]).map((f) => f.friend_id).filter((x) => !ids.includes(x));
  const { data: friendProfiles } = friendIds.length
    ? await supabase.from("profiles").select("id,handle,display_name,avatar_url,accent_color").in("id", friendIds)
    : { data: [] };

  const data: GroupData = {
    messages: ((msgs ?? []) as Msg[]).reverse(),
    addable: (friendProfiles ?? []) as MiniProfile[],
    group: group as GroupData["group"],
    meId: user!.id,
    members,
    rows: (rows ?? []) as unknown as (Pick<UserGame, "user_id" | "status" | "rating" | "scores" | "playtime_hours" | "finished_on" | "updated_at"> & { game: Pick<Game, "id" | "name" | "cover_url" | "banner_url" | "dominant_color" | "genres" | "release_year"> })[],
  };
  return <GroupView data={data} />;
}
