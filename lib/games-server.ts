import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GAME_FIELDS, igdb, timeToBeat, toGameRow, type IgdbGame } from "./igdb";

/**
 * Enregistre (ou retrouve) un jeu IGDB dans la table games, sans doublon :
 * - même igdb_id → on réutilise la fiche ;
 * - même jeu déjà importé depuis Steam (steam_appid) → on complète cette fiche avec les infos IGDB.
 */
export async function ensureIgdbGame(supabase: SupabaseClient, igdbId: number): Promise<string> {
  const { data: existing } = await supabase.from("games").select("id").eq("igdb_id", igdbId).maybeSingle();
  if (existing) return existing.id as string;

  const [g] = await igdb<IgdbGame[]>("games", `${GAME_FIELDS} where id = ${igdbId};`);
  if (!g) throw new Error("Jeu introuvable sur IGDB.");
  const row = { ...toGameRow(g), avg_hours: await timeToBeat(g.id) };

  if (row.steam_appid) {
    const { data: steamRow } = await supabase.from("games").select("id").eq("steam_appid", row.steam_appid).maybeSingle();
    if (steamRow) {
      const { error } = await supabase.from("games").update(row).eq("id", steamRow.id);
      if (error) throw new Error(error.message);
      return steamRow.id as string;
    }
  }

  const { data, error } = await supabase.from("games").insert(row).select("id").single();
  if (error) {
    // Ajouté au même moment par quelqu'un d'autre : on relit.
    const { data: again } = await supabase.from("games").select("id").eq("igdb_id", igdbId).maybeSingle();
    if (again) return again.id as string;
    throw new Error(error.message);
  }
  return data.id as string;
}
