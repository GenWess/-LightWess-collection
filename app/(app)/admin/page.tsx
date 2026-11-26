import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile, type Profile } from "@/lib/supabase/server";
import AdminView, { type Stats } from "./AdminView";

export const metadata: Metadata = { title: "Modération" };

export default async function Page() {
  const { supabase, profile } = await getSessionProfile();
  if (profile?.role !== "admin") redirect("/decouvrir");

  const [{ data: stats, error }, { data: members }, { data: reviews }] = await Promise.all([
    supabase.rpc("admin_stats", { days: 30 }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("user_games").select("id, review, rating, updated_at, profile:profiles(handle), game:games(id,name)").not("review", "is", null).order("updated_at", { ascending: false }).limit(30),
  ]);

  if (error) return <p className="rounded-3xl border border-line bg-card p-6">Impossible de charger les statistiques : {error.message}</p>;
  return <AdminView stats={stats as Stats} members={(members ?? []) as Profile[]} reviews={(reviews ?? []) as unknown as { id: string; review: string; rating: number | null; updated_at: string; profile: { handle: string }; game: { id: string; name: string } }[]} meId={profile.id} />;
}
