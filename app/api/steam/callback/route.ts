import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySteamLogin } from "@/lib/steam";

/** Retour de Steam : on vérifie la signature puis on relie le compte Steam au profil. */
export async function GET(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/parametres?steam=${q}`, req.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", req.url));

  const steamId = await verifySteamLogin(req.nextUrl.searchParams).catch(() => null);
  if (!steamId) return back("erreur");

  const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", user.id);
  if (error) return back(error.code === "23505" ? "deja-lie" : "erreur");
  return back("ok");
}
