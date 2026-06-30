import { useQuery } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useBalance } from "@/hooks/useBalance";
import { useContacts } from "@/hooks/useContacts";
import { usePersonalEntrySummary } from "@/hooks/usePersonalEntries";
import { usePromises } from "@/hooks/usePromises";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyWitnessRequests } from "@/hooks/useWitnesses";
import { Dashboard } from "./Dashboard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/context/OrgContext", () => ({ useOrgContext: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useBalance", () => ({ useBalance: vi.fn() }));
vi.mock("@/hooks/useContacts", () => ({ useContacts: vi.fn() }));
vi.mock("@/hooks/usePersonalEntries", () => ({ usePersonalEntrySummary: vi.fn() }));
vi.mock("@/hooks/usePromises", () => ({ usePromises: vi.fn() }));
vi.mock("@/hooks/useTransactions", () => ({ useTransactions: vi.fn() }));
vi.mock("@/hooks/useWitnesses", () => ({ useMyWitnessRequests: vi.fn() }));
vi.mock("../org/org-hero", () => ({ OrgHero: () => <div data-testid="org-hero" /> }));
vi.mock("../org/org-stats-row", () => ({ OrgStatsRow: () => <div data-testid="org-stats-row" /> }));
vi.mock("./ProjectsWidget", () => ({
  ProjectsWidget: () => <div data-testid="projects-widget" />,
}));
vi.mock("./OnboardingChecklist", () => ({ OnboardingChecklist: () => <div /> }));
vi.mock("@/components/transactions/TransactionCard", () => ({
  TransactionCard: () => <div />,
}));

function setupCommonMocks() {
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { id: "u1", preferredCurrency: "NGN" },
  });
  (useTransactions as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    transactions: [],
    loading: false,
  });
  (useContacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    contacts: [],
    loading: false,
  });
  (useBalance as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    balance: { netBalance: 0, currency: "NGN" },
    loading: false,
  });
  (useMyWitnessRequests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    requests: [],
    loading: false,
  });
  (usePromises as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    promises: [],
    loading: false,
  });
  (usePersonalEntrySummary as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    summary: { netCashPosition: 0 },
    loading: false,
  });
  (useQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined });
}

describe("Dashboard — financial stats by mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Cash Position in personal mode", () => {
    setupCommonMocks();
    (useOrgContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeOrg: null,
      isOrgMode: false,
    });

    render(<Dashboard />);

    expect(screen.getByText("Cash Position")).toBeInTheDocument();
  });

  it("hides Cash Position in org mode — it's sourced from Personal Entries, which has no org equivalent", () => {
    setupCommonMocks();
    (useOrgContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      activeOrg: {
        id: "org-1",
        slug: "acme",
        name: "Acme",
        members: [],
        transactionCount: 0,
        contactCount: 0,
        activeProjectCount: 0,
      },
      isOrgMode: true,
    });

    render(<Dashboard />);

    expect(screen.queryByText("Cash Position")).not.toBeInTheDocument();
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
  });
});
