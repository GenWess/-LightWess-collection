"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  gear: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>,
};

type L = { href: string; label: string; icon: keyof typeof ICONS };

export default function NavLinks({ links, variant }: { links: L[]; variant: "side" | "tab" }) {
  const path = usePathname();
  return (
    <>
      {links.map((l) => {
        const on = path === l.href || path.startsWith(l.href + "/");
        return variant === "side" ? (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-semibold transition ${on ? "bg-card2 text-ink [&_svg]:text-violet-hi" : "text-mute hover:bg-card hover:text-ink"}`}>
            {ICONS[l.icon]}{l.label}
          </Link>
        ) : (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-ink [&_svg]:text-violet-hi" : "text-faint"}`}>
            {ICONS[l.icon]}{l.label}
          </Link>
        );
      })}
    </>
  );
}
