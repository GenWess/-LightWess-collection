"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AddGame from "./AddGame";
import { Emblem } from "./Logo";
import MobileMenu from "./MobileMenu";
import type { NavLink } from "./NavLinks";

const s = { width: 23, height: 23, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const TABS = [
  { href: "/accueil", label: "Accueil", icon: <svg {...s}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg> },
  { href: "/decouvrir", label: "Découvrir", icon: <svg {...s}><rect x="6" y="3" width="12" height="17" rx="3" /><path d="M3 7v11M21 7v11" /></svg> },
  null, // bouton « + » au centre
  { href: "/collection", label: "Collection", icon: <svg {...s}><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="9" rx="2" /><rect x="3" y="15" width="7" height="6" rx="2" /><rect x="14" y="15" width="7" height="6" rx="2" /></svg> },
  { href: "__profil", label: "Profil", icon: <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg> },
];

const buzz = () => { try { navigator.vibrate?.(6); } catch {} };

/**
 * Interface téléphone :
 * - en haut, une barre qui se cache quand on descend et revient dès qu'on remonte ;
 * - en bas, une barre flottante à portée de pouce, avec un gros « + » pour ajouter un jeu.
 */
export default function MobileChrome({ links, pending, handle }: { links: NavLink[]; pending: number; handle: string }) {
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      const y = scrollY, d = y - last.current;
      if (Math.abs(d) < 6) return;
      const hide = d > 0 && y > 80;
      setHidden(hide);
      root.style.setProperty("--mh", hide ? "0px" : "calc(60px + env(safe-area-inset-top))");
      last.current = y;
    };
    root.style.setProperty("--mh", "calc(60px + env(safe-area-inset-top))");
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setHidden(false); document.documentElement.style.setProperty("--mh", "calc(60px + env(safe-area-inset-top))"); }, [path]);

  const href = (h: string) => (h === "__profil" ? `/u/${handle}` : h);
  const isOn = (h: string) => { const x = href(h); return path === x || path.startsWith(x + "/"); };

  return (
    <>
      <motion.header
        animate={{ y: hidden ? "-100%" : "0%" }} transition={{ type: "spring", stiffness: 420, damping: 40 }}
        className="fixed inset-x-0 top-0 z-30 border-b border-line bg-night/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-[60px] items-center justify-between px-4">
          <Link href="/accueil" aria-label="Lightwess Collection, accueil" className="flex items-center gap-2">
            <Emblem className="h-8 w-8" />
            <span className="font-display text-sm font-bold tracking-[0.14em]">LIGHTWESS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/explorer" aria-label="Explorer et chercher des jeux" className={`grid h-10 w-10 place-items-center rounded-full border ${isOn("/explorer") ? "border-violet bg-violet/20 text-ink" : "border-white/15 text-ink2"}`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            </Link>
            <Link href="/amis" aria-label={`Amis${pending ? ` (${pending} demande${pending > 1 ? "s" : ""})` : ""}`} className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 text-ink2">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><path d="M19 8v6M16 11h6" /></svg>
              {pending ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-violet px-1 text-[10px] font-bold text-white">{pending}</span> : null}
            </Link>
            <MobileMenu links={links} />
          </div>
        </div>
      </motion.header>

      <nav aria-label="Navigation" className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <LayoutGroup id="mtabs">
          <div className="mx-auto flex h-[66px] max-w-md items-center justify-around rounded-[26px] border border-white/10 bg-[#15121d]/95 px-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.85)] backdrop-blur-2xl">
            {TABS.map((t, i) =>
              t ? (
                <Link key={t.href} href={href(t.href)} onClick={buzz} aria-current={isOn(t.href) ? "page" : undefined}
                  className={`relative flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px] font-semibold transition-colors active:scale-95 ${isOn(t.href) ? "text-ink" : "text-faint"}`}>
                  {isOn(t.href) && <motion.span layoutId="mtab-pill" className="absolute inset-x-1 inset-y-0 rounded-[20px] bg-white/[.08]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className={`relative transition-transform ${isOn(t.href) ? "-translate-y-px text-violet-hi" : ""}`}>{t.icon}</span>
                  <span className="relative">{t.label}</span>
                </Link>
              ) : (
                <div key={i} className="flex flex-1 justify-center" onClick={buzz}>
                  <AddGame label="" ariaLabel="Ajouter un jeu"
                    className="grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-gradient-to-br from-violet-hi to-violet-lo text-white shadow-[0_10px_26px_-6px_#8b5cf6] transition active:scale-90" />
                </div>
              ),
            )}
          </div>
        </LayoutGroup>
      </nav>
    </>
  );
}
