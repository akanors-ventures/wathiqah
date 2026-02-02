export type CookieOptions = {
  path?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

const hasDocument = typeof document !== "undefined";

export function getCookie(name: string): string | undefined {
  if (!hasDocument) return undefined;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const c of cookies) {
    const [k, ...rest] = c.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  if (!hasDocument) return;

  const { path = "/", maxAge, secure, sameSite = "lax" } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (path) cookieString += `; path=${path}`;
  if (maxAge) cookieString += `; max-age=${maxAge}`;
  if (secure) cookieString += "; secure";
  if (sameSite) cookieString += `; samesite=${sameSite}`;

  // biome-ignore lint/suspicious/noDocumentCookie: Centralized cookie management
  document.cookie = cookieString;
}

export function deleteCookie(name: string, options: { path?: string } = {}) {
  setCookie(name, "", { ...options, maxAge: -1 });
}
