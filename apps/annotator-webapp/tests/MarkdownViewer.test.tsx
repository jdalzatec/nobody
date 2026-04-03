import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarkdownViewer } from "../src/components/MarkdownViewer";

vi.mock("../src/components/MermaidBlock", () => ({
  MermaidBlock: ({ code }: { code: string }) => (
    <div data-testid="mermaid-block">{code}</div>
  ),
}));

describe("MarkdownViewer", () => {
  it("renders heading from markdown", () => {
    render(<MarkdownViewer content="## Section Title" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Section Title",
    );
  });

  it("renders table from markdown", () => {
    const md = `| Name | Value |\n|------|-------|\n| A | 1 |\n| B | 2 |`;
    render(<MarkdownViewer content={md} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("renders regular code block", () => {
    const md = "```js\nconsole.log('hi');\n```";
    render(<MarkdownViewer content={md} />);
    expect(screen.getByText("console.log('hi');")).toBeInTheDocument();
  });

  it("delegates mermaid code block to MermaidBlock", () => {
    const md = "```mermaid\ngraph TD;\nA-->B;\n```";
    render(<MarkdownViewer content={md} />);
    expect(screen.getByTestId("mermaid-block")).toBeInTheDocument();
  });
});
