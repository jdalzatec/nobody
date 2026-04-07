import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";

vi.mock("../MermaidBlock", () => ({
  MermaidBlock: ({ code }: { code: string }) => <div data-testid="mermaid-block">{code}</div>,
}));

describe("MarkdownViewer", () => {
  it("renders heading from markdown", () => {
    // Arrange
    const content = "## Section Title";

    // Act
    render(<MarkdownViewer content={content} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Section Title");
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
    const content = "```mermaid\ngraph TD;\nA-->B;\n```";
    render(<MarkdownViewer content={content} />);
    expect(screen.getByTestId("mermaid-block")).toBeInTheDocument();
  });

  it("strips CriticMarkup and renders clean text", () => {
    const content = "Hello {==world==}{>>note<<} end";
    render(<MarkdownViewer content={content} />);
    expect(screen.getByText("Hello world end")).toBeInTheDocument();
  });

  it("stamps data-start and data-end on block elements", () => {
    const content = "Hello world";
    const { container } = render(<MarkdownViewer content={content} />);
    const p = container.querySelector("p");
    expect(p).toBeInTheDocument();
    expect(p).toHaveAttribute("data-start");
    expect(p).toHaveAttribute("data-end");
  });

  it("stamps data-block-id on block elements", () => {
    const content = "First\n\nSecond";
    const { container } = render(<MarkdownViewer content={content} />);
    const blocks = container.querySelectorAll("[data-block-id]");
    expect(blocks.length).toBeGreaterThanOrEqual(2);
  });

  it("list item with sub-bullets: direct text matches restricted source", () => {
    const content =
      "- **6.1** Add test `test_patch` in\n" +
      "  `TestPatch`:\n" +
      "  - Use `fixture` (which has `room_id=None`).\n" +
      '  - PATCH `/v1/{id}` with `{"room_id": null}`.';

    const { container } = render(<MarkdownViewer content={content} />);

    const lis = container.querySelectorAll("li[data-block-id]");
    expect(lis.length).toBeGreaterThanOrEqual(1);

    const parentLi = lis[0];
    const bStart = Number(parentLi.getAttribute("data-start"));

    // Find first child block element — restrict source to before it
    const childBlock = parentLi.querySelector("[data-block-id]");
    expect(childBlock).not.toBeNull();
    const childStartAttr = childBlock?.getAttribute("data-start") ?? "0";
    const restrictedSource = content.slice(bStart, Number(childStartAttr));

    // Get direct text content (excluding sub-list text)
    const walker = document.createTreeWalker(parentLi, NodeFilter.SHOW_TEXT);
    let directText = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      let ancestor: Node | null = node.parentNode;
      let insideChild = false;
      while (ancestor && ancestor !== parentLi) {
        if (ancestor instanceof HTMLElement && ancestor.hasAttribute("data-block-id")) {
          insideChild = true;
          break;
        }
        ancestor = ancestor.parentNode;
      }
      if (insideChild) break;
      directText += node.textContent ?? "";
    }
    directText = directText.replace(/\s+$/, "");

    // The restricted source must cover all direct text characters
    let si = 0;
    let ri = 0;
    while (ri < directText.length && si < restrictedSource.length) {
      if (restrictedSource[si] === directText[ri]) {
        si++;
        ri++;
      } else {
        si++;
      }
    }

    expect(ri).toBe(directText.length);
  });
});
