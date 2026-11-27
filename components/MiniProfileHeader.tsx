import Link from "next/link";
import Avatar from "./Avatar";
import ProfileTabs from "./ProfileTabs";
import type { Profile } from "@/lib/supabase/server";

/** En-tête compact pour les pages Journal et Listes d'un profil. */
export default function MiniProfileHeader({ p, title, subtitle }: { p: Profile; title: string; subtitle?: string }) {
  const accent = p.accent_color || "#8b5cf6";
  return (
    <div>
      <div className="relative overflow-hidden rounded-[26px] border border-line p-5 sm:p-6"
        style={{ background: p.banner_url ? undefined : `radial-gradient(90% 140% at 85% 0%, ${accent}55, transparent 60%), linear-gradient(135deg, ${accent}33, #15121d)` }}>
        {p.banner_url && (
          <>
            <div aria-hidden="true" className="absolute inset-0 bg-cover opacity-40" style={{ backgroundImage: `url("${p.banner_url}")`, backgroundPosition: `${p.banner_pos_x ?? 50}% ${p.banner_pos_y ?? 50}%` }} />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/30" />
          </>
        )}
        <div className="relative flex items-center gap-4">
          <Link href={`/u/${p.handle}`}><Avatar profile={p} size={64} ring /></Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mute"><Link href={`/u/${p.handle}`} className="hover:text-ink">{p.display_name || `@${p.handle}`}</Link></p>
            <h1 className="font-display text-[clamp(26px,4vw,38px)] font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-mute">{subtitle}</p>}
          </div>
        </div>
      </div>
      <ProfileTabs handle={p.handle!} />
    </div>
  );
}
