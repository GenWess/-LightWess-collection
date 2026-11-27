import "server-only";
import { unstable_cache } from "next/cache";
import { esc, igdb, img, type IgdbGame } from "./igdb";

/**
 * Catalogue IGDB pour l'Accueil et l'Explorer.
 * Les rubriques (sorties, à venir…) sont recalculées toutes seules toutes les heures :
 * rien à mettre à jour à la main.
 */

export type CatalogGame = {
  igdb_id: number; name: string; cover_url: string | null; banner_url: string | null;
  release_year: number | null; release_date: number | null; genres: string[]; platforms: string[];
  rating: number | null; hypes: number;
};

const FIELDS = "fields name,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.abbreviation,platforms.name,total_rating,total_rating_count,hypes;";
const BASE = "cover != null & version_parent = null";

function toCatalog(g: IgdbGame & { hypes?: number }): CatalogGame {
  const art = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
  return {
    igdb_id: g.id, name: g.name,
    cover_url: img(g.cover?.image_id), banner_url: img(art, "t_1080p"),
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    release_date: g.first_release_date ?? null,
    genres: (g.genres ?? []).map((x) => x.name).slice(0, 4),
    platforms: (g.platforms ?? []).map((x) => x.abbreviation || x.name).slice(0, 8),
    rating: g.total_rating && (g.total_rating_count ?? 0) >= 3 ? Math.round(g.total_rating / 2) / 10 : null,
    hypes: g.hypes ?? 0,
  };
}

async function q(body: string) {
  const games = await igdb<(IgdbGame & { hypes?: number })[]>("games", body);
  return games.map(toCatalog);
}

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400;

/** Une rubrique ne doit jamais casser la page : en cas de souci, elle est simplement vide. */
const safe = <T,>(fn: () => Promise<T[]>) => fn().catch(() => [] as T[]);

export const newReleases = unstable_cache(
  () => safe(() => q(`${FIELDS} where ${BASE} & first_release_date >= ${now() - 75 * DAY} & first_release_date <= ${now()} & (hypes >= 5 | total_rating_count >= 5); sort hypes desc; limit 24;`)),
  ["igdb-new"], { revalidate: 3600 }
);

export const upcoming = unstable_cache(
  () => safe(() => q(`${FIELDS} where ${BASE} & first_release_date > ${now()} & first_release_date < ${now() + 400 * DAY} & hypes >= 5; sort hypes desc; limit 24;`)),
  ["igdb-upcoming"], { revalidate: 3600 }
);

export const bestRecent = unstable_cache(
  () => safe(() => q(`${FIELDS} where ${BASE} & first_release_date >= ${now() - 540 * DAY} & first_release_date <= ${now()} & total_rating_count >= 15; sort total_rating desc; limit 24;`)),
  ["igdb-best-recent"], { revalidate: 6 * 3600 }
);

export const allTimeGreats = unstable_cache(
  () => safe(() => q(`${FIELDS} where ${BASE} & total_rating_count >= 400; sort total_rating desc; limit 30;`)),
  ["igdb-all-time"], { revalidate: 24 * 3600 }
);

/** Sélection selon les genres préférés (identifiants IGDB), en excluant des jeux déjà connus. */
export const forGenres = unstable_cache(
  (genreIds: number[], exclude: number[]) =>
    safe(() => q(`${FIELDS} where ${BASE} & genres = (${genreIds.join(",")}) & total_rating_count >= 60 & total_rating >= 78${exclude.length ? ` & id != (${exclude.slice(0, 400).join(",")})` : ""}; sort total_rating_count desc; limit 40;`)),
  ["igdb-for-genres"], { revalidate: 6 * 3600 }
);

/** Genres IGDB (identifiants stables) avec leur nom français. */
export const GENRES: { id: number; en: string; fr: string }[] = [
  { id: 12, en: "Role-playing (RPG)", fr: "RPG" },
  { id: 31, en: "Adventure", fr: "Aventure" },
  { id: 5, en: "Shooter", fr: "Tir" },
  { id: 8, en: "Platform", fr: "Plateforme" },
  { id: 9, en: "Puzzle", fr: "Réflexion" },
  { id: 25, en: "Hack and slash/Beat 'em up", fr: "Beat'em all" },
  { id: 4, en: "Fighting", fr: "Combat" },
  { id: 10, en: "Racing", fr: "Course" },
  { id: 14, en: "Sport", fr: "Sport" },
  { id: 15, en: "Strategy", fr: "Stratégie" },
  { id: 16, en: "Turn-based strategy (TBS)", fr: "Tour par tour" },
  { id: 24, en: "Tactical", fr: "Tactique" },
  { id: 13, en: "Simulator", fr: "Simulation" },
  { id: 32, en: "Indie", fr: "Indé" },
  { id: 33, en: "Arcade", fr: "Arcade" },
  { id: 34, en: "Visual Novel", fr: "Visual novel" },
  { id: 2, en: "Point-and-click", fr: "Point & click" },
  { id: 7, en: "Music", fr: "Musique" },
  { id: 35, en: "Card & Board Game", fr: "Cartes" },
  { id: 11, en: "Real Time Strategy (RTS)", fr: "Stratégie temps réel" },
];
export const genreId = (en: string) => GENRES.find((g) => g.en === en)?.id;

export const PLATFORMS_IGDB: { id: number; label: string }[] = [
  { id: 6, label: "PC" },
  { id: 167, label: "PS5" },
  { id: 48, label: "PS4" },
  { id: 169, label: "Xbox Series" },
  { id: 49, label: "Xbox One" },
  { id: 130, label: "Switch" },
  { id: 34, label: "Android" },
  { id: 39, label: "iOS" },
];

export type ExploreQuery = { q?: string; genre?: number; platform?: number; from?: number; to?: number; sort?: string; page?: number };

/** Recherche avec filtres (genre, plateforme, années de sortie, tri). */
export async function explore(o: ExploreQuery): Promise<CatalogGame[]> {
  const where = [BASE];
  if (o.genre) where.push(`genres = (${o.genre})`);
  if (o.platform) where.push(`platforms = (${o.platform})`);
  if (o.from) where.push(`first_release_date >= ${Math.floor(Date.UTC(o.from, 0, 1) / 1000)}`);
  if (o.to) where.push(`first_release_date < ${Math.floor(Date.UTC(o.to + 1, 0, 1) / 1000)}`);
  const page = Math.max(0, Math.min(20, o.page ?? 0));
  const text = (o.q ?? "").trim().slice(0, 80);

  if (text) {
    // IGDB ne permet pas de trier une recherche texte : on trie nous-mêmes.
    const res = await q(`search "${esc(text)}"; ${FIELDS} where ${where.join(" & ")}; limit 60; offset ${page * 60};`);
    return res.sort((a, b) => Number(!!b.rating) - Number(!!a.rating) || b.hypes - a.hypes);
  }
  const sorts: Record<string, string> = {
    popular: "sort total_rating_count desc;",
    rating: "sort total_rating desc;",
    recent: "sort first_release_date desc;",
    upcoming: "sort hypes desc;",
  };
  const sort = o.sort && sorts[o.sort] ? o.sort : "popular";
  if (sort === "rating") where.push("total_rating_count >= 20");
  if (sort === "recent") where.push(`first_release_date <= ${now()}`, "(hypes >= 1 | total_rating_count >= 1)");
  if (sort === "upcoming") where.push(`first_release_date > ${now()}`);
  return q(`${FIELDS} where ${where.join(" & ")}; ${sorts[sort]} limit 48; offset ${page * 48};`);
}
