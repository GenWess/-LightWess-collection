import "server-only";

/**
 * Résumé d'un jeu en français.
 * 1. La boutique Steam fournit la description officielle en français (pour tous les jeux présents sur Steam).
 * 2. Sinon, si une clé DeepL gratuite est configurée (DEEPL_API_KEY), on traduit le résumé anglais d'IGDB.
 * Le résultat est enregistré en base : chaque jeu n'est traité qu'une fois.
 */

const decode = (s: string) =>
  s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n").trim();

async function fromSteam(appid: number): Promise<string | null> {
  try {
    const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=french&cc=fr&filters=basic`, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j?.[appid]?.data;
    const txt = decode(d?.short_description || "");
    // Steam renvoie parfois l'anglais quand il n'y a pas de traduction : on vérifie quelques mots français courants.
    if (txt.length > 20 && /\b(le|la|les|des|une?|et|dans|vous|votre|est)\b/i.test(txt)) return txt;
    return null;
  } catch { return null; }
}

async function fromDeepL(text: string): Promise<string | null> {
  const key = (process.env.DEEPL_API_KEY || "").trim();
  if (!key || !text) return null;
  try {
    const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
    const r = await fetch(`https://${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], target_lang: "FR", source_lang: "EN" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.translations?.[0]?.text as string) || null;
  } catch { return null; }
}

export async function frenchSummary(g: { steam_appid: number | null; summary: string | null }): Promise<{ text: string; source: "steam" | "deepl" } | null> {
  if (g.steam_appid) {
    const s = await fromSteam(g.steam_appid);
    if (s) return { text: s, source: "steam" };
  }
  const t = await fromDeepL(g.summary ?? "");
  return t ? { text: t, source: "deepl" } : null;
}
