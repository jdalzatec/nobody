import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  const annotations = overrides.annotations ?? ([] as Annotation[]);
  return {
    annotations,
    sidebarRef: createRef<HTMLDivElement>(),
    positions: new Map(annotations.map((annotation) => [annotation.id, 0])),
    containerHeight: 0,
    registerCard: vi.fn(),
    unregisterCard: vi.fn(),
    editingAnnotationId: null,
    onDelete: vi.fn(),
    onStartEditing: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    ...overrides,
  };
}

describe("AnnotationSidebar", () => {
  it("renders nothing when there are no annotations", () => {
    // Arrange & Act
    const { container } = render(<AnnotationSidebar {...defaultProps({ annotations: [] })} />);

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
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
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

  it("renders Edit and Delete buttons on each card", () => {
    // Arrange
    const annotations = [makeAnnotation()];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);

    // Assert
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows delete confirmation when X is clicked", async () => {
    // Arrange
    const annotations = [makeAnnotation({ id: "ann-42" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Assert
    expect(screen.getByText("Are you sure you want to delete this note?")).toBeInTheDocument();
  });

  it("calls onDelete when confirming deletion in Popconfirm", async () => {
    // Arrange
    const onDelete = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-42" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, onDelete })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    // Assert
    expect(onDelete).toHaveBeenCalledWith("ann-42");
  });

  it("does not call onDelete when canceling deletion in Popconfirm", async () => {
    // Arrange
    const onDelete = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-42" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, onDelete })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "No" }));

    // Assert
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onStartEditing with the annotation ID when pencil is clicked", async () => {
    // Arrange
    const onStartEditing = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-42" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, onStartEditing })} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    // Assert
    expect(onStartEditing).toHaveBeenCalledWith("ann-42");
  });

  it("shows a textarea with current comment in edit mode", () => {
    // Arrange
    const annotations = [makeAnnotation({ id: "ann-1", comment: "original comment" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationId: "ann-1" })} />);

    // Assert
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("original comment");
  });

  it("shows Save and Cancel buttons in edit mode", () => {
    // Arrange
    const annotations = [makeAnnotation({ id: "ann-1" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationId: "ann-1" })} />);

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onSaveEdit with updated comment when Save is clicked", async () => {
    // Arrange
    const onSaveEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-1", comment: "old" })];

    // Act
    render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationId: "ann-1", onSaveEdit })}
      />,
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "new comment");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    expect(onSaveEdit).toHaveBeenCalledWith("new comment");
  });

  it("calls onCancelEdit when Cancel is clicked", async () => {
    // Arrange
    const onCancelEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-1" })];

    // Act
    render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationId: "ann-1", onCancelEdit })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("disables Save button when textarea is empty in edit mode", async () => {
    // Arrange
    const annotations = [makeAnnotation({ id: "ann-1", comment: "text" })];

    // Act
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationId: "ann-1" })} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("does not call onSaveEdit or onCancelEdit when clicking outside in edit mode", async () => {
    // Arrange
    const onSaveEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "ann-1", comment: "original" })];

    // Act
    const { container } = render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationId: "ann-1", onSaveEdit, onCancelEdit })}
      />,
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, " changed");
    // Simulate click outside the card
    await userEvent.click(container.querySelector("body") as Element);

    // Assert — nothing should happen, both callbacks are not called
    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(onCancelEdit).not.toHaveBeenCalled();
  });
});
