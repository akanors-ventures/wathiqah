import { gql } from "@apollo/client";
import { CombinedGraphQLErrors, CombinedProtocolErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { print } from "graphql";
import { from, switchMap, throwError } from "rxjs";
import { toast } from "sonner";
import { deleteCookie } from "@/lib/cookies";

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshTokenInput: RefreshTokenInput!) {
    refreshToken(refreshTokenInput: $refreshTokenInput) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

const isClient = typeof window !== "undefined";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/signup-success",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/features",
  "/pricing",
  "/shared-access",
  "/witnesses/invite/",
  "/shared-access/view/",
];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

/**
 * Suppress "Forbidden resource" (FORBIDDEN) error toasts for a window after an
 * org context switch. Org queries that fire with the old JWT during the
 * transition produce expected FORBIDDEN responses — showing them as toasts
 * is noise. Call before initiating a switch; the suppression auto-expires.
 */
let suppressForbiddenUntil = 0;
export function suppressForbiddenFor(ms: number) {
  suppressForbiddenUntil = Date.now() + ms;
}

/**
 * Single-flight token refresh. Multiple operations can fail with 401
 * concurrently (e.g. several queries on the same page); without this they'd
 * each fire their own /refresh request. All concurrent failures share one
 * in-flight promise; it's cleared once settled so the next 401 triggers a
 * fresh attempt.
 */
let refreshPromise: Promise<boolean> | null = null;
function refreshAuthToken(uri: string): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(uri, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        query: print(REFRESH_TOKEN_MUTATION),
        variables: { refreshTokenInput: { refreshToken: "" } },
      }),
    })
      .then((res) => res.json())
      .then((res) => Boolean(res.data?.refreshToken))
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const SKIP_REFRESH_OPERATIONS = new Set([
  "Login",
  "Logout",
  "RefreshToken",
  "Signup",
  "VerifyEmail",
  "ForgotPassword",
  "ResetPassword",
  "ResendVerificationEmail",
  "AcceptInvitation",
  "SharedData",
  "GetGeoIPInfo",
  "SupportOptions",
  "GetWitnessInvitation",
  "AcknowledgeWitnessRequest",
  "CreateCheckoutSession",
  // AccountSwitcher handles its own error toasts; skip global handling here.
  "SwitchOrgContext",
]);

export const errorLink = (uri: string) =>
  new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
      const operationName = operation.operationName || "";
      const currentPath = isClient ? window.location.pathname : "";

      const skipRefresh =
        SKIP_REFRESH_OPERATIONS.has(operationName) ||
        (isPublicPath(currentPath) && operationName === "Me");

      let needsRefresh = false;

      error.errors.forEach(({ extensions, message, locations, path }) => {
        console.debug(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        );
        const code = extensions?.code;
        const isAuthError =
          code === "UNAUTHENTICATED" ||
          code === "UNAUTHORIZED" ||
          message?.toLowerCase().includes("unauthorized");

        if (!skipRefresh && isAuthError) {
          needsRefresh = true;
        }

        if (!skipRefresh && code === "INTERNAL_SERVER_ERROR") {
          toast.error("A server error occurred. Please try again later.");
        } else if (
          !skipRefresh &&
          !isAuthError &&
          // FORBIDDEN is expected during org context transitions (org queries
          // refetch with the previous JWT briefly after a switch). Suppress
          // the toast while suppressForbiddenFor() window is active.
          !(code === "FORBIDDEN" && Date.now() < suppressForbiddenUntil)
        ) {
          toast.error(message || "An error occurred");
        }
      });

      if (needsRefresh) {
        console.debug(`[Apollo] Auth error detected on ${operationName}. Attempting refresh...`);

        // One shared refresh attempt serves every operation that failed with
        // 401 in this tick, instead of each firing its own /refresh request.
        // Apollo Client 4's Observable is RxJS-based (fromPromise was removed
        // in favor of rxjs `from`), so we lean on `switchMap`/`throwError`
        // instead of hand-wiring observer.next/error/complete.
        return from(refreshAuthToken(uri)).pipe(
          switchMap((refreshed) => {
            if (refreshed) {
              return forward(operation);
            }

            if (isClient) {
              deleteCookie("isLoggedIn");

              if (!isPublicPath(currentPath)) {
                console.debug(
                  "[Apollo] Not on public path, redirecting to login from:",
                  currentPath,
                );
                const redirectTo = encodeURIComponent(currentPath + window.location.search);
                window.location.href = `/login?redirectTo=${redirectTo}`;
              } else {
                console.debug("[Apollo] On public path, session cleared.");
              }
            }
            // Refresh failed: settle the observable with the original auth
            // error instead of leaving it pending forever. Without this,
            // callers on public paths (e.g. the shared-access accept flow)
            // never see their mutation/query promise resolve or reject.
            return throwError(() => error);
          }),
        );
      }
    } else if (CombinedProtocolErrors.is(error)) {
      error.errors.forEach(({ message, extensions }) => {
        console.debug(
          `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(extensions)}`,
        );
      });
    } else {
      console.error(`[Network error]: ${error}`);
      toast.error("Network error. Please check your internet connection.");
    }
  });
