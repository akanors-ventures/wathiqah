import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthContext } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import Header from "./Header";

// Mock router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuthContext: vi.fn(),
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
});
