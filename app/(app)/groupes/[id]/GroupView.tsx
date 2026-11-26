"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { CountUp, Donut, HBars } from "@/components/Charts";
import CopyLink from "@/components/CopyLink";
import Cover from "@/components/Cover";
import { setGlow } from "@/components/Glow";
import { Stars } from "@/components/Stars";
import { btnDanger, btnGhost } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sound";
import { toast } from "@/lib/toast";
import type { Game, MiniProfile, UserGame } from "@/lib/types";

type Row = Pick<UserGame, "user_id" | "status" | "rating" | "scores" | "playtime_hours" | "finished_on" | "updated_at"> & { game: Pick<Game, "id" | "name" | "cover_url" | "banner_url" | "dominant_color" | "genres" | "release_year"> };
type Member = { role: "owner" | "admin" | "member"; joined_at: string; profile: MiniProfile };
export type GroupData = {
  group: { id: string; name: string; description: string | null; color: string; owner_id: string; invite_code: string; created_at: string };
  meId: string; members: Member[]; rows: Row[];
};

const METRICS = {
  jeux: { label: "Collection", unit: "jeux", fn: (r: Row[]) => r.length },
  finis: { label: "Terminés", unit: "jeux", fn: (r: Row[]) => r.filter((x) => x.status === "termine" || x.status === "platine").length },
  heures: { label: "Heures", unit: "h", fn: (r: Row[]) => Math.round(r.reduce((a, x) => a + Number(x.playtime_hours || 0), 0)) },
  note: { label: "Note moyenne", unit: "★", fn: (r: Row[]) => { const v = r.filter((x) => x.rating != null); return v.length ? Math.round((v.reduce((a, x) => a + Number(x.rating), 0) / v.length) * 10) / 10 : 0; } },
} as const;
type MetricKey = keyof typeof METRICS;
const VERB: Record<string, string> = { a_faire: "veut jouer à", en_cours: "joue à", termine: "a terminé", platine: "a platiné", abandonne: "a abandonné" };
const PAL = ["#8B5CF6", "#5B8CFF", "#3DDC97", "#FFD45C", "#FF5C8A", "#2EB6E8", "#F28C38", "#C3A3FF"];

const ago = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
};

export default function GroupView({ data }: { data: GroupData }) {
  const router = useRouter();
  const { group, meId, members } = data;
  const [metric, setMetric] = useState<MetricKey>("finis");
  const [tab, setTab] = useState<"commun" | "top" | "activite">("commun");
  const myRole = members.find((m) => m.profile.id === meId)?.role ?? "member";
  const byUser = useMemo(() => {
    const m = new Map<string, Row[]>();
    data.rows.forEach((r) => m.set(r.user_id, [...(m.get(r.user_id) ?? []), r]));
    return m;
  }, [data.rows]);
  const prof = useMemo(() => new Map(members.map((m) => [m.profile.id, m.profile])), [members]);

  useEffect(() => { setGlow(group.color); return () => setGlow("#8b5cf6"); }, [group.color]);

  // Jeux en commun (possédés par au moins 2 membres) et moyennes du groupe.
  const games = useMemo(() => {
    const g = new Map<string, { game: Row["game"]; owners: Row[] }>();
    data.rows.forEach((r) => { const e = g.get(r.game.id) ?? { game: r.game, owners: [] }; e.owners.push(r); g.set(r.game.id, e); });
    return [...g.values()].map((e) => {
      const rs = e.owners.filter((o) => o.rating != null).map((o) => Number(o.rating));
      return { ...e, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null, rated: rs.length };
    });
  }, [data.rows]);
  const common = games.filter((g) => g.owners.length >= 2).sort((a, b) => b.owners.length - a.owners.length || (b.avg ?? 0) - (a.avg ?? 0)).slice(0, 24);
  const topRated = games.filter((g) => g.avg != null).sort((a, b) => (b.avg! - a.avg!) || b.rated - a.rated).slice(0, 12);
  const activity = data.rows.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 25);

  const genreCount = new Map<string, number>();
  data.rows.filter((r) => r.status === "termine" || r.status === "platine").forEach((r) => r.game.genres?.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const genres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value], i) => ({ label, value, color: PAL[i] }));

  const compare = members.map((m) => ({ label: "@" + m.profile.handle, value: METRICS[metric].fn(byUser.get(m.profile.id) ?? []), extra: <Avatar profile={m.profile} size={22} />, color: m.profile.accent_color }))
    .sort((a, b) => b.value - a.value);

  // Affinité : écart moyen de notes sur les jeux notés en commun avec moi.
  const mine = new Map((byUser.get(meId) ?? []).filter((r) => r.rating != null).map((r) => [r.game.id, Number(r.rating)]));
  const affinity = members.filter((m) => m.profile.id !== meId).map((m) => {
    const theirs = (byUser.get(m.profile.id) ?? []).filter((r) => r.rating != null && mine.has(r.game.id));
    if (!theirs.length) return null;
    const diff = theirs.reduce((a, r) => a + Math.abs(Number(r.rating) - mine.get(r.game.id)!), 0) / theirs.length;
    return { label: "@" + m.profile.handle, value: Math.round(Math.max(0, 100 - diff * 25)), extra: <Avatar profile={m.profile} size={22} />, color: m.profile.accent_color, n: theirs.length };
  }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.value - a.value);

  const totals = { jeux: data.rows.length, finis: METRICS.finis.fn(data.rows), heures: METRICS.heures.fn(data.rows), communs: common.length };

  async function leave() {
    const { error } = await createClient().from("group_members").delete().eq("group_id", group.id).eq("user_id", meId);
    if (error) return toast(error.message, "error");
    sfx.no(); toast("Tu as quitté le groupe"); router.push("/groupes"); router.refresh();
  }
  async function removeGroup() {
    const { error } = await createClient().from("groups").delete().eq("id", group.id);
    if (error) return toast(error.message, "error");
    sfx.no(); toast("Groupe supprimé"); router.push("/groupes"); router.refresh();
  }
  async function kick(uid: string, handle: string | null) {
    const { error } = await createClient().from("group_members").delete().eq("group_id", group.id).eq("user_id", uid);
    if (error) return toast(error.message, "error");
    toast(`@${handle} a été retiré du groupe`); router.refresh();
  }
  async function newCode() {
    const { error } = await createClient().rpc("regenerate_group_code", { gid: group.id });
    if (error) return toast(error.message, "error");
    sfx.ok(); toast("Nouveau lien créé : l'ancien ne marche plus", "success"); router.refresh();
  }

  const card = "rounded-3xl border border-line bg-card/80 p-5 backdrop-blur";
  return (
    <div>
      {/* En-tête */}
      <section className="relative overflow-hidden rounded-[32px] border border-line p-6 sm:p-8" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${group.color}55, transparent 60%), linear-gradient(160deg, #1a1426, #0b0a10)` }}>
        <motion.div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl" style={{ background: group.color }} animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.15, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative flex flex-wrap items-end gap-5">
          <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="grid h-24 w-24 place-items-center rounded-[28px] font-display text-5xl font-bold text-white shadow-[0_20px_50px_-15px_var(--glow)]" style={{ background: `linear-gradient(135deg, ${group.color}, #1a1426)` }}>{group.name[0].toUpperCase()}</motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink2">Groupe · {members.length} membre{members.length > 1 ? "s" : ""}</p>
            <h1 className="text-balance text-[clamp(30px,5vw,52px)] font-bold leading-none">{group.name}</h1>
            {group.description && <p className="mt-2 max-w-[60ch] text-ink2">{group.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-1">
              {members.map((m, i) => (
                <motion.div key={m.profile.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <Link href={`/u/${m.profile.handle}`} title={`@${m.profile.handle}`} className={i ? "-ml-2 block transition hover:-translate-y-1" : "block transition hover:-translate-y-1"}><Avatar profile={m.profile} size={38} /></Link>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2"><CopyLink code={group.invite_code} label="Inviter des amis" /></div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([[totals.jeux, "jeux à eux tous"], [totals.finis, "jeux terminés"], [totals.heures, "heures de jeu"], [totals.communs, "jeux en commun"]] as const).map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur"><b className="block font-display text-3xl leading-none"><CountUp value={v} /></b><span className="text-xs text-mute">{l}</span></div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Comparaison interactive */}
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Le classement du groupe</h2>
            <LayoutGroup id="metric">
              <div className="flex rounded-full bg-white/5 p-1" role="tablist" aria-label="Statistique">
                {(Object.keys(METRICS) as MetricKey[]).map((k) => (
                  <button key={k} role="tab" aria-selected={metric === k} onClick={() => setMetric(k)} className="relative min-h-9 rounded-full px-3 text-xs font-semibold">
                    {metric === k && <motion.span layoutId="metric-pill" className="absolute inset-0 rounded-full bg-violet" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <span className="relative">{METRICS[k].label}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={metric} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <HBars data={compare} format={(v) => `${String(v).replace(".", ",")} ${METRICS[metric].unit}`} />
            </motion.div>
          </AnimatePresence>
        </section>

        <div className="flex flex-col gap-5">
          {affinity.length > 0 && (
            <section className={card}>
              <h2 className="text-lg font-bold">Ton affinité de goûts</h2>
              <p className="mb-4 text-xs text-mute">Calculée sur les jeux que vous avez notés tous les deux.</p>
              <HBars data={affinity} format={(v) => `${v} %`} />
            </section>
          )}
          {genres.length > 0 && <section className={card}><h2 className="mb-4 text-lg font-bold">Ce que le groupe aime</h2><Donut data={genres} size={170} label="jeux finis" /></section>}
        </div>
      </div>

      {/* Onglets jeux */}
      <section className="mt-6">
        <LayoutGroup id="tabs">
          <div className="mb-4 flex gap-1 overflow-x-auto" role="tablist">
            {([["commun", `Jeux en commun (${common.length})`], ["top", "Les mieux notés"], ["activite", "Activité récente"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="relative min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold">
                {tab === k && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-2xl bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className={`relative ${tab === k ? "text-ink" : "text-mute"}`}>{l}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {tab === "commun" && (common.length ? (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {common.map((g, i) => (
                  <motion.div key={g.game.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }}>
                    <Link href={`/jeu/${g.game.id}`} className="group block">
                      <Cover game={g.game} className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_40px_-18px_var(--glow)] [--cover-fs:34px]">
                        <span className="absolute bottom-2 left-2 z-[2] flex">{g.owners.slice(0, 4).map((o, k) => { const p = prof.get(o.user_id); return p ? <span key={o.user_id} className={k ? "-ml-2" : ""}><Avatar profile={p} size={22} /></span> : null; })}</span>
                      </Cover>
                      <p className="mt-2 truncate text-sm font-semibold">{g.game.name}</p>
                      <p className="text-xs text-mute">{g.owners.length} membres{g.avg != null ? ` · ${g.avg.toFixed(1)}★` : ""}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : <p className={`${card} text-mute`}>Pas encore de jeu en commun. Ajoutez vos jeux ou importez vos bibliothèques Steam !</p>)}

            {tab === "top" && (topRated.length ? (
              <ol className="grid gap-3 md:grid-cols-2">
                {topRated.map((g, i) => (
                  <motion.li key={g.game.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/jeu/${g.game.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-card/70 p-3 transition hover:border-white/20 hover:bg-card">
                      <span className="w-7 text-center font-display text-2xl font-bold text-faint">{i + 1}</span>
                      <Cover game={g.game} className="w-12 shrink-0 rounded-lg [--cover-fs:12px]" />
                      <span className="min-w-0 flex-1"><b className="block truncate">{g.game.name}</b><span className="text-xs text-mute">noté par {g.rated} membre{g.rated > 1 ? "s" : ""}</span></span>
                      <span className="text-right"><Stars value={g.avg} size={13} /><b className="block font-display">{g.avg!.toFixed(1)}</b></span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            ) : <p className={`${card} text-mute`}>Aucun jeu noté dans le groupe pour l&apos;instant.</p>)}

            {tab === "activite" && (activity.length ? (
              <ul className="flex flex-col gap-2">
                {activity.map((r, i) => { const p = prof.get(r.user_id); return p ? (
                  <motion.li key={`${r.user_id}-${r.game.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 rounded-2xl border border-line bg-card/60 p-3 text-sm">
                    <Avatar profile={p} size={32} />
                    <p className="min-w-0 flex-1"><Link href={`/u/${p.handle}`} className="font-semibold hover:underline">@{p.handle}</Link> <span className="text-mute">{VERB[r.status]}</span> <Link href={`/jeu/${r.game.id}`} className="font-semibold hover:underline">{r.game.name}</Link>{r.rating != null && <span className="text-[#FFD45C]"> · {Number(r.rating).toFixed(1)}★</span>}</p>
                    <span className="shrink-0 text-xs text-faint">{ago(r.updated_at)}</span>
                    <Link href={`/jeu/${r.game.id}`} className="w-9 shrink-0"><Cover game={r.game} className="rounded-md [--cover-fs:9px]" /></Link>
                  </motion.li>
                ) : null; })}
              </ul>
            ) : <p className={`${card} text-mute`}>Rien pour l&apos;instant.</p>)}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Membres */}
      <section className={`${card} mt-6`}>
        <h2 className="mb-2 text-lg font-bold">Membres</h2>
        <ul className="grid gap-1 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.profile.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5">
              <Link href={`/u/${m.profile.handle}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar profile={m.profile} size={40} /><span className="min-w-0"><b className="block truncate">@{m.profile.handle}</b><span className="text-xs text-mute">{m.role === "owner" ? "Créateur" : m.role === "admin" ? "Admin" : "Membre"} · {(byUser.get(m.profile.id) ?? []).length} jeux</span></span></Link>
              {(myRole === "owner" || myRole === "admin") && m.role !== "owner" && m.profile.id !== meId && (
                <button onClick={() => kick(m.profile.id, m.profile.handle)} className="rounded-lg px-2 py-1 text-xs font-semibold text-no hover:bg-no/10">Retirer</button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {(myRole === "owner" || myRole === "admin") && <button className={btnGhost} onClick={newCode}>Changer le lien d&apos;invitation</button>}
          {myRole !== "owner" && <button className={btnDanger} onClick={leave}>Quitter le groupe</button>}
          {myRole === "owner" && <ConfirmDelete onConfirm={removeGroup} />}
        </div>
      </section>
    </div>
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  return ask ? (
    <span className="flex flex-wrap items-center gap-2"><span className="text-sm text-ink2">Supprimer le groupe pour tout le monde ?</span><button className={btnDanger} onClick={onConfirm}>Oui, supprimer</button><button className={btnGhost} onClick={() => setAsk(false)}>Annuler</button></span>
  ) : <button className={btnDanger} onClick={() => setAsk(true)}>Supprimer le groupe</button>;
}
