import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Barreira otimista: sem cookie de sessão em /conta, /admin ou /checkout, vai já para o login.
 * A verificação real (assinatura, revogação, papel) acontece nos layouts e em cada Server Action.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const url = new URL("/entrar", request.url);
  url.searchParams.set("voltar", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/conta/:path*", "/admin/:path*", "/checkout/:path*"],
};
