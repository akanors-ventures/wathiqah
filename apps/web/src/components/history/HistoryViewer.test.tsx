import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryViewer } from "./HistoryViewer";
import { describe, it, expect } from "vitest";

const mockHistory = [
  {
    id: "1",
    changeType: "CREATE",
    createdAt: "2023-01-01T10:00:00Z",
    user: { id: "u1", name: "Alice", email: "alice@example.com" },
    previousState: {},
    newState: { amount: 100 },
  },
  {
    id: "2",
    changeType: "UPDATE",
    createdAt: "2023-01-02T10:00:00Z",
    user: { id: "u1", name: "Alice", email: "alice@example.com" },
    previousState: { amount: 100 },
    newState: { amount: 200 },
  },
  {
    id: "3",
    changeType: "ACKNOWLEDGE",
    createdAt: "2023-01-03T10:00:00Z",
    user: { id: "u2", name: "Bob", email: "bob@example.com" },
    previousState: {},
    newState: { status: "ACKNOWLEDGED" },
  },
];

describe("HistoryViewer", () => {
  it("renders history items", () => {
    render(<HistoryViewer history={mockHistory} />);
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("CREATE")).toBeInTheDocument();
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
    expect(screen.getByText("ACKNOWLEDGE")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<HistoryViewer history={mockHistory} />);
    const searchInput = screen.getByPlaceholderText("Search history...");
    fireEvent.change(searchInput, { target: { value: "Bob" } });

    expect(screen.queryByText("CREATE")).not.toBeInTheDocument();
    expect(screen.getByText("ACKNOWLEDGE")).toBeInTheDocument();
  });

  it("toggles details view", () => {
    render(<HistoryViewer history={mockHistory} />);
    const viewButtons = screen.getAllByText(/View Details/i);
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText("New State")).toBeInTheDocument();
    expect(screen.getByText(/"amount": 100/)).toBeInTheDocument();
  });

  it("shows empty state when no history", () => {
    render(<HistoryViewer history={[]} />);
    expect(screen.getByText("No History Available")).toBeInTheDocument();
  });
});
