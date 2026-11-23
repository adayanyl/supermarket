// Checagem otimista de login: sem o cookie de sessão, páginas vão para
// /login e a API responde 401. A validação de verdade (sessão no banco,
// equipe) acontece em lib/auth.ts, em cada página e rota.
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "dispensa_session"; // mesmo nome de lib/auth.ts

const PUBLIC_PAGES = ["/login", "/cadastro", "/convite"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/")) return NextResponse.next();
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // tudo menos arquivos estáticos, manifest e service worker
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|svg|ico|webp|jpg)$).*)"],
};
