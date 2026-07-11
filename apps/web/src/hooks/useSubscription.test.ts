import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./use-auth";
import { useSubscription } from "./useSubscription";

vi.mock("./use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

import { useQuery } from "@apollo/client/react";

describe("useSubscription — loading composite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports loading while auth is still resolving, even though the subscription query is skipped and reports loading:false", () => {
    // While auth hasn't resolved yet, `user` is undefined so the subscription
    // query is `skip`-ped — Apollo reports a skipped query's own `loading` as
    // false. Without factoring in authLoading, `tier`/`isPro` would look
    // resolved (undefined -> isPro: false) before we actually know who the
    // user is, tripping premature Pro-gate redirects.
    vi.mocked(useAuth).mockReturnValue({ user: undefined, loading: true } as ReturnType<
      typeof useAuth
    >);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSubscription());

    expect(result.current.loading).toBe(true);
  });

  it("reports loading while the subscription query is still in flight after auth has resolved", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" },
      loading: false,
    } as ReturnType<typeof useAuth>);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSubscription());

    expect(result.current.loading).toBe(true);
  });

  it("only reports loading:false once both auth and the subscription query have resolved", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" },
      loading: false,
    } as ReturnType<typeof useAuth>);
    vi.mocked(useQuery).mockReturnValue({
      data: { mySubscription: { tier: "PRO" } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useSubscription());

    expect(result.current.loading).toBe(false);
    expect(result.current.isPro).toBe(true);
  });
});
