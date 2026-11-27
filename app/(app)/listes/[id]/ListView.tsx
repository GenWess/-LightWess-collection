"use client";

import Link from "next/link";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Cover from "@/components/Cover";
import { Stars } from "@/components/Stars";
import { btnDanger, btnGhost, btnPrimary, input, label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { copy } from "@/lib/social";
import type { Game, MiniProfile } from "@/lib/types";
import { Toggle } from "../NewList";

export type Item = { game: Game; note: string | null };
type Meta = { id: string; title: string; description: string | null; ranked: boolean; is_public: boolean; updated_at: string };
type Hit = { key: string; name: string; cover_url: string | null; banner_url?: string | null; year: number | null; gameId?: string; igdbId?: number; mine?: boolean };

export default function ListView({ list, author, items: initial, authorRatings, isOwner, startEditing, collection }: {
  list: Meta; author: MiniProfile; items: Item[]; authorRatings: Record<string, number | null>; isOwner: boolean; startEditing: boolean; collection: Game[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [meta, setMeta] = useState(list);
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState(startEditing);
  const [confirmDel, setConfirmDel] = useState(false);
  const order = useRef(initial.map((i) => i.game.id).join());

  async function saveMeta(patch: Partial<Meta>) {
    setMeta((m) => ({ ...m, ...patch }));
    const { error } = await supabase.from("lists").update(patch).eq("id", meta.id);
    if (error) toast("Impossible d'enregistrer", "error");
  }
  async function saveOrder(next: Item[]) {
    const key = next.map((i) => i.game.id).join();
    if (key === order.current) return;
    order.current = key;
    const { error } = await supabase.from("list_items").upsert(next.map((it, i) => ({ list_id: meta.id, game_id: it.game.id, position: i + 1 })), { onConflict: "list_id,game_id" });
    if (error) toast("Impossible d'enregistrer l'ordre", "error");
    else void supabase.from("lists").update({ title: meta.title }).eq("id", meta.id); // met à jour « modifiée le »
  }
  async function add(g: Game) {
    if (items.some((i) => i.game.id === g.id)) return toast("Déjà dans la liste", "info");
    const next = [...items, { game: g, note: null }];
    setItems(next);
    const { error } = await supabase.from("list_items").insert({ list_id: meta.id, game_id: g.id, position: next.length });
    if (error) { setItems(items); return toast("Impossible d'ajouter ce jeu", "error"); }
    order.current = next.map((i) => i.game.id).join();
  }
  async function remove(id: string) {
    const next = items.filter((i) => i.game.id !== id);
    setItems(next);
    await supabase.from("list_items").delete().eq("list_id", meta.id).eq("game_id", id);
    order.current = "";
    void saveOrder(next);
  }
  const move = (idx: number, d: number) => {
    const j = idx + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice(); [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next); void saveOrder(next);
  };
  async function del() {
    const { error } = await supabase.from("lists").delete().eq("id", meta.id);
    if (error) return toast("Impossible de supprimer", "error");
    toast("Liste supprimée"); router.push("/listes"); router.refresh();
  }
  async function share() {
    const url = `${location.origin}/listes/${meta.id}`;
    if (await copy(url)) toast(meta.is_public ? "Lien de la liste copié" : "Lien copié (la liste est privée : seul toi peux l'ouvrir)", "success");
  }

  const hero = items[0]?.game;

  return (
    <div className="fade-up">
      {/* En-tête */}
      <section className="relative isolate overflow-hidden rounded-[30px] border border-white/10 p-5 sm:p-8">
        {hero?.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.banner_url} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/80 to-night/40" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="flex shrink-0 items-end">
            {items.slice(0, 4).map((it, i) => (
              <div key={it.game.id} className="w-16 sm:w-20" style={{ marginLeft: i ? -28 : 0, zIndex: 10 - i, transform: `rotate(${(i - 1.5) * 4}deg)` }}>
                <Cover game={it.game} className="rounded-xl shadow-[0_14px_28px_-10px_rgba(0,0,0,.9)] [--cover-fs:14px]" />
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink2">
              <Link href={`/u/${author.handle}`} className="flex items-center gap-2 font-semibold hover:underline"><Avatar profile={author} size={22} />{author.display_name || `@${author.handle}`}</Link>
              <span className="text-faint">·</span><span>{items.length} jeu{items.length > 1 ? "x" : ""}</span>
              {!meta.is_public && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">🔒 Privée</span>}
            </p>
            {editing ? (
              <input className={`${input} mt-2 font-display text-2xl font-bold`} defaultValue={meta.title} maxLength={80} aria-label="Titre de la liste"
                onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== meta.title && saveMeta({ title: e.target.value.trim() })} />
            ) : (
              <h1 className="mt-1 text-balance font-display text-[clamp(28px,4.4vw,46px)] font-bold leading-[1.05]">{meta.title}</h1>
            )}
            {editing ? (
              <textarea className={`${input} mt-2 min-h-20 py-3`} defaultValue={meta.description ?? ""} maxLength={500} placeholder="Une petite description (facultatif)" aria-label="Description"
                onBlur={(e) => (e.target.value.trim() || null) !== meta.description && saveMeta({ description: e.target.value.trim() || null })} />
            ) : meta.description && <p className="mt-2 max-w-[65ch] text-ink2">{meta.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={share} className={`${btnGhost} backdrop-blur`}>Partager</button>
            {isOwner && <button onClick={() => { setEditing((e) => !e); if (editing) router.refresh(); }} className={editing ? btnPrimary : `${btnGhost} backdrop-blur`}>{editing ? "Terminé" : "Modifier"}</button>}
          </div>
        </div>
      </section>

      {isOwner && editing && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <AddPanel collection={collection} onAdd={add} inList={new Set(items.map((i) => i.game.id))} />
          <div className="flex flex-col gap-3">
            <Toggle on={meta.ranked} set={(v) => saveMeta({ ranked: v })} title="Liste classée" desc="Les jeux sont numérotés (1, 2, 3…)" />
            <Toggle on={meta.is_public} set={(v) => saveMeta({ is_public: v })} title="Publique" desc={meta.is_public ? "Visible par tous les membres, sur ton profil" : "Visible seulement par toi"} />
            {confirmDel ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-no/40 bg-no/10 p-3">
                <span className="text-sm font-semibold">Supprimer cette liste ?</span>
                <button className={`${btnDanger} min-h-10`} onClick={del}>Oui, supprimer</button>
                <button className={`${btnGhost} min-h-10`} onClick={() => setConfirmDel(false)}>Non</button>
              </div>
            ) : <button className={`${btnDanger} self-start`} onClick={() => setConfirmDel(true)}>Supprimer la liste</button>}
          </div>
        </div>
      )}

      {/* Les jeux */}
      <div className="mt-6">
        {!items.length ? (
          <p className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-mute">{isOwner ? "Ajoute des jeux avec la recherche ci-dessus." : "Cette liste est encore vide."}</p>
        ) : editing ? (
          <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
            {items.map((it, i) => (
              <EditRow key={it.game.id} it={it} i={i} ranked={meta.ranked} total={items.length} onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => remove(it.game.id)} onDrop={() => saveOrder(items)} />
            ))}
          </Reorder.Group>
        ) : meta.ranked ? (
          <ol className="flex flex-col gap-3">
            {items.map((it, i) => (
              <motion.li key={it.game.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.04 }}>
                <Link href={`/jeu/${it.game.id}${isOwner ? "" : `?de=${author.handle}`}`} className={`group grid items-center gap-4 rounded-3xl border border-line bg-card/70 p-3 transition hover:border-white/20 hover:bg-card ${i < 3 ? "grid-cols-[56px_88px_1fr] sm:grid-cols-[84px_110px_1fr]" : "grid-cols-[56px_64px_1fr] sm:grid-cols-[84px_76px_1fr]"}`}>
                  <span className={`text-center font-display font-bold leading-none ${i === 0 ? "text-[56px] text-[#FFD45C]" : i < 3 ? "text-[48px] text-violet-hi" : "text-[36px] text-mute"}`}>{i + 1}</span>
                  <Cover game={it.game} className="rounded-xl shadow-lg transition group-hover:scale-[1.03] [--cover-fs:16px]" />
                  <span className="min-w-0">
                    <b className={`block truncate ${i < 3 ? "text-xl" : "text-lg"}`}>{it.game.name}</b>
                    <span className="text-sm text-mute">{it.game.release_year ?? ""}</span>
                    {authorRatings[it.game.id] != null && <span className="mt-1 flex items-center gap-2 text-sm"><Stars value={Number(authorRatings[it.game.id])} size={14} /><b>{Number(authorRatings[it.game.id]).toFixed(1)}</b></span>}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ol>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6">
            {items.map((it, i) => (
              <motion.div key={it.game.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 18) * 0.02 }}>
                <Link href={`/jeu/${it.game.id}${isOwner ? "" : `?de=${author.handle}`}`} className="group block">
                  <Cover game={it.game} className="shadow-lg transition group-hover:-translate-y-1 [--cover-fs:30px]" />
                  <p className="mt-2 truncate text-sm font-semibold">{it.game.name}</p>
                  {authorRatings[it.game.id] != null && <p className="text-xs text-[#FFD45C]">★ {Number(authorRatings[it.game.id]).toFixed(1)}</p>}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditRow({ it, i, ranked, total, onUp, onDown, onRemove, onDrop }: { it: Item; i: number; ranked: boolean; total: number; onUp: () => void; onDown: () => void; onRemove: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={it} dragListener={false} dragControls={controls} onDragEnd={onDrop}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2 shadow-sm" whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px -12px rgba(0,0,0,.7)" }}>
      <button onPointerDown={(e) => controls.start(e)} className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center text-faint hover:text-ink active:cursor-grabbing" aria-label="Glisser pour déplacer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
      </button>
      {ranked && <b className="w-7 shrink-0 text-center font-display text-xl text-mute">{i + 1}</b>}
      <Cover game={it.game} className="w-10 shrink-0 rounded-md [--cover-fs:10px]" />
      <span className="min-w-0 flex-1 truncate font-semibold">{it.game.name}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        <IconBtn label="Monter" disabled={i === 0} onClick={onUp} d="M6 15l6-6 6 6" />
        <IconBtn label="Descendre" disabled={i === total - 1} onClick={onDown} d="M6 9l6 6 6-6" />
        <IconBtn label="Retirer de la liste" onClick={onRemove} d="M6 6l12 12M18 6L6 18" danger />
      </span>
    </Reorder.Item>
  );
}

function IconBtn({ label, onClick, d, disabled, danger }: { label: string; onClick: () => void; d: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`grid h-9 w-9 place-items-center rounded-full transition disabled:opacity-25 ${danger ? "text-faint hover:bg-no/15 hover:text-no" : "text-mute hover:bg-white/10 hover:text-ink"}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    </button>
  );
}

/** Recherche pour ajouter : d'abord dans ma collection, puis dans tout le catalogue. */
function AddPanel({ collection, onAdd, inList }: { collection: Game[]; onAdd: (g: Game) => void; inList: Set<string> }) {
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const t = q.trim().toLowerCase();

  const local: Hit[] = useMemo(() => collection
    .filter((g) => !t || g.name.toLowerCase().includes(t))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .slice(0, t ? 12 : 8)
    .map((g) => ({ key: g.id, name: g.name, cover_url: g.cover_url, banner_url: g.banner_url, year: g.release_year, gameId: g.id, igdbId: g.igdb_id ?? undefined, mine: true })), [collection, t]);

  useEffect(() => {
    if (t.length < 2) { setRemote([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      const r = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).catch(() => null);
      const j = r?.ok ? await r.json() : { results: [] };
      const mineIgdb = new Set(collection.map((g) => g.igdb_id));
      setRemote((j.results as { igdb_id: number; name: string; cover_url: string | null; release_year: number | null }[]).filter((g) => !mineIgdb.has(g.igdb_id)).slice(0, 12)
        .map((g) => ({ key: "i" + g.igdb_id, name: g.name, cover_url: g.cover_url, year: g.release_year, igdbId: g.igdb_id })));
      setLoading(false);
    }, 280);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q, t, collection]);

  async function pick(h: Hit) {
    setAdding(h.key);
    let gameId = h.gameId;
    if (!gameId && h.igdbId) {
      const r = await fetch("/api/games/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ igdbId: h.igdbId }) }).catch(() => null);
      const j = r?.ok ? await r.json() : null;
      gameId = j?.gameId;
    }
    setAdding(null);
    if (!gameId) return toast("Impossible d'ajouter ce jeu", "error");
    onAdd({ id: gameId, name: h.name, cover_url: h.cover_url, banner_url: h.banner_url ?? null, release_year: h.year } as Game);
  }

  const Row = ({ h }: { h: Hit }) => {
    const already = !!h.gameId && inList.has(h.gameId);
    return (
      <li>
        <button onClick={() => pick(h)} disabled={already || adding === h.key} className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-1.5 text-left transition hover:bg-white/5 disabled:opacity-50">
          <Cover game={{ name: h.name, cover_url: h.cover_url, banner_url: h.banner_url ?? null }} className="w-10 rounded-md [--cover-fs:10px]" />
          <span className="min-w-0"><b className="block truncate text-sm">{h.name}</b><span className="text-xs text-mute">{h.year ?? ""}</span></span>
          <span className={`grid h-8 w-8 place-items-center rounded-full ${already ? "text-ok" : "bg-violet text-white"}`}>{adding === h.key ? "…" : already ? "✓" : "+"}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-line bg-card/80 p-4">
      <label htmlFor="addq" className={label}>Ajouter des jeux</label>
      <input id="addq" type="search" className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans ma collection ou tout le catalogue" />
      <div className="max-h-[340px] overflow-y-auto overscroll-contain">
        {local.length > 0 && <><p className="px-1.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-faint">Ma collection</p><ul>{local.map((h) => <Row key={h.key} h={h} />)}</ul></>}
        {t.length >= 2 && <p className="px-1.5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-faint">Catalogue {loading && "…"}</p>}
        {remote.length > 0 && <ul>{remote.map((h) => <Row key={h.key} h={h} />)}</ul>}
        {t.length >= 2 && !loading && !remote.length && !local.length && <p className="p-3 text-sm text-mute">Aucun jeu trouvé.</p>}
      </div>
    </div>
  );
}
