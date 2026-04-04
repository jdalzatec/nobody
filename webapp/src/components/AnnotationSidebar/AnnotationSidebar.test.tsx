import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";

import { AnnotationSidebar } from "./AnnotationSidebar";

import type { Annotation } from "../../types";

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

function defaultProps(overrides: Partial<Parameters<typeof AnnotationSidebar>[0]> = {}) {
  return {
    annotations: [] as Annotation[],
    sidebarRef: createRef<HTMLDivElement>(),
    positions: new Map<string, number>(),
    containerHeight: 0,
    registerCard: vi.fn(),
    unregisterCard: vi.fn(),
    ...overrides,
  };
}

describe("AnnotationSidebar", () => {
  it("renders the container element even when annotations is empty", () => {
    // Act
    const { container } = render(<AnnotationSidebar {...defaultProps()} />);

    // Assert
    expect(container.querySelector(".annotation-sidebar")).toBeInTheDocument();
  });

  it("renders a card for each annotation", () => {
    // Arrange
    const annotations = [
      makeAnnotation({ id: "1", comment: "First" }),
      makeAnnotation({ id: "2", comment: "Second" }),
      makeAnnotation({ id: "3", comment: "Third" }),
    ];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    // Assert
    expect(screen.getAllByText("User")).toHaveLength(3);
  });

  it("displays the selected text as a quote", () => {
    // Arrange
    const annotations = [makeAnnotation({ text: "highlighted portion" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    // Assert
    expect(screen.getByText("highlighted portion")).toBeInTheDocument();
  });

  it("displays the user comment", () => {
    // Arrange
    const annotations = [makeAnnotation({ comment: "This is important" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    // Assert
    expect(screen.getByText("This is important")).toBeInTheDocument();
  });

  it("shows the User label on each card", () => {
    // Arrange
    const annotations = [makeAnnotation()];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    // Assert
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("applies the correct top from positions map", () => {
    // Arrange
    const annotations = [
      makeAnnotation({ id: "a" }),
      makeAnnotation({ id: "b", comment: "Second" }),
    ];
    const positions = new Map([
      ["a", 100],
      ["b", 250],
    ]);

    // Act
    const { container } = render(
      <AnnotationSidebar {...defaultProps({ annotations, positions })} />,
    );

    // Assert
    const wrappers = container.querySelectorAll<HTMLElement>(".annotation-sidebar > div");
    expect(wrappers[0].style.top).toBe("100px");
    expect(wrappers[1].style.top).toBe("250px");
  });

  it("calls registerCard on mount and unregisterCard on unmount", () => {
    // Arrange
    const registerCard = vi.fn();
    const unregisterCard = vi.fn();
    const annotations = [makeAnnotation({ id: "a" })];

    // Act
    const { unmount } = render(
      <AnnotationSidebar {...defaultProps({ annotations, registerCard, unregisterCard })} />,
    );

    // Assert — registerCard called on mount
    expect(registerCard).toHaveBeenCalledWith("a", expect.any(HTMLElement));

    // Act — unmount
    unmount();

    // Assert — unregisterCard called on unmount
    expect(unregisterCard).toHaveBeenCalledWith("a");
  });
});
