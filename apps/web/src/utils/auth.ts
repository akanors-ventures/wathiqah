import { redirect } from "@tanstack/react-router";
import { getCookie } from "@/lib/cookies";
import { UserRole } from "@/types/__generated__/graphql";

export const isAuthenticated = () => {
  if (typeof document === "undefined") return false;
  const token = getCookie("isLoggedIn");
  return token === "true";
};

/**
 * Platform-admin check against the global UserRole (distinct from org-scoped OrgRole).
 * ADMIN and SUPER_ADMIN can both reach the admin area; SUPER_ADMIN-only actions
 * (e.g. role changes) are gated separately server-side and in the UI.
 */
export const isPlatformAdmin = (role?: UserRole | null): boolean =>
  role === UserRole.Admin || role === UserRole.SuperAdmin;

export const isSuperAdmin = (role?: UserRole | null): boolean => role === UserRole.SuperAdmin;

export const authGuard = (opts?: { location?: { pathname?: string; searchStr?: string } }) => {
  if (typeof window !== "undefined" && !isAuthenticated()) {
    const pathname = opts?.location?.pathname ?? window.location.pathname ?? "/";
    const searchStr = opts?.location?.searchStr ?? window.location.search ?? "";
    const redirectTo = encodeURIComponent(`${pathname}${searchStr}`);
    throw redirect({
      to: "/login",
      search: { redirectTo },
    });
  }
};

export const redirectToLogin = (currentPath?: string) => {
  if (typeof window === "undefined") return;
  const path = currentPath || window.location.pathname + window.location.search;
  window.location.href = `/login?redirectTo=${encodeURIComponent(path)}`;
};

/**
 * Parses a redirect URL string into a TanStack Router friendly format
 * @param url The URL string to parse (e.g. "/transactions?tab=funds")
 * @returns An object with 'to' and 'search' properties
 */
export const parseRedirect = (url: string) => {
  const [path, searchStr] = url.split("?");
  const search = searchStr ? Object.fromEntries(new URLSearchParams(searchStr)) : undefined;

  return {
    to: path,
    search: search,
  };
};
