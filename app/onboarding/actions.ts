"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HANDLE_RE } from "@/components/ui";

export async function chooseHandle(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  const handle = String(form.get("handle") || "").trim().toLowerCase().replace(/^@/, "");
  if (!HANDLE_RE.test(handle)) return { error: "3 à 20 caractères : lettres minuscules, chiffres ou _." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase.from("profiles").update({ handle, display_name: handle }).eq("id", user.id).is("handle", null);
  if (error) {
    if (error.code === "23505") return { error: `@${handle} est déjà pris.` };
    return { error: "Impossible d'enregistrer ce @pseudo. Réessaie." };
  }
  redirect(`/u/${handle}`);
}
