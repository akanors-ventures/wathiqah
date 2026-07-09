import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAdminUsers } from "@/hooks/useAdmin";
import { SubscriptionTier, UserRole } from "@/types/__generated__/graphql";
import { AdminUsersTable } from "./AdminUsersTable";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

vi.mock("@/hooks/useAdmin", () => ({ useAdminUsers: vi.fn() }));

// Isolate the table from the actions menu (which pulls in auth + mutations).
vi.mock("./UserActionsMenu", () => ({
  UserActionsMenu: () => <div data-testid="actions" />,
}));

const USERS = [
  {
    id: "u1",
    name: "Amina Bello",
    email: "amina@example.com",
    role: UserRole.User,
    tier: SubscriptionTier.Pro,
    createdAt: "2026-01-05T00:00:00.000Z",
    firstName: "Amina",
    lastName: "Bello",
    phoneNumber: null,
    preferredCurrency: "NGN",
    isSupporter: false,
    isEmailVerified: true,
    subscriptionStatus: "active",
  },
  {
    id: "u2",
    name: "Bola Ade",
    email: "bola@example.com",
    role: UserRole.Admin,
    tier: SubscriptionTier.Free,
    createdAt: "2026-02-05T00:00:00.000Z",
    firstName: "Bola",
    lastName: "Ade",
    phoneNumber: null,
    preferredCurrency: "NGN",
    isSupporter: false,
    isEmailVerified: true,
    subscriptionStatus: null,
  },
];

function mockUsers(users: typeof USERS, total = users.length) {
  (useAdminUsers as Mock).mockReturnValue({
    users,
    total,
    page: 1,
    limit: 20,
    loading: false,
    refetch: vi.fn(),
  });
}

describe("AdminUsersTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a row per user with name and email", () => {
    mockUsers(USERS);
    render(<AdminUsersTable />);
    // Names appear in both the desktop table and mobile card list, so use getAllByText.
    expect(screen.getAllByText("Amina Bello").length).toBeGreaterThan(0);
    expect(screen.getAllByText("amina@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bola Ade").length).toBeGreaterThan(0);
    expect(screen.getByText("2 users total")).toBeInTheDocument();
  });

  it("shows an empty state when no users match", () => {
    mockUsers([], 0);
    render(<AdminUsersTable />);
    expect(screen.getAllByText("No users match these filters.").length).toBeGreaterThan(0);
  });
});
