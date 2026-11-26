import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownedGames, resolveSteamId, steamCover, steamHeader } from "@/lib/steam";

export const maxDuration = 60;

/**
 * Importe la bibliothèque Steam : chaque jeu est ajouté à la base (une seule fiche par appid)
 * puis à la collection, sans doublon et sans écraser ce que l'utilisateur a déjà rempli.
 * Seul le temps de jeu est mis à jour pour les jeux déjà présents.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as { profile?: string };
    const { data: me } = await supabase.from("profiles").select("steam_id").eq("id", user.id).single();
    let steamId = me?.steam_id as string | null;
    if (body.profile) {
      steamId = await resolveSteamId(body.profile);
      if (steamId !== me?.steam_id) {
        const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", user.id);
        if (error?.code === "23505") throw new Error("Ce compte Steam est déjà relié à un autre joueur.");
      }
    }
    if (!steamId) throw new Error("Relie d'abord ton compte Steam ou colle le lien de ton profil.");

    const owned = await ownedGames(steamId);
    if (!owned.length) return NextResponse.json({ found: 0, added: 0, updated: 0 });

    // 1. Fiches jeux (une par appid).
    const ids = new Map<number, string>();
    for (let i = 0; i < owned.length; i += 400) {
      const chunk = owned.slice(i, i + 400);
      const appids = chunk.map((g) => g.appid);
      const { data: known } = await supabase.from("games").select("id, steam_appid").in("steam_appid", appids);
      (known ?? []).forEach((k) => ids.set(k.steam_appid as number, k.id as string));
      const missing = chunk.filter((g) => !ids.has(g.appid)).map((g) => ({
        steam_appid: g.appid, name: g.name, cover_url: steamCover(g.appid), banner_url: steamHeader(g.appid), platforms: ["PC"],
      }));
      if (missing.length) {
        const { data: inserted, error } = await supabase.from("games").upsert(missing, { onConflict: "steam_appid", ignoreDuplicates: true }).select("id, steam_appid");
        if (error) throw new Error(error.message);
        (inserted ?? []).forEach((k) => ids.set(k.steam_appid as number, k.id as string));
        const still = missing.filter((m) => !ids.has(m.steam_appid)).map((m) => m.steam_appid);
        if (still.length) {
          const { data: again } = await supabase.from("games").select("id, steam_appid").in("steam_appid", still);
          (again ?? []).forEach((k) => ids.set(k.steam_appid as number, k.id as string));
        }
      }
    }

    // 2. Collection.
    const { data: mine } = await supabase.from("user_games").select("game_id, playtime_hours").eq("user_id", user.id);
    const have = new Map((mine ?? []).map((m) => [m.game_id as string, m.playtime_hours as number | null]));
    const hours = (m: number) => (m ? Math.round((m / 60) * 10) / 10 : null);

    const toAdd = owned
      .filter((g) => ids.has(g.appid) && !have.has(ids.get(g.appid)!))
      .map((g) => ({ user_id: user.id, game_id: ids.get(g.appid)!, status: "a_faire", playtime_hours: hours(g.playtime_forever), platform: "PC", source: "steam" }));
    for (let i = 0; i < toAdd.length; i += 400) {
      const { error } = await supabase.from("user_games").upsert(toAdd.slice(i, i + 400), { onConflict: "user_id,game_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }

    let updated = 0;
    for (const g of owned) {
      const gid = ids.get(g.appid);
      const h = hours(g.playtime_forever);
      if (gid && have.has(gid) && h != null && (have.get(gid) ?? 0) < h) {
        await supabase.from("user_games").update({ playtime_hours: h }).eq("user_id", user.id).eq("game_id", gid);
        updated++;
      }
    }

    await supabase.from("site_events").insert({ type: "steam_import", user_id: user.id }).then(() => null, () => null);
    return NextResponse.json({ found: owned.length, added: toAdd.length, updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
