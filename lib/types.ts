export type Game = {
  id: string;
  igdb_id: number | null;
  steam_appid: number | null;
  slug: string | null;
  name: string;
  cover_url: string | null;
  banner_url: string | null;
  release_year: number | null;
  genres: string[];
  platforms: string[];
  summary: string | null;
  avg_hours: number | null;
  dominant_color: string | null;
};

export type Status = "a_faire" | "en_cours" | "termine" | "platine" | "abandonne";

export type UserGame = {
  id: string;
  user_id: string;
  game_id: string;
  status: Status;
  rating: number | null;
  scores: Record<string, number>;
  difficulty: number | null;
  review: string | null;
  has_spoilers: boolean;
  started_on: string | null;
  finished_on: string | null;
  playtime_hours: number | null;
  platform: string | null;
  top_rank: number | null;
  source: "manual" | "steam" | "swipe";
  created_at: string;
  updated_at: string;
};

export type MiniProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  accent_color: string;
};

export const STATUSES: { key: Status; label: string; short: string }[] = [
  { key: "a_faire", label: "À faire", short: "À faire" },
  { key: "en_cours", label: "En cours", short: "En cours" },
  { key: "termine", label: "Terminé", short: "Terminé" },
  { key: "platine", label: "Platine / 100 %", short: "Platine" },
  { key: "abandonne", label: "Abandonné", short: "Abandonné" },
];
export const STATUS_LABEL: Record<Status, string> = Object.fromEntries(STATUSES.map((s) => [s.key, s.label])) as Record<Status, string>;

export const CATEGORIES: { key: string; label: string }[] = [
  { key: "graphismes", label: "Graphismes" },
  { key: "histoire", label: "Histoire" },
  { key: "gameplay", label: "Gameplay" },
  { key: "ambiance", label: "Ambiance & son" },
  { key: "duree", label: "Durée de vie" },
];

export const PLATFORMS = ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series", "Xbox One", "Switch", "Switch 2", "Steam Deck", "Mobile", "Autre"];

/** Couleur de repli stable à partir d'un texte (quand le jeu n'a pas encore de couleur). */
export function colorFromText(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 33 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 58%)`;
}
