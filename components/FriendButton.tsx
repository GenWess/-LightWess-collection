"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnGhost, btnPrimary } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sound";

type Rel = { id: string; status: string; requester_id: string } | null;

export default function FriendButton({ meId, otherId, rel }: { meId: string; otherId: string; rel: Rel }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const run = async (fn: () => PromiseLike<unknown>, s: () => void) => { setBusy(true); await fn(); s(); setBusy(false); router.refresh(); };

  if (!rel || rel.status === "declined")
    return rel ? null : <button className={btnPrimary} disabled={busy} data-nosound onClick={() => run(() => supabase.from("friendships").insert({ requester_id: meId, addressee_id: otherId }), sfx.ok)}>Ajouter en ami</button>;
  if (rel.status === "accepted") return <span className="rounded-full bg-ok/15 px-4 py-2 text-sm font-semibold text-ok">Ami ✓</span>;
  if (rel.requester_id === meId)
    return <button className={btnGhost} disabled={busy} onClick={() => run(() => supabase.from("friendships").delete().eq("id", rel.id), sfx.no)}>Demande envoyée · annuler</button>;
  return <button className={btnPrimary} disabled={busy} data-nosound onClick={() => run(() => supabase.from("friendships").update({ status: "accepted" }).eq("id", rel.id), sfx.match)}>Accepter sa demande</button>;
}
