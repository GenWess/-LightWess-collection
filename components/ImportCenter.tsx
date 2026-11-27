"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Cover from "./Cover";
import { btnGhost, btnPrimary, input } from "./ui";
import { toast } from "@/lib/toast";
import { STATUSES, type Status } from "@/lib/types";

type SteamGame = { appid: number; name: string; hours: number; cover: string; capsule: string; owned: boolean };
type Match = { title: string; match: { igdb_id: number; name: string; cover_url: string | null; release_year: number | null; platforms: string[] } | null };

const PLATFORMS = [
  { key: "steam", label: "Steam", color: "#66c0f4" },
  { key: "playstation", label: "PlayStation", color: "#3a7bff", platform: "PlayStation 5", tip: "Sur ton téléphone : appli PlayStation → Bibliothèque → « Achetés ». Ou sur ordinateur : library.playstation.com. Copie les titres, un par ligne." },
  { key: "xbox", label: "Xbox", color: "#2fbf4a", platform: "Xbox Series", tip: "Sur xbox.com → ton profil → « Succès » ou « Jeux » : copie les titres, un par ligne. Fonctionne aussi pour le Game Pass PC." },
  { key: "epic", label: "Epic Games", color: "#d7d7d7", platform: "PC", tip: "Lanceur Epic → Bibliothèque, ou epicgames.com → Compte → Transactions. Copie les titres, un par ligne." },
  { key: "nintendo", label: "Nintendo", color: "#ff4554", platform: "Switch", tip: "Sur la Switch : Paramètres → Gestion des données → logiciels, ou ton historique d'achats sur accounts.nintendo.com. Un titre par ligne." },
  { key: "autre", label: "Autre", color: "#8b5cf6", platform: "Autre", tip: "GOG, Battle.net, Ubisoft, EA, mobile… Colle simplement tes titres, un par ligne." },
] as const;

export default function ImportCenter({ steamId, label = "Importer mes jeux", className = btnGhost }: { steamId: string | null; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.button whileTap={{ scale: 0.95 }} className={className} onClick={() => { setOpen(true); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>{label}
      </motion.button>
      <AnimatePresence>{open && <Dialog steamId={steamId} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function Dialog({ steamId, onClose }: { steamId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof PLATFORMS)[number]["key"]>("steam");
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const p = PLATFORMS.find((x) => x.key === tab)!;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Importer mes jeux">
      <motion.div initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="relative flex h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-night2 sm:h-[86dvh] sm:rounded-[30px]">
        <motion.div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[70%] -translate-x-1/2 rounded-full blur-3xl" animate={{ background: p.color, opacity: 0.25 }} transition={{ duration: 0.6 }} />
        <div className="relative flex items-center justify-between gap-3 p-5 pb-3">
          <div><h2 className="text-2xl font-bold">Importer mes jeux</h2><p className="text-sm text-mute">Tu choisis ce que tu gardes. Aucun doublon, rien n&apos;est noté à ta place.</p></div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-mute hover:text-ink" aria-label="Fermer">✕</button>
        </div>
        <LayoutGroup id="platforms">
          <div className="relative flex gap-1 overflow-x-auto px-5 pb-3" role="tablist">
            {PLATFORMS.map((x) => (
              <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)} className="relative min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold">
                {tab === x.key && <motion.span layoutId="plat-pill" className="absolute inset-0 rounded-full" style={{ background: x.color + "33", boxShadow: `inset 0 0 0 1.5px ${x.color}` }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className={`relative ${tab === x.key ? "text-ink" : "text-mute"}`}>{x.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="relative min-h-0 flex-1 border-t border-line">
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="flex h-full flex-col" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              {tab === "steam" ? <SteamPane steamId={steamId} onDone={onClose} /> : <ListPane key={tab} tip={"tip" in p ? p.tip : ""} platform={"platform" in p ? p.platform : "Autre"} onDone={onClose} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Footer({ count, busy, status, setStatus, onGo, children }: { count: number; busy: boolean; status: Status; setStatus: (s: Status) => void; onGo: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line bg-night2/95 p-4 backdrop-blur">
      {children}
      <label className="ml-auto flex items-center gap-2 text-sm text-mute">Ranger en
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="min-h-10 rounded-xl border border-white/15 bg-night px-2 text-ink">
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <motion.button whileTap={{ scale: 0.95 }} className={`${btnPrimary} min-w-44`} disabled={!count || busy} onClick={onGo}>
        {busy ? "Import…" : `Importer ${count} jeu${count > 1 ? "x" : ""}`}
      </motion.button>
    </div>
  );
}

function SteamPane({ steamId, onDone }: { steamId: string | null; onDone: () => void }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [games, setGames] = useState<SteamGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [minH, setMinH] = useState(0);
  const [hideOwned, setHideOwned] = useState(true);
  const [status, setStatus] = useState<Status>("a_faire");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setErr("");
    const r = await fetch(`/api/steam/library${link.trim() ? `?profile=${encodeURIComponent(link.trim())}` : ""}`).catch(() => null);
    const j = r ? await r.json().catch(() => ({ error: `Le serveur a répondu avec une erreur (${r.status}). Réessaie dans un instant.` })) : { error: "Pas de connexion internet ?" };
    setLoading(false);
    if (!r || !r.ok) { return setErr(j.error || "Erreur inconnue"); }
    setGames(j.games);
    // Pré-cochés : les jeux auxquels tu as vraiment joué et qui ne sont pas déjà dans ta collection.
    setSel(new Set((j.games as SteamGame[]).filter((g) => !g.owned && g.hours >= 1).map((g) => g.appid)));
  }
  useEffect(() => { if (steamId) void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    if (!games) return [];
    const t = q.trim().toLowerCase();
    return games.filter((g) => (!hideOwned || !g.owned) && g.hours >= minH && (!t || g.name.toLowerCase().includes(t)));
  }, [games, q, minH, hideOwned]);

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = () => setSel((s) => new Set([...s, ...shown.filter((g) => !g.owned).map((g) => g.appid)]));
  const none = () => setSel((s) => { const n = new Set(s); shown.forEach((g) => n.delete(g.appid)); return n; });

  async function go() {
    setBusy(true);
    // Envoi par paquets de 150 jeux : une très grosse bibliothèque ne dépasse plus le temps limite du serveur.
    const ids = [...sel];
    let added = 0;
    for (let i = 0; i < ids.length; i += 150) {
      const r = await fetch("/api/steam/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appids: ids.slice(i, i + 150), status }) }).catch(() => null);
      const j = r ? await r.json().catch(() => ({ error: `Le serveur a répondu avec une erreur (${r.status}).` })) : { error: "Pas de connexion internet ?" };
      if (!r || !r.ok) {
        setBusy(false);
        if (added) router.refresh();
        return toast(`${added ? `${added} jeux ajoutés, puis : ` : ""}${j.error || "Erreur inconnue"}`, "error");
      }
      added += j.added ?? 0;
    }
    setBusy(false);
    toast(added ? `${added} jeu${added > 1 ? "x" : ""} ajouté${added > 1 ? "s" : ""} à ta collection 🎮` : "Ces jeux étaient déjà dans ta collection (temps de jeu mis à jour)", "match");
    onDone(); router.refresh();
  }

  if (!games)
    return (
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-14 rounded-2xl" style={{ animationDelay: `${i * 70}ms` }} />)}</div>
        ) : (
          <>
            {!steamId && <a href="/api/steam/login" className={`${btnGhost} self-start`}>Se connecter avec Steam</a>}
            <p className="text-sm text-mute">{steamId ? "Ton compte Steam est relié. Tu peux aussi analyser un autre profil :" : "Ou colle le lien de ton profil Steam :"}</p>
            <div className="flex flex-wrap gap-2">
              <input className={`${input} flex-1 basis-64`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://steamcommunity.com/id/tonpseudo" aria-label="Lien du profil Steam" />
              <button className={btnPrimary} onClick={load} disabled={!steamId && !link.trim()}>Analyser ma bibliothèque</button>
            </div>
            <p className="text-xs text-faint">Ton profil Steam et « Détails des jeux » doivent être en Public (Steam → Modifier le profil → Confidentialité).</p>
            {err && <p className="rounded-2xl bg-no/10 p-3 text-sm text-no">{err}</p>}
          </>
        )}
      </div>
    );

  const owned = games.filter((g) => g.owned).length;
  return (
    <>
      <div className="flex flex-col gap-3 p-4 pb-2">
        <p className="text-sm text-ink2"><b>{games.length}</b> jeux trouvés · {owned} déjà dans ta collection · <b className="text-violet-hi">{sel.size}</b> sélectionnés</p>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} min-h-11 flex-1 basis-48`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un jeu" aria-label="Chercher un jeu" />
          <select value={minH} onChange={(e) => setMinH(Number(e.target.value))} className={`${input} min-h-11 w-auto`} aria-label="Temps de jeu minimum">
            <option value={0}>Tous les jeux</option><option value={0.1}>Déjà lancés</option><option value={1}>1 h et plus</option><option value={5}>5 h et plus</option><option value={20}>20 h et plus</option><option value={100}>100 h et plus</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5" onClick={all}>Tout sélectionner</button>
          <button className="rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5" onClick={none}>Tout désélectionner</button>
          <label className="ml-auto flex items-center gap-2 text-mute"><input type="checkbox" checked={hideOwned} onChange={(e) => setHideOwned(e.target.checked)} className="h-5 w-5 accent-violet-500" />Masquer ceux déjà ajoutés</label>
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {shown.map((g) => {
          const on = sel.has(g.appid);
          return (
            <li key={g.appid} className="cv-auto">
              <button disabled={g.owned} onClick={() => toggle(g.appid)} aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${on ? "bg-violet/15" : "hover:bg-white/5"} ${g.owned ? "opacity-50" : ""}`}>
                <motion.span animate={{ scale: on ? 1 : 0.9, backgroundColor: on ? "#8b5cf6" : "rgba(255,255,255,0)" }} transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-white/30 text-sm font-bold text-white">{on ? "✓" : ""}</motion.span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.capsule} alt="" loading="lazy" draggable={false} className="h-[46px] w-[123px] shrink-0 rounded-lg bg-white/5 object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                <span className="min-w-0 flex-1"><b className="block truncate">{g.name}</b><span className="text-xs text-mute">{g.hours ? `${g.hours} h de jeu` : "Jamais lancé"}</span></span>
                {g.owned && <span className="shrink-0 rounded-full bg-ok/15 px-2 py-1 text-xs font-semibold text-ok">Déjà ajouté</span>}
              </button>
            </li>
          );
        })}
        {!shown.length && <li className="p-6 text-center text-mute">Aucun jeu avec ces filtres.</li>}
      </ul>
      <Footer count={sel.size} busy={busy} status={status} setStatus={setStatus} onGo={go} />
    </>
  );
}

function ListPane({ tip, platform, onDone }: { tip: string; platform: string; onDone: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [results, setResults] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<Status>("termine");
  const [busy, setBusy] = useState(false);

  async function find() {
    const titles = text.split(/\n|;/).map((t) => t.trim()).filter(Boolean);
    if (!titles.length) return;
    setLoading(true);
    const r = await fetch("/api/games/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titles }) });
    const j = await r.json().catch(() => ({ results: [] }));
    setLoading(false);
    setResults(j.results ?? []);
    setSel(new Set((j.results as Match[]).filter((m) => m.match).map((m) => m.match!.igdb_id)));
  }
  async function go() {
    setBusy(true);
    const r = await fetch("/api/games/add-many", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ igdbIds: [...sel], status, platform }) });
    const j = await r.json().catch(() => ({ error: "Réponse illisible" }));
    setBusy(false);
    if (!r.ok) { return toast(j.error, "error"); }
    toast(`${j.added} jeu${j.added > 1 ? "x" : ""} ajouté${j.added > 1 ? "s" : ""}${j.already ? ` · ${j.already} déjà présent${j.already > 1 ? "s" : ""}` : ""}`, "match");
    onDone(); router.refresh();
  }
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!results)
    return (
      <div className="flex flex-col gap-3 overflow-y-auto p-5">
        <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-ink2">{tip}</p>
        <p className="text-xs text-faint">Cette plateforme ne permet pas à un site de lire ta bibliothèque : on retrouve chaque jeu automatiquement à partir de son nom, avec sa vraie jaquette, et tu choisis ensuite lesquels garder.</p>
        <textarea className={`${input} min-h-48 py-3`} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Final Fantasy VII Rebirth\nAstro Bot\nThe Legend of Zelda: Tears of the Kingdom"} aria-label="Liste de tes jeux, un par ligne" />
        <div className="flex items-center gap-3">
          <button className={btnPrimary} onClick={find} disabled={!text.trim() || loading}>{loading ? "Recherche des jaquettes…" : "Trouver mes jeux"}</button>
          <span className="text-xs text-faint">80 titres maximum à la fois</span>
        </div>
        {loading && <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" style={{ animationDelay: `${i * 50}ms` }} />)}</div>}
      </div>
    );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4 pb-2 text-sm">
        <p className="text-ink2"><b>{results.filter((r) => r.match).length}</b> / {results.length} trouvés · <b className="text-violet-hi">{sel.size}</b> sélectionnés</p>
        <button className="ml-auto rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5" onClick={() => setSel(new Set(results.filter((r) => r.match).map((r) => r.match!.igdb_id)))}>Tout</button>
        <button className="rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5" onClick={() => setSel(new Set())}>Aucun</button>
        <button className="rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5" onClick={() => setResults(null)}>Modifier la liste</button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-3 overflow-y-auto p-4 pt-2 sm:grid-cols-5">
        {results.map((r, i) => r.match ? (
          <motion.button key={r.title + i} onClick={() => toggle(r.match!.igdb_id)} aria-pressed={sel.has(r.match.igdb_id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 30) * 0.02 }} whileTap={{ scale: 0.95 }} className="text-left">
            <div className="relative">
              <Cover game={{ name: r.match.name, cover_url: r.match.cover_url }} className={`transition [--cover-fs:24px] ${sel.has(r.match.igdb_id) ? "ring-[3px] ring-violet-hi" : "opacity-50 grayscale"}`} />
              <motion.span animate={{ scale: sel.has(r.match.igdb_id) ? 1 : 0 }} className="absolute right-2 top-2 z-[3] grid h-6 w-6 place-items-center rounded-full bg-violet text-sm font-bold text-white">✓</motion.span>
            </div>
            <span className="mt-1 block truncate text-xs font-semibold">{r.match.name}</span>
            {r.match.name.toLowerCase() !== r.title.toLowerCase() && <span className="block truncate text-[11px] text-faint">pour « {r.title} »</span>}
          </motion.button>
        ) : (
          <div key={r.title + i} className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-white/15 p-2 text-center text-xs text-mute">« {r.title} » introuvable</div>
        ))}
      </div>
      <Footer count={sel.size} busy={busy} status={status} setStatus={setStatus} onGo={go}>
        <Link href="/collection" className="text-xs text-faint">Introuvable ? Cherche-le dans « Ajouter un jeu ».</Link>
      </Footer>
    </>
  );
}
