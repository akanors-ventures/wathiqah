import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOrgBySlug } from "./use-org-by-slug";

const mockUseOrgFromSlug = vi.fn();
const mockUseOrgContext = vi.fn();

vi.mock("@/hooks/use-org-from-slug", () => ({
  useOrgFromSlug: (slug: string) => mockUseOrgFromSlug(slug),
}));

vi.mock("@/context/OrgContext", () => ({
  useOrgContext: () => mockUseOrgContext(),
}));

function org(slug: string) {
  return { id: `id-${slug}`, slug, name: slug, members: [] } as never;
}

describe("useOrgBySlug", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the org immediately once it's present in OrgContext's myOrgs", () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("acme")],
      loadingOrgs: false,
      refetchOrgs: vi.fn(),
    });

    const { result } = renderHook(() => useOrgBySlug("acme"));

    expect(result.current.org).toEqual(org("acme"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.notFound).toBe(false);
  });

  it("stays loading and confirms with a refetch before declaring not-found, instead of trusting a stale read", async () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    const refetchOrgs = vi.fn().mockResolvedValue(undefined);
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: false, refetchOrgs });

    const { result } = renderHook(() => useOrgBySlug("brand-new-org"));

    // org genuinely absent from the current read, but we must not declare
    // notFound until a confirmatory refetch has actually run.
    expect(result.current.org).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);

    await waitFor(() => expect(refetchOrgs).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it("does not declare not-found while org-context is still loading", () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    const refetchOrgs = vi.fn();
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: true, refetchOrgs });

    const { result } = renderHook(() => useOrgBySlug("brand-new-org"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);
    expect(refetchOrgs).not.toHaveBeenCalled();
  });

  it("does not declare not-found while useOrgFromSlug is still syncing the JWT", () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: true });
    const refetchOrgs = vi.fn();
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: false, refetchOrgs });

    const { result } = renderHook(() => useOrgBySlug("brand-new-org"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);
    expect(refetchOrgs).not.toHaveBeenCalled();
  });

  it("re-confirms when the slug changes after a previous slug was confirmed missing", async () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    const refetchOrgs = vi.fn().mockResolvedValue(undefined);
    mockUseOrgContext.mockReturnValue({ myOrgs: [], loadingOrgs: false, refetchOrgs });

    const { result, rerender } = renderHook(({ slug }) => useOrgBySlug(slug), {
      initialProps: { slug: "org-a" },
    });

    await waitFor(() => expect(result.current.notFound).toBe(true));

    act(() => {
      rerender({ slug: "org-b" });
    });

    expect(result.current.notFound).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(refetchOrgs).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.notFound).toBe(true));
  });

  it("does not refetch again once the org appears (e.g. another consumer's refetch resolved first)", async () => {
    mockUseOrgFromSlug.mockReturnValue({ isSyncing: false });
    const refetchOrgs = vi.fn().mockResolvedValue(undefined);
    mockUseOrgContext.mockReturnValue({ myOrgs: [org("acme")], loadingOrgs: false, refetchOrgs });

    const { result } = renderHook(() => useOrgBySlug("acme"));

    expect(result.current.org).toEqual(org("acme"));
    expect(result.current.notFound).toBe(false);
    expect(refetchOrgs).not.toHaveBeenCalled();
  });
});
