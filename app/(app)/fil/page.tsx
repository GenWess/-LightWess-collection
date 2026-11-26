import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Cover from "@/components/Cover";
import { btnPrimary } from "@/components/ui";
import { getSessionProfile } from "@/lib/supabase/server";
import type { Game, MiniProfile, UserGame } from "@/lib/types";
import { ReviewCard, type ReviewRow } from "../jeu/[id]/Reviews";

export const metadata: Metadata = { title: "Fil d'amis" };

const VERB: Record<string, string> = { a_faire: "veut jouer à", en_cours: "joue à", termine: "a terminé", platine: "a platiné", abandonne: "a abandonné" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const { data: friends } = await supabase.rpc("my_friends");
  const ids = ((friends ?? []) as { friend_id: string }[]).map((f) => f.friend_id);

  if (!ids.length)
    return (
      <div className="fade-up">
        <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Fil d&apos;amis</h1>
        <div className="rounded-3xl border border-line bg-card/70 p-10 text-center">
          <p className="text-xl font-bold">C&apos;est calme ici</p>
          <p className="mx-auto mt-2 max-w-md text-mute">Ajoute tes amis avec leur @pseudo : leurs jeux finis, leurs notes et leurs avis apparaîtront ici.</p>
          <Link href="/amis" className={`${btnPrimary} mt-5`}>Trouver des amis</Link>
        </div>
      </div>
    );

  const { data } = await supabase
    .from("user_games")
    .select("*, game:games(id,name,cover_url,banner_url,dominant_color), profile:profiles(id,handle,display_name,avatar_url,accent_color), likes:review_likes(user_id), replies:review_replies(id,body,created_at,user_id,profile:profiles(id,handle,display_name,avatar_url,accent_color))")
    .in("user_id", ids)
    .order("updated_at", { ascending: false })
    .limit(80);
  const rows = (data ?? []) as (UserGame & { game: Game; profile: MiniProfile } & Pick<ReviewRow, "likes" | "replies">)[];
  const finished = rows.filter((r) => r.status === "termine" || r.status === "platine").slice(0, 12);

  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Ce que jouent tes amis</p>
      <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Fil d&apos;amis</h1>

      {finished.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Terminés récemment</h2>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3">
            {finished.map((r) => (
              <Link key={r.id} href={`/jeu/${r.game.id}`} className="w-32 shrink-0 snap-start">
                <Cover game={r.game} className="[--cover-fs:32px]">
                  <span className="absolute bottom-2 left-2 z-[2] rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">@{r.profile.handle}</span>
                </Cover>
                <p className="mt-2 truncate text-sm font-semibold">{r.game.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex max-w-3xl flex-col gap-3">
        {rows.map((r) =>
          r.rating != null || r.review ? (
            <ReviewCard key={r.id} r={{ ...r, isFriend: true } as ReviewRow & { game: { id: string; name: string } }} meId={user!.id} showGame />
          ) : (
            <div key={r.id} className="flex items-center gap-3 rounded-3xl border border-line bg-card/60 p-3 text-sm">
              <Avatar profile={r.profile} size={32} />
              <p className="flex-1"><Link href={`/u/${r.profile.handle}`} className="font-semibold hover:underline">@{r.profile.handle}</Link> <span className="text-mute">{VERB[r.status]}</span> <Link href={`/jeu/${r.game.id}`} className="font-semibold hover:underline">{r.game.name}</Link></p>
              <Link href={`/jeu/${r.game.id}`} className="w-10 shrink-0"><Cover game={r.game} className="rounded-lg [--cover-fs:10px]" /></Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}
