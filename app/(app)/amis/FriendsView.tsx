"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import CopyLink from "@/components/CopyLink";
import { btnGhost, btnPrimary, input, panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sound";
import type { MiniProfile } from "@/lib/types";

export type Req = { id: string; status: "pending" | "accepted" | "declined"; created_at: string; requester_id: string; addressee_id: string };
type Row = Req & { requester: MiniProfile; addressee: MiniProfile };

function Person({ p, children }: { p: MiniProfile; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5">
      <Link href={`/u/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar profile={p} size={44} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{p.display_name || p.handle}</span>
          <span className="block truncate text-sm text-mute">@{p.handle}</span>
        </span>
      </Link>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}

export default function FriendsView({ meId, myHandle, rows }: { meId: string; myHandle: string; rows: Row[] }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [q, setQ] = useState("");
  const [found, setFound] = useState<MiniProfile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const other = (r: Row) => (r.requester_id === meId ? r.addressee : r.requester);
  const received = rows.filter((r) => r.status === "pending" && r.addressee_id === meId);
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === meId);
  const friends = rows.filter((r) => r.status === "accepted");
  const relation = new Map(rows.map((r) => [other(r).id, r]));

  useEffect(() => {
    const term = q.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
    if (term.length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id,handle,display_name,avatar_url,accent_color").ilike("handle", `${term}%`).neq("id", meId).not("handle", "is", null).limit(12);
      setFound((data ?? []) as MiniProfile[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, meId, supabase]);

  // Nouvelles demandes en direct.
  useEffect(() => {
    const ch = supabase.channel("friendships-me")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${meId}` }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [meId, router, supabase]);

  async function act(key: string, fn: () => PromiseLike<{ error: { message: string; code?: string } | null }>, okSound: () => void, okMsg: string) {
    setBusy(key); setMsg("");
    const { error } = await fn();
    setBusy(null);
    if (error) { sfx.err(); setMsg(error.code === "23505" ? "Une demande existe déjà entre vous." : "Erreur : " + error.message); return; }
    okSound(); setMsg(okMsg); router.refresh();
  }

  const request = (p: MiniProfile) => act(p.id, () => supabase.from("friendships").insert({ requester_id: meId, addressee_id: p.id }), sfx.ok, `Demande envoyée à @${p.handle}`);
  const answer = (r: Row, status: "accepted" | "declined") => act(r.id, () => supabase.from("friendships").update({ status }).eq("id", r.id), status === "accepted" ? sfx.match : sfx.no, status === "accepted" ? `Tu es maintenant ami avec @${other(r).handle} 🎉` : "Demande refusée");
  const remove = (r: Row, txt: string) => act(r.id, () => supabase.from("friendships").delete().eq("id", r.id), sfx.no, txt);

  function actionFor(p: MiniProfile) {
    const r = relation.get(p.id);
    if (!r || r.status === "declined") {
      if (r && r.status === "declined") return <span className="text-sm text-faint">Indisponible</span>;
      return <button className={`${btnPrimary} min-h-10 px-4 text-sm`} disabled={busy === p.id} onClick={() => request(p)} data-nosound>Ajouter</button>;
    }
    if (r.status === "accepted") return <span className="rounded-full bg-ok/15 px-3 py-1.5 text-sm font-semibold text-ok">Ami</span>;
    if (r.addressee_id === meId) return <button className={`${btnPrimary} min-h-10 px-4 text-sm`} onClick={() => answer(r, "accepted")} data-nosound>Accepter</button>;
    return <span className="text-sm text-mute">Demande envoyée</span>;
  }

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mute">Ton pseudo : @{myHandle}</p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Amis</h1>
        </div>
        <CopyLink handle={myHandle} />
      </div>
      <p className="-mt-3 mb-6 text-sm text-mute">Envoie ton lien d&apos;ami à tes potes : un clic et ils t&apos;ajoutent, même s&apos;ils n&apos;ont pas encore de compte.</p>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className={panel}>
            <h2 className="text-lg font-bold">Trouver un joueur</h2>
            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-violet-hi">@</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} className={`${input} pl-9`} placeholder="pseudo de ton ami" aria-label="Chercher un @pseudo" autoComplete="off" />
            </div>
            <div className="mt-2">
              {found.map((p) => <Person key={p.id} p={p}>{actionFor(p)}</Person>)}
              {q.trim().length >= 2 && !found.length && <p className="p-2 text-sm text-mute">Personne avec ce pseudo. Vérifie l&apos;orthographe ou invite ton ami à s&apos;inscrire.</p>}
            </div>
            <p className="mt-1 text-sm text-mute" aria-live="polite">{msg}</p>
          </section>

          <section className={panel}>
            <h2 className="text-lg font-bold">Mes amis <span className="text-base font-normal text-mute">{friends.length}</span></h2>
            <div className="mt-2">
              {friends.length ? friends.map((r) => (
                <Person key={r.id} p={other(r)}>
                  <button className={`${btnGhost} min-h-10 px-3 text-sm`} onClick={() => remove(r, "Ami retiré")}>Retirer</button>
                </Person>
              )) : <p className="p-2 text-mute">Pas encore d&apos;amis. Cherche leur @pseudo juste au-dessus.</p>}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className={panel}>
            <h2 className="text-lg font-bold">Demandes reçues <span className="text-base font-normal text-mute">{received.length}</span></h2>
            <div className="mt-2">
              {received.length ? received.map((r) => (
                <Person key={r.id} p={r.requester}>
                  <button className={`${btnPrimary} min-h-10 px-4 text-sm`} disabled={busy === r.id} onClick={() => answer(r, "accepted")} data-nosound>Accepter</button>
                  <button className={`${btnGhost} min-h-10 px-3 text-sm`} disabled={busy === r.id} onClick={() => answer(r, "declined")} data-nosound>Refuser</button>
                </Person>
              )) : <p className="p-2 text-sm text-mute">Aucune demande en attente.</p>}
            </div>
          </section>
          <section className={panel}>
            <h2 className="text-lg font-bold">Demandes envoyées <span className="text-base font-normal text-mute">{sent.length}</span></h2>
            <div className="mt-2">
              {sent.length ? sent.map((r) => (
                <Person key={r.id} p={r.addressee}>
                  <button className={`${btnGhost} min-h-10 px-3 text-sm`} onClick={() => remove(r, "Demande annulée")}>Annuler</button>
                </Person>
              )) : <p className="p-2 text-sm text-mute">Aucune demande envoyée.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
