import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuthContext } from "./AuthContext";

const mockUseQuery = vi.fn();
const mockIsAuthenticated = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard" }),
}));

vi.mock("@/utils/auth", () => ({
  isAuthenticated: () => mockIsAuthenticated(),
}));

vi.mock("@/lib/cookies", () => ({
  deleteCookie: vi.fn(),
}));

vi.mock("@apollo/client/errors", () => ({
  CombinedGraphQLErrors: {
    is: (err: unknown) => Boolean((err as { __combined?: boolean } | undefined)?.__combined),
  },
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    clearStore: vi.fn().mockResolvedValue(undefined),
    refetchQueries: vi.fn(),
  }),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => mockUseQuery(),
}));

type RenderSnapshot = { loading: boolean; user: "undefined" | "null" | string };

function makeConsumer(renders: RenderSnapshot[]) {
  return function Consumer() {
    const { user, loading } = useAuthContext();
    renders.push({
      loading,
      user: user === undefined ? "undefined" : user === null ? "null" : user.email,
    });
    return null;
  };
}

describe("AuthContext — effectiveLoading", () => {
  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never reports loading:false while user is still undefined — the original race this fix closes", async () => {
    // Apollo transitions `data` and `loading` together the instant the network
    // response lands, one render before the sync effect's setUser(data.me) runs.
    // effectiveLoading must stay true through that gap instead of reading the
    // query's own `loading` flag (which is already false here).
    mockUseQuery.mockReturnValue({
      data: { me: { id: "u1", email: "a@test.com" } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const renders: RenderSnapshot[] = [];
    const Consumer = makeConsumer(renders);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(renders.some((r) => r.user === "a@test.com")).toBe(true);
    });

    const raceViolation = renders.find((r) => r.loading === false && r.user === "undefined");
    expect(raceViolation).toBeUndefined();
  });

  it("resolves user to null (not stuck undefined) on a classified UNAUTHENTICATED error", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: {
        __combined: true,
        errors: [{ extensions: { code: "UNAUTHENTICATED" }, message: "Unauthenticated" }],
      },
      refetch: vi.fn(),
    });

    const renders: RenderSnapshot[] = [];
    const Consumer = makeConsumer(renders);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(renders.at(-1)?.user).toBe("null");
      expect(renders.at(-1)?.loading).toBe(false);
    });
  });

  it("resolves user to null (not stuck undefined forever) on an unclassified network error while a session cookie is present", async () => {
    // Regression test: a transient network failure (backend down, timeout) is
    // NOT a CombinedGraphQLErrors auth error, so the sync effect's classified
    // branches never fire. Without the fallback, `user` stays undefined and
    // effectiveLoading (which no longer depends on the query's own `loading`
    // flag) would hang true forever, wedging every Pro-gated/auth-gated route.
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Failed to fetch"),
      refetch: vi.fn(),
    });

    const renders: RenderSnapshot[] = [];
    const Consumer = makeConsumer(renders);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(renders.at(-1)?.user).toBe("null");
      expect(renders.at(-1)?.loading).toBe(false);
    });
  });

  it("reports loading:false immediately when there is no session cookie at all", () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const renders: RenderSnapshot[] = [];
    const Consumer = makeConsumer(renders);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(renders.every((r) => r.loading === false)).toBe(true);
  });
});
