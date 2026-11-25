"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, input, label } from "@/components/ui";
import DiscordButton from "@/components/DiscordButton";
import { frAuthError } from "@/lib/errors";

export default function LoginForm({ next, discord }: { next: string; discord: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(frAuthError(error.message));
    // Le proxy redirige vers le profil (ou vers /onboarding si le @pseudo manque).
    router.push(next || "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>Mot de passe</label>
        <input id="password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <p className="min-h-5 text-sm text-no" aria-live="polite">{error}</p>
      <button className={`${btnPrimary} min-h-13 text-[17px]`} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      {discord && <DiscordButton />}
      <p className="text-center text-sm text-mute">Pas encore de compte ? <Link href="/inscription" className="font-semibold text-violet-hi underline-offset-4 hover:underline">Créer un compte</Link></p>
    </form>
  );
}
