import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMIT_RULES } from "@/lib/rate-limiter";

const SESSION_COOKIE = "cineprompt_session";

// Rotas públicas que não requerem autenticação
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/confirm-email",
  "/terms",
  "/privacy",
  "/pricing",
];

function applySecurityHeaders(response: NextResponse, correlationId: string): NextResponse {
  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();

  // Ignorar assets estáticos e Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Extrai o IP do cliente para auditoria e rate limiting
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  // Rate Limiting para rotas de autenticação (mitigação de força bruta)
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    const rateCheck = checkRateLimit(`auth:${clientIp}`, RATE_LIMIT_RULES.AUTH);
    if (!rateCheck.success) {
      const rateLimitedResponse = NextResponse.json(
        {
          error: "Muitas tentativas de autenticação em sequência. Aguarde antes de tentar novamente.",
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 }
      );
      rateLimitedResponse.headers.set("Retry-After", rateCheck.retryAfter.toString());
      rateLimitedResponse.headers.set("X-RateLimit-Limit", rateCheck.limit.toString());
      rateLimitedResponse.headers.set("X-RateLimit-Remaining", "0");
      rateLimitedResponse.headers.set("X-RateLimit-Reset", rateCheck.resetAt.toString());
      return applySecurityHeaders(rateLimitedResponse, correlationId);
    }
  }

  // Rotas da API de saúde e autenticação interna não requerem validação de sessão
  if (pathname.startsWith("/api/health") || pathname.startsWith("/api/auth")) {
    const res = NextResponse.next();
    return applySecurityHeaders(res, correlationId);
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublicPage = PUBLIC_PATHS.some((path) => pathname === path);
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  // Se o usuário já está autenticado e tenta acessar login/register, redirecionar para /projects
  if (sessionCookie && isAuthPage) {
    const redirectUrl = new URL("/projects", request.url);
    const res = NextResponse.redirect(redirectUrl);
    return applySecurityHeaders(res, correlationId);
  }

  // Se o usuário não está autenticado e tenta acessar página protegida
  if (!sessionCookie && !isPublicPage && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    const destination = `${pathname}${search}`;
    loginUrl.searchParams.set("redirect", destination);
    const res = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(res, correlationId);
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res, correlationId);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
