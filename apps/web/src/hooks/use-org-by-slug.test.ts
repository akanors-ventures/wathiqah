import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOrgBySlug } from "./use-org-by-slug";

const mockUseOrgFromSlug = vi.fn();
const mockUseOrgContext = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/use-org-from-slug", () => ({
  useOrgFromSlug: (slug: string) => mockUseOrgFromSlug(slug),
}));

vi.mock("@/context/OrgContext", () => ({
  useOrgContext: () => mockUseOrgContext(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
}));

vi.mock("@/lib/apollo/queries/organisations", () => ({
  MY_ORGANISATIONS_QUERY: {},
}));

function org(slug: string) {
  return { id: `id-${slug}`, slug, name: slug, members: [] } as never;
}

describe("useOrgBySlug", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the org immediately once it's present in either source", () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    mockUseOrgContext.mockReturnValue({ myOrgs: [org("acme")], loadingOrgs: false });
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [] },
      loading: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useOrgBySlug("acme"));

    expect(result.current.org).toEqual(org("acme"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.notFound).toBe(false);
  });

  it("stays loading and confirms with a refetch before declaring not-found, instead of trusting a stale cache read", async () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: false });
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [] },
      loading: false,
      refetch,
    });

    const { result } = renderHook(() => useOrgBySlug("brand-new-org"));

    // org genuinely absent from a stale cache read, but we must not declare
    // notFound until a confirmatory refetch has actually run.
    expect(result.current.org).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it("does not declare not-found while org-context or the org-list query is still loading", () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: true });
    const refetch = vi.fn();
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, refetch });

    const { result } = renderHook(() => useOrgBySlug("brand-new-org"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("re-confirms when the slug changes after a previous slug was confirmed missing", async () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: false });
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [] },
      loading: false,
      refetch,
    });

    const { result, rerender } = renderHook(({ slug }) => useOrgBySlug(slug), {
      initialProps: { slug: "org-a" },
    });

    await waitFor(() => expect(result.current.notFound).toBe(true));

    act(() => {
      rerender({ slug: "org-b" });
    });

    expect(result.current.notFound).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.notFound).toBe(true));
  });
});
