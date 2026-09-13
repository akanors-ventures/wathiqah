import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TransactionType } from "@/types/__generated__/graphql";
import { IntentPicker } from "./IntentPicker";

function Harness({ initial = TransactionType.LoanGiven }: { initial?: TransactionType }) {
  const [value, setValue] = useState<TransactionType>(initial);
  return (
    <>
      <p data-testid="value">{value}</p>
      <IntentPicker value={value} onChange={setValue} />
    </>
  );
}

describe("IntentPicker", () => {
  it("defaults to the new intent's first direction the moment its card is clicked", () => {
    // Regression: clicking the intent card only changed which direction
    // options were shown, without calling onChange — the underlying type
    // silently stayed whatever it was before (e.g. the default LOAN_GIVEN)
    // until a direction button was also clicked, even though the card itself
    // now looked selected. A user who stops after step 1 submits the wrong
    // type with no indication anything is off.
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /custody/i }));

    expect(screen.getByTestId("value")).toHaveTextContent(TransactionType.Escrowed);
  });

  it("does not clobber an already-matching type when its own card is clicked again", () => {
    render(<Harness initial={TransactionType.LoanReceived} />);

    fireEvent.click(screen.getByRole("button", { name: /^lending/i }));

    // Re-clicking the intent the current type already belongs to must not
    // reset it back to that intent's first direction (LoanGiven), discarding
    // the user's actual selection (LoanReceived).
    expect(screen.getByTestId("value")).toHaveTextContent(TransactionType.LoanReceived);
  });

  it("still lets a direction button set the type directly, unchanged from before", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /gifting/i }));
    fireEvent.click(screen.getByRole("button", { name: /i'm receiving/i }));

    expect(screen.getByTestId("value")).toHaveTextContent(TransactionType.GiftReceived);
  });
});
