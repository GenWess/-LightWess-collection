/** Classes partagées (boutons, champs) pour garder un style cohérent. */
export const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50";
export const btnPrimary = `${btn} bg-violet text-white shadow-[0_12px_32px_-12px_#8b5cf6] hover:bg-[#9b70ff]`;
export const btnGhost = `${btn} border border-white/15 bg-white/5 text-ink hover:bg-white/10`;
export const btnDanger = `${btn} border border-no/40 text-no hover:bg-no/10`;
export const input =
  "w-full min-h-12 rounded-2xl border border-white/15 bg-night2 px-4 text-base text-ink placeholder:text-faint transition focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/25";
export const label = "text-[13px] font-semibold text-ink2";
export const panel = "rounded-3xl border border-line bg-card/80 p-5 backdrop-blur";

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
