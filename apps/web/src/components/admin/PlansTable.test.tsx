import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAdminPlanMutations, useAdminPlans } from "@/hooks/useAdmin";
import {
  type AdminPlanFieldsFragment,
  PlanStatus,
  SubscriptionTier,
} from "@/types/__generated__/graphql";
import { PlansTable } from "./PlansTable";

vi.mock("@/hooks/useAdmin", () => ({
  useAdminPlans: vi.fn(),
  useAdminPlanMutations: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Flatten the dropdown so its items are always in the DOM (no portal/open state).
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

const PLAN: AdminPlanFieldsFragment = {
  __typename: "PlanEntity",
  id: "plan_1",
  tier: SubscriptionTier.Pro,
  interval: "monthly",
  currency: "NGN",
  amount: 2500,
  name: "Monthly Wathiqah Pro",
  provider: "flutterwave",
  providerPlanId: "163686",
  status: PlanStatus.Active,
  createdAt: "2026-07-11T23:34:00.000Z",
  updatedAt: "2026-07-11T23:34:00.000Z",
};

function mockPlans(plans: AdminPlanFieldsFragment[], loading = false) {
  (useAdminPlans as Mock).mockReturnValue({ plans, loading, error: undefined, refetch: vi.fn() });
}

const defaultMutations = {
  syncPlans: vi.fn().mockResolvedValue({ data: { adminSyncPlans: [] } }),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  cancelPlan: vi.fn(),
  syncing: false,
  creating: false,
  updating: false,
  cancelling: false,
};

function mockMutations(overrides: Partial<typeof defaultMutations> = {}) {
  (useAdminPlanMutations as Mock).mockReturnValue({ ...defaultMutations, ...overrides });
}

describe("PlansTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutations();
  });

  it("renders a row per plan with name, plan ID, amount, and status", () => {
    mockPlans([PLAN]);
    render(<PlansTable />);

    expect(screen.getByText("Monthly Wathiqah Pro")).toBeInTheDocument();
    expect(screen.getByText("163686")).toBeInTheDocument();
    expect(screen.getByText(/2,500\.00/)).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows an empty state when there are no plans", () => {
    mockPlans([]);
    render(<PlansTable />);

    expect(screen.getByText(/No plans yet\. Sync from Flutterwave/i)).toBeInTheDocument();
  });

  it("shows an 'Unassigned' tier label when the plan has no tier", () => {
    mockPlans([{ ...PLAN, tier: null }]);
    render(<PlansTable />);

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("calls syncPlans when 'Sync from Flutterwave' is clicked", async () => {
    const syncPlans = vi.fn().mockResolvedValue({ data: { adminSyncPlans: [PLAN] } });
    mockMutations({ syncPlans });
    mockPlans([]);
    render(<PlansTable />);

    fireEvent.click(screen.getByText("Sync from Flutterwave"));

    expect(syncPlans).toHaveBeenCalled();
  });

  it("opens the edit dialog pre-filled with the plan's current name and status", () => {
    mockPlans([PLAN]);
    render(<PlansTable />);

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.getByDisplayValue("Monthly Wathiqah Pro")).toBeInTheDocument();
  });

  it("hides the 'Cancel plan' action for an already-cancelled plan", () => {
    mockPlans([{ ...PLAN, status: PlanStatus.Cancelled }]);
    render(<PlansTable />);

    expect(screen.queryByText("Cancel plan")).not.toBeInTheDocument();
  });
});
