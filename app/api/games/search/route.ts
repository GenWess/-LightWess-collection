import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GAME_FIELDS, esc, igdb, toGameRow, type IgdbGame } from "@/lib/igdb";

/** Recherche en temps réel dans tout le catalogue IGDB. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const games = await igdb<IgdbGame[]>("games", `search "${esc(q)}"; ${GAME_FIELDS} where version_parent = null; limit 50;`);
    // Les jeux connus (beaucoup d'avis) et avec jaquette d'abord.
    games.sort((a, b) => Number(!!b.cover) - Number(!!a.cover) || (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0));
    return NextResponse.json({ results: games.map(toGameRow) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
