import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MiniProfileHeader from "@/components/MiniProfileHeader";
import { createClient, type Profile } from "@/lib/supabase/server";
import type { Game, UserGame } from "@/lib/types";
import Journal, { type Entry } from "./Journal";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ annee?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `Journal de @${decodeURIComponent(handle)}` };
}

export default async function JournalPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { annee } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").eq("handle", decodeURIComponent(handle).toLowerCase()).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;
  const isMe = user?.id === p.id;
  const { data: canView } = await supabase.rpc("can_view_collection", { owner: p.id });

  const { data: rowsData } = canView
    ? await supabase.from("user_games").select("*, game:games(id,name,cover_url,banner_url,dominant_color,genres,release_year)").eq("user_id", p.id)
    : { data: [] };
  const rows = (rowsData ?? []) as (UserGame & { game: Game })[];

  // Chaque date saisie devient une entrée du journal (on se fie aux dates de fin/début, pas à la date d'ajout).
  const entries: Entry[] = [];
  for (const r of rows) {
    if (r.finished_on && (r.status === "termine" || r.status === "platine" || r.status === "abandonne"))
      entries.push({ key: r.id + "f", date: r.finished_on, kind: r.status === "platine" ? "platine" : r.status === "abandonne" ? "abandon" : "fini", row: r });
    if (r.started_on) entries.push({ key: r.id + "s", date: r.started_on, kind: "debut", row: r });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === "debut" ? 1 : -1));
  const finished = entries.filter((e) => e.kind === "fini" || e.kind === "platine").length;

  return (
    <div className="fade-up">
      <MiniProfileHeader p={p} title="Journal" subtitle={canView ? `${finished} jeu${finished > 1 ? "x" : ""} terminé${finished > 1 ? "s" : ""} au fil du temps` : undefined} />
      {canView ? (
        <Journal entries={entries} from={isMe ? undefined : p.handle!} isMe={isMe} initialYear={Number(annee) || undefined} />
      ) : (
        <p className="mt-6 rounded-3xl border border-line bg-card/70 p-8 text-center text-mute">Ce journal est privé.</p>
      )}
    </div>
  );
}
