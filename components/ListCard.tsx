import Link from "next/link";
import Avatar from "./Avatar";
import Cover from "./Cover";
import type { ListSummary } from "@/lib/lists";

/** Carte d'une liste : jaquettes en éventail, titre, auteur. */
export default function ListCard({ l, showAuthor = true }: { l: ListSummary; showAuthor?: boolean }) {
  const covers = l.covers.slice(0, 5);
  return (
    <Link href={`/listes/${l.id}`} className="group block rounded-3xl border border-line bg-card/80 p-4 transition hover:-translate-y-1 hover:border-white/20 hover:bg-card">
      <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-violet/25 to-transparent sm:h-40">
        {covers.length ? (
          <div className="absolute inset-0 flex items-end justify-center pb-3">
            {covers.map((g, i) => {
              const mid = (covers.length - 1) / 2;
              const o = i - mid;
              return (
                <div key={g.id} className="w-[24%] shrink-0 transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ marginLeft: i ? "-7%" : 0, zIndex: 10 - Math.abs(Math.round(o)), transform: `rotate(${o * 5}deg) translateY(${Math.abs(o) * 6}px)` }}>
                  <Cover game={g} className="rounded-xl shadow-[0_12px_24px_-10px_rgba(0,0,0,.9)] [--cover-fs:14px]" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-mute">Liste vide</div>
        )}
        {!l.is_public && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-ink2 backdrop-blur">🔒 Privée</span>}
      </div>
      <h3 className="mt-3 truncate text-lg font-bold">{l.title}</h3>
      <p className="flex items-center gap-2 text-sm text-mute">
        {showAuthor && <><Avatar profile={l.profile} size={18} /><span className="truncate">{l.profile.display_name || `@${l.profile.handle}`}</span><span aria-hidden="true">·</span></>}
        <span className="shrink-0">{l.count} jeu{l.count > 1 ? "x" : ""}{l.ranked ? " · classée" : ""}</span>
      </p>
    </Link>
  );
}
