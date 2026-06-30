import { render } from "@testing-library/react";
import type * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HeaderUser from "./header-user";

const mocks = vi.hoisted(() => ({
  capturedOnOpenChange: {
    current: undefined as ((open: boolean) => void) | undefined,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "u1", firstName: "Fawaz", lastName: "Abdganiyu", name: "Fawaz Abdganiyu" },
    loading: false,
    logout: vi.fn(),
    isAuthenticated: () => true,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "PRO", isPro: true }),
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

const refetchOrgs = vi.fn().mockResolvedValue(undefined);

vi.mock("@/context/OrgContext", () => ({
  useOrgContext: () => ({
    activeOrg: null,
    myOrgs: [{ id: "org-1", slug: "akanors", name: "Akanors", industry: "Agriculture" }],
    loadingOrgs: false,
    isOrgMode: false,
    switchToOrg: vi.fn(),
    refetchOrgs,
    blockAutoSwitch: vi.fn(),
    unblockAutoSwitch: vi.fn(),
    autoSwitchBlocked: { current: false },
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => {
    mocks.capturedOnOpenChange.current = onOpenChange;
    return <div>{children}</div>;
  },
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("HeaderUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.capturedOnOpenChange.current = undefined;
  });

  it("refetches the org list whenever the account dropdown is opened", () => {
    render(<HeaderUser />);

    expect(mocks.capturedOnOpenChange.current).toBeInstanceOf(Function);
    expect(refetchOrgs).not.toHaveBeenCalled();

    mocks.capturedOnOpenChange.current?.(true);

    expect(refetchOrgs).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the dropdown closes", () => {
    render(<HeaderUser />);

    mocks.capturedOnOpenChange.current?.(false);

    expect(refetchOrgs).not.toHaveBeenCalled();
  });
});
