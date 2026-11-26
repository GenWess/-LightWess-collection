import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InviteLanding from "@/components/InviteLanding";
import { getSessionProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rejoindre un groupe" };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  const { data } = await supabase.rpc("group_preview", { p_code: code });
  const g = (data as { id: string; name: string; description: string | null; color: string; members: number }[] | null)?.[0];
  if (!g) notFound();
  return <InviteLanding target={{ kind: "group", code, ...g, members: Number(g.members) }} meId={user?.id ?? null} meHasHandle={!!profile?.handle} />;
}
