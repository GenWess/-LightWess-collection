"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Cover from "./Cover";
import { btnPrimary, input } from "./ui";
import { sfx } from "@/lib/sound";
import { STATUSES, type Status } from "@/lib/types";

type Result = { igdb_id: number; name: string; cover_url: string | null; banner_url: string | null; release_year: number | null; genres: string[]; platforms: string[] };

/** Bouton « Ajouter un jeu » + fenêtre de recherche en temps réel dans IGDB. */
export default function AddGame({ label = "Ajouter un jeu", className = btnPrimary, ownedIgdbIds = [] }: { label?: string; className?: string; ownedIgdbIds?: number[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => { setOpen(true); sfx.pop(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {label}
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} owned={new Set(ownedIgdbIds)} />}
    </>
  );
}

function SearchDialog({ onClose, owned }: { onClose: () => void; owned: Set<number> }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [picked, setPicked] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setState("idle"); return; }
    setState("loading");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Recherche impossible");
        setResults(j.results); setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") { setState("error"); setMsg((e as Error).message); }
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  async function add(status: Status) {
    if (!picked) return;
    setBusy(true);
    const r = await fetch("/api/games/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ igdbId: picked.igdb_id, status }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { sfx.err(); setMsg(j.error || "Erreur"); return; }
    sfx.ok();
    onClose();
    router.push(`/jeu/${j.gameId}`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onPointerDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Ajouter un jeu">
      <div className="fade-up flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-night2 sm:rounded-[28px]">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-mute" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} className={`${input} border-0 bg-transparent px-0 focus:ring-0`} placeholder="Cherche n'importe quel jeu : Elden Ring, Final Fantasy, Mario…" aria-label="Chercher un jeu" />
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-mute hover:text-ink" aria-label="Fermer">✕</button>
        </div>

        {picked ? (
          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            <div className="flex gap-4">
              <Cover game={picked} className="w-28 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold">{picked.name}</h2>
                <p className="mt-1 text-sm text-mute">{[picked.release_year, picked.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-xs text-faint">{picked.platforms.slice(0, 6).join(" · ")}</p>
              </div>
            </div>
            <p className="font-semibold">Où le ranger ?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUSES.map((s) => (
                <button key={s.key} disabled={busy} onClick={() => add(s.key)} className="min-h-12 rounded-2xl border border-white/12 bg-white/5 px-3 font-semibold transition hover:border-violet hover:bg-violet/15 active:scale-95 disabled:opacity-50">{s.label}</button>
              ))}
            </div>
            <button className="self-start text-sm text-mute underline" onClick={() => setPicked(null)}>← Retour aux résultats</button>
            {msg && <p className="text-sm text-no">{msg}</p>}
          </div>
        ) : (
          <div className="overflow-y-auto p-2">
            {state === "loading" && <p className="p-4 text-sm text-mute">Recherche…</p>}
            {state === "error" && <p className="p-4 text-sm text-no">{msg}</p>}
            {state === "idle" && q.trim().length >= 2 && !results.length && <p className="p-4 text-sm text-mute">Aucun jeu trouvé pour « {q} ».</p>}
            {q.trim().length < 2 && <p className="p-4 text-sm text-mute">Tape au moins 2 lettres. Toutes les plateformes sont couvertes : PC, PlayStation, Xbox, Nintendo, mobile…</p>}
            <ul>
              {results.map((g) => (
                <li key={g.igdb_id}>
                  <button className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/5" onClick={() => { setPicked(g); sfx.pop(); }}>
                    <Cover game={g} className="w-[52px] rounded-lg [--cover-fs:14px]" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{g.name}</span>
                      <span className="block truncate text-xs text-mute">{[g.release_year, g.genres[0], g.platforms.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</span>
                    </span>
                    {owned.has(g.igdb_id) && <span className="rounded-full bg-ok/15 px-2 py-1 text-xs font-semibold text-ok">Déjà ajouté</span>}
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-3 pb-2 pt-3 text-[11px] text-faint">Données et jaquettes : IGDB.com</p>
          </div>
        )}
      </div>
    </div>
  );
}
