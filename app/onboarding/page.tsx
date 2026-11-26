import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getSessionProfile } from "@/lib/supabase/server";
import HandleForm from "./HandleForm";

export const metadata: Metadata = { title: "Choisis ton @pseudo" };

export default async function Page() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/connexion");
  if (profile?.handle) redirect("/decouvrir");
  const wanted = (user.user_metadata?.handle as string | undefined) ?? "";
  return (
    <AuthShell
      title="Choisis ton @pseudo"
      sub={wanted ? `@${wanted} est déjà pris. Choisis-en un autre.` : "C'est ton identifiant unique : tes amis te chercheront avec."}
    >
      <HandleForm />
    </AuthShell>
  );
}
