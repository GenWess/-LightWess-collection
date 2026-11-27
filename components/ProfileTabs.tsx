"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { usePathname } from "next/navigation";

/** Onglets du profil : Profil · Journal · Listes. */
export default function ProfileTabs({ handle, counts }: { handle: string; counts?: { journal?: number; lists?: number } }) {
  const path = usePathname();
  const base = `/u/${handle}`;
  const tabs = [
    { href: base, label: "Profil" },
    { href: `${base}/journal`, label: "Journal", n: counts?.journal },
    { href: `${base}/listes`, label: "Listes", n: counts?.lists },
  ];
  return (
    <LayoutGroup id="ptabs">
      <nav className="mt-5 flex gap-1 border-b border-line" aria-label="Sections du profil">
        {tabs.map((t) => {
          const on = path === t.href;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`relative px-4 pb-3 pt-1 text-[15px] font-semibold transition ${on ? "text-ink" : "text-mute hover:text-ink2"}`}>
              {t.label}{t.n ? <span className="ml-1.5 text-xs font-normal text-faint">{t.n}</span> : null}
              {on && <motion.span layoutId="ptab-line" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-violet" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
