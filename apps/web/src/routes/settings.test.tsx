import { useMutation } from "@apollo/client/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/useProfile";
import { useSharedAccess } from "@/hooks/useSharedAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { BillingSection, PreferencesSection, SettingsPage, SharedAccessSection } from "./settings";

// Mock hooks
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: vi.fn(),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(),
}));

vi.mock("@/hooks/useSharedAccess", () => ({
  useSharedAccess: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock components that might cause issues in tests
vi.mock("@/components/ui/page-loader", () => ({
  PageLoader: () => <div data-testid="page-loader">Loading...</div>,
  BrandLoader: () => <div data-testid="brand-loader">Loading...</div>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <button
      type="button"
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange?.("USD")}
    >
      {children}
    </button>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <div>{placeholder}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    asChild,
    isLoading,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
    asChild?: boolean;
    isLoading?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const Comp = asChild ? "span" : "button";
    return (
      <Comp
        onClick={onClick}
        disabled={disabled || isLoading}
        data-variant={variant}
        data-size={size}
        className={className}
        {...props}
      >
        {children}
      </Comp>
    );
  },
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  CreditCard: () => <svg data-testid="credit-card-icon" />,
  Zap: () => <svg data-testid="zap-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Shield: () => <svg data-testid="shield-icon" />,
  Bell: () => <svg data-testid="bell-icon" />,
  Lock: () => <svg data-testid="lock-icon" />,
  Globe: () => <svg data-testid="globe-icon" />,
  Moon: () => <svg data-testid="moon-icon" />,
  LogOut: () => <svg data-testid="logout-icon" />,
}));

// Mock router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (component: React.ComponentType) => component,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}));

describe("SettingsPage", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    preferredCurrency: "NGN",
  };

  const mockSubscription = {
    subscriptionStatus: "active",
  };

  const mockUpdateUser = vi.fn();
  const mockGrantAccess = vi.fn();
  const mockRevokeAccess = vi.fn();
  const mockCancelSubscription = vi.fn();
  const mockRefetchSubscription = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (useSubscription as Mock).mockReturnValue({
      tier: "FREE",
      subscription: mockSubscription,
      loading: false,
      witnessUsage: 5,
      maxWitnessesPerMonth: 10,
      isPro: false,
      refetch: mockRefetchSubscription,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    (useProfile as Mock).mockReturnValue({
      updateUser: mockUpdateUser,
      updating: false,
    });

    (useSharedAccess as Mock).mockReturnValue({
      accessGrants: [],
      receivedGrants: [],
      loading: false,
      loadingReceived: false,
      error: null,
      grantAccess: mockGrantAccess,
      granting: false,
      revokeAccess: mockRevokeAccess,
    });

    (useMutation as unknown as Mock).mockReturnValue([mockCancelSubscription, { loading: false }]);
  });

  it("renders loading state when auth is loading", () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<SettingsPage />);
    expect(screen.getByTestId("page-loader")).toBeInTheDocument();
  });

  it("renders login message when user is not authenticated", () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<SettingsPage />);
    expect(screen.getByText(/Please log in to view settings/i)).toBeInTheDocument();
  });

  it("renders all sections when authenticated", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    // We can assume children are rendered if headers are present
    expect(screen.getByText("Subscription & Billing")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Shared With Me")).toBeInTheDocument();
  });

  describe("BillingSection", () => {
    it("displays Free plan details correctly", () => {
      render(<BillingSection />);
      expect(screen.getByText("FREE")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("Witness Requests")).toBeInTheDocument();
      expect(screen.getByText("5 / 10")).toBeInTheDocument();
      expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
    });

    it("displays Pro plan details correctly", () => {
      (useSubscription as Mock).mockReturnValue({
        tier: "PRO",
        subscription: mockSubscription,
        loading: false,
        witnessUsage: 50,
        maxWitnessesPerMonth: Infinity,
        isPro: true,
        refetch: mockRefetchSubscription,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2024-12-31"),
      });

      render(<BillingSection />);
      const proElements = screen.getAllByText("PRO");
      expect(proElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/active/i)).toBeInTheDocument();
      expect(screen.getByText("Unlimited")).toBeInTheDocument();
      expect(screen.getByText(/Renews on/)).toBeInTheDocument();
      expect(screen.getByText("Cancel Subscription")).toBeInTheDocument();
    });

    it("displays cancellation status correctly", () => {
      (useSubscription as Mock).mockReturnValue({
        tier: "PRO",
        subscription: mockSubscription,
        loading: false,
        witnessUsage: 50,
        maxWitnessesPerMonth: Infinity,
        isPro: true,
        refetch: mockRefetchSubscription,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date("2024-12-31"),
      });

      render(<BillingSection />);
      expect(screen.getByText("Cancelling")).toBeInTheDocument();
      expect(screen.getByText(/Access until/)).toBeInTheDocument();
      expect(screen.getByText("Auto-renewal disabled")).toBeInTheDocument();
    });
  });

  describe("PreferencesSection", () => {
    it("displays current preferred currency", () => {
      render(<PreferencesSection />);
      expect(screen.getByText("Preferences")).toBeInTheDocument();
      expect(screen.getByText("Preferred Currency")).toBeInTheDocument();
    });
  });

  describe("SharedAccessSection", () => {
    it("renders empty state when no grants", () => {
      render(<SharedAccessSection />);
      expect(screen.getByPlaceholderText("ahmad.sulaiman@example.com")).toBeInTheDocument();
      expect(screen.getByText("Grant Access")).toBeInTheDocument();
    });

    it("calls grantAccess when form is submitted", async () => {
      render(<SharedAccessSection />);
      const input = screen.getByPlaceholderText("ahmad.sulaiman@example.com");
      const button = screen.getByText("Grant Access");

      fireEvent.change(input, { target: { value: "newuser@example.com" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockGrantAccess).toHaveBeenCalledWith({ email: "newuser@example.com" });
      });
    });
  });
});
