import Link from "next/link";
import Cover from "./Cover";
import { STATUSES, type Game, type UserGame } from "@/lib/types";

const SHORT = Object.fromEntries(STATUSES.map((s) => [s.key, s.short]));

export default function GameTile({ game, entry, sub }: { game: Game; entry?: Pick<UserGame, "status" | "rating"> | null; sub?: string }) {
  return (
    <Link href={`/jeu/${game.id}`} className="group block min-w-0 transition duration-300 hover:-translate-y-1 hover:-rotate-1">
      <Cover game={game} className="shadow-[0_18px_30px_-18px_rgba(0,0,0,.8)] [--cover-fs:38px]">
        {entry && <span className="absolute left-2 top-2 z-[2] rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{SHORT[entry.status]}</span>}
        {entry?.rating != null && <span className="absolute right-2 top-2 z-[2] rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-bold text-[#FFD45C] backdrop-blur">★ {Number(entry.rating).toFixed(1)}</span>}
      </Cover>
      <p className="mt-2 truncate text-sm font-semibold">{game.name}</p>
      {sub && <p className="truncate text-xs text-mute">{sub}</p>}
    </Link>
  );
}
