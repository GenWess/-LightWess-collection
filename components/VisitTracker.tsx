"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Enregistre une visite par session (pour les statistiques de la page admin). */
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("lw-visit")) return;
      sessionStorage.setItem("lw-visit", "1");
    } catch {}
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) =>
      supabase.from("site_events").insert({ type: "visit", user_id: data.user?.id ?? null, path: location.pathname.slice(0, 200) })
    );
  }, []);
  return null;
}
