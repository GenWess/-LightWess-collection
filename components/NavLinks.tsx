"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const s = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const ICONS = {
  swipe: <svg {...s}><rect x="6" y="3" width="12" height="17" rx="3" /><path d="M3 7v11M21 7v11" /></svg>,
  feed: <svg {...s}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  lib: <svg {...s}><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="9" rx="2" /><rect x="3" y="15" width="7" height="6" rx="2" /><rect x="14" y="15" width="7" height="6" rx="2" /></svg>,
  friends: <svg {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.5 0 4 1.5 4.6 4" /></svg>,
  user: <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  gear: <svg {...s}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>,
  groups: <svg {...s}><circle cx="12" cy="7.5" r="3" /><circle cx="5" cy="10" r="2.2" /><circle cx="19" cy="10" r="2.2" /><path d="M7 20c.6-3.4 2.6-5.5 5-5.5s4.4 2.1 5 5.5M1.5 18c.4-2.2 1.6-3.6 3.4-3.8M22.5 18c-.4-2.2-1.6-3.6-3.4-3.8" /></svg>,
  home: <svg {...s}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>,
  search: <svg {...s}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  list: <svg {...s}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={3} /></svg>,
  trophy: <svg {...s}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 21h8M9.5 17h5" /></svg>,
  shield: <svg {...s}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>,
};

export type NavLink = { href: string; label: string; short?: string; icon: keyof typeof ICONS; badge?: number; tab?: boolean };

export default function NavLinks({ links, variant }: { links: NavLink[]; variant: "side" | "tab" }) {
  const path = usePathname();
  const shown = variant === "tab" ? links.filter((l) => l.tab) : links;
  return (
    <>
      {shown.map((l) => {
        const on = path === l.href || path.startsWith(l.href + "/");
        const badge = l.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet px-1.5 text-[11px] font-bold text-white">{l.badge}</span> : null;
        return variant === "side" ? (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-semibold transition ${on ? "bg-card2 text-ink [&_svg]:text-violet-hi" : "text-mute hover:bg-card hover:text-ink"}`}>
            {ICONS[l.icon]}<span className="flex-1">{l.label}</span>{badge}
          </Link>
        ) : (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={`relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-ink [&_svg]:text-violet-hi" : "text-faint"}`}>
            {ICONS[l.icon]}{l.short || l.label}
            {l.badge ? <span className="absolute right-2 top-0.5 h-2.5 w-2.5 rounded-full bg-violet" /> : null}
          </Link>
        );
      })}
    </>
  );
}
