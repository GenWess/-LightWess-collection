import "server-only";

export const steamCover = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
export const steamHeader = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

const KEY = () => {
  // On nettoie la clé : un espace ou des guillemets collés par erreur dans Vercel suffisent à la casser.
  const k = (process.env.STEAM_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!k) throw new Error("La clé Steam n'est pas configurée sur le site (variable STEAM_API_KEY dans Vercel).");
  if (!/^[0-9A-Fa-f]{32}$/.test(k)) throw new Error("La clé Steam enregistrée dans Vercel n'a pas le bon format (32 caractères, chiffres et lettres A à F).");
  return k;
};

/** Appel à l'API Steam avec des messages d'erreur clairs (clé refusée, Steam en panne, délai dépassé…). */
async function steamApi(path: string, params: Record<string, string>) {
  const url = `https://api.steampowered.com/${path}?${new URLSearchParams({ key: KEY(), format: "json", ...params })}`;
  let r: Response;
  try {
    r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error("Steam met trop de temps à répondre. Réessaie dans un instant.");
  }
  if (r.status === 401 || r.status === 403) throw new Error("Steam refuse la clé API du site. Vérifie STEAM_API_KEY dans Vercel (Settings → Environment Variables), puis redéploie.");
  if (r.status === 429) throw new Error("Trop de demandes à Steam d'un coup. Attends une minute et réessaie.");
  if (!r.ok) throw new Error(`Steam ne répond pas (erreur ${r.status}). Réessaie dans un instant.`);
  try { return await r.json(); } catch { throw new Error("Réponse de Steam illisible. Réessaie dans un instant."); }
}

/** Accepte un SteamID64, une URL de profil (/profiles/… ou /id/…) ou un pseudo personnalisé. */
export async function resolveSteamId(input: string): Promise<string> {
  const raw = input.trim();
  const m = raw.match(/steamcommunity\.com\/(profiles|id)\/([^/?#]+)/i);
  const value = m ? m[2] : raw;
  if (/^\d{17}$/.test(value)) return value;
  if (!value || /\s/.test(value)) throw new Error("Colle le lien de ton profil Steam (steamcommunity.com/id/… ou /profiles/…).");
  const j = await steamApi("ISteamUser/ResolveVanityURL/v1/", { vanityurl: value });
  if (j?.response?.success !== 1) throw new Error("Profil Steam introuvable. Vérifie le lien.");
  return j.response.steamid as string;
}

export type OwnedGame = { appid: number; name: string; playtime_forever: number };

export async function ownedGames(steamId: string): Promise<OwnedGame[]> {
  const j = await steamApi("IPlayerService/GetOwnedGames/v1/", { steamid: steamId, include_appinfo: "1", include_played_free_games: "1" });
  const res = j?.response ?? {};
  const games = res.games as OwnedGame[] | undefined;
  if (!games) {
    if (res.game_count === 0) throw new Error("Aucun jeu trouvé sur ce compte Steam.");
    throw new Error("Ta bibliothèque Steam est privée : dans Steam → Modifier le profil → Paramètres de confidentialité, passe « Mon profil » et « Détails des jeux » en Public. Steam peut mettre quelques minutes à appliquer le changement.");
  }
  // Certains jeux arrivent sans nom (jeux retirés de la boutique) : on leur en donne un.
  return games.map((g) => ({ appid: g.appid, name: g.name?.trim() || `Jeu Steam ${g.appid}`, playtime_forever: g.playtime_forever ?? 0 }));
}

const OPENID = "https://steamcommunity.com/openid/login";

export function steamLoginUrl(origin: string) {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/steam/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID}?${p}`;
}

/** Vérifie auprès de Steam que la réponse OpenID est authentique, et renvoie le SteamID64. */
export async function verifySteamLogin(params: URLSearchParams): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  const check = new URLSearchParams(params);
  check.set("openid.mode", "check_authentication");
  const r = await fetch(OPENID, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: check.toString(), cache: "no-store", signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  if (!/is_valid\s*:\s*true/.test(text)) return null;
  const m = (params.get("openid.claimed_id") || "").match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/);
  return m ? m[1] : null;
}
