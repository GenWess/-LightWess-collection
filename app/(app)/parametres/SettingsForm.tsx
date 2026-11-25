"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { btnDanger, btnGhost, btnPrimary, input, label, panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/server";

const SWATCHES = ["#8B5CF6", "#F28C38", "#FF5C8A", "#5B8CFF", "#3DDC97", "#E5C14B", "#2EB6E8", "#FF4D3D"];

/** Redimensionne une image dans le navigateur avant envoi (plus léger, plus rapide). */
async function resize(file: File, w: number, h: number): Promise<Blob> {
  const img = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const s = Math.max(w / img.width, h / img.height);
  c.getContext("2d")!.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Image illisible"))), "image/webp", 0.88));
}

export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [p, setP] = useState(profile);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const supabase = createClient();

  async function save(patch: Partial<Profile>, quiet = false) {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("profiles").update(patch).eq("id", p.id);
    setBusy(false);
    if (error) return setMsg("Erreur : " + error.message);
    setP((x) => ({ ...x, ...patch }));
    if (!quiet) setMsg("Enregistré ✓");
    router.refresh();
  }

  async function upload(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const blob = await resize(file, kind === "avatar" ? 320 : 1500, kind === "avatar" ? 320 : 500);
      const path = `${p.id}/${kind}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      await save(kind === "avatar" ? { avatar_url: url } : { banner_url: url });
    } catch (e) {
      setBusy(false);
      setMsg("Erreur d'envoi : " + (e as Error).message);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); return setMsg("Erreur : " + error.message); }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <form className={`${panel} flex flex-col gap-5`} onSubmit={(e) => { e.preventDefault(); save({ display_name: p.display_name?.trim() || p.handle, bio: p.bio?.trim() || null }); }}>
        <h2 className="text-xl font-bold">Profil</h2>
        <div className="flex items-center gap-4">
          <Avatar profile={p} size={84} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="av" className={label}>Photo de profil</label>
            <input id="av" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-semibold file:text-ink" onChange={(e) => upload(e.target.files?.[0], "avatar")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ban" className={label}>Bannière</label>
          <input id="ban" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-semibold file:text-ink" onChange={(e) => upload(e.target.files?.[0], "banner")} />
          {p.banner_url && <button type="button" className="self-start text-sm text-mute underline" onClick={() => save({ banner_url: null })}>Retirer la bannière</button>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dn" className={label}>Nom affiché</label>
          <input id="dn" className={input} maxLength={40} value={p.display_name ?? ""} onChange={(e) => setP({ ...p, display_name: e.target.value })} />
          <p className="text-xs text-faint">Ton @{p.handle} reste le même.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className={label}>Bio</label>
          <textarea id="bio" className={`${input} min-h-24 py-3`} maxLength={280} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <button className={btnPrimary} disabled={busy}>Enregistrer</button>
          <span className="text-sm text-mute" aria-live="polite">{msg}</span>
        </div>
      </form>

      <div className="flex flex-col gap-5">
        <div className={`${panel} flex flex-col gap-3`}>
          <h2 className="text-xl font-bold">Couleur du profil</h2>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={p.accent_color?.toLowerCase() === c.toLowerCase()} onClick={() => save({ accent_color: c }, true)}
                className="h-11 w-11 rounded-full border-[3px] transition active:scale-90" style={{ background: c, borderColor: p.accent_color?.toLowerCase() === c.toLowerCase() ? "#fff" : "transparent" }} />
            ))}
            <label className="flex items-center gap-2 text-sm text-mute">Autre
              <input type="color" value={p.accent_color || "#8B5CF6"} onChange={(e) => save({ accent_color: e.target.value.toUpperCase() }, true)} className="h-11 w-11 cursor-pointer rounded-full border-0 bg-transparent" />
            </label>
          </div>
        </div>

        <div className={`${panel} flex flex-col gap-3`}>
          <h2 className="text-xl font-bold">Qui voit ma collection ?</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Confidentialité">
            {([["public", "Tout le monde", "Tous les membres du site"], ["friends", "Mes amis", "Seulement les amis acceptés"], ["private", "Moi seul", "Personne d'autre"]] as const).map(([v, t, d]) => (
              <button key={v} type="button" role="radio" aria-checked={p.collection_visibility === v} onClick={() => save({ collection_visibility: v }, true)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${p.collection_visibility === v ? "border-violet bg-violet/15" : "border-white/10 hover:bg-white/5"}`}>
                <b>{t}</b><span className="block text-sm text-mute">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`${panel} flex flex-col gap-3`}>
          <h2 className="text-xl font-bold">Compte</h2>
          <form action="/deconnexion" method="post"><button className={btnGhost}>Se déconnecter</button></form>
          {confirmDelete ? (
            <div className="rounded-2xl border border-no/40 bg-no/10 p-4">
              <p className="font-semibold">Supprimer définitivement ton compte ?</p>
              <p className="mt-1 text-sm text-ink2">Ta collection, tes avis et tes amis seront effacés.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnDanger} onClick={deleteAccount} disabled={busy}>Oui, tout supprimer</button>
                <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>Annuler</button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${btnDanger} self-start`} onClick={() => setConfirmDelete(true)}>Supprimer mon compte</button>
          )}
        </div>
      </div>
    </div>
  );
}
