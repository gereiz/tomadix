import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "cineprompt_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 dias

/**
 * Define o cookie de sessão seguro no navegador
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Remove o cookie de sessão seguro
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Lê o token de sessão do cookie
 */
export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
