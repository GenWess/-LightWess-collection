import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { esc, igdb, img, type IgdbGame } from "@/lib/igdb";

export const maxDuration = 60;

/** Import assisté : retrouve sur IGDB chaque titre d'une liste collée (PlayStation, Xbox, Epic, Nintendo…). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { titles?: string[] };
  const titles = [...new Set((body.titles ?? []).map((t) => String(t).replace(/[™®©]/g, "").trim()).filter((t) => t.length >= 2))].slice(0, 80);
  if (!titles.length) return NextResponse.json({ results: [] });

  const results: { title: string; match: { igdb_id: number; name: string; cover_url: string | null; release_year: number | null; platforms: string[] } | null }[] = [];
  // 4 recherches en parallèle maximum (limite de l'API IGDB).
  for (let i = 0; i < titles.length; i += 4) {
    const batch = titles.slice(i, i + 4);
    const found = await Promise.all(batch.map(async (title) => {
      try {
        const r = await igdb<IgdbGame[]>("games", `search "${esc(title)}"; fields name,cover.image_id,first_release_date,platforms.abbreviation,platforms.name,total_rating_count; where version_parent = null; limit 5;`);
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const g = r.find((x) => norm(x.name) === norm(title)) ?? r.sort((a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0))[0];
        return { title, match: g ? { igdb_id: g.id, name: g.name, cover_url: img(g.cover?.image_id, "t_cover_big"), release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null, platforms: (g.platforms ?? []).map((p) => p.abbreviation || p.name).slice(0, 5) } : null };
      } catch {
        return { title, match: null };
      }
    }));
    results.push(...found);
    if (i + 4 < titles.length) await new Promise((r) => setTimeout(r, 260));
  }
  return NextResponse.json({ results });
}
