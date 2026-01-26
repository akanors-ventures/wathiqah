import { gql, Observable } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { print } from "graphql";

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
  const token = isClient ? localStorage.getItem("accessToken") : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const errorLink = (uri: string) =>
  new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
      for (const err of error.errors) {
        if (err.extensions?.code === "UNAUTHENTICATED") {
          const refreshToken = isClient ? localStorage.getItem("refreshToken") : null;

          if (!refreshToken) {
            // No refresh token, likely need to login
            return;
          }

          return new Observable((observer) => {
            fetch(uri, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: print(REFRESH_TOKEN_MUTATION),
                variables: { refreshToken },
              }),
            })
              .then((res) => res.json())
              .then((res) => {
                const data = res.data?.refreshToken;
                if (data) {
                  localStorage.setItem("accessToken", data.accessToken);
                  localStorage.setItem("refreshToken", data.refreshToken);

                  operation.setContext(({ headers = {} }) => ({
                    headers: {
                      ...headers,
                      authorization: `Bearer ${data.accessToken}`,
                    },
                  }));

                  const subscriber = {
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer),
                  };

                  forward(operation).subscribe(subscriber);
                } else {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  if (isClient) window.location.href = "/login";
                }
              })
              .catch((error) => {
                observer.error(error);
              });
          });
        }
      }
    }
  });
