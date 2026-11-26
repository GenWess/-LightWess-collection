import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureIgdbGame } from "@/lib/games-server";

export const maxDuration = 60;
const STATUSES = ["a_faire", "en_cours", "termine", "platine", "abandonne"];

/** Ajoute plusieurs jeux IGDB à la collection en une fois (sans doublon). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { igdbIds?: number[]; status?: string; platform?: string };
  const ids = [...new Set((body.igdbIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 80);
  const status = STATUSES.includes(body.status ?? "") ? body.status! : "a_faire";
  const platform = typeof body.platform === "string" ? body.platform.slice(0, 40) : null;

  let added = 0;
  const failed: number[] = [];
  for (let i = 0; i < ids.length; i += 3) {
    await Promise.all(ids.slice(i, i + 3).map(async (id) => {
      try {
        const gameId = await ensureIgdbGame(supabase, id);
        const { data, error } = await supabase.from("user_games")
          .upsert({ user_id: user.id, game_id: gameId, status, platform, source: "manual" }, { onConflict: "user_id,game_id", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        if (data?.length) added++;
      } catch { failed.push(id); }
    }));
  }
  return NextResponse.json({ added, already: ids.length - added - failed.length, failed: failed.length });
}
