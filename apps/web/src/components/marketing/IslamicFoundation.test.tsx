import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { IslamicFoundation } from "./IslamicFoundation";

describe("IslamicFoundation", () => {
  it("renders the section label", () => {
    render(<IslamicFoundation />);
    expect(screen.getByText(/our foundation/i)).toBeInTheDocument();
  });

  it("renders the Quranic verse", () => {
    render(<IslamicFoundation />);
    expect(screen.getByText(/when you contract a debt for a specified term/i)).toBeInTheDocument();
  });

  it("renders the citation", () => {
    render(<IslamicFoundation />);
    expect(screen.getByText(/surah al-baqarah 2:282/i)).toBeInTheDocument();
  });

  it("renders the body paragraph with the differentiator", () => {
    render(<IslamicFoundation />);
    expect(screen.getByText(/most tools do the first/i)).toBeInTheDocument();
  });

  it("renders a blockquote element for the verse", () => {
    const { container } = render(<IslamicFoundation />);
    expect(container.querySelector("blockquote")).not.toBeNull();
  });
});
