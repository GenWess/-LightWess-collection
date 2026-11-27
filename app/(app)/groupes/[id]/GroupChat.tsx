"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import { input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { MiniProfile } from "@/lib/types";

export type Msg = { id: string; group_id: string; user_id: string; body: string | null; gif_url: string | null; created_at: string; pending?: boolean };
type Gif = { id: string; preview: string; url: string; w: number; h: number };

const day = (d: string) => {
  const x = new Date(d), now = new Date();
  const diff = Math.round((new Date(now.toDateString()).getTime() - new Date(x.toDateString()).getTime()) / 86400000);
  return diff === 0 ? "Aujourd'hui" : diff === 1 ? "Hier" : x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};
const hm = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Discussion du groupe, en direct : messages, GIFs et photos. */
export default function GroupChat({ groupId, meId, members, canModerate, initial }: { groupId: string; meId: string; members: MiniProfile[]; canModerate: boolean; initial: Msg[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prof = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Nouveaux messages en direct.
  useEffect(() => {
    const ch = supabase.channel(`groupe-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs.filter((x) => !(x.pending && x.user_id === m.user_id && x.body === m.body && x.gif_url === m.gif_url)), m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMsgs((xs) => xs.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [supabase, groupId]);

  // Toujours voir le dernier message.
  const last = msgs[msgs.length - 1]?.id;
  useEffect(() => { const b = box.current; if (b) b.scrollTo({ top: b.scrollHeight, behavior: "smooth" }); }, [last]);
  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, []);

  async function send(body: string | null, gif: string | null) {
    const clean = body?.trim().slice(0, 2000) || null;
    if (!clean && !gif) return;
    const temp: Msg = { id: "tmp-" + Date.now(), group_id: groupId, user_id: meId, body: clean, gif_url: gif, created_at: new Date().toISOString(), pending: true };
    setMsgs((xs) => [...xs, temp]);
    const { data, error } = await supabase.from("group_messages").insert({ group_id: groupId, user_id: meId, body: clean, gif_url: gif }).select().single();
    if (error) {
      setMsgs((xs) => xs.filter((x) => x.id !== temp.id));
      return toast(/group_messages/.test(error.message) ? "La discussion n'est pas encore activée (fichier 004 à lancer dans Supabase)." : "Message non envoyé", "error");
    }
    setMsgs((xs) => (xs.some((x) => x.id === data.id) ? xs.filter((x) => x.id !== temp.id) : xs.map((x) => (x.id === temp.id ? (data as Msg) : x))));
  }
  async function remove(id: string) {
    setMsgs((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("group_messages").delete().eq("id", id);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast("Image trop lourde (5 Mo maximum)", "error");
    setUploading(true);
    try {
      let blob: Blob = file, ext = file.type === "image/gif" ? "gif" : "webp";
      if (file.type !== "image/gif") {
        // Photo : on la réduit (plus rapide à envoyer et à afficher).
        const img = await createImageBitmap(file);
        const s = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Image illisible"))), "image/webp", 0.85));
        ext = "webp";
      }
      const path = `${meId}/chat-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: ext === "gif" ? "image/gif" : "image/webp" });
      if (error) throw error;
      await send(null, supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      toast("Envoi impossible : " + (e as Error).message, "error");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="flex h-[min(68dvh,640px)] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-line bg-card/80 backdrop-blur">
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {!msgs.length && (
          <div className="grid h-full place-items-center text-center">
            <div><p className="text-4xl">💬</p><p className="mt-2 font-semibold">Lancez la discussion !</p><p className="text-sm text-mute">Un message, un GIF, une capture de ton dernier boss…</p></div>
          </div>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1], next = msgs[i + 1];
          const mine = m.user_id === meId;
          const p = prof.get(m.user_id);
          const newDay = !prev || day(prev.created_at) !== day(m.created_at);
          const first = newDay || prev.user_id !== m.user_id || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60000;
          const lastOfRun = !next || next.user_id !== m.user_id || day(next.created_at) !== day(m.created_at) || new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60000;
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">{day(m.created_at)}</p>}
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: m.pending ? 0.6 : 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""} ${first ? "mt-3" : "mt-0.5"}`}>
                <div className="w-8 shrink-0">{!mine && lastOfRun && p && <Link href={`/u/${p.handle}`}><Avatar profile={p} size={32} /></Link>}</div>
                <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && first && p && <span className="mb-0.5 ml-1 text-xs font-semibold" style={{ color: p.accent_color }}>{p.display_name || p.handle}</span>}
                  <button type="button" onClick={() => setSel((s) => (s === m.id ? null : m.id))} className="text-left">
                    {m.gif_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.gif_url} alt="GIF" loading="lazy" className="max-h-64 max-w-full rounded-2xl" />
                    )}
                    {m.body && (
                      <p className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug ${m.gif_url ? "mt-1" : ""} ${mine ? "rounded-[20px] rounded-br-md bg-violet text-white" : "rounded-[20px] rounded-bl-md bg-white/[.08] text-ink"}`}>{m.body}</p>
                    )}
                  </button>
                  <AnimatePresence>
                    {sel === m.id && (
                      <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 flex items-center gap-3 px-1 text-[11px] text-faint">
                        {hm(m.created_at)}
                        {(mine || canModerate) && !m.pending && <button onClick={() => remove(m.id)} className="font-semibold text-no">Supprimer</button>}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const t = text; setText(""); void send(t, null); }} className="flex items-end gap-2 border-t border-line bg-night2/80 p-2.5">
        <button type="button" onClick={() => setGifOpen(true)} className="grid h-11 shrink-0 place-items-center rounded-full border border-white/15 px-3 text-xs font-bold text-ink2 transition hover:bg-white/10 active:scale-95" aria-label="Envoyer un GIF">GIF</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-ink2 transition hover:bg-white/10 active:scale-95 disabled:opacity-50" aria-label="Envoyer une photo">
          {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-9 8" /></svg>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Écris un message…" aria-label="Message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); const t = text; setText(""); void send(t, null); } }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-white/12 bg-night px-4 py-2.5 text-[15px] leading-snug text-ink placeholder:text-faint focus:border-violet focus:outline-none" />
        <motion.button whileTap={{ scale: 0.88 }} disabled={!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet text-white transition disabled:opacity-40" aria-label="Envoyer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </motion.button>
      </form>

      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onPick={(url) => { setGifOpen(false); void send(null, url); }} onUpload={() => { setGifOpen(false); fileRef.current?.click(); }} />
    </section>
  );
}

function GifPicker({ open, onClose, onPick, onUpload }: { open: boolean; onClose: () => void; onPick: (url: string) => void; onUpload: () => void }) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/gifs?q=${encodeURIComponent(q)}`).catch(() => null);
      const j = r?.ok ? await r.json() : { enabled: false, results: [] };
      setEnabled(j.enabled); setGifs(j.results ?? []);
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <Sheet open={open} onClose={onClose} label="Choisir un GIF"
      handleArea={<div className="flex items-center gap-2 p-4 pt-2"><input className={`${input} min-h-11`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un GIF (gg, rage, boss…)" aria-label="Chercher un GIF" /><button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-mute" aria-label="Fermer">✕</button></div>}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {enabled === false ? (
          <div className="flex flex-col gap-3 py-2">
            <button onClick={onUpload} className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-left font-semibold hover:bg-white/10">📱 Envoyer un GIF ou une image depuis mon téléphone</button>
            <form onSubmit={(e) => { e.preventDefault(); if (/^https:\/\/\S+$/.test(link.trim())) onPick(link.trim()); else toast("Colle un lien qui commence par https://", "error"); }} className="flex gap-2">
              <input className={`${input} min-h-11`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="…ou colle le lien d'un GIF" aria-label="Lien d'un GIF" />
              <button className="rounded-2xl bg-violet px-4 font-semibold text-white">OK</button>
            </form>
            <p className="text-xs text-faint">Pour chercher des GIFs directement ici, il faut ajouter une clé GIPHY gratuite dans Vercel (GIPHY_API_KEY).</p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2 sm:columns-3">
              {gifs.map((g) => (
                <button key={g.id} onClick={() => onPick(g.url)} className="mb-2 block w-full overflow-hidden rounded-xl bg-white/5 transition active:scale-95" style={{ aspectRatio: `${g.w} / ${g.h}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.preview} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {enabled && !gifs.length && <p className="p-4 text-center text-sm text-mute">Aucun GIF trouvé.</p>}
            <button onClick={onUpload} className="mt-2 w-full rounded-2xl border border-white/12 px-4 py-2.5 text-sm font-semibold text-ink2 hover:bg-white/5">Envoyer depuis mon téléphone</button>
            <p className="mt-2 text-center text-[10px] text-faint">GIFs : GIPHY / Tenor</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
