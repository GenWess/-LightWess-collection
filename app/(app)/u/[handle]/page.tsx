import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import FriendButton from "@/components/FriendButton";
import GameTile from "@/components/GameTile";
import TopFan from "@/components/TopFan";
import { btnGhost, panel } from "@/components/ui";
import { createClient, type Profile } from "@/lib/supabase/server";
import { STATUSES, type Game, type UserGame } from "@/lib/types";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}` };
}

const fmtMonth = (d: string) => new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

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

  const { data: rowsData } = canView
    ? await supabase.from("user_games").select("*, game:games(*)").eq("user_id", p.id).order("updated_at", { ascending: false })
    : { data: [] };
  const rows = (rowsData ?? []) as (UserGame & { game: Game })[];

  const done = rows.filter((r) => r.status === "termine" || r.status === "platine");
  const rated = rows.filter((r) => r.rating != null);
  const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : null;
  const hours = rows.reduce((a, r) => a + Number(r.playtime_hours || 0), 0);
  const year = new Date().getFullYear();
  const doneYear = done.filter((r) => r.finished_on?.startsWith(String(year)));
  const months = MONTHS.map((_, m) => doneYear.filter((r) => Number(r.finished_on!.slice(5, 7)) === m + 1).length);
  const maxM = Math.max(1, ...months);
  const top: (Game | null)[] = [1, 2, 3, 4, 5].map((n) => rows.find((r) => r.top_rank === n)?.game ?? null);
  const playing = rows.filter((r) => r.status === "en_cours");
  const recent = done.slice().sort((a, b) => (b.finished_on ?? "").localeCompare(a.finished_on ?? "")).slice(0, 12);
  const accent = p.accent_color || "#8b5cf6";

  return (
    <div className="fade-up">
      {/* Bannière */}
      <div
        className="h-[clamp(140px,22vw,230px)] rounded-[28px] bg-cover bg-center"
        style={{ backgroundColor: accent, backgroundImage: p.banner_url ? `url("${p.banner_url}")` : `radial-gradient(90% 140% at 85% 0%, rgba(255,255,255,.35), transparent 60%), linear-gradient(135deg, ${accent}, #1a1426)` }}
      />
      {/* En-tête : passe AU-DESSUS de la bannière (relative + z-index) */}
      <div className="relative z-10 -mt-14 flex flex-col gap-3 px-3 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5 sm:px-6">
        <Avatar profile={p} size={112} ring />
        <div className="min-w-0 flex-1 sm:pb-1">
          <h1 className="text-[30px] font-bold leading-tight">{p.display_name || p.handle}</h1>
          <p className="text-sm text-mute">@{p.handle} · membre depuis {fmtMonth(p.created_at)}{p.role === "admin" ? " · modérateur" : ""}</p>
          {p.bio && <p className="mt-2 max-w-[60ch] text-ink2">{p.bio}</p>}
        </div>
        <div className="sm:pb-1">
          {isMe ? <Link href="/parametres" className={btnGhost}>Personnaliser</Link> : <FriendButton meId={user!.id} otherId={p.id} rel={rel as { id: string; status: string; requester_id: string } | null} />}
        </div>
      </div>

      {canView ? (
        <>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[rows.length, "jeux dans la collection"], [done.length, "jeux terminés"], [avg == null ? "–" : avg.toFixed(1), "note moyenne"], [Math.round(hours), "heures de jeu"]].map(([n, l]) => (
              <div key={String(l)} className={panel}>
                <b className="block font-display text-[28px] leading-none">{n}</b>
                <span className="mt-1 block text-[13px] text-mute">{l}</span>
              </div>
            ))}
          </div>

          {(isMe || top.some(Boolean)) && (
            <section className="mt-8">
              <div className="flex items-baseline justify-between"><h2 className="text-xl font-bold">Top 5</h2>{isMe && <span className="text-xs text-mute">Choisis-le depuis la page d&apos;un jeu</span>}</div>
              <TopFan games={top} mine={isMe} />
            </section>
          )}

          <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className={panel}>
              <h2 className="text-lg font-bold">Terminés récemment</h2>
              {recent.length ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{recent.map((r) => <GameTile key={r.id} game={r.game} entry={r} />)}</div>
              ) : <p className="mt-2 text-mute">Aucun jeu terminé pour l&apos;instant.</p>}
            </section>
            <div className="flex flex-col gap-5">
              <section className={panel}>
                <h2 className="text-lg font-bold">Terminés en {year}</h2>
                <div className="mt-4 grid h-28 grid-cols-12 items-end gap-1.5">
                  {months.map((n, i) => (
                    <div key={i} className="flex h-full flex-col items-center justify-end gap-1 text-[11px] text-mute" title={`${n} jeu(x)`}>
                      <span>{n || ""}</span>
                      <span className="block w-full rounded-t-md bg-violet" style={{ height: `${(n / maxM) * 75}%`, minHeight: 3 }} />
                      <span>{MONTHS[i]}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className={panel}>
                <h2 className="text-lg font-bold">En cours <span className="text-base font-normal text-mute">{playing.length}</span></h2>
                <ul className="mt-2 flex flex-col">
                  {playing.slice(0, 6).map((r) => (
                    <li key={r.id}><Link href={`/jeu/${r.game.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/5"><span className="truncate">{r.game.name}</span>{r.playtime_hours ? <span className="shrink-0 text-sm text-mute">{r.playtime_hours} h</span> : null}</Link></li>
                  ))}
                  {!playing.length && <li className="text-mute">Rien en ce moment.</li>}
                </ul>
              </section>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">Collection <span className="text-base font-normal text-mute">{rows.length}</span></h2>
            {rows.length ? (
              <>
                <p className="mb-4 flex flex-wrap gap-2 text-sm">{STATUSES.map((s) => <span key={s.key} className="rounded-full border border-white/12 px-3 py-1"><b>{rows.filter((r) => r.status === s.key).length}</b> <span className="text-mute">{s.label}</span></span>)}</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6">{rows.slice(0, 48).map((r) => <GameTile key={r.id} game={r.game} entry={r} />)}</div>
                {isMe && rows.length > 48 && <Link href="/collection" className={`${btnGhost} mt-4`}>Voir toute ma collection</Link>}
              </>
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
