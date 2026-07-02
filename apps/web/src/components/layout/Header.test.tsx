import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthContext } from "@/context/AuthContext";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useSubscription } from "@/hooks/useSubscription";
import Header from "./Header";

// Mock router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouterState: vi.fn(
    ({ select }: { select?: (s: { location: { pathname: string } }) => unknown } = {}) => {
      const state = { location: { pathname: "/" } };
      return select ? select(state) : state;
    },
  ),
  Link: ({
    children,
    to,
    params,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    onClick?: () => void;
  }) => {
    // Mirror TanStack Router's $param substitution so tests can assert on
    // the resolved href, the same way a real <Link to="/org/$slug/x"
    // params={{ slug }}> resolves at runtime.
    const href = params
      ? Object.entries(params).reduce((acc, [key, value]) => acc.replace(`$${key}`, value), to)
      : to;
    return (
      <a href={href} onClick={onClick} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

// Mock OrgContext — Header now uses useActiveOrg and AccountSwitcher uses useOrgContext
vi.mock("@/context/OrgContext", () => ({
  useOrgContext: vi.fn(() => ({
    activeOrg: null,
    myOrgs: [],
    loadingOrgs: false,
    switchToOrg: vi.fn(),
    refetchOrgs: vi.fn(),
    isOrgMode: false,
    blockAutoSwitch: vi.fn(),
    unblockAutoSwitch: vi.fn(),
    autoSwitchBlocked: { current: false },
  })),
  OrgProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg: vi.fn(() => ({ activeOrg: null, isOrgMode: false, switchToOrg: vi.fn() })),
}));

// Mock useSubscription
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: vi.fn(() => ({ isPro: false, loading: false })),
}));

// Mock ThemeProvider
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

// Mock Radix UI components that use Portals
vi.mock("@radix-ui/react-dropdown-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: () => <div />,
  Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ItemIndicator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@radix-ui/react-tooltip", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock NotificationBell to isolate the test from Apollo hooks (useQuery,
// useMutation, useSubscription) which require a real ApolloProvider tree.
vi.mock("./notification-bell", () => ({
  NotificationBell: () => <button type="button" aria-label="Notifications" />,
}));

// Mock HeaderUser to isolate the test from hydration logic and hooks
vi.mock("../auth/header-user", () => ({
  __esModule: true,
  default: () => {
    const { user, loading } = useAuthContext();
    if (loading) return <output aria-label="Loading user profile" />;
    if (!user)
      return (
        <div>
          <button type="button">Sign in</button>
          <button type="button">Sign up</button>
        </div>
      );
    return <button type="button" aria-label="User menu" />;
  },
}));

describe("Header UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays user menu when authenticated", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: { name: "Test User", firstName: "Test", lastName: "User" },
      loading: false,
      logout: vi.fn(),
      isAuthenticated: () => true,
    });

    render(
      <React.StrictMode>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </React.StrictMode>,
    );
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("displays sign in/up buttons when unauthenticated", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: null,
      loading: false,
      logout: vi.fn(),
      isAuthenticated: () => false,
    });

    render(
      <React.StrictMode>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </React.StrictMode>,
    );
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.queryByLabelText("User menu")).not.toBeInTheDocument();
  });

  it("displays loading state when loading", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: undefined,
      loading: true,
      logout: vi.fn(),
      isAuthenticated: () => false,
    });
    (useSubscription as Mock).mockReturnValue({
      isPro: false,
      loading: false,
    });

    render(
      <React.StrictMode>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </React.StrictMode>,
    );
    // When loading, it shows a pulse div, not the menu or buttons
    expect(screen.getByLabelText("Loading user profile")).toBeInTheDocument();
  });

  it("shows personal-only nav items and no Organisation group in personal mode", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: { name: "Test User", firstName: "Test", lastName: "User" },
      loading: false,
      logout: vi.fn(),
      isAuthenticated: () => true,
    });
    (useActiveOrg as Mock).mockReturnValue({ activeOrg: null, isOrgMode: false });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Promises")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.queryByText("Organisation")).not.toBeInTheDocument();
    expect(screen.queryByText("Events & Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
  });

  it("keeps org-scoped nav items, hides personal-only Notes, and shows the Organisation group pointing at the active org in org mode", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: { name: "Test User", firstName: "Test", lastName: "User" },
      loading: false,
      logout: vi.fn(),
      isAuthenticated: () => true,
    });
    (useActiveOrg as Mock).mockReturnValue({
      activeOrg: { id: "org-1", slug: "akanors-livestock" },
      isOrgMode: true,
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    // Projects and Promises are backend org-scoped (@ActiveOrg() resolves
    // orgId from the JWT automatically) -- same route works in both modes --
    // so they must stay reachable in org mode, not be hidden.
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Promises")).toBeInTheDocument();
    // Personal Notes has no org equivalent (org notes live under the
    // dedicated Events & Notes page instead) — must not be reachable while
    // in org mode, so a user can't mistake a personal note for an org one.
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();

    expect(screen.getByText("Organisation")).toBeInTheDocument();
    expect(screen.getByText("Events & Notes")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    expect(screen.getByText("Events & Notes").closest("a")).toHaveAttribute(
      "href",
      "/org/akanors-livestock/events",
    );
    expect(screen.getByText("Members").closest("a")).toHaveAttribute(
      "href",
      "/org/akanors-livestock/members",
    );
  });
});
