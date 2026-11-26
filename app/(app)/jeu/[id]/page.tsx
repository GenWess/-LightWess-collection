import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import Glow from "@/components/Glow";
import { Stars } from "@/components/Stars";
import { getSessionProfile } from "@/lib/supabase/server";
import { CATEGORIES, type Game, type MiniProfile, type UserGame } from "@/lib/types";
import GameEditor from "./GameEditor";
import Reviews, { type ReviewRow } from "./Reviews";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("games").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Jeu" };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default async function GamePage({ params }: Props) {
  const { id } = await params;
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
  const reviews = rows.filter((r) => r.rating != null || r.review).sort((a, b) => Number(b.isFriend) - Number(a.isFriend));

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
            <p className="text-sm font-semibold text-ink2">{[g.release_year, g.genres.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</p>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <GameEditor gameId={g.id} gameName={g.name} entry={(mine as UserGame | null) ?? null} topsUsed={((tops ?? []) as { top_rank: number; game_id: string }[]).filter((t) => t.game_id !== g.id).map((t) => t.top_rank)} />

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

          {g.summary && (
            <section className="rounded-3xl border border-line bg-card/80 p-5">
              <h2 className="text-lg font-bold">Résumé</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{g.summary}</p>
              <p className="mt-2 text-[11px] text-faint">Résumé en anglais fourni par IGDB.com</p>
            </section>
          )}
        </div>
      </div>

      <Reviews reviews={reviews as ReviewRow[]} meId={user!.id} />
    </div>
  );
}
