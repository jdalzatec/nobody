import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockRejectedValue(new Error("render failed")),
  },
}));

import { MermaidBlock } from "../src/components/MermaidBlock";

describe("MermaidBlock", () => {
  it("renders fallback with raw source when mermaid.render fails", async () => {
    render(<MermaidBlock code="graph TD; A-->B;" />);
    expect(
      await screen.findByText("graph TD; A-->B;"),
    ).toBeInTheDocument();
    expect(screen.getByText("graph TD; A-->B;").closest("pre")).toHaveClass(
      "mermaid-fallback",
    );
  });
});
