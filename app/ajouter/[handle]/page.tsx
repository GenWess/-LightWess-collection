import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InviteLanding from "@/components/InviteLanding";
import { getSessionProfile } from "@/lib/supabase/server";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `Ajouter @${decodeURIComponent(handle)}` };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  const { data } = await supabase.rpc("profile_preview", { p_handle: decodeURIComponent(handle) });
  const p = (data as { id: string; handle: string; display_name: string | null; avatar_url: string | null; accent_color: string }[] | null)?.[0];
  if (!p) notFound();
  return <InviteLanding target={{ kind: "friend", ...p }} meId={user?.id ?? null} meHasHandle={!!profile?.handle} />;
}
