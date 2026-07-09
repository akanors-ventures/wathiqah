import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types/__generated__/graphql";
import { AdminLayout } from "./AdminLayout";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: (opts?: { select?: (s: { location: { pathname: string } }) => unknown }) => {
    const state = { location: { pathname: "/admin" } };
    return opts?.select ? opts.select(state) : state;
  },
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function renderWith(role: UserRole | undefined) {
  (useAuth as Mock).mockReturnValue({
    user: role ? { id: "u1", role } : { id: "u1" },
    loading: false,
  });
  return render(
    <AdminLayout>
      <div>ADMIN CONTENT</div>
    </AdminLayout>,
  );
}

describe("AdminLayout role gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a plain USER with a Not authorized message", () => {
    renderWith(UserRole.User);
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN CONTENT")).not.toBeInTheDocument();
  });

  it("renders the console and children for an ADMIN", () => {
    renderWith(UserRole.Admin);
    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByText("ADMIN CONTENT")).toBeInTheDocument();
    expect(screen.queryByText("Not authorized")).not.toBeInTheDocument();
  });

  it("renders the console and children for a SUPER_ADMIN", () => {
    renderWith(UserRole.SuperAdmin);
    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByText("ADMIN CONTENT")).toBeInTheDocument();
  });
});
