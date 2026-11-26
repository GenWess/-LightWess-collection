import { NextResponse, type NextRequest } from "next/server";
import { steamLoginUrl } from "@/lib/steam";

/** Envoie l'utilisateur sur la page de connexion officielle de Steam. */
export async function GET(req: NextRequest) {
  return NextResponse.redirect(steamLoginUrl(req.nextUrl.origin));
}
