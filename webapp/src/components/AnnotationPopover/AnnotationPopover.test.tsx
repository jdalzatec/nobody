import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { AnnotationPopover } from "./AnnotationPopover";

const defaultProps = {
  position: { top: 100, left: 200 },
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe("AnnotationPopover", () => {
  it("renders the User label", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("renders a textarea with placeholder", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByPlaceholderText("Add a comment...")).toBeInTheDocument();
  });

  it("renders Save and Cancel buttons", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders a close button with X icon", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("auto-focuses the textarea on mount", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByPlaceholderText("Add a comment...")).toHaveFocus();
  });

  it("disables Save button when textarea is empty", () => {
    // Arrange & Act
    render(<AnnotationPopover {...defaultProps} />);

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save button when textarea has content", async () => {
    // Arrange
    render(<AnnotationPopover {...defaultProps} />);

    // Act
    await userEvent.type(screen.getByPlaceholderText("Add a comment..."), "My note");

    // Assert
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("calls onSave with trimmed comment when Save is clicked", async () => {
    // Arrange
    const onSave = vi.fn();
    render(<AnnotationPopover {...defaultProps} onSave={onSave} />);

    // Act
    await userEvent.type(screen.getByPlaceholderText("Add a comment..."), "  My note  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    expect(onSave).toHaveBeenCalledWith("My note");
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    // Arrange
    const onCancel = vi.fn();
    render(<AnnotationPopover {...defaultProps} onCancel={onCancel} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when X button is clicked", async () => {
    // Arrange
    const onCancel = vi.fn();
    render(<AnnotationPopover {...defaultProps} onCancel={onCancel} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    // Assert
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when ESC is pressed", async () => {
    // Arrange
    const onCancel = vi.fn();
    render(<AnnotationPopover {...defaultProps} onCancel={onCancel} />);

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSave when Ctrl+Enter is pressed with content", async () => {
    // Arrange
    const onSave = vi.fn();
    render(<AnnotationPopover {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByPlaceholderText("Add a comment...");
    await userEvent.type(textarea, "A comment");

    // Act
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    // Assert
    expect(onSave).toHaveBeenCalledWith("A comment");
  });

  it("calls onSave when Cmd+Enter is pressed with content", async () => {
    // Arrange
    const onSave = vi.fn();
    render(<AnnotationPopover {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByPlaceholderText("Add a comment...");
    await userEvent.type(textarea, "A comment");

    // Act
    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });

    // Assert
    expect(onSave).toHaveBeenCalledWith("A comment");
  });

  it("does not call onSave on Ctrl+Enter when textarea is empty", () => {
    // Arrange
    const onSave = vi.fn();
    render(<AnnotationPopover {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByPlaceholderText("Add a comment...");

    // Act
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    // Assert
    expect(onSave).not.toHaveBeenCalled();
  });

  it("is positioned at the given coordinates", () => {
    // Arrange & Act
    const { container } = render(
      <AnnotationPopover {...defaultProps} position={{ top: 150, left: 300 }} />,
    );

    // Assert
    const popover = container.firstChild as HTMLElement;
    expect(popover.style.top).toBe("150px");
    expect(popover.style.left).toBe("300px");
  });
});
