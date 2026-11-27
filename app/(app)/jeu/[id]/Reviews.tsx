"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import Avatar from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import ReviewText from "@/components/ReviewText";
import { createClient } from "@/lib/supabase/client";
import type { MiniProfile, UserGame } from "@/lib/types";

export type ReviewRow = UserGame & {
  profile: MiniProfile;
  isFriend: boolean;
  likes: { user_id: string }[];
  replies: { id: string; body: string; created_at: string; user_id: string; profile: MiniProfile }[];
};

const ago = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
};

export function ReviewCard({ r, meId, showGame }: { r: ReviewRow & { game?: { id: string; name: string } }; meId: string; showGame?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [liked, setLiked] = useState(r.likes.some((l) => l.user_id === meId));
  const [likes, setLikes] = useState(r.likes.length);

  async function like() {
    // Optimiste : le cœur réagit tout de suite, la base suit.
    const was = liked;
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    const { error } = was
      ? await supabase.from("review_likes").delete().eq("user_game_id", r.id).eq("user_id", meId)
      : await supabase.from("review_likes").insert({ user_game_id: r.id, user_id: meId });
    if (error) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); }
  }
  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const { error } = await supabase.from("review_replies").insert({ user_game_id: r.id, user_id: meId, body: text.trim().slice(0, 1000) });
    if (!error) { setText(""); router.refresh(); }
  }
  async function delReply(id: string) {
    await supabase.from("review_replies").delete().eq("id", id);
    router.refresh();
  }

  return (
    <article className="rounded-3xl border border-line bg-card/80 p-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/u/${r.profile.handle}`} className="flex items-center gap-2 font-semibold hover:underline"><Avatar profile={r.profile} size={30} />@{r.profile.handle}</Link>
        {r.isFriend && <span className="rounded-full bg-violet/20 px-2 py-0.5 text-[11px] font-semibold text-violet-hi">ami</span>}
        {showGame && r.game && <span className="text-mute">· <Link href={`/jeu/${r.game.id}`} className="font-semibold text-ink hover:underline">{r.game.name}</Link></span>}
        <span className="text-faint">· {ago(r.updated_at)}</span>
      </header>
      {r.rating != null && <div className="mt-2 flex items-center gap-2"><Stars value={Number(r.rating)} /><b>{Number(r.rating).toFixed(1)}</b>{r.difficulty != null && <span className="text-xs text-mute">· difficulté {Number(r.difficulty).toFixed(1)}/5</span>}</div>}
      <ReviewText r={r} className="mt-2" />
      <div className="mt-3 flex gap-1">
        <button onClick={like} className={`flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition hover:bg-white/5 ${liked ? "text-no" : "text-mute"}`} aria-pressed={liked}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
          <motion.span key={likes} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="inline-block">{likes || ""}</motion.span> J&apos;aime
        </button>
        <button onClick={() => setOpen((o) => !o)} className="flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-mute transition hover:bg-white/5">
          {r.replies.length || ""} Répondre
        </button>
      </div>
      {(open || r.replies.length > 0) && (
        <div className="mt-2 flex flex-col gap-2 border-l-2 border-line pl-3">
          {r.replies.map((x) => (
            <div key={x.id} className="flex items-start gap-2 text-sm">
              <Avatar profile={x.profile} size={24} />
              <p className="flex-1 rounded-2xl bg-white/5 px-3 py-1.5"><Link href={`/u/${x.profile.handle}`} className="font-semibold">@{x.profile.handle}</Link> {x.body}</p>
              {(x.user_id === meId || r.user_id === meId) && <button onClick={() => delReply(x.id)} className="px-1 text-faint hover:text-no" aria-label="Supprimer la réponse">✕</button>}
            </div>
          ))}
          {open && (
            <form onSubmit={reply} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ta réponse…" aria-label="Ta réponse" className="min-h-10 flex-1 rounded-xl border border-white/12 bg-night2 px-3 text-base focus:border-violet focus:outline-none" />
              <button className="rounded-xl bg-violet px-4 text-sm font-semibold text-white">Envoyer</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export default function Reviews({ reviews, meId }: { reviews: ReviewRow[]; meId: string }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-bold">Avis des joueurs <span className="text-base font-normal text-mute">{reviews.length}</span></h2>
      {reviews.length ? (
        <div className="grid gap-3 md:grid-cols-2">{reviews.map((r) => <ReviewCard key={r.id} r={r} meId={meId} />)}</div>
      ) : (
        <p className="rounded-3xl border border-line bg-card/70 p-6 text-mute">Aucun avis pour l&apos;instant. Ceux de tes amis apparaîtront ici.</p>
      )}
    </section>
  );
}
