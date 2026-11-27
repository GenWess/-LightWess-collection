import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isOldSteamUrl, steamArt } from "./steam";

/**
 * Répare les jaquettes des jeux importés de Steam qui utilisent encore les anciennes adresses
 * (souvent cassées pour les jeux récents). Chaque jeu n'est réparé qu'une fois :
 * ensuite son adresse est la bonne et il n'est plus touché.
 */
export async function repairSteamCovers(supabase: SupabaseClient, games: { id: string; steam_appid: number | null; cover_url: string | null; banner_url?: string | null }[], max = 200) {
  const todo = games.filter((g) => g.steam_appid && (isOldSteamUrl(g.cover_url) || (!g.cover_url && isOldSteamUrl(g.banner_url)))).slice(0, max);
  if (!todo.length) return new Map<string, { cover_url: string | null; banner_url: string | null }>();
  const art = await steamArt(todo.map((g) => g.steam_appid!));
  const fixed = new Map<string, { cover_url: string | null; banner_url: string | null }>();
  await Promise.all(todo.map(async (g) => {
    const a = art.get(g.steam_appid!);
    if (!a || (!a.cover && !a.banner)) return;
    const patch = { cover_url: a.cover, banner_url: a.banner ?? g.banner_url ?? null };
    const { error } = await supabase.from("games").update(patch).eq("id", g.id);
    if (!error) fixed.set(g.id, patch);
  }));
  return fixed;
}

/** Applique les réparations à une liste de lignes déjà chargées (pour l'affichage immédiat). */
export async function withFixedCovers<T extends { game: { id: string; steam_appid: number | null; cover_url: string | null; banner_url: string | null } | null }>(supabase: SupabaseClient, rows: T[]): Promise<T[]> {
  const fixed = await repairSteamCovers(supabase, rows.map((r) => r.game).filter((g): g is NonNullable<T["game"]> => !!g));
  if (!fixed.size) return rows;
  return rows.map((r) => (r.game && fixed.has(r.game.id) ? { ...r, game: { ...r.game, ...fixed.get(r.game.id) } } : r));
}
