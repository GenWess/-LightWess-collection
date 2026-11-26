import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GAME_FIELDS, igdb, toGameRow, type IgdbGame } from "@/lib/igdb";

/** Jeux très bien notés (IGDB), pour compléter Découvrir quand les amis n'ont pas encore assez joué. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const page = Math.max(0, Math.min(20, Number(req.nextUrl.searchParams.get("page")) || 0));
  try {
    const games = await igdb<IgdbGame[]>(
      "games",
      `${GAME_FIELDS} where total_rating_count > 300 & cover != null & version_parent = null; sort total_rating desc; limit 40; offset ${page * 40};`
    );
    return NextResponse.json({ results: games.map((g) => ({ ...toGameRow(g), rating: g.total_rating ? Math.round(g.total_rating) / 20 : null })) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
