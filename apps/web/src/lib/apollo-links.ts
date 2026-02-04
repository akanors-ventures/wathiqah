import { gql, Observable } from "@apollo/client";
import { CombinedGraphQLErrors, CombinedProtocolErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
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

export const authLink = new SetContextLink(({ headers }, _) => {
  // Tokens are now handled via httpOnly cookies by the browser.
  // We don't need to manually set the Authorization header anymore.
  return {
    headers: {
      ...headers,
    },
  };
});

export const errorLink = (uri: string) =>
  new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
      let refreshObservable: Observable<unknown> | null = null;

      // Skip refresh for login, logout, and refreshToken mutations to avoid infinite loops
      const operationName = operation.operationName || "";
      const skipRefresh = [
        "Login",
        "Logout",
        "RefreshToken",
        "Signup",
        "VerifyEmail",
        "ForgotPassword",
        "ResetPassword",
        "ResendVerificationEmail",
        "AcceptInvitation",
      ].includes(operationName);

      error.errors.forEach(({ extensions, message, locations, path }) => {
        console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
        const code = extensions?.code;
        if (
          !skipRefresh &&
          (code === "UNAUTHENTICATED" ||
            code === "UNAUTHORIZED" ||
            message?.toLowerCase().includes("unauthorized"))
        ) {
          console.debug(`[Apollo] Auth error detected: ${code || message}. Attempting refresh...`);
          // If unauthenticated, try to refresh.
          // The refreshToken is in a httpOnly cookie, so the browser will send it.
          refreshObservable = new Observable((observer) => {
            fetch(uri, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include", // Crucial for cookies
              body: JSON.stringify({
                query: print(REFRESH_TOKEN_MUTATION),
                variables: { refreshTokenInput: { refreshToken: "" } }, // Server will check cookie if empty
              }),
            })
              .then((res) => res.json())
              .then((res) => {
                const data = res.data?.refreshToken;
                if (data) {
                  // Server has already set new cookies via the response headers.
                  const subscriber = {
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                  };

                  forward(operation).subscribe(subscriber);
                } else {
                  if (isClient) {
                    const currentPath = window.location.pathname;
                    const publicPaths = [
                      "/",
                      "/login",
                      "/signup",
                      "/forgot-password",
                      "/reset-password",
                      "/verify-email",
                      "/shared-access",
                    ];
                    const isPublicPath =
                      publicPaths.includes(currentPath) ||
                      currentPath.startsWith("/witnesses/invite/") ||
                      currentPath.startsWith("/shared-access/view/");

                    deleteCookie("isLoggedIn");

                    if (!isPublicPath) {
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
          // Handle other specific errors or general errors
          toast.error("A server error occurred. Please try again later.");
        } else if (code === "FORBIDDEN") {
          toast.error("You don't have permission to perform this action.");
        }
      });

      if (refreshObservable) {
        return refreshObservable;
      }
    } else if (CombinedProtocolErrors.is(error)) {
      error.errors.forEach(({ message, extensions }) => {
        console.log(
          `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(extensions)}`,
        );
      });
    } else {
      console.error(`[Network error]: ${error}`);
      toast.error("Network error. Please check your internet connection.");
    }
  });
