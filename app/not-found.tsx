import Link from "next/link";
import { Emblem } from "@/components/Logo";
import { btnPrimary } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="fade-up">
        <Emblem className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-3xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-mute">Ce joueur ou cette page n&apos;existe pas.</p>
        <Link href="/" className={`${btnPrimary} mt-6`}>Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
