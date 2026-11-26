import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import GroupsHome, { type GroupCard } from "./GroupsHome";

export const metadata: Metadata = { title: "Groupes" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const { data: mine } = await supabase.from("group_members").select("role, group:groups(id,name,description,color,created_at)").eq("user_id", user!.id);
  const groups = ((mine ?? []) as unknown as { role: string; group: Omit<GroupCard, "role" | "members" | "avatars"> }[]).filter((m) => m.group);
  const ids = groups.map((g) => g.group.id);
  const { data: members } = ids.length
    ? await supabase.from("group_members").select("group_id, profile:profiles(id,handle,display_name,avatar_url,accent_color)").in("group_id", ids)
    : { data: [] };
  const byGroup = new Map<string, GroupCard["avatars"]>();
  ((members ?? []) as unknown as { group_id: string; profile: GroupCard["avatars"][number] }[]).forEach((m) => {
    byGroup.set(m.group_id, [...(byGroup.get(m.group_id) ?? []), m.profile]);
  });
  const cards: GroupCard[] = groups.map((g) => ({ ...g.group, role: g.role, members: byGroup.get(g.group.id)?.length ?? 1, avatars: (byGroup.get(g.group.id) ?? []).slice(0, 6) }));
  cards.sort((a, b) => b.members - a.members);
  return <GroupsHome groups={cards} />;
}
