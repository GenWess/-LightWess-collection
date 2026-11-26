"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { Logo } from "./Logo";
import { btnGhost, btnPrimary } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { addFriend, forget, INVITE_KEY, JOIN_KEY, remember } from "@/lib/social";
import { sfx } from "@/lib/sound";
import { toast } from "@/lib/toast";

type Friend = { kind: "friend"; id: string; handle: string; display_name: string | null; avatar_url: string | null; accent_color: string };
type Group = { kind: "group"; id: string; code: string; name: string; description: string | null; color: string; members: number };

/** Page d'arrivée d'un lien d'invitation (ami ou groupe), connecté ou non. */
export default function InviteLanding({ target, meId, meHasHandle }: { target: Friend | Group; meId: string | null; meHasHandle: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const isGroup = target.kind === "group";
  const color = isGroup ? target.color : target.accent_color;
  const next = isGroup ? `/rejoindre/${target.code}` : `/ajouter/${target.handle}`;

  // Sans compte : on garde l'invitation en mémoire, elle sera terminée automatiquement après l'inscription.
  useEffect(() => {
    if (meId && meHasHandle) { forget(isGroup ? JOIN_KEY : INVITE_KEY); return; }
    remember(isGroup ? JOIN_KEY : INVITE_KEY, isGroup ? target.code : target.handle);
  }, [meId, meHasHandle, isGroup, target]);

  async function accept() {
    if (!meId) return;
    setState("busy");
    const supabase = createClient();
    if (isGroup) {
      const { data, error } = await supabase.rpc("join_group", { p_code: target.code });
      if (error) { sfx.err(); toast(error.message, "error"); setState("idle"); return; }
      sfx.match(); toast(`Bienvenue dans ${target.name} !`, "match");
      router.push(`/groupes/${data}`);
    } else {
      const r = await addFriend(supabase, meId, target.id);
      if (r === "error") { sfx.err(); toast("Impossible d'envoyer la demande.", "error"); setState("idle"); return; }
      sfx.match();
      toast(r === "accepted" ? `Tu es maintenant ami avec @${target.handle} 🎉` : r === "already" ? `Vous êtes déjà amis` : `Demande envoyée à @${target.handle}`, r === "accepted" ? "match" : "success");
      setState("done");
      setTimeout(() => router.push(`/u/${target.handle}`), 900);
    }
  }

  const self = !isGroup && meId === target.id;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: color }} />
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-card/80 p-7 text-center shadow-[0_40px_100px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl">
        <div className="mb-6 flex justify-center"><Logo size="sm" /></div>
        <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }} className="mx-auto grid w-fit place-items-center">
          {isGroup ? (
            <span className="grid h-24 w-24 place-items-center rounded-[28px] font-display text-4xl font-bold text-white shadow-2xl" style={{ background: `linear-gradient(135deg, ${color}, #1a1426)` }}>{target.name.charAt(0).toUpperCase()}</span>
          ) : (
            <Avatar profile={target} size={96} ring />
          )}
        </motion.div>
        <p className="mt-5 text-sm font-semibold text-mute">{isGroup ? "Tu es invité à rejoindre le groupe" : "Tu es invité à devenir ami avec"}</p>
        <h1 className="mt-1 text-3xl font-bold">{isGroup ? target.name : `@${target.handle}`}</h1>
        {isGroup ? (
          <p className="mt-1 text-mute">{target.members} membre{target.members > 1 ? "s" : ""}{target.description ? ` · ${target.description}` : ""}</p>
        ) : target.display_name && target.display_name !== target.handle ? <p className="mt-1 text-mute">{target.display_name}</p> : null}

        <div className="mt-7 flex flex-col gap-2">
          {self ? (
            <>
              <p className="text-ink2">C&apos;est ton propre lien : envoie-le à tes amis !</p>
              <Link href="/amis" className={btnGhost}>Retour</Link>
            </>
          ) : meId && meHasHandle ? (
            <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={accept} disabled={state !== "idle"} data-nosound className={`${btnPrimary} min-h-14 text-lg`}>
              {state === "busy" ? "Un instant…" : state === "done" ? "C'est fait ✓" : isGroup ? "Rejoindre le groupe" : `Ajouter @${target.handle}`}
            </motion.button>
          ) : (
            <>
              <Link href={`/inscription?next=${encodeURIComponent(next)}`} className={`${btnPrimary} min-h-14 text-lg`}>Créer mon compte</Link>
              <Link href={`/connexion?next=${encodeURIComponent(next)}`} className={btnGhost}>J&apos;ai déjà un compte</Link>
              <p className="mt-2 text-xs text-faint">L&apos;invitation sera acceptée automatiquement juste après.</p>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
