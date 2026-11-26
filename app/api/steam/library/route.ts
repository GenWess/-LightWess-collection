import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownedGames, resolveSteamId, steamCover } from "@/lib/steam";

/** Liste la bibliothèque Steam pour l'écran de sélection (rien n'est ajouté ici). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  try {
    const input = req.nextUrl.searchParams.get("profile");
    const { data: me } = await supabase.from("profiles").select("steam_id").eq("id", user.id).single();
    let steamId = me?.steam_id as string | null;
    if (input) steamId = await resolveSteamId(input);
    if (!steamId) throw new Error("Relie ton compte Steam ou colle le lien de ton profil.");
    if (input && steamId !== me?.steam_id) {
      const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", user.id);
      if (error?.code === "23505") throw new Error("Ce compte Steam est déjà relié à un autre joueur.");
    }

    const owned = await ownedGames(steamId);
    // Jeux Steam déjà présents dans ma collection (pour les signaler et éviter les doublons).
    const { data: mine } = await supabase.from("user_games").select("game:games(steam_appid)").eq("user_id", user.id);
    const have = new Set(((mine ?? []) as unknown as { game: { steam_appid: number | null } | null }[]).map((m) => m.game?.steam_appid).filter(Boolean));

    const games = owned
      .map((g) => ({
        appid: g.appid,
        name: g.name,
        hours: g.playtime_forever ? Math.round((g.playtime_forever / 60) * 10) / 10 : 0,
        cover: steamCover(g.appid),
        capsule: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`,
        owned: have.has(g.appid),
      }))
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
    return NextResponse.json({ steamId, games });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
