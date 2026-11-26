import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import FriendsView, { type Req } from "./FriendsView";
import type { MiniProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Amis" };

export default async function Page() {
  const { supabase, user, profile } = await getSessionProfile();
  const sel = "id, status, created_at, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id,handle,display_name,avatar_url,accent_color), addressee:profiles!friendships_addressee_id_fkey(id,handle,display_name,avatar_url,accent_color)";
  const { data } = await supabase.from("friendships").select(sel).or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`).order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as (Req & { requester: MiniProfile; addressee: MiniProfile })[];
  return <FriendsView meId={user!.id} myHandle={profile!.handle!} rows={rows} />;
}
