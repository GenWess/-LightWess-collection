"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HANDLE_RE, btnPrimary, input, label } from "@/components/ui";
import DiscordButton from "@/components/DiscordButton";
import { frAuthError } from "@/lib/errors";

export default function SignupForm({ discord }: { discord: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const cleanHandle = handle.trim().toLowerCase().replace(/^@/, "");
  const handleOk = HANDLE_RE.test(cleanHandle);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!handleOk) return setError("Ton @pseudo doit faire 3 à 20 caractères : lettres minuscules, chiffres ou _.");
    if (password.length < 8) return setError("Mot de passe : 8 caractères minimum.");
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { handle: cleanHandle, display_name: cleanHandle },
        emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setBusy(false);
    if (error) return setError(frAuthError(error.message));
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else setSent(true);
  }

  if (sent)
    return (
      <div className="rounded-3xl border border-violet/40 bg-violet/10 p-5">
        <p className="font-semibold">Vérifie ta boîte mail ✉️</p>
        <p className="mt-1 text-ink2">On t&apos;a envoyé un lien à <b>{email}</b>. Clique dessus pour activer ton compte.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="handle" className={label}>Ton @pseudo</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-violet-hi">@</span>
          <input id="handle" className={`${input} pl-9`} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ""))} maxLength={21} autoComplete="username" placeholder="lucas" required />
        </div>
        <p className={`text-xs ${handle && !handleOk ? "text-no" : "text-faint"}`}>3 à 20 caractères : a-z, 0-9 et _. Il ne pourra plus changer.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>Mot de passe</label>
        <input id="password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} placeholder="8 caractères minimum" required />
      </div>
      <p className="min-h-5 text-sm text-no" aria-live="polite">{error}</p>
      <button className={`${btnPrimary} min-h-13 text-[17px]`} disabled={busy}>{busy ? "Création…" : "Créer mon compte"}</button>
      {discord && <DiscordButton />}
      <p className="text-center text-sm text-mute">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-violet-hi underline-offset-4 hover:underline">Se connecter</Link></p>
    </form>
  );
}
