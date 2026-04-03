import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarkdownViewer } from "./MarkdownViewer";

vi.mock("../MermaidBlock", () => ({
  MermaidBlock: ({ code }: { code: string }) => (
    <div data-testid="mermaid-block">{code}</div>
  ),
}));

describe("MarkdownViewer", () => {
  it("renders heading from markdown", () => {
    // Arrange
    const content = "## Section Title";

    // Act
    render(<MarkdownViewer content={content} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Section Title",
    );
  });

  it("renders table from markdown", () => {
    // Arrange
    const content = `| Name | Value |\n|------|-------|\n| A | 1 |\n| B | 2 |`;

    // Act
    render(<MarkdownViewer content={content} />);

    // Assert
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("renders regular code block", () => {
    // Arrange
    const content = "```js\nconsole.log('hi');\n```";

    // Act
    render(<MarkdownViewer content={content} />);

    // Assert
    expect(screen.getByText("console.log('hi');")).toBeInTheDocument();
  });

  it("delegates mermaid code block to MermaidBlock", () => {
    // Arrange
    const content = "```mermaid\ngraph TD;\nA-->B;\n```";

    // Act
    render(<MarkdownViewer content={content} />);

    // Assert
    expect(screen.getByTestId("mermaid-block")).toBeInTheDocument();
  });
});
