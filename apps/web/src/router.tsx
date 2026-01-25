import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";

import {
	routerWithApolloClient,
	ApolloClient,
	InMemoryCache,
} from "@apollo/client-integration-tanstack-start";
import { HttpLink, ApolloLink } from "@apollo/client";
import { authLink, errorLink } from "./lib/apollo-links";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	const uri =
		import.meta.env.VITE_GRAPHQL_ENDPOINT ||
		"https://countries.trevorblades.com/";

	// Configure Apollo Client
	const apolloClient = new ApolloClient({
		cache: new InMemoryCache(),
		link: ApolloLink.from([authLink, errorLink(uri), new HttpLink({ uri })]),
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
