import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import Glow from "@/components/Glow";
import { Stars } from "@/components/Stars";
import { getSessionProfile } from "@/lib/supabase/server";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ReviewText from "@/components/ReviewText";
import { frenchSummary } from "@/lib/summary-fr";
import { CATEGORIES, STATUS_LABEL, genreFr, type Game, type MiniProfile, type UserGame } from "@/lib/types";
import FoldEditor from "./FoldEditor";
import GameEditor from "./GameEditor";
import Reviews, { type ReviewRow } from "./Reviews";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ de?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("games").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Jeu" };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default async function GamePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { de } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getSessionProfile();

  const { data: game } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (!game) notFound();
  const g = game as Game;

  const [{ data: mine }, { data: others }, { data: friends }, { data: tops }] = await Promise.all([
    supabase.from("user_games").select("*").eq("game_id", id).eq("user_id", user!.id).maybeSingle(),
    supabase
      .from("user_games")
      .select("*, profile:profiles(id,handle,display_name,avatar_url,accent_color), likes:review_likes(user_id), replies:review_replies(id,body,created_at,user_id,profile:profiles(id,handle,display_name,avatar_url,accent_color))")
      .eq("game_id", id)
      .neq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.rpc("my_friends"),
    supabase.from("user_games").select("top_rank, game_id").eq("user_id", user!.id).not("top_rank", "is", null),
  ]);

  const friendIds = new Set(((friends ?? []) as { friend_id: string }[]).map((f) => f.friend_id));
  const rows = ((others ?? []) as (UserGame & { profile: MiniProfile; likes: { user_id: string }[]; replies: ReviewRow["replies"] })[]).map((r) => ({ ...r, isFriend: friendIds.has(r.user_id) }));
  const rated = rows.filter((r) => r.rating != null);
  const friendRated = rated.filter((r) => r.isFriend);
  const friendAvg = avg(friendRated.map((r) => Number(r.rating)));
  const allAvg = avg([...rated.map((r) => Number(r.rating)), ...(mine?.rating != null ? [Number(mine.rating)] : [])]);
  const catSource = friendRated.length ? friendRated : rated;
  const cats = CATEGORIES.map((c) => ({ ...c, v: avg(catSource.map((r) => r.scores?.[c.key]).filter((x): x is number => typeof x === "number")) }));
  const owners = rows.length + (mine ? 1 : 0);
  const friendsWithIt = rows.filter((r) => r.isFriend);
  // Arrivée depuis le profil d'un ami (?de=pseudo) : son avis passe en premier.
  const focus = de ? rows.find((r) => r.profile.handle?.toLowerCase() === de.toLowerCase()) ?? null : null;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // Résumé en français (Steam, sinon DeepL si configuré), enregistré une fois pour toutes.
  let summaryFr = g.summary_fr ?? null;
  if (!summaryFr) {
    const fr = await frenchSummary(g);
    if (fr) {
      summaryFr = fr.text;
      await supabase.from("games").update({ summary_fr: fr.text }).eq("id", g.id).then(() => null, () => null);
    }
  }

  const reviews = rows.filter((r) => r.rating != null || r.review || r.spoiler_text).sort((a, b) => Number(b.isFriend) - Number(a.isFriend));

  return (
    <div className="fade-up">
      <Glow color={g.dominant_color} image={g.cover_url} />
      <section className="relative overflow-hidden rounded-[28px] border border-line">
        {g.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/80 to-night/30" />
        <div className="relative grid gap-6 p-5 sm:grid-cols-[180px_1fr] sm:items-end sm:p-8">
          <Cover game={g} className="w-36 shadow-2xl sm:w-full [--cover-fs:44px]" priority />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink2">{[g.release_year, g.genres.slice(0, 3).map(genreFr).join(", ")].filter(Boolean).join(" · ")}</p>
            <h1 className="mt-1 text-balance text-[clamp(28px,4.5vw,46px)] font-bold leading-[1.05]">{g.name}</h1>
            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
              <div><b className="block font-display text-3xl text-violet-hi">{friendAvg?.toFixed(1) ?? "–"}</b><span className="text-xs text-mute">moyenne amis</span></div>
              <div><b className="block font-display text-3xl">{allAvg?.toFixed(1) ?? "–"}</b><span className="text-xs text-mute">sur Lightwess</span></div>
              <div><b className="block font-display text-3xl">{owners}</b><span className="text-xs text-mute">joueurs l&apos;ont</span></div>
              <div><b className="block font-display text-3xl">{g.avg_hours ? `≈${Math.round(g.avg_hours)} h` : "–"}</b><span className="text-xs text-mute">pour finir</span></div>
            </div>
            {g.platforms.length > 0 && <p className="mt-3 text-xs text-faint">{g.platforms.join(" · ")}</p>}
          </div>
        </div>
      </section>

      {focus && (
        <section className="mt-6 rounded-3xl border p-5 sm:p-6" style={{ borderColor: (focus.profile.accent_color || "#8b5cf6") + "66", background: `linear-gradient(135deg, ${(focus.profile.accent_color || "#8b5cf6")}1f, transparent 60%), var(--color-card)` }}>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/u/${focus.profile.handle}`} className="flex items-center gap-3">
              <Avatar profile={focus.profile} size={48} />
              <span><span className="block text-xs font-semibold uppercase tracking-wider text-mute">L&apos;avis de</span><b className="text-lg hover:underline">{focus.profile.display_name || `@${focus.profile.handle}`}</b></span>
            </Link>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold">{STATUS_LABEL[focus.status]}</span>
            {focus.rating != null && <span className="ml-auto flex items-center gap-2"><Stars value={Number(focus.rating)} size={18} /><b className="font-display text-2xl">{Number(focus.rating).toFixed(1)}</b></span>}
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {focus.playtime_hours != null && <div><dt className="text-xs text-mute">Temps de jeu</dt><dd className="font-semibold">{focus.playtime_hours} h</dd></div>}
            {focus.difficulty != null && <div><dt className="text-xs text-mute">Difficulté</dt><dd className="font-semibold">{Number(focus.difficulty).toFixed(1)} / 5</dd></div>}
            {focus.platform && <div><dt className="text-xs text-mute">Plateforme</dt><dd className="font-semibold">{focus.platform}</dd></div>}
            {focus.started_on && <div><dt className="text-xs text-mute">Commencé le</dt><dd className="font-semibold">{fmtDate(focus.started_on)}</dd></div>}
            {focus.finished_on && <div><dt className="text-xs text-mute">Terminé le</dt><dd className="font-semibold">{fmtDate(focus.finished_on)}</dd></div>}
            {focus.top_rank && <div><dt className="text-xs text-mute">Son top 5</dt><dd className="font-semibold">N°{focus.top_rank}</dd></div>}
          </dl>

          {Object.keys(focus.scores ?? {}).length > 0 && (
            <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {CATEGORIES.filter((c) => typeof focus.scores?.[c.key] === "number").map((c) => (
                <div key={c.key} className="grid grid-cols-[110px_1fr_30px] items-center gap-3 text-sm">
                  <span className="text-mute">{c.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full" style={{ width: `${(focus.scores[c.key] / 5) * 100}%`, background: focus.profile.accent_color || "#8b5cf6" }} /></span>
                  <b className="text-right">{focus.scores[c.key].toFixed(1)}</b>
                </div>
              ))}
            </div>
          )}

          <ReviewText r={focus} className="mt-4 text-[15px]" />
          {!focus.review && !focus.spoiler_text && focus.rating == null && <p className="mt-3 text-sm text-mute">Pas encore d&apos;avis écrit sur ce jeu.</p>}
        </section>
      )}
      {de && !focus && <p className="mt-6 rounded-2xl border border-line bg-card/70 px-4 py-3 text-sm text-mute">@{de} n&apos;a pas ce jeu dans sa collection (ou elle n&apos;est pas visible pour toi).</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <FoldEditor folded={!!focus && !mine} gameName={g.name}>
          <GameEditor gameId={g.id} gameName={g.name} entry={(mine as UserGame | null) ?? null} topsUsed={((tops ?? []) as { top_rank: number; game_id: string }[]).filter((t) => t.game_id !== g.id).map((t) => t.top_rank)} />
        </FoldEditor>

        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-line bg-card/80 p-5">
            <h2 className="text-lg font-bold">Notes par catégorie <span className="text-sm font-normal text-mute">{friendRated.length ? "(amis)" : "(tous)"}</span></h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {cats.map((c) => (
                <div key={c.key} className="grid grid-cols-[110px_1fr_34px] items-center gap-3 text-sm">
                  <span className="text-mute">{c.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/8"><span className="block h-full rounded-full bg-violet" style={{ width: `${((c.v ?? 0) / 5) * 100}%` }} /></span>
                  <b className="text-right">{c.v?.toFixed(1) ?? "–"}</b>
                </div>
              ))}
            </div>
          </section>

          {friendsWithIt.length > 0 && (
            <section className="rounded-3xl border border-line bg-card/80 p-5">
              <h2 className="text-lg font-bold">Tes amis et ce jeu</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {friendsWithIt.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                    <a href={`/u/${f.profile.handle}`} className="font-semibold hover:underline">@{f.profile.handle}</a>
                    <span className="text-mute">{({ a_faire: "veut y jouer", en_cours: "joue en ce moment", termine: "l'a terminé", platine: "l'a platiné", abandonne: "a abandonné" } as const)[f.status]}</span>
                    {f.rating != null && <Stars value={Number(f.rating)} size={13} />}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(summaryFr || g.summary) && (
            <section className="rounded-3xl border border-line bg-card/80 p-5">
              <h2 className="text-lg font-bold">Résumé</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink2">{summaryFr || g.summary}</p>
              {!summaryFr && <p className="mt-2 text-[11px] text-faint">Pas encore de résumé en français pour ce jeu : voici celui d&apos;IGDB.com, en anglais.</p>}
            </section>
          )}
        </div>
      </div>

      <Reviews reviews={reviews as ReviewRow[]} meId={user!.id} />
    </div>
  );
}
