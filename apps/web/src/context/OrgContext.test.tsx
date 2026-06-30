import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrgProvider, useOrgContext } from "./OrgContext";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseApolloClient = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useApolloClient: (...args: unknown[]) => mockUseApolloClient(...args),
}));

vi.mock("@/lib/apollo-links", () => ({
  suppressForbiddenFor: vi.fn(),
}));

function org(id: string) {
  return { id, slug: id, name: id, members: [] } as never;
}

const ORG_STORAGE_KEY = "wathiqah_active_org_id";

function setSignalCookie(orgId: string | null) {
  document.cookie = orgId ? `activeOrgId=${orgId}` : "activeOrgId=; max-age=0";
}

function wrapper({ children }: { children: ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>;
}

describe("OrgContext restoration effect", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "activeOrgId=; max-age=0";
    mockUseMutation.mockReturnValue([vi.fn()]);
    mockUseApolloClient.mockReturnValue({ refetchQueries: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("repairs local activeOrgId when the signal cookie already has an org local state doesn't know about (the dashboard-page gap)", async () => {
    // localStorage empty (no org selected locally), but the cookie already
    // says org-acme is active -- e.g. switched in another tab, or
    // localStorage cleared independently of the cookie. This previously had
    // no repair path at all outside org-slug pages.
    setSignalCookie("org-acme");
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [org("org-acme")] },
      loading: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useOrgContext(), { wrapper });

    await waitFor(() => expect(result.current.activeOrg?.id).toBe("org-acme"));
    expect(localStorage.getItem(ORG_STORAGE_KEY)).toBe("org-acme");
  });

  it("does nothing when local state already matches the signal cookie", async () => {
    localStorage.setItem(ORG_STORAGE_KEY, "org-acme");
    setSignalCookie("org-acme");
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [org("org-acme")] },
      loading: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useOrgContext(), { wrapper });

    await waitFor(() => expect(result.current.loadingOrgs).toBe(false));
    expect(result.current.activeOrg?.id).toBe("org-acme");
    expect(localStorage.getItem(ORG_STORAGE_KEY)).toBe("org-acme");
  });

  it("clears local activeOrgId when it points at an org no longer in myOrgs", async () => {
    localStorage.setItem(ORG_STORAGE_KEY, "org-removed");
    setSignalCookie("org-removed");
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [org("org-acme")] },
      loading: false,
      refetch: vi.fn(),
    });

    renderHook(() => useOrgContext(), { wrapper });

    await waitFor(() => expect(localStorage.getItem(ORG_STORAGE_KEY)).toBeNull());
  });

  it("re-issues the org context via switchToOrg when the cookie lost it but local state still has it (token refresh case)", async () => {
    localStorage.setItem(ORG_STORAGE_KEY, "org-acme");
    setSignalCookie(null);
    const switchOrgContextMutation = vi.fn().mockResolvedValue({
      data: { switchOrgContext: { accessToken: "tok" } },
    });
    mockUseMutation.mockReturnValue([switchOrgContextMutation]);
    mockUseQuery.mockReturnValue({
      data: { myOrganisations: [org("org-acme")] },
      loading: false,
      refetch: vi.fn(),
    });

    renderHook(() => useOrgContext(), { wrapper });

    await waitFor(() =>
      expect(switchOrgContextMutation).toHaveBeenCalledWith({
        variables: { orgId: "org-acme" },
      }),
    );
  });

  it("does not act while the org list is still loading", () => {
    setSignalCookie("org-acme");
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, refetch: vi.fn() });

    const { result } = renderHook(() => useOrgContext(), { wrapper });

    expect(result.current.activeOrg).toBeNull();
    expect(localStorage.getItem(ORG_STORAGE_KEY)).toBeNull();
  });
});
