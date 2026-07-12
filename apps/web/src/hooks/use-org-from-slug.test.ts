import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOrgFromSlug } from "./use-org-from-slug";

const mockUseOrgContext = vi.fn();

vi.mock("@/context/OrgContext", () => ({
  useOrgContext: () => mockUseOrgContext(),
}));

function org(id: string, slug: string) {
  return { id, slug };
}

function setActiveOrgIdCookie(orgId: string | null) {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API — direct assignment simulates browser cookie state in tests
  document.cookie = orgId ? `activeOrgId=${orgId}` : "activeOrgId=; max-age=0";
}

describe("useOrgFromSlug", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API — direct assignment resets cookie state between tests
    document.cookie = "activeOrgId=; max-age=0";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("repairs stale local activeOrgId when the signal cookie already matches the target org, instead of leaving it stuck (the bug)", async () => {
    // The JWT/cookie already says we're in org "acme" (e.g. switched in
    // another tab, or localStorage was cleared independently of the
    // cookie), but local React state still thinks we're in a different org
    // (or no org). Previously this branch detected the mismatch and did
    // nothing about it.
    setActiveOrgIdCookie("org-acme");
    const syncActiveOrgId = vi.fn();
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("org-acme", "acme")],
      activeOrg: null,
      switchToOrg: vi.fn(),
      autoSwitchBlocked: { current: false },
      syncActiveOrgId,
    });

    renderHook(() => useOrgFromSlug("acme"));

    await waitFor(() => expect(syncActiveOrgId).toHaveBeenCalledWith("org-acme"));
    // No mutation needed since the server already has the right context.
    expect(mockUseOrgContext().switchToOrg).not.toHaveBeenCalled();
  });

  it("does not call syncActiveOrgId when local state already matches the signal cookie", async () => {
    setActiveOrgIdCookie("org-acme");
    const syncActiveOrgId = vi.fn();
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("org-acme", "acme")],
      activeOrg: org("org-acme", "acme"),
      switchToOrg: vi.fn(),
      autoSwitchBlocked: { current: false },
      syncActiveOrgId,
    });

    const { result } = renderHook(() => useOrgFromSlug("acme"));

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(syncActiveOrgId).not.toHaveBeenCalled();
  });

  it("still performs a real switch (mutation) when the signal cookie points at a different org", async () => {
    setActiveOrgIdCookie("org-other");
    const switchToOrg = vi.fn().mockResolvedValue(undefined);
    const syncActiveOrgId = vi.fn();
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("org-acme", "acme")],
      activeOrg: org("org-other", "other"),
      switchToOrg,
      autoSwitchBlocked: { current: false },
      syncActiveOrgId,
    });

    const { result } = renderHook(() => useOrgFromSlug("acme"));

    expect(result.current.isSyncing).toBe(true);
    await waitFor(() => expect(switchToOrg).toHaveBeenCalledWith("org-acme"));
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    // This path goes through the real mutation, not the local-only repair.
    expect(syncActiveOrgId).not.toHaveBeenCalled();
  });

  it("does not auto-switch while an explicit AccountSwitcher-initiated switch is in progress", async () => {
    setActiveOrgIdCookie("org-other");
    const switchToOrg = vi.fn();
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("org-acme", "acme")],
      activeOrg: org("org-other", "other"),
      switchToOrg,
      autoSwitchBlocked: { current: true },
      syncActiveOrgId: vi.fn(),
    });

    const { result } = renderHook(() => useOrgFromSlug("acme"));

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(switchToOrg).not.toHaveBeenCalled();
  });

  it("re-syncs when the slug changes to a different org that the cookie already matches", async () => {
    setActiveOrgIdCookie("org-beta");
    const syncActiveOrgId = vi.fn();
    mockUseOrgContext.mockReturnValue({
      myOrgs: [org("org-acme", "acme"), org("org-beta", "beta")],
      activeOrg: org("org-acme", "acme"),
      switchToOrg: vi.fn().mockResolvedValue(undefined),
      autoSwitchBlocked: { current: false },
      syncActiveOrgId,
    });

    const { rerender } = renderHook(({ slug }) => useOrgFromSlug(slug), {
      initialProps: { slug: "acme" },
    });

    act(() => {
      rerender({ slug: "beta" });
    });

    await waitFor(() => expect(syncActiveOrgId).toHaveBeenCalledWith("org-beta"));
  });
});
