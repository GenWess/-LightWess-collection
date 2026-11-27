import type { Metadata } from "next";
import ListCard from "@/components/ListCard";
import { loadLists } from "@/lib/lists";
import { getSessionProfile } from "@/lib/supabase/server";
import NewList from "./NewList";

export const metadata: Metadata = { title: "Listes" };

export default async function Page() {
  const { supabase, user } = await getSessionProfile();
  const { data: friends } = await supabase.rpc("my_friends");
  const ids = ((friends ?? []) as { friend_id: string }[]).map((f) => f.friend_id);
  const [{ error }, mine, theirs, everyone] = await Promise.all([
    supabase.from("lists").select("id", { head: true, count: "exact" }).limit(1),
    loadLists(supabase, { userId: user!.id }),
    loadLists(supabase, { userIds: ids, publicOnly: true, limit: 24 }),
    loadLists(supabase, { publicOnly: true, limit: 24 }),
  ]);
  const others = everyone.filter((l) => l.user_id !== user!.id && !ids.includes(l.user_id) && l.count > 0);

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mute">Top 10, jeux solo, pépites indé…</p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Listes</h1>
        </div>
        {!error && <NewList />}
      </div>

      {error ? (
        <p className="rounded-3xl border border-line bg-card/70 p-8 text-center text-mute">Les listes ne sont pas encore activées : colle le fichier <b className="text-ink">004_mise_a_jour.sql</b> dans Supabase → SQL Editor → Run.</p>
      ) : (
        <>
          <Section title="Mes listes" empty="Crée ta première liste : ton top 10, tes jeux solo préférés, tes pépites… Tu choisis si elle est publique ou privée.">
            {mine.map((l) => <ListCard key={l.id} l={l} showAuthor={false} />)}
          </Section>
          {theirs.length > 0 && <Section title="Listes de tes amis">{theirs.map((l) => <ListCard key={l.id} l={l} />)}</Section>}
          {others.length > 0 && <Section title="Sur Lightwess">{others.map((l) => <ListCard key={l.id} l={l} />)}</Section>}
        </>
      )}
    </div>
  );
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode[]; empty?: string }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {children.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div> : <p className="rounded-3xl border border-dashed border-white/15 p-6 text-center text-mute">{empty}</p>}
    </section>
  );
}
