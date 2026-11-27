"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StarInput } from "@/components/Stars";
import { btnDanger, btnPrimary, input, label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, PLATFORMS, STATUSES, type Status, type UserGame } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function GameEditor({ gameId, gameName, entry, topsUsed }: { gameId: string; gameName: string; entry: UserGame | null; topsUsed: number[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<Status | null>(entry?.status ?? null);
  const [rating, setRating] = useState<number | null>(entry?.rating != null ? Number(entry.rating) : null);
  const [scores, setScores] = useState<Record<string, number>>(entry?.scores ?? {});
  const [difficulty, setDifficulty] = useState<number | null>(entry?.difficulty != null ? Number(entry.difficulty) : null);
  // Anciens avis entièrement « spoilers » : leur texte passe dans la partie floutée.
  const legacy = !!entry?.has_spoilers && !entry?.spoiler_text;
  const [review, setReview] = useState(legacy ? "" : entry?.review ?? "");
  const [spoilerText, setSpoilerText] = useState(legacy ? entry?.review ?? "" : entry?.spoiler_text ?? "");
  const [showSpoil, setShowSpoil] = useState(!!(legacy ? entry?.review : entry?.spoiler_text));
  const [started, setStarted] = useState(entry?.started_on ?? "");
  const [finished, setFinished] = useState(entry?.finished_on ?? "");
  const [hours, setHours] = useState(entry?.playtime_hours != null ? String(entry.playtime_hours) : "");
  const [platform, setPlatform] = useState(entry?.platform ?? "");
  const [top, setTop] = useState<number | null>(entry?.top_rank ?? null);
  const [details, setDetails] = useState(Object.keys(entry?.scores ?? {}).length > 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const catAvg = (() => {
    const v = Object.values(scores);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 2) / 2 : null;
  })();

  function pickStatus(s: Status) {
    setStatus(s);
    if ((s === "termine" || s === "platine") && !finished) setFinished(today());
    if (s === "en_cours" && !started) setStarted(today());
  }

  async function save() {
    if (!status) { return setMsg("Choisis d'abord un statut."); }
    setBusy(true); setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (top && top !== entry?.top_rank) {
      await supabase.from("user_games").update({ top_rank: null }).eq("user_id", user.id).eq("top_rank", top);
    }
    const row = {
      user_id: user.id, game_id: gameId, status,
      rating: rating ?? catAvg, scores, difficulty,
      review: review.trim() || null, spoiler_text: spoilerText.trim() || null, has_spoilers: !!spoilerText.trim(),
      started_on: started || null, finished_on: finished || null,
      playtime_hours: hours ? Number(hours) : null, platform: platform || null, top_rank: top,
    };
    const { error } = await supabase.from("user_games").upsert(row, { onConflict: "user_id,game_id" });
    setBusy(false);
    if (error) { return setMsg("Erreur : " + error.message); }
    setMsg("Enregistré ✓");
    router.refresh();
  }

  async function remove() {
    if (!entry) return;
    setBusy(true);
    await supabase.from("user_games").delete().eq("id", entry.id);
    router.push("/collection");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-line bg-card/80 p-5">
      <div>
        <h2 className="text-lg font-bold">{entry ? "Dans ma collection" : "Ajouter à ma collection"}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Statut">
          {STATUSES.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={status === s.key} onClick={() => pickStatus(s.key)}
              className={`min-h-11 rounded-2xl border px-2 text-sm font-semibold transition active:scale-95 ${status === s.key ? "border-violet bg-violet text-white shadow-[0_8px_24px_-10px_#8b5cf6]" : "border-white/12 bg-white/5 text-ink2 hover:bg-white/10"}`}>
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><label htmlFor="st" className={label}>Commencé le</label><input id="st" type="date" max={today()} className={input} value={started} onChange={(e) => setStarted(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="fi" className={label}>Fini le</label><input id="fi" type="date" max={today()} className={input} value={finished} onChange={(e) => setFinished(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="hr" className={label}>Heures de jeu</label><input id="hr" type="number" min="0" step="0.5" inputMode="decimal" className={input} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="ex. 32" /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="pf" className={label}>Plateforme</label>
          <select id="pf" className={input} value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">—</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Ma note</span>
          <StarInput value={rating ?? catAvg} onChange={setRating} label="Note globale" size={30} />
        </div>
        <button type="button" onClick={() => setDetails((d) => !d)} className="mt-2 text-sm font-semibold text-violet-hi hover:underline">
          {details ? "Masquer le détail par catégorie" : "Noter par catégorie (graphismes, histoire…)"}
        </button>
        {details && (
          <div className="mt-3 flex flex-col gap-1">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex flex-wrap items-center justify-between gap-x-3">
                <span className="text-sm text-ink2">{c.label}</span>
                <StarInput value={scores[c.key] ?? null} size={22} label={c.label}
                  onChange={(v) => setScores((s) => { const n = { ...s }; if (v == null) delete n[c.key]; else n[c.key] = v; return n; })} />
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-line pt-1">
              <span className="text-sm text-ink2">Difficulté <span className="text-faint">(1 = facile)</span></span>
              <StarInput value={difficulty} onChange={setDifficulty} size={22} label="Difficulté" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rv" className={label}>Mon avis</label>
        <textarea id="rv" className={`${input} min-h-28 py-3`} maxLength={5000} value={review} onChange={(e) => setReview(e.target.value)} placeholder={`Ce que tu as pensé de ${gameName}, sans rien dévoiler…`} />
        {showSpoil ? (
          <div className="mt-2 flex flex-col gap-1.5 rounded-2xl border border-no/25 bg-no/[.05] p-3">
            <label htmlFor="sp" className="flex items-center gap-1.5 text-[13px] font-semibold text-no/90">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17.5v.01" /></svg>
              Partie avec spoilers <span className="font-normal text-mute">(floutée pour les autres, seulement cette partie)</span>
            </label>
            <textarea id="sp" className={`${input} min-h-24 py-3`} maxLength={5000} value={spoilerText} onChange={(e) => setSpoilerText(e.target.value)} placeholder="La fin, les révélations, les boss secrets…" />
            {!spoilerText.trim() && <button type="button" onClick={() => setShowSpoil(false)} className="self-start text-xs text-mute hover:text-ink">Retirer cette partie</button>}
          </div>
        ) : (
          <button type="button" onClick={() => setShowSpoil(true)} className="mt-1 flex items-center gap-1.5 self-start rounded-full border border-white/12 px-3 py-1.5 text-sm font-semibold text-ink2 transition hover:bg-white/5">
            <span aria-hidden="true" className="text-base leading-none">+</span> Ajouter une partie avec spoilers
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="tp" className="text-sm text-ink2">Mon top 5 :</label>
        <select id="tp" value={top ?? ""} onChange={(e) => setTop(e.target.value ? Number(e.target.value) : null)} className={`${input} min-h-10 w-auto py-1`}>
          <option value="">Pas dans mon top</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>N°{n}{topsUsed.includes(n) ? " (remplace l'actuel)" : ""}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimary} onClick={save} disabled={busy}>{entry ? "Enregistrer" : "Ajouter à ma collection"}</button>
        {entry && <button className={btnDanger} onClick={remove} disabled={busy}>Retirer</button>}
        <span className="text-sm text-mute" aria-live="polite">{msg}</span>
      </div>
    </section>
  );
}
