import "server-only";

export const steamCover = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
export const steamHeader = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

const KEY = () => {
  const k = process.env.STEAM_API_KEY;
  if (!k) throw new Error("Clé Steam manquante (STEAM_API_KEY).");
  return k;
};

/** Accepte un SteamID64, une URL de profil (/profiles/… ou /id/…) ou un pseudo personnalisé. */
export async function resolveSteamId(input: string): Promise<string> {
  const raw = input.trim();
  const m = raw.match(/steamcommunity\.com\/(profiles|id)\/([^/?#]+)/i);
  const value = m ? m[2] : raw;
  if (/^\d{17}$/.test(value)) return value;
  const r = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${KEY()}&vanityurl=${encodeURIComponent(value)}`, { cache: "no-store" });
  const j = await r.json();
  if (j?.response?.success !== 1) throw new Error("Profil Steam introuvable. Vérifie le lien.");
  return j.response.steamid as string;
}

export type OwnedGame = { appid: number; name: string; playtime_forever: number };

export async function ownedGames(steamId: string): Promise<OwnedGame[]> {
  const r = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${KEY()}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`,
    { cache: "no-store" }
  );
  if (!r.ok) throw new Error("Steam ne répond pas, réessaie dans un instant.");
  const j = await r.json();
  const games = j?.response?.games as OwnedGame[] | undefined;
  if (!games) throw new Error("Ta bibliothèque Steam est privée : passe « Détails des jeux » en Public dans Steam → Modifier le profil → Paramètres de confidentialité.");
  return games;
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
  const r = await fetch(OPENID, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: check.toString(), cache: "no-store" });
  const text = await r.text();
  if (!/is_valid\s*:\s*true/.test(text)) return null;
  const m = (params.get("openid.claimed_id") || "").match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return m ? m[1] : null;
}
