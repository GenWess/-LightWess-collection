import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <AuthShell title="Créer ton compte" sub="Choisis ton @pseudo : c'est comme ça que tes amis te trouveront.">
      <SignupForm discord={process.env.NEXT_PUBLIC_DISCORD_ENABLED === "1"} />
    </AuthShell>
  );
}
