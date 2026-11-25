import Link from "next/link";
import { redirect } from "next/navigation";
import { Emblem, Logo } from "@/components/Logo";
import Avatar from "@/components/Avatar";
import NavLinks from "@/components/NavLinks";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/connexion");
  if (!profile?.handle) redirect("/onboarding");

  const links = [
    { href: `/u/${profile.handle}`, label: "Mon profil", icon: "user" as const },
    { href: "/parametres", label: "Paramètres", icon: "gear" as const },
  ];

  return (
    <div className="min-h-dvh">
      {/* Barre latérale (PC) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-2 border-r border-line bg-night/80 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href={`/u/${profile.handle}`} className="mb-6 px-2" aria-label="Lightwess Collection"><Logo size="sm" /></Link>
        <NavLinks links={links} variant="side" />
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
          <Avatar profile={profile} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{profile.display_name || profile.handle}</p>
            <p className="truncate text-xs text-mute">@{profile.handle}</p>
          </div>
          <form action="/deconnexion" method="post">
            <button className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-mute hover:text-ink" aria-label="Se déconnecter" title="Se déconnecter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Barre du haut (mobile) : logo dans le coin */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-night/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href={`/u/${profile.handle}`} aria-label="Lightwess Collection" className="flex items-center gap-2">
          <Emblem className="h-8 w-8" />
          <span className="font-display text-sm font-bold tracking-[0.14em]">LIGHTWESS</span>
        </Link>
        <Avatar profile={profile} size={34} />
      </header>

      <main className="px-4 pb-28 pt-5 sm:px-8 lg:ml-64 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Onglets (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-night/90 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigation">
        <NavLinks links={links} variant="tab" />
      </nav>
    </div>
  );
}
