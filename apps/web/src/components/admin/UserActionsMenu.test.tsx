import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionTier, UserRole } from "@/types/__generated__/graphql";
import { type AdminUserLike, UserActionsMenu } from "./UserActionsMenu";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useAdmin", () => ({
  useAdminMutations: () => ({
    provisionPro: vi.fn(),
    deprovisionPro: vi.fn(),
    setUserRole: vi.fn(),
    provisioning: false,
    deprovisioning: false,
    settingRole: false,
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Flatten the dropdown so its items are always in the DOM (no portal/open state).
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const freeUser: AdminUserLike = {
  id: "u1",
  name: "Amina Bello",
  email: "amina@example.com",
  tier: SubscriptionTier.Free,
  role: UserRole.User,
};

function renderAs(viewerRole: UserRole, user = freeUser) {
  (useAuth as Mock).mockReturnValue({ user: { id: "viewer", role: viewerRole } });
  return render(<UserActionsMenu user={user} />);
}

describe("UserActionsMenu — role-gated actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides Change role for an ADMIN viewer (mirrors the server guard)", () => {
    renderAs(UserRole.Admin);
    expect(screen.getByText("Provision Pro")).toBeInTheDocument();
    expect(screen.queryByText("Change role")).not.toBeInTheDocument();
  });

  it("shows Change role for a SUPER_ADMIN viewer", () => {
    renderAs(UserRole.SuperAdmin);
    expect(screen.getByText("Change role")).toBeInTheDocument();
  });

  it("offers Revoke Pro only when the user is already Pro", () => {
    renderAs(UserRole.SuperAdmin, {
      ...freeUser,
      tier: SubscriptionTier.Pro,
    });
    expect(screen.getByText("Revoke Pro")).toBeInTheDocument();
    expect(screen.getByText("Extend Pro")).toBeInTheDocument();
  });
});
