import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureIgdbGame } from "@/lib/games-server";

/** Ouvre la fiche d'un jeu du catalogue : on l'enregistre dans la base si besoin, puis on redirige vers sa page. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ igdbId: string }> }) {
  const { igdbId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", req.url));
  const id = Number(igdbId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.redirect(new URL("/explorer", req.url));
  try {
    const gameId = await ensureIgdbGame(supabase, id);
    return NextResponse.redirect(new URL(`/jeu/${gameId}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/explorer?erreur=1", req.url));
  }
}
