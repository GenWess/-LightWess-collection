import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import FriendButton from "@/components/FriendButton";
import GameTile from "@/components/GameTile";
import TopFan from "@/components/TopFan";
import ProfileStats from "@/components/ProfileStats";
import CopyLink from "@/components/CopyLink";
import ProfileTabs from "@/components/ProfileTabs";
import GameBrowser from "@/components/GameBrowser";
import PeekTile from "@/components/GamePeek";
import { panel } from "@/components/ui";
import { badgesFor, nameClass, normalize } from "@/lib/ranking";
import { createClient, type Profile } from "@/lib/supabase/server";
import { withFixedCovers } from "@/lib/steam-repair";
import { type Game, type UserGame } from "@/lib/types";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}` };
}

function Thumb({ g }: { g: Game }) {
  return g.cover_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={g.cover_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" />
    : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{g.name.charAt(0)}</span>;
}

const fmtMonth = (d: string) => new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase.from("profiles").select("*").eq("handle", decodeURIComponent(handle).toLowerCase()).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;
  const isMe = user?.id === p.id;

  const [{ data: canView }, { data: rel }] = await Promise.all([
    supabase.rpc("can_view_collection", { owner: p.id }),
    isMe ? Promise.resolve({ data: null }) : supabase.from("friendships").select("id,status,requester_id")
      .or(`and(requester_id.eq.${user!.id},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${user!.id})`).maybeSingle(),
  ]);

  // Tout ce dont la page a besoin, chargé en même temps (page plus rapide).
  const [{ data: rowsData }, { data: mineData }, { count: listCount }, { data: lb }] = await Promise.all([
    canView ? supabase.from("user_games").select("*, game:games(*)").eq("user_id", p.id).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    !isMe && user && canView ? supabase.from("user_games").select("game_id").eq("user_id", user.id) : Promise.resolve({ data: [] as { game_id: string }[] }),
    supabase.from("lists").select("id", { count: "exact", head: true }).eq("user_id", p.id),
    supabase.rpc("leaderboard"),
  ]);
  const rows = await withFixedCovers(supabase, (rowsData ?? []) as (UserGame & { game: Game })[]);

  const done = rows.filter((r) => r.status === "termine" || r.status === "platine");
  const top: (Game | null)[] = [1, 2, 3, 4, 5].map((n) => rows.find((r) => r.top_rank === n)?.game ?? null);
  const playing = rows.filter((r) => r.status === "en_cours");
  const recent = done.slice().sort((a, b) => (b.finished_on ?? "").localeCompare(a.finished_on ?? "")).slice(0, 12);
  const accent = p.accent_color || "#8b5cf6";

  // Jeux conseillés : ses jeux les mieux notés (hors top 5). Pour un visiteur, on enlève ceux qu'il a déjà.
  const already = new Set((mineData ?? []).map((m) => m.game_id as string));
  const picks = rows
    .filter((r) => r.rating != null && Number(r.rating) >= 3.5 && r.top_rank == null && !already.has(r.game_id))
    .sort((a, b) => Number(b.rating) - Number(a.rating) || (b.finished_on ?? "").localeCompare(a.finished_on ?? ""))
    .slice(0, 8);
  // Top 5 des pires jeux : ses 5 plus mauvaises notes (3★ ou moins).
  const flops = rows
    .filter((r) => r.rating != null && Number(r.rating) <= 3 && r.top_rank == null)
    .sort((a, b) => Number(a.rating) - Number(b.rating) || (b.finished_on ?? "").localeCompare(a.finished_on ?? ""))
    .slice(0, 5);
  const name = p.display_name || `@${p.handle}`;
  // Sur le profil d'un ami, cliquer un jeu ouvre SON avis (?de=pseudo).
  const fromQ = isMe ? undefined : p.handle ?? undefined;
  const deQ = fromQ ? `?de=${encodeURIComponent(fromQ)}` : "";
  const owner = { id: p.id, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url, accent_color: p.accent_color };
  // Sur le profil de quelqu'un d'autre, toucher un jeu ouvre SON avis directement (sans quitter le profil).
  const tile = (r: UserGame & { game: Game }, key?: string) => (isMe ? <GameTile key={key} game={r.game} entry={r} /> : <PeekTile key={key} row={r} owner={owner} />);

  // Badges et pseudo coloré, d'après le classement du site.
  const { badges, nameTier } = badgesFor(p.id, normalize(lb ?? []));

  // Petite bulle « joue à… / ensuite… ».
  const nowPlaying = playing.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const todo = rows.filter((r) => r.status === "a_faire").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const upNext = todo[0];
  const pill = "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 text-sm font-semibold text-ink backdrop-blur transition hover:border-white/30 hover:bg-white/10 active:scale-95";

  return (
    <div className="fade-up">
      {/* Bannière (cadrage choisi dans les Paramètres) */}
      <div
        className="relative h-[clamp(150px,24vw,250px)] overflow-hidden rounded-[28px] bg-cover"
        style={{ backgroundColor: accent, backgroundPosition: `${p.banner_pos_x ?? 50}% ${p.banner_pos_y ?? 50}%`, backgroundImage: p.banner_url ? `url("${p.banner_url}")` : `radial-gradient(90% 140% at 85% 0%, rgba(255,255,255,.35), transparent 60%), linear-gradient(135deg, ${accent}, #1a1426)` }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/90 via-night/30 to-transparent" />
      </div>

      {/* En-tête : passe AU-DESSUS de la bannière */}
      <div className="relative z-10 -mt-16 px-2 sm:-mt-20 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <Avatar profile={p} size={116} ring />
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="truncate font-display text-[clamp(28px,4.2vw,40px)] font-bold leading-[1.05] tracking-tight">
              <span className={nameClass(nameTier)}>{p.display_name || p.handle}</span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mute">
              <span className="font-semibold text-ink2">@{p.handle}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-faint" />
              <span>membre depuis {fmtMonth(p.created_at)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            {isMe ? (
              <>
                <CopyLink handle={p.handle!} className={pill} />
                <Link href="/parametres" className={pill}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
                  Personnaliser
                </Link>
              </>
            ) : <FriendButton meId={user!.id} otherId={p.id} rel={rel as { id: string; status: string; requester_id: string } | null} />}
          </div>
        </div>

        {(badges.length > 0 || p.bio || nowPlaying.length > 0 || upNext) && (
          <div className="mt-4 flex flex-col gap-3">
            {p.bio && <p className="max-w-[65ch] leading-relaxed text-ink2">{p.bio}</p>}
            {badges.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Badges">
                {badges.map((b) => (
                  <li key={b.key} title={b.hint}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${b.tone === "gold" ? "border-[#f5b400]/50 bg-[#f5b400]/10 text-[#ffe08a]" : b.tone === "violet" ? "border-violet/50 bg-violet/15 text-violet-hi" : "border-white/12 bg-white/[.04] text-ink2"}`}>
                    <span aria-hidden="true">{b.icon}</span>{b.label}
                  </li>
                ))}
              </ul>
            )}
            {canView && (nowPlaying.length > 0 || upNext) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {nowPlaying.length > 0 && (
                  <Link href={`/jeu/${nowPlaying[0].game.id}${deQ}`} className="group flex max-w-full items-center gap-2 rounded-full border border-ok/25 bg-ok/[.07] py-1 pl-1 pr-3 text-ink2 transition hover:bg-ok/15">
                    <Thumb g={nowPlaying[0].game} />
                    <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-ok" /></span>
                    <span className="truncate">Joue à <b className="text-ink">{nowPlaying[0].game.name}</b>{nowPlaying.length > 1 ? <span className="text-mute"> +{nowPlaying.length - 1}</span> : null}</span>
                  </Link>
                )}
                {upNext && (
                  <Link href={`/jeu/${upNext.game.id}${deQ}`} className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[.03] py-1 pl-1 pr-3 text-mute transition hover:bg-white/[.07]">
                    <Thumb g={upNext.game} />
                    <span className="truncate">Ensuite : <b className="font-semibold text-ink2">{upNext.game.name}</b>{todo.length > 1 ? <span> +{todo.length - 1}</span> : null}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ProfileTabs handle={p.handle!} counts={{ lists: listCount ?? undefined }} />

      {canView ? (
        <>
          {(isMe || top.some(Boolean)) && (
            <section className="mt-7">
              <h2 className="text-xl font-bold">Top 5</h2>
              <TopFan peek={isMe ? undefined : { owner, rows: Object.fromEntries(rows.filter((r) => r.top_rank).map((r) => [r.game.id, r])) }} games={top} mine={isMe} collection={isMe ? rows.map((r) => ({ game: r.game, status: r.status })) : []} />
            </section>
          )}

          {picks.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold">{isMe ? "Mes jeux conseillés" : `${name} te conseille`}</h2>
              <p className="mb-3 text-sm text-mute">{isMe ? "Tes jeux les mieux notés, hors top 5." : "Ses jeux les mieux notés que tu n'as pas encore."}</p>
              <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pt-2 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
                {picks.map((r) => <div key={r.id} className="w-[30%] shrink-0 snap-start sm:w-auto">{tile(r)}</div>)}
              </div>
            </section>
          )}

          {flops.length > 0 && (
            <section className="mt-6">
              <h2 className="flex items-center gap-2 text-xl font-bold"><span aria-hidden="true">💀</span>Top 5 des pires jeux</h2>
              <p className="mb-3 text-sm text-mute">{isMe ? "Tes plus mauvaises notes. À éviter… ou pas." : `Les jeux que ${name} a le moins aimés.`}</p>
              <ol className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pt-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
                {flops.map((r, i) => (
                  <li key={r.id} className="relative w-[30%] shrink-0 snap-start sm:w-auto">
                    <span className="absolute -left-1 -top-1 z-10 grid h-8 w-8 place-items-center rounded-full border-2 border-night bg-no font-display text-sm font-bold text-white shadow-lg">{i + 1}</span>
                    <div className="grayscale-[35%] transition hover:grayscale-0">{tile(r)}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">Statistiques</h2>
            <ProfileStats rows={rows} />
          </section>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className={panel}>
              <h2 className="text-lg font-bold">Terminés récemment</h2>
              {recent.length ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{recent.map((r) => tile(r, r.id))}</div>
              ) : <p className="mt-2 text-mute">Aucun jeu terminé pour l&apos;instant.</p>}
            </section>
            <div className="flex flex-col gap-5">
              <section className={panel}>
                <h2 className="text-lg font-bold">En cours <span className="text-base font-normal text-mute">{playing.length}</span></h2>
                <ul className="mt-2 flex flex-col">
                  {playing.slice(0, 6).map((r) => (
                    <li key={r.id}><Link href={`/jeu/${r.game.id}${deQ}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/5"><span className="truncate">{r.game.name}</span>{r.playtime_hours ? <span className="shrink-0 text-sm text-mute">{r.playtime_hours} h</span> : null}</Link></li>
                  ))}
                  {!playing.length && <li className="text-mute">Rien en ce moment.</li>}
                </ul>
              </section>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">Collection <span className="text-base font-normal text-mute">{rows.length}</span></h2>
            {rows.length ? (
              <GameBrowser rows={rows} removable={isMe} peekOwner={isMe ? undefined : owner} searchLabel={isMe ? "Chercher dans ma collection" : `Chercher dans la collection de ${name}`} />
            ) : <p className="rounded-3xl border border-line bg-card/70 p-6 text-mute">{isMe ? "Ta collection est vide. Ajoute un jeu depuis « Ma collection »." : `@${p.handle} n'a encore ajouté aucun jeu.`}</p>}
          </section>
        </>
      ) : (
        <div className={`${panel} mt-7 text-center`}>
          <p className="font-semibold">Collection privée</p>
          <p className="mt-1 text-mute">{p.collection_visibility === "friends" ? `Deviens ami avec @${p.handle} pour voir ses jeux.` : `@${p.handle} garde sa collection pour lui.`}</p>
        </div>
      )}
    </div>
  );
}
