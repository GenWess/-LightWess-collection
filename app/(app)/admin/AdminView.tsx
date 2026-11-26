"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/server";

export type Stats = {
  users: number; users_7d: number; active_7d: number; reviews: number; games: number; collection_rows: number;
  daily: { day: string; visits: number; signups: number }[];
  top_games: { id: string; name: string; cover_url: string | null; owners: number }[];
};

const d = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function AdminView({ stats, members, reviews, meId }: { stats: Stats; members: Profile[]; reviews: { id: string; review: string; rating: number | null; updated_at: string; profile: { handle: string }; game: { id: string; name: string } }[]; meId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [msg, setMsg] = useState("");
  const daily = stats.daily ?? [];
  const max = Math.max(1, ...daily.map((x) => x.visits));
  const v7 = daily.slice(-7).reduce((a, x) => a + x.visits, 0);
  const vPrev = daily.slice(-14, -7).reduce((a, x) => a + x.visits, 0);

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    setMsg(error ? "Erreur : " + error.message : ok);
    router.refresh();
  }

  const kpis: [string | number, string, string?][] = [
    [stats.users, "membres", `+${stats.users_7d} cette semaine`],
    [stats.active_7d, "actifs sur 7 jours"],
    [v7, "visites sur 7 jours", vPrev ? `${v7 >= vPrev ? "+" : ""}${Math.round(((v7 - vPrev) / vPrev) * 100)} % vs semaine d'avant` : undefined],
    [stats.reviews, "avis et notes"],
    [stats.games, "jeux dans la base"],
  ];

  return (
    <div className="fade-up">
      <p className="text-sm font-semibold text-mute">Les chiffres de ton site, en direct</p>
      <h1 className="mb-6 text-[clamp(28px,4vw,40px)] font-bold">Modération</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(([n, l, sub]) => (
          <div key={l} className={panel}>
            <b className="block font-display text-3xl leading-none">{n}</b>
            <span className="mt-1 block text-[13px] text-mute">{l}</span>
            {sub && <span className="mt-1 block text-xs font-semibold text-ok">{sub}</span>}
          </div>
        ))}
      </div>

      <section className={`${panel} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Visites et inscriptions, 30 derniers jours</h2>
          <span className="text-xs text-mute"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-violet" />visites <span className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-ok" />jours avec inscriptions</span>
        </div>
        <div className="mt-4 grid h-36 items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${daily.length || 1}, minmax(0,1fr))` }}>
          {daily.map((x) => (
            <span key={x.day} title={`${d(x.day)} : ${x.visits} visites, ${x.signups} inscriptions`} className="block rounded-t-[3px] bg-violet" style={{ height: `${(x.visits / max) * 100}%`, minHeight: 2, boxShadow: x.signups ? "inset 0 4px 0 #3ddc97" : undefined }} />
          ))}
        </div>
        {daily.length > 0 && <div className="mt-1 flex justify-between text-xs text-faint"><span>{d(daily[0].day)}</span><span>aujourd&apos;hui</span></div>}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-lg font-bold">Jeux les plus ajoutés</h2>
          <ol className="mt-2">
            {(stats.top_games ?? []).map((g, i) => (
              <li key={g.id}><Link href={`/jeu/${g.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"><span className="w-5 text-right text-sm text-faint">{i + 1}</span><span className="flex-1 truncate">{g.name}</span><b>{g.owners}</b></Link></li>
            ))}
            {!stats.top_games?.length && <li className="text-mute">Aucun jeu pour l&apos;instant.</li>}
          </ol>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-bold">Derniers avis</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {reviews.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 text-sm">
                <div className="min-w-0 flex-1"><b>@{r.profile.handle}</b> sur <Link href={`/jeu/${r.game.id}`} className="font-semibold hover:underline">{r.game.name}</Link><p className="line-clamp-2 text-ink2">{r.review}</p></div>
                <button className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-no hover:bg-no/10" onClick={() => run(supabase.from("user_games").update({ review: null }).eq("id", r.id), "Avis supprimé")}>Supprimer</button>
              </li>
            ))}
            {!reviews.length && <li className="text-mute">Aucun avis écrit pour l&apos;instant.</li>}
          </ul>
        </section>
      </div>

      <section className={`${panel} mt-5`}>
        <h2 className="text-lg font-bold">Membres <span className="text-base font-normal text-mute">{members.length}</span></h2>
        <p className="text-sm text-mute" aria-live="polite">{msg}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-mute"><th className="py-2">Joueur</th><th>Inscrit le</th><th>Rôle</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="py-2"><Link href={`/u/${m.handle}`} className="flex items-center gap-2 font-semibold"><Avatar profile={m} size={28} />@{m.handle ?? "—"}{m.is_banned && <span className="text-xs text-no">suspendu</span>}</Link></td>
                  <td className="whitespace-nowrap">{d(m.created_at)}</td>
                  <td>{m.role === "admin" ? "Modo" : "Membre"}</td>
                  <td className="py-2 text-right">
                    {m.id !== meId && (
                      <div className="flex justify-end gap-1">
                        <button className="rounded-lg border border-white/12 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/5" onClick={() => run(supabase.from("profiles").update({ is_banned: !m.is_banned }).eq("id", m.id), m.is_banned ? "Compte réactivé" : "Compte suspendu")}>{m.is_banned ? "Réactiver" : "Suspendre"}</button>
                        <button className="rounded-lg border border-white/12 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/5" onClick={() => run(supabase.from("profiles").update({ role: m.role === "admin" ? "user" : "admin" }).eq("id", m.id), "Rôle modifié")}>{m.role === "admin" ? "Retirer modo" : "Nommer modo"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
