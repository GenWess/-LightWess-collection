import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Paramètres" };

export default async function Page() {
  const { profile } = await getSessionProfile();
  if (!profile) return null;
  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Tout est gratuit, tout est à toi</p>
      <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Paramètres</h1>
      <SettingsForm profile={profile} />
    </div>
  );
}
