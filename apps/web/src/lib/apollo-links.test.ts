import {
  ApolloClient,
  ApolloLink,
  gql,
  InMemoryCache,
  Observable as RxObservable,
} from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { firstValueFrom } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorLink } from "./apollo-links";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const URI = "http://localhost:3001/api/graphql";

const ACCEPT_ACCESS = gql`
  mutation AcceptAccess($token: String!) {
    acceptAccess(token: $token) {
      id
    }
  }
`;

function unauthenticatedError() {
  return new CombinedGraphQLErrors({ data: null }, [
    { message: "Unauthorized", extensions: { code: "UNAUTHENTICATED" } },
  ]);
}

const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });

function mockRefreshFetch(succeeds: boolean) {
  return vi.fn().mockResolvedValue({
    json: () =>
      Promise.resolve(
        succeeds ? { data: { refreshToken: { accessToken: "new-token" } } } : { data: null },
      ),
  });
}

describe("errorLink", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/shared-access");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries AcceptAccess after a silent refresh instead of skipping it", async () => {
    global.fetch = mockRefreshFetch(true);

    let callCount = 0;
    const terminatingLink = new ApolloLink(() => {
      callCount += 1;
      return callCount === 1
        ? new RxObservable((observer) => observer.error(unauthenticatedError()))
        : new RxObservable((observer) => {
            observer.next({ data: { acceptAccess: { id: "grant-1" } } });
            observer.complete();
          });
    });

    const link = ApolloLink.from([errorLink(URI), terminatingLink]);
    const result = await firstValueFrom(
      ApolloLink.execute(link, { query: ACCEPT_ACCESS, variables: { token: "abc" } }, { client }),
    );

    expect(result.data).toEqual({ acceptAccess: { id: "grant-1" } });
    expect(callCount).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("settles instead of hanging when refresh fails on a public path", async () => {
    global.fetch = mockRefreshFetch(false);

    const terminatingLink = new ApolloLink(
      () => new RxObservable((observer) => observer.error(unauthenticatedError())),
    );

    const link = ApolloLink.from([errorLink(URI), terminatingLink]);

    await expect(
      firstValueFrom(
        ApolloLink.execute(link, { query: ACCEPT_ACCESS, variables: { token: "abc" } }, { client }),
      ),
    ).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent refresh attempts into a single in-flight request", async () => {
    global.fetch = mockRefreshFetch(true);

    const terminatingLink = new ApolloLink((operation) => {
      const attempt = operation.getContext().attempt ?? 0;
      if (attempt === 0) {
        operation.setContext({ attempt: 1 });
        return new RxObservable((observer) => observer.error(unauthenticatedError()));
      }
      return new RxObservable((observer) => {
        observer.next({ data: { acceptAccess: { id: "grant-1" } } });
        observer.complete();
      });
    });

    const link = ApolloLink.from([errorLink(URI), terminatingLink]);

    await Promise.all([
      firstValueFrom(
        ApolloLink.execute(link, { query: ACCEPT_ACCESS, variables: { token: "a" } }, { client }),
      ),
      firstValueFrom(
        ApolloLink.execute(link, { query: ACCEPT_ACCESS, variables: { token: "b" } }, { client }),
      ),
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
