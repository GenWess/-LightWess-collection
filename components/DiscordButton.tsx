"use client";

import { createClient } from "@/lib/supabase/client";
import { btnGhost } from "./ui";

export default function DiscordButton() {
  return (
    <button
      type="button"
      className={`${btnGhost} min-h-12`}
      onClick={() =>
        createClient().auth.signInWithOAuth({
          provider: "discord",
          options: { redirectTo: `${location.origin}/auth/callback?next=/onboarding` },
        })
      }
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9 0 13.4.3 17.8a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.5-3.4-13.4ZM8.5 15.1c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" /></svg>
      Continuer avec Discord
    </button>
  );
}
