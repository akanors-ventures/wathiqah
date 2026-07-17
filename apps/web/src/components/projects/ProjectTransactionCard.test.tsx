import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ProjectTransactionCard,
  type ProjectTransactionCardTransaction,
} from "./ProjectTransactionCard";

const baseTx: ProjectTransactionCardTransaction = {
  id: "tx-1",
  type: "EXPENSE",
  amount: 50000,
  category: "Materials",
  description: "Cement bags",
  date: "2026-07-16",
  witnesses: [],
  history: [],
};

describe("ProjectTransactionCard", () => {
  it("calls onView when the row's icon/description area is clicked (mobile: no view button)", () => {
    const onView = vi.fn();
    render(
      <ProjectTransactionCard
        transaction={baseTx}
        currency="NGN"
        onView={onView}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View transaction: Cement bags · Materials" }),
    );
    expect(onView).toHaveBeenCalledWith(baseTx);
  });

  it("clicking Edit calls onEdit, not onView", () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    render(
      <ProjectTransactionCard
        transaction={baseTx}
        currency="NGN"
        onView={onView}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit transaction" }));
    expect(onEdit).toHaveBeenCalledWith(baseTx);
    expect(onView).not.toHaveBeenCalled();
  });

  it("clicking Delete calls onDelete, not onView, when there are no witnesses", () => {
    const onView = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProjectTransactionCard
        transaction={baseTx}
        currency="NGN"
        onView={onView}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    expect(onDelete).toHaveBeenCalledWith(baseTx);
    expect(onView).not.toHaveBeenCalled();
  });

  it("disables Delete and does not call onDelete when the transaction has witnesses", () => {
    const onDelete = vi.fn();
    render(
      <ProjectTransactionCard
        transaction={{
          ...baseTx,
          witnesses: [
            { id: "w1", status: "ACKNOWLEDGED", user: { firstName: "A", lastName: "B" } },
          ],
        }}
        currency="NGN"
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    const deleteButton = screen.getByRole("button", {
      name: /delete transaction \(disabled/i,
    });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(deleteButton);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
