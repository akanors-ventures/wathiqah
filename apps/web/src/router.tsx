import { ApolloLink, HttpLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import {
  ApolloClient,
  InMemoryCache,
  routerWithApolloClient,
} from "@apollo/client-integration-tanstack-start";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { OperationDefinitionNode } from "graphql";
import { createClient } from "graphql-ws";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
import { errorLink } from "./lib/apollo-links";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
  const uri = import.meta.env.VITE_API_URL || "http://localhost:3001/api/graphql";

  const httpChain = ApolloLink.from([
    errorLink(uri),
    new HttpLink({ uri, credentials: "include" }),
  ]);

  // Subscriptions only make sense client-side — a WebSocket can't be opened
  // during SSR, and the auth cookie that authenticates the connection is
  // only readable in the browser anyway.
  const link =
    typeof window === "undefined"
      ? httpChain
      : ApolloLink.split(
          (operation) => {
            const definition = getMainDefinition(operation.query) as OperationDefinitionNode;
            return (
              definition.kind === "OperationDefinition" && definition.operation === "subscription"
            );
          },
          new GraphQLWsLink(createClient({ url: uri.replace(/^http/, "ws") })),
          httpChain,
        );

  // Configure Apollo Client
  const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    link,
  });

  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: {
      ...routerWithApolloClient.defaultContext,

      ...rqContext,
    },

    defaultPreload: "intent",
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return routerWithApolloClient(router, apolloClient);
};
