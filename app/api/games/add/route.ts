import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureIgdbGame } from "@/lib/games-server";

const STATUSES = ["a_faire", "en_cours", "termine", "platine", "abandonne"];

/** Ajoute un jeu IGDB à la base (sans doublon) et, si demandé, à la collection de l'utilisateur. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { igdbId?: number; status?: string; source?: string };
  const igdbId = Number(body.igdbId);
  if (!Number.isInteger(igdbId) || igdbId <= 0) return NextResponse.json({ error: "Jeu invalide." }, { status: 400 });

  try {
    const gameId = await ensureIgdbGame(supabase, igdbId);
    if (body.status && STATUSES.includes(body.status)) {
      const { error } = await supabase.from("user_games").upsert(
        { user_id: user.id, game_id: gameId, status: body.status, source: body.source === "swipe" ? "swipe" : "manual" },
        { onConflict: "user_id,game_id", ignoreDuplicates: true }
      );
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ gameId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
