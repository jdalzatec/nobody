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
    // Arrange
    const code = "graph TD; A-->B;";

    // Act
    render(<MermaidBlock code={code} />);

    // Assert
    expect(await screen.findByText(code)).toBeInTheDocument();
    expect(screen.getByText(code).closest("pre")).toBeInTheDocument();
  });
});
