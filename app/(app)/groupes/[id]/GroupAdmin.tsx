"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import BannerPicker from "@/components/BannerPicker";
import CopyLink from "@/components/CopyLink";
import Sheet from "@/components/Sheet";
import { btnPrimary, input, label, panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { MiniProfile } from "@/lib/types";

type G = { id: string; name: string; description: string | null; color: string; avatar_url?: string | null; banner_url?: string | null; banner_pos_y?: number | null };
const SWATCHES = ["#8B5CF6", "#F28C38", "#FF5C8A", "#5B8CFF", "#3DDC97", "#E5C14B", "#2EB6E8", "#FF4D3D"];

/** Ajouter des gens au groupe : ses amis en un toucher, ou n'importe quel @pseudo. */
export function AddMembers({ groupId, friends, canAddAnyone, inviteCode }: { groupId: string; friends: MiniProfile[]; canAddAnyone: boolean; inviteCode: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function add(h: string, key: string) {
    if (!h.trim()) return;
    setBusy(key);
    const { error } = await createClient().rpc("add_group_member", { gid: groupId, p_handle: h.trim() });
    setBusy(null);
    if (error) return toast(/add_group_member/.test(error.message) ? "Fonction pas encore activée : lance le fichier 004 dans Supabase." : error.message, "error");
    setAdded((s) => new Set(s).add(key));
    toast(`@${h.replace(/^@/, "")} a été ajouté au groupe 🎉`, "match");
    router.refresh();
  }

  const left = friends.filter((f) => !added.has(f.id));
  return (
    <section className={`${panel} flex flex-col gap-4`}>
      <h2 className="text-lg font-bold">Ajouter des gens</h2>
      <form onSubmit={(e) => { e.preventDefault(); void add(handle, "h:" + handle).then(() => setHandle("")); }} className="flex gap-2">
        <input className={`${input} min-h-11`} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@pseudo" aria-label="Pseudo à ajouter" autoCapitalize="none" autoCorrect="off" />
        <button className={`${btnPrimary} min-h-11`} disabled={!handle.trim() || busy != null}>Ajouter</button>
      </form>
      {!canAddAnyone && <p className="-mt-2 text-xs text-faint">Tu peux ajouter tes amis. Pour les autres, demande au créateur du groupe.</p>}

      {left.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Tes amis</p>
          <ul className="-mx-2 flex flex-col">
            {left.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
                <Avatar profile={f} size={38} />
                <span className="min-w-0 flex-1"><b className="block truncate">{f.display_name || f.handle}</b><span className="text-xs text-mute">@{f.handle}</span></span>
                <button onClick={() => add(f.handle ?? "", f.id)} disabled={busy === f.id} className="min-h-9 rounded-full bg-violet px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50">{busy === f.id ? "…" : "Ajouter"}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm text-mute">Ou envoie le lien : ceux qui l&apos;ouvrent rejoignent le groupe.</p>
        <CopyLink code={inviteCode} label="Copier le lien d'invitation" />
      </div>
    </section>
  );
}

/** Personnaliser le groupe : photo, bannière, nom, description, couleur. */
export function GroupEdit({ open, onClose, group, meId }: { open: boolean; onClose: () => void; group: G; meId: string }) {
  const router = useRouter();
  const [g, setG] = useState(group);
  const [busy, setBusy] = useState(false);

  async function save(patch: Partial<G>, msg = "Enregistré ✓") {
    setBusy(true);
    const { error } = await createClient().from("groups").update(patch).eq("id", group.id);
    setBusy(false);
    if (error) return toast(/avatar_url|banner/.test(error.message) ? "Il manque la mise à jour : lance le fichier 004 dans Supabase." : "Erreur : " + error.message, "error");
    setG((x) => ({ ...x, ...patch }));
    toast(msg, "success");
    router.refresh();
  }

  async function upload(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    setBusy(true);
    try {
      const img = await createImageBitmap(file);
      const c = document.createElement("canvas");
      if (kind === "avatar") {
        c.width = c.height = 400;
        const s = Math.max(400 / img.width, 400 / img.height);
        c.getContext("2d")!.drawImage(img, (400 - img.width * s) / 2, (400 - img.height * s) / 2, img.width * s, img.height * s);
      } else {
        const s = Math.min(1, 2000 / Math.max(img.width, img.height));
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      }
      const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Image illisible"))), "image/webp", 0.88));
      const supabase = createClient();
      const path = `${meId}/groupe-${group.id}-${kind}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      await save(kind === "avatar" ? { avatar_url: url } : { banner_url: url, banner_pos_y: 50 }, kind === "avatar" ? "Photo du groupe changée ✓" : "Bannière changée ✓ Fais-la glisser pour la cadrer.");
    } catch (e) {
      setBusy(false);
      toast("Envoi impossible : " + (e as Error).message, "error");
    }
  }

  const file = "text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-semibold file:text-ink";
  return (
    <Sheet open={open} onClose={onClose} label="Modifier le groupe" className="max-w-xl"
      handleArea={<div className="flex items-center justify-between p-5 pb-3 pt-2 sm:pt-5"><h2 className="text-2xl font-bold">Modifier le groupe</h2><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-mute" aria-label="Fermer">✕</button></div>}>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="flex items-center gap-4">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-cover bg-center font-display text-4xl font-bold" style={{ background: g.avatar_url ? undefined : `linear-gradient(135deg, ${g.color}, #1a1426)`, backgroundImage: g.avatar_url ? `url("${g.avatar_url}")` : undefined }}>{g.avatar_url ? null : g.name[0]?.toUpperCase()}</span>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gav" className={label}>Photo du groupe</label>
            <input id="gav" type="file" accept="image/*" className={file} disabled={busy} onChange={(e) => upload(e.target.files?.[0], "avatar")} />
            {g.avatar_url && <button className="self-start text-xs text-mute underline" onClick={() => save({ avatar_url: null })}>Retirer la photo</button>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gban" className={label}>Bannière</label>
          <input id="gban" type="file" accept="image/*" className={file} disabled={busy} onChange={(e) => upload(e.target.files?.[0], "banner")} />
          {g.banner_url && (
            <>
              <BannerPicker key={g.banner_url} url={g.banner_url} x={50} y={g.banner_pos_y ?? 50} accent={g.color} busy={busy} onSave={(pos) => save({ banner_pos_y: pos.banner_pos_y }, "Cadrage enregistré ✓")} />
              <button className="self-start text-xs text-mute underline" onClick={() => save({ banner_url: null })}>Retirer la bannière</button>
            </>
          )}
        </div>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (g.name.trim().length >= 2) void save({ name: g.name.trim(), description: g.description?.trim() || null }); }}>
          <div className="flex flex-col gap-1.5"><label htmlFor="gn" className={label}>Nom</label><input id="gn" className={input} maxLength={40} value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></div>
          <div className="flex flex-col gap-1.5"><label htmlFor="gd" className={label}>Description</label><textarea id="gd" className={`${input} min-h-20 py-3`} maxLength={280} value={g.description ?? ""} onChange={(e) => setG({ ...g, description: e.target.value })} /></div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Couleur du groupe">
            {SWATCHES.map((c) => <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={g.color.toLowerCase() === c.toLowerCase()} onClick={() => save({ color: c }, "Couleur changée ✓")} className="h-10 w-10 rounded-full border-[3px] transition active:scale-90" style={{ background: c, borderColor: g.color.toLowerCase() === c.toLowerCase() ? "#fff" : "transparent" }} />)}
          </div>
          <button className={`${btnPrimary} self-start`} disabled={busy}>Enregistrer</button>
        </form>
      </div>
    </Sheet>
  );
}
