"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { addFriend, forget, INVITE_KEY, JOIN_KEY, recall } from "@/lib/social";
import { toast } from "@/lib/toast";

/**
 * Après une inscription ou une connexion, termine automatiquement
 * l'invitation qui avait été ouverte avant (ajout d'ami ou entrée dans un groupe).
 */
export default function InviteResume({ meId }: { meId: string }) {
  const router = useRouter();
  useEffect(() => {
    const handle = recall(INVITE_KEY);
    const code = recall(JOIN_KEY);
    if (!handle && !code) return;
    const supabase = createClient();
    (async () => {
      if (handle) {
        forget(INVITE_KEY);
        const { data } = await supabase.rpc("profile_preview", { p_handle: handle });
        const other = (data as { id: string }[] | null)?.[0];
        if (other && other.id !== meId) {
          const r = await addFriend(supabase, meId, other.id);
          if (r === "accepted") { toast(`Tu es maintenant ami avec @${handle} 🎉`, "match"); }
          else if (r === "sent") { toast(`Demande d'ami envoyée à @${handle}`, "success"); }
          router.refresh();
        }
      }
      if (code) {
        forget(JOIN_KEY);
        const { data: gid, error } = await supabase.rpc("join_group", { p_code: code });
        if (!error && gid) { toast("Bienvenue dans le groupe !", "match"); router.push(`/groupes/${gid}`); }
      }
    })();
  }, [meId, router]);
  return null;
}
