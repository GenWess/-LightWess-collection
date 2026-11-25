import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { btnGhost, panel } from "@/components/ui";
import { createClient, type Profile } from "@/lib/supabase/server";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}` };
}

const STATUS = [
  ["termine", "Terminés"],
  ["platine", "Platine / 100 %"],
  ["en_cours", "En cours"],
  ["a_faire", "À faire"],
  ["abandonne", "Abandonnés"],
] as const;

const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase.from("profiles").select("*").eq("handle", decodeURIComponent(handle).toLowerCase()).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;
  const isMe = user?.id === p.id;

  const { data: canView } = await supabase.rpc("can_view_collection", { owner: p.id });
  const { data: rows } = canView
    ? await supabase.from("user_games").select("status, rating, playtime_hours").eq("user_id", p.id)
    : { data: [] as { status: string; rating: number | null; playtime_hours: number | null }[] };
  const games = rows ?? [];
  const count = (s: string) => games.filter((g) => g.status === s).length;
  const rated = games.filter((g) => g.rating != null);
  const avg = rated.length ? rated.reduce((a, g) => a + Number(g.rating), 0) / rated.length : null;
  const hours = games.reduce((a, g) => a + Number(g.playtime_hours || 0), 0);
  const accent = p.accent_color || "#8b5cf6";

  return (
    <div className="fade-up">
      <div
        className="relative h-[clamp(140px,22vw,230px)] overflow-hidden rounded-[28px] bg-cover bg-center"
        style={{ backgroundColor: accent, backgroundImage: p.banner_url ? `url("${p.banner_url}")` : `radial-gradient(90% 140% at 85% 0%, rgba(255,255,255,.35), transparent 60%), linear-gradient(135deg, ${accent}, #1a1426)` }}
      />
      <div className="-mt-12 flex flex-col gap-4 px-3 sm:-mt-14 sm:flex-row sm:items-end sm:px-6">
        <Avatar profile={p} size={104} ring />
        <div className="flex-1 pb-1">
          <h1 className="text-[30px] font-bold leading-tight">{p.display_name || p.handle}</h1>
          <p className="text-sm text-mute">@{p.handle} · membre depuis {fmt(p.created_at)}{p.role === "admin" ? " · modérateur" : ""}</p>
          {p.bio && <p className="mt-2 max-w-[60ch] text-ink2">{p.bio}</p>}
        </div>
        {isMe && <Link href="/parametres" className={btnGhost}>Personnaliser</Link>}
      </div>

      {canView ? (
        <>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [games.length, "jeux dans la collection"],
              [count("termine") + count("platine"), "jeux terminés"],
              [avg == null ? "–" : avg.toFixed(1), "note moyenne"],
              [Math.round(hours), "heures de jeu"],
            ].map(([n, l]) => (
              <div key={String(l)} className={panel}>
                <b className="block font-display text-[28px] leading-none">{n}</b>
                <span className="mt-1 block text-[13px] text-mute">{l}</span>
              </div>
            ))}
          </div>
          <div className={`${panel} mt-4`}>
            <h2 className="text-xl font-bold">Collection</h2>
            {games.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {STATUS.map(([k, l]) => (
                  <li key={k} className="rounded-full border border-white/15 px-3 py-1.5 text-sm"><b>{count(k)}</b> <span className="text-mute">{l}</span></li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-mute">{isMe ? "Ta collection est vide pour l'instant." : `@${p.handle} n'a encore ajouté aucun jeu.`}</p>
            )}
          </div>
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
