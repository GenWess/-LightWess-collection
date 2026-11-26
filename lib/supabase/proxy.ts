import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/u", "/parametres", "/onboarding", "/collection", "/amis", "/decouvrir", "/admin", "/fil", "/jeu"];
const AUTH_PAGES = ["/connexion", "/inscription"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Important : rafraîchit le jeton de session à chaque requête.
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    if (to === "/connexion") url.searchParams.set("next", path);
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user && isProtected) return redirect("/connexion");

  if (user && (isProtected || AUTH_PAGES.includes(path) || path === "/")) {
    const { data: profile } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
    const handle = profile?.handle as string | null | undefined;
    if (!handle && path !== "/onboarding") return redirect("/onboarding");
    if (handle && (AUTH_PAGES.includes(path) || path === "/" || path === "/onboarding")) return redirect("/decouvrir");
  }

  return response;
}
