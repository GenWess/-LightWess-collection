import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import CatalogCard, { Rail, railItem } from "@/components/CatalogCard";
import Cover from "@/components/Cover";
import { btnGhost, btnPrimary } from "@/components/ui";
import { GENRES, allTimeGreats, bestRecent, forGenres, genreId, newReleases, upcoming, type CatalogGame } from "@/lib/catalog";
import { getSessionProfile } from "@/lib/supabase/server";
import { genreFr, type Game, type MiniProfile, type Status, type UserGame } from "@/lib/types";
import { Countdown, HeroBackdrop } from "./HomeBits";

export const metadata: Metadata = { title: "Accueil" };

const VERB: Record<Status, string> = { a_faire: "veut jouer à", en_cours: "joue à", termine: "a terminé", platine: "a platiné", abandonne: "a abandonné" };
const ago = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};
const hello = () => {
  const h = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));
  return h < 5 ? "Encore debout" : h < 18 ? "Salut" : "Bonsoir";
};

export default async function Accueil() {
  const { supabase, user, profile } = await getSessionProfile();
  const me = user!.id;

  const [{ data: mineData }, { data: friends }, { data: trend }] = await Promise.all([
    supabase.from("user_games").select("status, rating, finished_on, game:games(id, igdb_id, genres)").eq("user_id", me),
    supabase.rpc("my_friends"),
    supabase.rpc("trending_games", { days: 30, lim: 18 }),
  ]);
  const mine = (mineData ?? []) as unknown as { status: Status; rating: number | null; finished_on: string | null; game: Pick<Game, "id" | "igdb_id" | "genres"> }[];
  const owned = new Map<number, Status>(mine.filter((m) => m.game?.igdb_id).map((m) => [m.game.igdb_id!, m.status]));
  const friendIds = ((friends ?? []) as { friend_id: string }[]).map((f) => f.friend_id);

  // Genres préférés : ceux des jeux terminés ou bien notés.
  const gc = new Map<number, number>();
  mine.filter((m) => m.status === "termine" || m.status === "platine" || Number(m.rating ?? 0) >= 4)
    .forEach((m) => m.game?.genres?.forEach((g) => { const id = genreId(g); if (id) gc.set(id, (gc.get(id) ?? 0) + 1 + Number(m.rating ?? 0) / 5); }));
  const favGenres = [...gc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);

  const trendIds = ((trend ?? []) as { game_id: string; players: number }[]);
  const [news, soon, best, picks, { data: activity }, { data: trendGames }] = await Promise.all([
    newReleases(), upcoming(), bestRecent(),
    favGenres.length ? forGenres(favGenres, [...owned.keys()]) : allTimeGreats(),
    friendIds.length
      ? supabase.from("user_games").select("id, status, rating, updated_at, finished_on, game:games(id,name,cover_url,banner_url,dominant_color), profile:profiles(id,handle,display_name,avatar_url,accent_color)").in("user_id", friendIds).order("updated_at", { ascending: false }).limit(9)
      : Promise.resolve({ data: [] }),
    trendIds.length ? supabase.from("games").select("*").in("id", trendIds.map((t) => t.game_id)) : Promise.resolve({ data: [] }),
  ]);

  const acts = (activity ?? []) as unknown as (Pick<UserGame, "id" | "status" | "rating" | "updated_at" | "finished_on"> & { game: Game; profile: MiniProfile })[];
  const players = new Map(trendIds.map((t) => [t.game_id, Number(t.players)]));
  const trending = ((trendGames ?? []) as Game[]).sort((a, b) => (players.get(b.id) ?? 0) - (players.get(a.id) ?? 0));
  const forYou = picks.filter((g) => !owned.has(g.igdb_id)).slice(0, 20);
  const hero: CatalogGame | undefined = news.find((g) => g.banner_url) ?? best.find((g) => g.banner_url);
  const year = new Date().getFullYear();
  const doneThisYear = mine.filter((m) => (m.status === "termine" || m.status === "platine") && m.finished_on?.startsWith(String(year))).length;
  const playing = mine.filter((m) => m.status === "en_cours").length;

  return (
    <div className="fade-up">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* À la une */}
        <section className="relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[30px] border border-white/10 p-5 sm:min-h-[360px] sm:p-7">
          {hero && <HeroBackdrop src={hero.banner_url!} />}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/70 to-night/10" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-night/80 via-transparent to-transparent" />
          <p className="text-sm font-semibold text-ink2">{hello()} {profile?.display_name || `@${profile?.handle}`} 👋</p>
          <h1 className="mt-1 max-w-[18ch] text-balance font-display text-[clamp(30px,4.4vw,48px)] font-bold leading-[1.02]">
            {doneThisYear ? <>Déjà <span className="text-violet-hi">{doneThisYear} jeu{doneThisYear > 1 ? "x" : ""}</span> terminé{doneThisYear > 1 ? "s" : ""} en {year}.</> : <>Qu&apos;est-ce qu&apos;on lance aujourd&apos;hui&nbsp;?</>}
          </h1>
          {hero && (
            <a href={`/api/games/open/${hero.igdb_id}`} className="mt-4 flex max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-black/35 p-2 pr-4 backdrop-blur-md transition hover:border-white/30 hover:bg-black/50">
              <Cover game={{ name: hero.name, cover_url: hero.cover_url, banner_url: null }} className="w-12 shrink-0 rounded-lg [--cover-fs:12px]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-violet-hi">À la une</span>
                <b className="block truncate">{hero.name}</b>
                <span className="block truncate text-xs text-mute">{[hero.release_year, hero.genres.slice(0, 2).map(genreFr).join(", ")].filter(Boolean).join(" · ")}</span>
              </span>
            </a>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/explorer" className={btnPrimary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              Explorer les jeux
            </Link>
            <Link href="/decouvrir" className={`${btnGhost} backdrop-blur`}>Swiper des recos</Link>
            {playing > 0 && <Link href="/collection" className={`${btnGhost} backdrop-blur`}>{playing} en cours</Link>}
          </div>
        </section>

        {/* Activité des amis */}
        <section className="flex flex-col rounded-[30px] border border-line bg-card/80 p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" /></span>
              Activité des amis
            </h2>
            {acts.length > 0 && <Link href="/fil" className="text-sm font-semibold text-mute hover:text-ink">Tout voir</Link>}
          </div>
          {acts.length ? (
            <ul className="-mx-2 flex flex-col">
              {acts.map((a) => (
                <li key={a.id}>
                  <Link href={`/jeu/${a.game.id}?de=${a.profile.handle}`} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/5">
                    <span className="relative shrink-0">
                      <Cover game={a.game} className="w-9 rounded-md [--cover-fs:9px]" />
                      <span className="absolute -bottom-1 -right-1.5"><Avatar profile={a.profile} size={20} /></span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">
                      <b>{a.profile.display_name || a.profile.handle}</b> <span className="text-mute">{VERB[a.status]}</span> <b className="text-ink">{a.game.name}</b>
                      {a.rating != null && <span className="text-[#FFD45C]"> · {Number(a.rating).toFixed(1)}★</span>}
                    </span>
                    <span className="shrink-0 text-xs text-faint">{ago(a.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
              <p className="text-mute">Ajoute des amis pour voir ici ce qu&apos;ils terminent, notent et commencent.</p>
              <Link href="/amis" className={btnGhost}>Trouver des amis</Link>
            </div>
          )}
        </section>
      </div>

      {forYou.length > 0 && (
        <Rail title="Sélection pour toi" hint={favGenres.length ? `D'après tes genres préférés : ${favGenres.map((id) => GENRES.find((g) => g.id === id)?.fr).filter(Boolean).join(", ")}` : "Des incontournables très bien notés"}>
          {forYou.map((g) => <div key={g.igdb_id} className={railItem}><CatalogCard g={g} sub="rating" /></div>)}
        </Rail>
      )}

      {news.length > 0 && (
        <Rail title="Nouvelles sorties" hint="Sortis ces dernières semaines · mis à jour automatiquement">
          {news.map((g) => <div key={g.igdb_id} className={railItem}><CatalogCard g={g} status={owned.get(g.igdb_id)} sub="date" /></div>)}
        </Rail>
      )}

      {trending.length > 0 && (
        <Rail title="Populaires sur Lightwess" hint="Les jeux les plus ajoutés et joués par les membres ce mois-ci">
          {trending.map((g, i) => (
            <Link key={g.id} href={`/jeu/${g.id}`} className={`${railItem} group block`}>
              <Cover game={g} className="shadow-[0_18px_30px_-18px_rgba(0,0,0,.85)] transition group-hover:-translate-y-1 [--cover-fs:34px]">
                <span className="absolute left-2 top-2 z-[2] grid h-8 min-w-8 place-items-center rounded-full bg-black/70 px-2 font-display text-sm font-bold text-white backdrop-blur">{i + 1}</span>
              </Cover>
              <p className="mt-2 truncate text-sm font-semibold">{g.name}</p>
              <p className="text-xs text-mute">{players.get(g.id)} joueur{(players.get(g.id) ?? 0) > 1 ? "s" : ""}</p>
            </Link>
          ))}
        </Rail>
      )}

      {soon.length > 0 && (
        <Rail title="Bientôt disponibles" hint="Les sorties les plus attendues">
          {soon.map((g) => (
            <div key={g.igdb_id} className={railItem}>
              <CatalogCard g={g} status={owned.get(g.igdb_id)} sub="date" badge={g.release_date ? <Countdown at={g.release_date} /> : null} />
            </div>
          ))}
        </Rail>
      )}

      {best.length > 0 && (
        <Rail title="Les mieux notés du moment" hint="Sortis ces 18 derniers mois, salués par la critique et les joueurs">
          {best.map((g) => <div key={g.igdb_id} className={railItem}><CatalogCard g={g} status={owned.get(g.igdb_id)} sub="rating" /></div>)}
        </Rail>
      )}

      {!news.length && !soon.length && !best.length && (
        <p className="mt-10 rounded-3xl border border-line bg-card/70 p-6 text-center text-mute">Le catalogue ne répond pas pour l&apos;instant. Réessaie dans un moment.</p>
      )}

      <p className="mt-10 text-center text-[11px] text-faint">Catalogue, dates et jaquettes : IGDB.com</p>
    </div>
  );
}

