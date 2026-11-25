import type { Profile } from "@/lib/supabase/server";

type P = Pick<Profile, "avatar_url" | "accent_color" | "display_name" | "handle">;

export default function Avatar({ profile, size = 40, ring = false }: { profile: P; size?: number; ring?: boolean }) {
  const letter = (profile.display_name || profile.handle || "?").charAt(0).toUpperCase();
  return (
    <span
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center font-display font-bold text-night"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: profile.accent_color || "#8b5cf6",
        backgroundImage: profile.avatar_url ? `url("${profile.avatar_url}")` : undefined,
        boxShadow: ring ? `0 0 0 4px var(--color-night), 0 0 0 7px ${profile.accent_color || "#8b5cf6"}` : undefined,
      }}
      aria-hidden="true"
    >
      {profile.avatar_url ? null : letter}
    </span>
  );
}
