import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CategoryAutocompleteInput } from "./category-autocomplete-input";

function ControlledHarness({ suggestions }: { suggestions: string[] }) {
  const [value, setValue] = useState("");
  return (
    <CategoryAutocompleteInput
      suggestions={suggestions}
      placeholder="Select or type a category"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

describe("CategoryAutocompleteInput", () => {
  it("opens the dropdown on focus and lists all suggestions", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Labor" })).toBeInTheDocument();
  });

  it("filters suggestions as the user types", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor", "Contribution"]} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "lab" } });
    expect(screen.getByRole("option", { name: "Labor" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Materials" })).not.toBeInTheDocument();
  });

  it("selects a suggestion on click and closes the dropdown", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: "Materials" }));
    expect(input.value).toBe("Materials");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the dropdown on blur, e.g. tabbing to the next field", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps option buttons out of the tab order so Tab leaves the widget instead of walking through options", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    fireEvent.focus(screen.getByRole("combobox"));
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("tabindex", "-1");
    }
  });

  it("ArrowDown then Enter selects the highlighted suggestion via keyboard", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Materials");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not open a dropdown when there are no suggestions", () => {
    render(<ControlledHarness suggestions={[]} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("reports aria-expanded=false and no dangling aria-controls target when the query matches nothing", () => {
    render(<ControlledHarness suggestions={["Materials", "Labor"]} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "no-match-xyz" } });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
