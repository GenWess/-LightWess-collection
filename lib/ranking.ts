/** Classement et badges, calculés à partir de la fonction SQL `leaderboard()`. */

export type LeaderRow = {
  id: string; handle: string; display_name: string | null; avatar_url: string | null; accent_color: string; role: string;
  games: number; finished: number; platinum: number; hours: number; reviews: number; avg_rating: number | null;
};

export const CATS = [
  { key: "hours", label: "Plus gros joueur", short: "Heures", unit: (v: number) => `${Math.round(v).toLocaleString("fr-FR")} h`, icon: "⏱️" },
  { key: "platinum", label: "Chasseur de platines", short: "Platines", unit: (v: number) => `${v} platine${v > 1 ? "s" : ""}`, icon: "🏆" },
  { key: "games", label: "Plus grosse collection", short: "Jeux", unit: (v: number) => `${v} jeu${v > 1 ? "x" : ""}`, icon: "📚" },
  { key: "finished", label: "Finisseur", short: "Terminés", unit: (v: number) => `${v} terminé${v > 1 ? "s" : ""}`, icon: "✅" },
  { key: "reviews", label: "Critique", short: "Avis", unit: (v: number) => `${v} avis`, icon: "✍️" },
] as const;
export type CatKey = (typeof CATS)[number]["key"];

export function normalize(rows: unknown[]): LeaderRow[] {
  return (rows as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as LeaderRow),
    games: Number(r.games ?? 0), finished: Number(r.finished ?? 0), platinum: Number(r.platinum ?? 0),
    hours: Number(r.hours ?? 0), reviews: Number(r.reviews ?? 0), avg_rating: r.avg_rating == null ? null : Number(r.avg_rating),
  }));
}

/** Classe les joueurs dans une catégorie (ex aequo = même rang). Ceux à 0 ne sont pas classés. */
export function rank(rows: LeaderRow[], key: CatKey) {
  const sorted = rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key] || a.handle.localeCompare(b.handle));
  let last = -1, pos = 0;
  return sorted.map((r, i) => {
    if (r[key] !== last) { pos = i + 1; last = r[key]; }
    return { ...r, pos };
  });
}

export type Badge = { key: string; label: string; icon: string; tone: "gold" | "violet" | "plain"; hint: string };

/** Badges d'un joueur + style de son pseudo (violet / or pour les meilleurs). */
export function badgesFor(id: string, rows: LeaderRow[]): { badges: Badge[]; nameTier: "gold" | "violet" | null } {
  const me = rows.find((r) => r.id === id);
  const badges: Badge[] = [];
  let nameTier: "gold" | "violet" | null = null;
  if (!me) return { badges, nameTier };

  for (const c of CATS) {
    const r = rank(rows, c.key).find((x) => x.id === id);
    if (!r || r.pos > 3) continue;
    badges.push({ key: c.key, icon: c.icon, label: r.pos === 1 ? c.label : `Top ${r.pos} · ${c.short}`, tone: r.pos === 1 ? "gold" : "violet", hint: `${r.pos}ᵉ du site · ${c.unit(r[c.key])}` });
    if (c.key === "hours") nameTier = r.pos === 1 ? "gold" : nameTier ?? "violet";
    else if (r.pos === 1 && !nameTier) nameTier = "violet";
  }

  const miles: [boolean, Badge][] = [
    [me.finished >= 100, { key: "f100", icon: "💯", label: "100 jeux finis", tone: "plain", hint: "A terminé 100 jeux ou plus" }],
    [me.finished >= 50 && me.finished < 100, { key: "f50", icon: "🎖️", label: "50 jeux finis", tone: "plain", hint: "A terminé 50 jeux ou plus" }],
    [me.finished >= 10 && me.finished < 50, { key: "f10", icon: "🎮", label: "10 jeux finis", tone: "plain", hint: "A terminé 10 jeux ou plus" }],
    [me.platinum >= 5, { key: "p5", icon: "💎", label: "Perfectionniste", tone: "plain", hint: "5 jeux ou plus à 100 %" }],
    [me.hours >= 1000, { key: "h1000", icon: "🔥", label: "1 000 heures", tone: "plain", hint: "Plus de 1 000 heures de jeu" }],
    [me.reviews >= 10, { key: "r10", icon: "🖋️", label: "Plume", tone: "plain", hint: "10 avis écrits ou plus" }],
  ];
  miles.forEach(([ok, b]) => ok && badges.push(b));
  if (me.role === "admin") badges.unshift({ key: "admin", icon: "🛡️", label: "Modérateur", tone: "plain", hint: "Modère le site" });
  return { badges, nameTier };
}

/** Classes CSS du pseudo selon le rang. */
export const nameClass = (t: "gold" | "violet" | null) =>
  t === "gold" ? "name-gold" : t === "violet" ? "name-violet" : "";
