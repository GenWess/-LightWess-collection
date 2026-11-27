import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/supabase/server";
import { normalize } from "@/lib/ranking";
import Leaderboard from "./Leaderboard";

export const metadata: Metadata = { title: "Classement" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const { data, error } = await supabase.rpc("leaderboard");

  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Tous les joueurs du site</p>
      <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Classement</h1>
      {error ? (
        <div className="rounded-3xl border border-line bg-card/70 p-8 text-center text-mute">
          Le classement n&apos;est pas encore activé : il faut coller le fichier <b className="text-ink">004_mise_a_jour.sql</b> dans Supabase → SQL Editor → Run.
        </div>
      ) : (
        <Leaderboard rows={normalize(data ?? [])} meId={user!.id} />
      )}
    </div>
  );
}
