import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnnotationSidebar } from "../src/components/AnnotationSidebar";
import type { Annotation } from "../src/types";

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: "ann-1",
  text: "selected text",
  comment: "my comment",
  range: {
    startContainerPath: [0, 0],
    startOffset: 0,
    endContainerPath: [0, 0],
    endOffset: 13,
  },
  ...overrides,
});

describe("AnnotationSidebar", () => {
  it("renders nothing when there are no annotations", () => {
    // Arrange & Act
    const { container } = render(<AnnotationSidebar annotations={[]} />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("renders a card for each annotation", () => {
    // Arrange
    const annotations = [
      makeAnnotation({ id: "1", comment: "First" }),
      makeAnnotation({ id: "2", comment: "Second" }),
      makeAnnotation({ id: "3", comment: "Third" }),
    ];

    // Act
    render(<AnnotationSidebar annotations={annotations} />);

    // Assert
    expect(screen.getAllByText("User")).toHaveLength(3);
  });

  it("displays the selected text as a quote", () => {
    // Arrange
    const annotations = [makeAnnotation({ text: "highlighted portion" })];

    // Act
    render(<AnnotationSidebar annotations={annotations} />);

    // Assert
    expect(screen.getByText("highlighted portion")).toBeInTheDocument();
  });

  it("displays the user comment", () => {
    // Arrange
    const annotations = [makeAnnotation({ comment: "This is important" })];

    // Act
    render(<AnnotationSidebar annotations={annotations} />);

    // Assert
    expect(screen.getByText("This is important")).toBeInTheDocument();
  });

  it("shows the User label on each card", () => {
    // Arrange
    const annotations = [makeAnnotation()];

    // Act
    render(<AnnotationSidebar annotations={annotations} />);

    // Assert
    expect(screen.getByText("User")).toBeInTheDocument();
  });
});
