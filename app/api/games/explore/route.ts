import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { explore } from "@/lib/catalog";

/** Explorer : recherche dans tout le catalogue avec filtres. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const num = (k: string) => { const n = Number(p.get(k)); return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined; };
  try {
    const results = await explore({ q: p.get("q") ?? "", genre: num("genre"), platform: num("platform"), from: num("from"), to: num("to"), sort: p.get("sort") ?? "popular", page: num("page") ?? 0 });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
