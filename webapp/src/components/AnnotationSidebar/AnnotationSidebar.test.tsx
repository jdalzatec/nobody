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
    const { container } = render(<AnnotationSidebar {...defaultProps()} />);

    expect(container.querySelector(".annotation-sidebar")).toBeInTheDocument();
  });

  it("renders a card for each annotation", () => {
    const annotations = [
      makeAnnotation({ id: "1", comment: "First" }),
      makeAnnotation({ id: "2", comment: "Second" }),
      makeAnnotation({ id: "3", comment: "Third" }),
    ];

    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    expect(screen.getAllByText("User")).toHaveLength(3);
  });

  it("displays the selected text as a quote", () => {
    const annotations = [makeAnnotation({ text: "highlighted portion" })];

    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    expect(screen.getByText("highlighted portion")).toBeInTheDocument();
  });

  it("displays the user comment", () => {
    const annotations = [makeAnnotation({ comment: "This is important" })];

    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    expect(screen.getByText("This is important")).toBeInTheDocument();
  });

  it("shows the User label on each card", () => {
    const annotations = [makeAnnotation()];

    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("applies the correct top from positions map", () => {
    const annotations = [
      makeAnnotation({ id: "a" }),
      makeAnnotation({ id: "b", comment: "Second" }),
    ];
    const positions = new Map([
      ["a", 100],
      ["b", 250],
    ]);

    const { container } = render(
      <AnnotationSidebar {...defaultProps({ annotations, positions })} />,
    );

    const wrappers = container.querySelectorAll<HTMLElement>(".annotation-sidebar > div");
    expect(wrappers[0].style.top).toBe("100px");
    expect(wrappers[1].style.top).toBe("250px");
  });

  it("calls registerCard on mount and unregisterCard on unmount", () => {
    const registerCard = vi.fn();
    const unregisterCard = vi.fn();
    const annotations = [makeAnnotation({ id: "a" })];

    const { unmount } = render(
      <AnnotationSidebar
        {...defaultProps({ annotations, registerCard, unregisterCard })}
      />,
    );

    expect(registerCard).toHaveBeenCalledWith("a", expect.any(HTMLElement));

    unmount();

    expect(unregisterCard).toHaveBeenCalledWith("a");
  });
});
