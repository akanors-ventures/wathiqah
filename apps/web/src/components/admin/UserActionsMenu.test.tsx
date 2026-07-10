import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionTier, UserRole } from "@/types/__generated__/graphql";
import {
  type AdminUserLike,
  endOfDayIso,
  localDateString,
  UserActionsMenu,
} from "./UserActionsMenu";

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

describe("localDateString", () => {
  it("formats a Date's local calendar components, not its UTC-converted date", () => {
    // Constructed from local (year, month, day) components — this must
    // round-trip regardless of the runtime's timezone offset, unlike
    // `toISOString().slice(0, 10)` which reads the UTC-shifted date.
    expect(localDateString(new Date(2027, 0, 5))).toBe("2027-01-05");
    expect(localDateString(new Date(2027, 11, 31))).toBe("2027-12-31");
  });

  it("zero-pads single-digit months and days", () => {
    expect(localDateString(new Date(2027, 2, 7))).toBe("2027-03-07");
  });
});

describe("endOfDayIso", () => {
  it("anchors the persisted expiry to the exact calendar date picked, in UTC", () => {
    // Previously built via `new Date(`${expiresAt}T23:59:59`)` (no offset),
    // which parses as the viewer's *local* time — for any timezone behind
    // UTC, 23:59:59 local rolls into the next UTC day, silently persisting
    // an expiry one day later than the admin selected.
    expect(endOfDayIso("2027-07-10")).toBe("2027-07-10T23:59:59.000Z");
  });

  it("does not drift across a month/year boundary", () => {
    expect(endOfDayIso("2027-12-31")).toBe("2027-12-31T23:59:59.000Z");
  });
});
