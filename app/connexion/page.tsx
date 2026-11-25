import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  return (
    <AuthShell title="Bon retour 👋" sub="Connecte-toi pour retrouver ta collection.">
      <LoginForm next={safeNext} discord={process.env.NEXT_PUBLIC_DISCORD_ENABLED === "1"} />
    </AuthShell>
  );
}
