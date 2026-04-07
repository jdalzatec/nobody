import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";

import { AnnotationSidebar } from "./AnnotationSidebar";

import type { Annotation } from "../../types";

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: "0",
  text: "selected text",
  comment: "my comment",
  sourceStart: 0,
  sourceEnd: 10,
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
    editingAnnotationIndex: null,
    activeAnnotationId: null,
    onActivate: vi.fn(),
    onDelete: vi.fn(),
    onStartEditing: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    ...overrides,
  };
}

describe("AnnotationSidebar", () => {
  it("renders nothing when there are no annotations", () => {
    const { container } = render(<AnnotationSidebar {...defaultProps({ annotations: [] })} />);
    expect(container.querySelector(".annotation-sidebar")).toBeInTheDocument();
  });

  it("renders a card for each annotation", () => {
    const annotations = [
      makeAnnotation({ id: "0", comment: "First" }),
      makeAnnotation({ id: "1", comment: "Second" }),
      makeAnnotation({ id: "2", comment: "Third" }),
    ];
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
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

  it("applies the correct top from positions map", () => {
    const annotations = [
      makeAnnotation({ id: "0" }),
      makeAnnotation({ id: "1", comment: "Second" }),
    ];
    const positions = new Map([
      ["0", 100],
      ["1", 250],
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
    const annotations = [makeAnnotation({ id: "0" })];
    const { unmount } = render(
      <AnnotationSidebar {...defaultProps({ annotations, registerCard, unregisterCard })} />,
    );
    expect(registerCard).toHaveBeenCalledWith("0", expect.any(HTMLElement));
    unmount();
    expect(unregisterCard).toHaveBeenCalledWith("0");
  });

  it("renders Edit and Delete buttons on each card", () => {
    const annotations = [makeAnnotation()];
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows delete confirmation when X is clicked", async () => {
    const annotations = [makeAnnotation({ id: "0" })];
    render(<AnnotationSidebar {...defaultProps({ annotations })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Are you sure you want to delete this note?")).toBeInTheDocument();
  });

  it("calls onDelete with index when confirming deletion", async () => {
    const onDelete = vi.fn();
    const annotations = [makeAnnotation({ id: "0" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, onDelete })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("does not call onDelete when canceling deletion", async () => {
    const onDelete = vi.fn();
    const annotations = [makeAnnotation({ id: "0" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, onDelete })} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onStartEditing with index when pencil is clicked", async () => {
    const onStartEditing = vi.fn();
    const annotations = [makeAnnotation({ id: "0" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, onStartEditing })} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onStartEditing).toHaveBeenCalledWith(0);
  });

  it("shows a textarea with current comment in edit mode", () => {
    const annotations = [makeAnnotation({ id: "0", comment: "original comment" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationIndex: 0 })} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("original comment");
  });

  it("shows Save and Cancel buttons in edit mode", () => {
    const annotations = [makeAnnotation({ id: "0" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationIndex: 0 })} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onSaveEdit with updated comment when Save is clicked", async () => {
    const onSaveEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "0", comment: "old" })];
    render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationIndex: 0, onSaveEdit })}
      />,
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "new comment");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveEdit).toHaveBeenCalledWith("new comment");
  });

  it("calls onCancelEdit when Cancel is clicked", async () => {
    const onCancelEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "0" })];
    render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationIndex: 0, onCancelEdit })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("disables Save button when textarea is empty in edit mode", async () => {
    const annotations = [makeAnnotation({ id: "0", comment: "text" })];
    render(<AnnotationSidebar {...defaultProps({ annotations, editingAnnotationIndex: 0 })} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("does not call onSaveEdit or onCancelEdit when clicking outside in edit mode", async () => {
    const onSaveEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const annotations = [makeAnnotation({ id: "0", comment: "original" })];
    const { container } = render(
      <AnnotationSidebar
        {...defaultProps({ annotations, editingAnnotationIndex: 0, onSaveEdit, onCancelEdit })}
      />,
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, " changed");
    await userEvent.click(container.querySelector("body") as Element);
    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(onCancelEdit).not.toHaveBeenCalled();
  });
});
