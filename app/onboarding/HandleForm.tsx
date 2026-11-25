"use client";

import { useActionState } from "react";
import { btnPrimary, input, label } from "@/components/ui";
import { chooseHandle } from "./actions";

export default function HandleForm() {
  const [state, action, pending] = useActionState(chooseHandle, { error: "" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="handle" className={label}>Ton @pseudo</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-violet-hi">@</span>
          <input id="handle" name="handle" className={`${input} pl-9`} maxLength={21} pattern="@?[a-z0-9_]{3,20}" autoComplete="username" placeholder="lucas" required />
        </div>
        <p className="text-xs text-faint">3 à 20 caractères : a-z, 0-9 et _. Il ne pourra plus changer.</p>
      </div>
      <p className="min-h-5 text-sm text-no" aria-live="polite">{state.error}</p>
      <button className={`${btnPrimary} min-h-13 text-[17px]`} disabled={pending}>{pending ? "Enregistrement…" : "C'est parti"}</button>
    </form>
  );
}
