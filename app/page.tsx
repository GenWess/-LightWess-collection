import Link from "next/link";
import { Logo } from "@/components/Logo";
import { btnGhost, btnPrimary } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/connexion" className={btnGhost}>Se connecter</Link>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="fade-up">
          <h1 className="text-balance text-[clamp(40px,6.5vw,72px)] font-bold leading-[1.02]">
            Tous tes jeux.<br />Toutes tes notes.<br /><span className="text-violet-hi">Tes potes.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg text-ink2">
            Range ta collection, note chaque jeu que tu termines, importe ta bibliothèque Steam et découvre ce que tes amis adorent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className={`${btnPrimary} min-h-13 px-7 text-[17px]`}>Créer mon compte</Link>
            <Link href="/connexion" className={`${btnGhost} min-h-13 px-7 text-[17px]`}>J&apos;ai déjà un compte</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-mute">
            <li>Gratuit, sans pub</li>
            <li>Ton @pseudo unique</li>
            <li>Toutes les plateformes</li>
          </ul>
        </div>

        <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden="true">
          <div className="absolute inset-[12%] rounded-[44px] bg-gradient-to-br from-violet-hi to-violet-lo opacity-90 blur-[2px] [transform:rotate(-8deg)]" />
          <div className="absolute inset-[18%] grid place-items-center rounded-[40px] border border-white/20 bg-night/40 backdrop-blur-xl [transform:rotate(4deg)]">
            <svg viewBox="0 0 100 100" className="h-2/5 w-2/5 drop-shadow-[0_0_40px_rgba(199,164,255,.8)]">
              <path d="M58 12 26 56h20l-9 32 37-46H54l11-30z" fill="#fff" />
            </svg>
          </div>
        </div>
      </section>

      <footer className="pb-2 text-xs text-faint">Un projet du studio Lightwess.</footer>
    </main>
  );
}
