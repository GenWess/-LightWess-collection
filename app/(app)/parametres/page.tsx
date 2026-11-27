import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";
import SteamImport from "./SteamImport";
import InstallApp from "@/components/InstallApp";

export const metadata: Metadata = { title: "Paramètres" };

export default async function Page({ searchParams }: { searchParams: Promise<{ steam?: string }> }) {
  const { profile } = await getSessionProfile();
  const { steam } = await searchParams;
  if (!profile) return null;
  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Tout est gratuit, tout est à toi</p>
      <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Paramètres</h1>
      <SettingsForm profile={profile} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SteamImport steamId={profile.steam_id} notice={steam} />
        <InstallApp />
      </div>
    </div>
  );
}
