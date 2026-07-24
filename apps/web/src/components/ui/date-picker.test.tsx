import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";

function ControlledHarness(props: {
  initial?: string;
  min?: string;
  max?: string;
  onChangeSpy?: (v: string) => void;
}) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <DatePicker
      value={value}
      min={props.min}
      max={props.max}
      onChange={(v) => {
        setValue(v);
        props.onChangeSpy?.(v);
      }}
    />
  );
}

describe("DatePicker", () => {
  it("shows the placeholder when no value is set", () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /pick a date/i })).toBeInTheDocument();
  });

  it("shows the formatted date when a value is set", () => {
    render(<DatePicker value="2026-07-17" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Jul 17, 2026/ })).toBeInTheDocument();
  });

  it("opens the calendar when the trigger is clicked", () => {
    render(<DatePicker value="2026-07-17" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Jul 17, 2026/ }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("selecting a day calls onChange with a yyyy-MM-dd string and closes the calendar", () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness initial="2026-07-01" onChangeSpy={onChangeSpy} />);

    fireEvent.click(screen.getByRole("button", { name: /Jul 1, 2026/ }));
    const grid = screen.getByRole("grid");
    fireEvent.click(within(grid).getByRole("button", { name: /July 15th, 2026/ }));

    expect(onChangeSpy).toHaveBeenCalledWith("2026-07-15");
    expect(screen.getByRole("button", { name: /Jul 15, 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("disables days before `min` and does not select them on click", () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness initial="2026-07-17" min="2026-07-10" onChangeSpy={onChangeSpy} />);

    fireEvent.click(screen.getByRole("button", { name: /Jul 17, 2026/ }));
    const grid = screen.getByRole("grid");
    const disabledDay = within(grid).getByRole("button", { name: /July 5th, 2026/ });

    expect(disabledDay).toBeDisabled();
    fireEvent.click(disabledDay);
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("disables days after `max` and does not select them on click", () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness initial="2026-07-05" max="2026-07-10" onChangeSpy={onChangeSpy} />);

    fireEvent.click(screen.getByRole("button", { name: /Jul 5, 2026/ }));
    const grid = screen.getByRole("grid");
    const disabledDay = within(grid).getByRole("button", { name: /July 20th, 2026/ });

    expect(disabledDay).toBeDisabled();
    fireEvent.click(disabledDay);
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("respects a disabled prop on the trigger itself", () => {
    render(<DatePicker value="2026-07-17" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /Jul 17, 2026/ })).toBeDisabled();
  });
});
