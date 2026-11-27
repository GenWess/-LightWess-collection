"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Cover from "@/components/Cover";
import { extractColor, setGlow } from "@/components/Glow";
import { Stars } from "@/components/Stars";
import { btnGhost, btnPrimary } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, genreFr, type Game, type MiniProfile, type Status } from "@/lib/types";

type FriendView = { profile: MiniProfile; rating: number | null; review: string | null; status: Status; scores: Record<string, number> };
type CardGame = Pick<Game, "name" | "cover_url" | "banner_url" | "release_year" | "genres" | "avg_hours" | "dominant_color"> & { id?: string };
export type Card = { key: string; gameId?: string; igdbId: number | null; game: CardGame; friends: FriendView[]; source: "amis" | "populaire"; igdbRating?: number | null };

const SKIP_KEY = "lw-skip-igdb";
const readSkips = (): number[] => { try { return JSON.parse(localStorage.getItem(SKIP_KEY) || "[]"); } catch { return []; } };
const STATUS_TXT: Record<Status, string> = { a_faire: "veut y jouer", en_cours: "y joue", termine: "l'a fini", platine: "l'a platiné", abandonne: "a abandonné" };

export default function SwipeDeck({ initial, ownedIgdb, hasFriends }: { initial: Card[]; ownedIgdb: number[]; hasFriends: boolean }) {
  const [supabase] = useState(() => createClient());
  const [cards, setCards] = useState<Card[]>(initial);
  const [flipped, setFlipped] = useState(false);
  const [toast, setToast] = useState<{ text: string; match?: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, y: 0, dx: 0, dy: 0, on: false, moved: 0 });
  const leaving = useRef(false);

  // Complète la pile avec des jeux très bien notés sur IGDB quand les amis n'ont plus de recos.
  const loadMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/games/popular?page=${page}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const skip = new Set([...readSkips(), ...ownedIgdb]);
      const seen = new Set(cards.map((c) => c.igdbId).filter(Boolean));
      const extra: Card[] = (j.results as (CardGame & { igdb_id: number; rating: number | null })[])
        .filter((g) => !skip.has(g.igdb_id) && !seen.has(g.igdb_id))
        .map((g) => ({ key: `igdb-${g.igdb_id}`, igdbId: g.igdb_id, game: g, friends: [], source: "populaire", igdbRating: g.rating }));
      setCards((c) => [...c, ...extra]);
      setPage((p) => p + 1);
      if (!j.results.length || page >= 10) setExhausted(true);
    } catch { setExhausted(true); }
    setLoadingMore(false);
  }, [loadingMore, exhausted, page, cards, ownedIgdb]);

  useEffect(() => { if (cards.length < 4) void loadMore(); }, [cards.length, loadMore]);

  const top = cards[0];
  useEffect(() => {
    if (!top) return;
    let alive = true;
    if (top.game.dominant_color) setGlow(top.game.dominant_color);
    else if (top.game.cover_url) extractColor(top.game.cover_url).then((c) => alive && c && setGlow(c));
    return () => { alive = false; };
  }, [top]);
  useEffect(() => () => setGlow("#8b5cf6"), []);

  function showToast(text: string, match = false) {
    setToast({ text, match });
    setTimeout(() => setToast(null), match ? 3200 : 2000);
  }

  const swipe = useCallback(async (dir: "left" | "right") => {
    const c = cards[0]; const el = topRef.current;
    if (!c || leaving.current) return;
    leaving.current = true;
    const sx = dir === "right" ? 1 : -1;
    if (el) {
      el.style.pointerEvents = "none";
      el.style.transition = "transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s";
      el.style.transform = `translate(${sx * 700}px, 40px) rotate(${sx * 28}deg)`;
      el.style.opacity = "0";
      const st = el.querySelector<HTMLElement>(dir === "right" ? "[data-stamp=yes]" : "[data-stamp=no]"); if (st) st.style.opacity = "1";
    }
    setTimeout(() => { setCards((cs) => cs.slice(1)); setFlipped(false); leaving.current = false; }, 420);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (dir === "right") {
        let gameId = c.gameId;
        if (c.igdbId && !gameId) {
          const r = await fetch("/api/games/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ igdbId: c.igdbId, status: "a_faire", source: "swipe" }) });
          gameId = (await r.json()).gameId;
        } else if (gameId) {
          await supabase.from("user_games").upsert({ user_id: user.id, game_id: gameId, status: "a_faire", source: "swipe" }, { onConflict: "user_id,game_id", ignoreDuplicates: true });
        }
        if (gameId) await supabase.from("swipes").upsert({ user_id: user.id, game_id: gameId, direction: "right" });
        const mates = c.friends.filter((f) => f.status === "a_faire").map((f) => "@" + f.profile.handle);
        if (mates.length) { showToast(`C'est un match ! ${mates.join(", ")} ${mates.length > 1 ? "veulent" : "veut"} aussi y jouer`, true); }
        else showToast(`${c.game.name} ajouté à « À faire »`);
      } else {
        if (c.gameId) await supabase.from("swipes").upsert({ user_id: user.id, game_id: c.gameId, direction: "left" });
        else if (c.igdbId) { try { localStorage.setItem(SKIP_KEY, JSON.stringify([...readSkips(), c.igdbId].slice(-2000))); } catch {} }
      }
    } catch { /* l'animation est déjà partie : on ne bloque pas l'utilisateur */ }
  }, [cards, supabase]);

  const flip = useCallback(() => { setFlipped((f) => !f); }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); void swipe("right"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); void swipe("left"); }
      else if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); flip(); }
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [swipe, flip]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button") || leaving.current) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, on: true, moved: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (topRef.current) topRef.current.style.transition = "none";
  };
  const raf = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.on || !topRef.current) return;
    d.dx = e.clientX - d.x; d.dy = (e.clientY - d.y) * 0.35; d.moved = Math.max(d.moved, Math.abs(d.dx) + Math.abs(d.dy));
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; paint(); });
  };
  const paint = () => {
    const d = drag.current; if (!topRef.current) return;
    topRef.current.style.transform = `translate(${d.dx}px, ${d.dy}px) rotate(${d.dx / 16}deg)`;
    const y = topRef.current.querySelector<HTMLElement>("[data-stamp=yes]"), n = topRef.current.querySelector<HTMLElement>("[data-stamp=no]");
    if (y) y.style.opacity = String(Math.max(0, Math.min(1, d.dx / 100)));
    if (n) n.style.opacity = String(Math.max(0, Math.min(1, -d.dx / 100)));
  };
  const onUp = () => {
    const d = drag.current; if (!d.on) return; d.on = false;
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    if (Math.abs(d.dx) > 110) return void swipe(d.dx > 0 ? "right" : "left");
    if (topRef.current) {
      topRef.current.style.transition = "transform .5s cubic-bezier(.2,.8,.2,1)";
      topRef.current.style.transform = "none";
      topRef.current.querySelectorAll<HTMLElement>("[data-stamp]").forEach((s) => (s.style.opacity = "0"));
    }
    if (d.moved < 6) flip();
  };

  return (
    <div className="fade-up">
      <div className="mb-3 sm:mb-4">
        <p className="hidden text-sm font-semibold text-mute sm:block">Ce soir on joue à quoi ?</p>
        <h1 className="text-[clamp(28px,4vw,40px)] font-bold">Découvrir</h1>
      </div>
      {!hasFriends && (
        <p className="mb-4 rounded-2xl border border-violet/30 bg-violet/10 px-4 py-3 text-sm text-ink2">
          Ajoute des amis pour voir leurs recommandations ici. En attendant, voici les jeux les mieux notés au monde. <Link href="/amis" className="font-semibold text-violet-hi underline">Trouver des amis</Link>
        </p>
      )}

      <div className="flex flex-col items-center">
        <div className="relative aspect-[330/480] w-full max-w-[min(370px,calc((100svh-330px)*0.6875))] [perspective:1500px] lg:max-w-[370px]">
          {cards.slice(0, 3).reverse().map((c, ri, arr) => {
            const d = arr.length - 1 - ri;
            const isTop = d === 0;
            return (
              <div key={c.key} ref={isTop ? topRef : undefined}
                onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined} onPointerUp={isTop ? onUp : undefined} onPointerCancel={isTop ? onUp : undefined}
                onDragStart={(e) => e.preventDefault()}
                className="absolute inset-0 touch-none select-none [-webkit-user-drag:none]"
                style={{ zIndex: 10 - d, transform: isTop ? undefined : `translateY(${d * 20}px) scale(${1 - d * 0.06})`, transition: "transform .5s cubic-bezier(.2,.8,.2,1)", cursor: isTop ? "grab" : undefined }}
                aria-hidden={!isTop}>
                <CardView c={c} flipped={isTop && flipped} />
              </div>
            );
          })}
          {!cards.length && (
            <div className="absolute inset-0 grid place-items-center rounded-[30px] border border-line bg-card p-8 text-center">
              <div>
                <p className="text-xl font-bold">{loadingMore ? "Chargement…" : "Tu as tout vu !"}</p>
                {!loadingMore && <p className="mt-2 text-mute">Reviens quand tes amis auront noté de nouveaux jeux.</p>}
                {!loadingMore && <Link href="/amis" className={`${btnPrimary} mt-4`}>Trouver des amis</Link>}
              </div>
            </div>
          )}
        </div>

        {cards.length > 0 && (
          <>
            <div className="mt-5 flex items-center gap-6 sm:mt-6">
              <button onClick={() => swipe("left")} aria-label="Pas pour moi" className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-card text-no shadow-[0_12px_30px_-12px_#ff5c6c] transition active:scale-90">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <button onClick={flip} aria-label="Voir les avis" className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-card transition active:scale-90">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /></svg>
              </button>
              <button onClick={() => swipe("right")} aria-label="Ça m'intéresse" className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-card text-ok shadow-[0_12px_30px_-12px_#3ddc97] transition active:scale-90">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-faint"><span className="sm:hidden">Glisse la carte, ou touche-la pour voir les avis.</span><span className="hidden sm:inline">Glisse la carte, ou touche-la pour voir les avis. Clavier : ← → et espace.</span></p>
          </>
        )}
      </div>

      {toast && (
        <div role="status" className={`fixed left-1/2 top-[calc(16px+env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold shadow-2xl fade-up ${toast.match ? "bg-violet text-white" : "bg-ink text-night"}`}>{toast.text}</div>
      )}
    </div>
  );
}

function CardView({ c, flipped }: { c: Card; flipped: boolean }) {
  const rs = c.friends.map((f) => f.rating).filter((x): x is number => x != null);
  const friendAvg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  const score = friendAvg ?? c.igdbRating ?? null;
  const best = c.friends.filter((f) => f.review).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  const names = c.friends.map((f) => "@" + f.profile.handle);
  const recTxt = names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(" et ");
  const cats = CATEGORIES.map((k) => {
    const v = c.friends.map((f) => f.scores?.[k.key]).filter((x): x is number => typeof x === "number");
    return { ...k, v: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null };
  }).filter((k) => k.v != null);

  return (
    <div className="absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
      {/* Recto */}
      <div className="absolute inset-0 overflow-hidden rounded-[30px] shadow-[0_40px_80px_-30px_var(--glow)] [backface-visibility:hidden]">
        <Cover game={c.game} fill className="[--cover-fs:72px]" priority />
        {c.friends.length > 0 ? (
          <div className="absolute left-3 top-3 z-[3] flex items-center gap-2 rounded-full bg-black/60 py-1 pl-1 pr-3 text-xs font-semibold text-white backdrop-blur">
            <span className="flex">{c.friends.slice(0, 3).map((f, i) => <span key={f.profile.id} className={i ? "-ml-2" : ""}><Avatar profile={f.profile} size={26} /></span>)}</span>{recTxt}
          </div>
        ) : (
          <div className="absolute left-3 top-3 z-[3] rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">Parmi les mieux notés au monde</div>
        )}
        <div data-stamp="yes" className="pointer-events-none absolute left-4 top-16 z-[4] rotate-[-12deg] rounded-xl border-[3px] border-ok bg-black/30 px-3 py-1 font-display text-xl font-bold text-ok opacity-0">ÇA M&apos;INTÉRESSE</div>
        <div data-stamp="no" className="pointer-events-none absolute right-4 top-16 z-[4] rotate-[12deg] rounded-xl border-[3px] border-no bg-black/30 px-3 py-1 font-display text-xl font-bold text-no opacity-0">PAS POUR MOI</div>
        <div className="absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-b from-transparent via-black/85 to-black px-5 pb-5 pt-20 text-white">
          <div className="flex items-baseline justify-between gap-2"><h2 className="text-[26px] font-bold leading-tight">{c.game.name}</h2>{c.game.avg_hours ? <span className="shrink-0 text-xs text-white/70">≈ {Math.round(c.game.avg_hours)} h</span> : null}</div>
          <p className="text-sm text-white/70">{[c.game.genres?.[0] && genreFr(c.game.genres[0]), c.game.release_year].filter(Boolean).join(" · ")}</p>
          {score != null && <div className="mt-2 flex items-center gap-2 text-sm"><Stars value={score} /><b>{score.toFixed(1)}</b><span className="text-white/60">{friendAvg != null ? "amis" : "IGDB"}</span></div>}
          {best && <p className="mt-3 line-clamp-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] leading-snug">« {best.review} » <b>— @{best.profile.handle}</b></p>}
        </div>
      </div>
      {/* Verso */}
      <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-[30px] border border-line bg-card p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[var(--glow)]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">{c.friends.length ? "Ce qu'en pensent tes amis" : "Le jeu"}</p>
        <h2 className="-mt-2 text-2xl font-bold">{c.game.name}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/5 p-2"><b className="block font-display text-xl">{friendAvg?.toFixed(1) ?? "–"}</b><span className="text-[11px] text-mute">moy. amis</span></div>
          <div className="rounded-2xl bg-white/5 p-2"><b className="block font-display text-xl">{c.friends.length}</b><span className="text-[11px] text-mute">amis l&apos;ont</span></div>
          <div className="rounded-2xl bg-white/5 p-2"><b className="block font-display text-xl">{c.game.avg_hours ? Math.round(c.game.avg_hours) + " h" : "–"}</b><span className="text-[11px] text-mute">pour finir</span></div>
        </div>
        {cats.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {cats.map((k) => (
              <div key={k.key} className="grid grid-cols-[96px_1fr_28px] items-center gap-2 text-xs">
                <span className="text-mute">{k.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[var(--glow)]" style={{ width: `${((k.v ?? 0) / 5) * 100}%` }} /></span>
                <b className="text-right">{k.v!.toFixed(1)}</b>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          {c.friends.slice(0, 4).map((f) => (
            <div key={f.profile.id} className="flex gap-2.5 text-sm">
              <Avatar profile={f.profile} size={30} />
              <div className="min-w-0">
                <p><b>@{f.profile.handle}</b> <span className="text-mute">{STATUS_TXT[f.status]}</span>{f.rating != null && <span className="text-[#FFD45C]"> · {f.rating.toFixed(1)}★</span>}</p>
                {f.review && <p className="line-clamp-2 text-ink2">{f.review}</p>}
              </div>
            </div>
          ))}
          {!c.friends.length && <p className="text-sm text-mute">Aucun de tes amis ne l&apos;a encore. Sois le premier !</p>}
        </div>
        {c.gameId && <Link href={`/jeu/${c.gameId}`} className={`${btnGhost} mt-auto min-h-10 text-sm`}>Voir la fiche complète</Link>}
      </div>
    </div>
  );
}
