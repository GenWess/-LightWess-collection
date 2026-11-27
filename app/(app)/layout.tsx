import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import Avatar from "@/components/Avatar";
import NavLinks, { type NavLink } from "@/components/NavLinks";
import InviteResume from "@/components/InviteResume";
import MobileChrome from "@/components/MobileChrome";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/connexion");
  if (!profile?.handle) redirect("/onboarding");

  const { count: pending } = await supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending");

  const links: NavLink[] = [
    { href: "/accueil", label: "Accueil", icon: "home", tab: true },
    { href: "/explorer", label: "Explorer", icon: "search", tab: true },
    { href: "/decouvrir", label: "Découvrir", icon: "swipe", tab: true },
    { href: "/fil", label: "Fil d'amis", short: "Fil", icon: "feed" },
    { href: "/collection", label: "Ma collection", short: "Collection", icon: "lib", tab: true },
    { href: "/listes", label: "Listes", icon: "list" },
    { href: "/amis", label: "Amis", icon: "friends", badge: pending ?? 0 },
    { href: "/groupes", label: "Groupes", icon: "groups" },
    { href: "/classement", label: "Classement", icon: "trophy" },
    { href: `/u/${profile.handle}`, label: "Mon profil", short: "Profil", icon: "user", tab: true },
    { href: "/parametres", label: "Paramètres", icon: "gear" },
    ...(profile.role === "admin" ? [{ href: "/admin", label: "Modération", icon: "shield" as const }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <InviteResume meId={user.id} />
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-1 overflow-y-auto border-r border-line bg-night/80 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/accueil" className="mb-4 px-2" aria-label="Lightwess Collection, accueil"><Logo size="sm" /></Link>
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

      <MobileChrome links={links} pending={pending ?? 0} handle={profile.handle!} />

      <main className="px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-[calc(76px+env(safe-area-inset-top))] sm:px-8 lg:ml-64 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

    </div>
  );
}
