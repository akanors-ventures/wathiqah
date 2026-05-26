import { gql, Observable } from "@apollo/client";
import { CombinedGraphQLErrors, CombinedProtocolErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { print } from "graphql";
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
]);

export const errorLink = (uri: string) =>
  new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
      let refreshObservable: Observable<unknown> | null = null;

      const operationName = operation.operationName || "";
      const currentPath = isClient ? window.location.pathname : "";

      const skipRefresh =
        SKIP_REFRESH_OPERATIONS.has(operationName) ||
        (isPublicPath(currentPath) && operationName === "Me");

      error.errors.forEach(({ extensions, message, locations, path }) => {
        console.debug(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        );
        const code = extensions?.code;

        if (
          !skipRefresh &&
          (code === "UNAUTHENTICATED" ||
            code === "UNAUTHORIZED" ||
            message?.toLowerCase().includes("unauthorized"))
        ) {
          console.debug(`[Apollo] Auth error detected: ${code || message}. Attempting refresh...`);

          refreshObservable = new Observable((observer) => {
            fetch(uri, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                query: print(REFRESH_TOKEN_MUTATION),
                variables: { refreshTokenInput: { refreshToken: "" } },
              }),
            })
              .then((res) => res.json())
              .then((res) => {
                if (res.data?.refreshToken) {
                  const subscriber = {
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                  };
                  forward(operation).subscribe(subscriber);
                } else {
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
                }
              })
              .catch((error) => {
                observer.error(error);
              });
          });
        }

        if (code === "INTERNAL_SERVER_ERROR") {
          toast.error("A server error occurred. Please try again later.");
        } else if (!skipRefresh && code !== "UNAUTHENTICATED" && code !== "UNAUTHORIZED") {
          toast.error(message || "An error occurred");
        }
      });

      if (refreshObservable) {
        return refreshObservable;
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
