import "server-only";

/** Accès à IGDB (base de jeux de Twitch). Les clés restent côté serveur. */

type Token = { value: string; expires: number };
let cached: Token | null = null;

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.value;
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Clés Twitch manquantes (TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET).");
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST", cache: "no-store" });
  if (!r.ok) throw new Error("Twitch a refusé les clés IGDB.");
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return cached.value;
}

export async function igdb<T = unknown>(endpoint: string, body: string): Promise<T> {
  const t = await token();
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${t}`, Accept: "application/json" },
    body,
    cache: "no-store",
  });
  if (r.status === 401) { cached = null; throw new Error("Jeton IGDB expiré, réessaie."); }
  if (!r.ok) throw new Error(`IGDB ne répond pas (${r.status}).`);
  return (await r.json()) as T;
}

export const img = (id: string | undefined, size: "t_cover_big_2x" | "t_cover_big" | "t_1080p" | "t_screenshot_big" = "t_cover_big_2x") =>
  id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;

export type IgdbGame = {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  genres?: { name: string }[];
  platforms?: { abbreviation?: string; name: string }[];
  external_games?: { uid?: string; category?: number; external_game_source?: number }[];
  total_rating?: number;
  total_rating_count?: number;
};

export const GAME_FIELDS =
  "fields name,slug,summary,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.abbreviation,platforms.name,external_games.uid,external_games.category,external_games.external_game_source,total_rating,total_rating_count;";

/** Identifiant Steam d'un jeu IGDB, s'il existe (source 1 = Steam). */
export function steamAppId(g: IgdbGame): number | null {
  const e = g.external_games?.find((x) => x.category === 1 || x.external_game_source === 1);
  const n = e?.uid ? parseInt(e.uid, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Format commun renvoyé au navigateur et enregistré en base. */
export function toGameRow(g: IgdbGame) {
  const art = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
  return {
    igdb_id: g.id,
    steam_appid: steamAppId(g),
    slug: g.slug ?? null,
    name: g.name,
    cover_url: img(g.cover?.image_id),
    banner_url: img(art, "t_1080p"),
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    genres: (g.genres ?? []).map((x) => x.name).slice(0, 4),
    platforms: (g.platforms ?? []).map((x) => x.abbreviation || x.name).slice(0, 8),
    summary: g.summary ?? null,
  };
}

export const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** Durée moyenne pour finir l'histoire (en heures), si IGDB la connaît. */
export async function timeToBeat(igdbId: number): Promise<number | null> {
  try {
    const r = await igdb<{ normally?: number; hastily?: number }[]>("game_time_to_beats", `fields normally,hastily; where game_id = ${igdbId};`);
    const s = r[0]?.normally ?? r[0]?.hastily;
    return s ? Math.round((s / 3600) * 10) / 10 : null;
  } catch {
    return null;
  }
}
