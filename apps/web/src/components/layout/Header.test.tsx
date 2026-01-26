import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { ReactNode } from "react";
import Header from "./Header";
import { useAuthContext } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

// Mock router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: ReactNode;
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

// Mock ThemeProvider
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("Header UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays user menu when authenticated", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: { name: "Test User", firstName: "Test", lastName: "User" },
      loading: false,
      logout: vi.fn(),
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("displays sign in/up buttons when unauthenticated", () => {
    (useAuthContext as Mock).mockReturnValue({
      user: null,
      loading: false,
      logout: vi.fn(),
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
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
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    // When loading, it shows a pulse div, not the menu or buttons
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("User menu")).not.toBeInTheDocument();
  });
});
