import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListCard from "@/components/ListCard";
import MiniProfileHeader from "@/components/MiniProfileHeader";
import { loadLists } from "@/lib/lists";
import { createClient, type Profile } from "@/lib/supabase/server";
import NewList from "../../../listes/NewList";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `Listes de @${decodeURIComponent(handle)}` };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").eq("handle", decodeURIComponent(handle).toLowerCase()).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;
  const isMe = user?.id === p.id;
  const lists = await loadLists(supabase, { userId: p.id, publicOnly: !isMe });

  return (
    <div className="fade-up">
      <MiniProfileHeader p={p} title="Listes" subtitle={`${lists.length} liste${lists.length > 1 ? "s" : ""}`} />
      {isMe && <div className="mt-5"><NewList /></div>}
      {lists.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lists.map((l) => <ListCard key={l.id} l={l} showAuthor={false} />)}</div>
      ) : (
        <p className="mt-6 rounded-3xl border border-dashed border-white/15 p-10 text-center text-mute">{isMe ? "Pas encore de liste. Crée ton top 10 !" : `@${p.handle} n'a pas encore de liste publique.`}</p>
      )}
    </div>
  );
}
