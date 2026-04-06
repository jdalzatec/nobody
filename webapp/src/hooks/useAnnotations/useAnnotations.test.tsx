import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import {
  highlightRange,
  removeHighlightById,
  removePendingHighlight,
} from "../../utils/range-utils";

import { useAnnotations } from "./useAnnotations";

vi.mock("../../utils/range-utils", () => ({
  serializeRange: vi.fn(() => ({
    startContainerPath: [0, 0],
    startOffset: 0,
    endContainerPath: [0, 0],
    endOffset: 5,
  })),
  highlightRange: vi.fn(),
  removeHighlightById: vi.fn(),
  removePendingHighlight: vi.fn(),
}));

function createMockRange(text: string): Range {
  const range = new Range();
  Object.defineProperty(range, "toString", { value: () => text });
  return range;
}

function createMockRect(): DOMRect {
  return new DOMRect(100, 200, 50, 20);
}

function setupWithContainer() {
  const { result } = renderHook(() => useAnnotations());
  const container = document.createElement("div");
  Object.defineProperty(result.current.containerRef, "current", {
    value: container,
    writable: true,
  });
  return { result, container };
}

function setupWithAnnotation() {
  const { result, container } = setupWithContainer();
  act(() => {
    result.current.handleTextSelected(createMockRange("hello"), createMockRect());
  });
  act(() => {
    result.current.saveAnnotation("my comment");
  });
  return { result, container, annotationId: result.current.annotations[0].id };
}

describe("useAnnotations", () => {
  it("starts with empty annotations and no pending selection", () => {
    // Arrange & Act
    const { result } = renderHook(() => useAnnotations());

    // Assert
    expect(result.current.annotations).toEqual([]);
    expect(result.current.pendingSelection).toBeNull();
  });

  it("sets pending selection when handleTextSelected is called", () => {
    // Arrange
    const { result, container } = setupWithContainer();
    const range = createMockRange("hello");
    const rect = createMockRect();
    void container;

    // Act
    act(() => {
      result.current.handleTextSelected(range, rect);
    });

    // Assert
    expect(result.current.pendingSelection).not.toBeNull();
    expect(result.current.pendingSelection?.range).toBe(range);
  });

  it("applies pending highlight when text is selected", () => {
    // Arrange
    const { result, container } = setupWithContainer();

    // Act
    act(() => {
      result.current.handleTextSelected(createMockRange("hello"), createMockRect());
    });

    // Assert
    expect(vi.mocked(highlightRange)).toHaveBeenCalledWith(
      expect.objectContaining({ startContainerPath: [0, 0] }),
      container,
      "pending",
      "annotation-highlight-pending",
    );
  });

  it("cleans up previous pending highlight on re-selection", () => {
    // Arrange
    const { result, container } = setupWithContainer();
    act(() => {
      result.current.handleTextSelected(createMockRange("first"), createMockRect());
    });
    vi.mocked(removePendingHighlight).mockClear();

    // Act
    act(() => {
      result.current.handleTextSelected(createMockRange("second"), createMockRect());
    });

    // Assert
    expect(vi.mocked(removePendingHighlight)).toHaveBeenCalledWith(container);
  });

  it("clears pending selection on cancelAnnotation", () => {
    // Arrange
    const { result } = setupWithContainer();
    act(() => {
      result.current.handleTextSelected(createMockRange("hello"), createMockRect());
    });
    expect(result.current.pendingSelection).not.toBeNull();

    // Act
    act(() => {
      result.current.cancelAnnotation();
    });

    // Assert
    expect(result.current.pendingSelection).toBeNull();
  });

  it("removes pending highlight on cancel", () => {
    // Arrange
    const { result, container } = setupWithContainer();
    act(() => {
      result.current.handleTextSelected(createMockRange("hello"), createMockRect());
    });
    vi.mocked(removePendingHighlight).mockClear();

    // Act
    act(() => {
      result.current.cancelAnnotation();
    });

    // Assert
    expect(vi.mocked(removePendingHighlight)).toHaveBeenCalledWith(container);
  });

  it("adds an annotation and clears pending selection on saveAnnotation", () => {
    // Arrange
    const { result } = setupWithContainer();
    act(() => {
      result.current.handleTextSelected(createMockRange("hello"), createMockRect());
    });

    // Act
    act(() => {
      result.current.saveAnnotation("my comment");
    });

    // Assert
    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0].comment).toBe("my comment");
    expect(result.current.annotations[0].text).toBe("hello");
    expect(result.current.pendingSelection).toBeNull();
  });

  it("removes pending highlight and applies permanent highlight on save", () => {
    // Arrange
    const { result, container } = setupWithContainer();
    act(() => {
      result.current.handleTextSelected(createMockRange("hello"), createMockRect());
    });
    vi.mocked(removePendingHighlight).mockClear();
    vi.mocked(highlightRange).mockClear();

    // Act
    act(() => {
      result.current.saveAnnotation("my comment");
    });

    // Assert
    expect(vi.mocked(removePendingHighlight)).toHaveBeenCalledWith(container);
    expect(vi.mocked(highlightRange)).toHaveBeenCalledWith(
      expect.objectContaining({ startContainerPath: [0, 0] }),
      container,
      expect.any(String),
    );
  });

  it("does nothing on saveAnnotation when there is no pending selection", () => {
    // Arrange
    const { result } = renderHook(() => useAnnotations());

    // Act
    act(() => {
      result.current.saveAnnotation("orphan comment");
    });

    // Assert
    expect(result.current.annotations).toEqual([]);
  });

  it("deletes an annotation and removes its highlight", () => {
    // Arrange
    const { result, container, annotationId } = setupWithAnnotation();
    expect(result.current.annotations).toHaveLength(1);
    vi.mocked(removeHighlightById).mockClear();

    // Act
    act(() => {
      result.current.deleteAnnotation(annotationId);
    });

    // Assert
    expect(result.current.annotations).toHaveLength(0);
    expect(vi.mocked(removeHighlightById)).toHaveBeenCalledWith(container, annotationId);
  });

  it("clears editingAnnotationId when the edited annotation is deleted", () => {
    // Arrange
    const { result, annotationId } = setupWithAnnotation();
    act(() => {
      result.current.startEditing(annotationId);
    });
    expect(result.current.editingAnnotationId).toBe(annotationId);

    // Act
    act(() => {
      result.current.deleteAnnotation(annotationId);
    });

    // Assert
    expect(result.current.editingAnnotationId).toBeNull();
  });

  it("sets editingAnnotationId when startEditing is called", () => {
    // Arrange
    const { result, annotationId } = setupWithAnnotation();

    // Act
    act(() => {
      result.current.startEditing(annotationId);
    });

    // Assert
    expect(result.current.editingAnnotationId).toBe(annotationId);
  });

  it("updates the comment and clears editing state on saveEdit", () => {
    // Arrange
    const { result, annotationId } = setupWithAnnotation();
    act(() => {
      result.current.startEditing(annotationId);
    });

    // Act
    act(() => {
      result.current.saveEdit("updated comment");
    });

    // Assert
    expect(result.current.annotations[0].comment).toBe("updated comment");
    expect(result.current.editingAnnotationId).toBeNull();
  });

  it("clears editing state without changing comment on cancelEdit", () => {
    // Arrange
    const { result, annotationId } = setupWithAnnotation();
    act(() => {
      result.current.startEditing(annotationId);
    });

    // Act
    act(() => {
      result.current.cancelEdit();
    });

    // Assert
    expect(result.current.annotations[0].comment).toBe("my comment");
    expect(result.current.editingAnnotationId).toBeNull();
  });

  it("does nothing on saveEdit when not editing", () => {
    // Arrange
    const { result } = setupWithAnnotation();

    // Act
    act(() => {
      result.current.saveEdit("should not apply");
    });

    // Assert
    expect(result.current.annotations[0].comment).toBe("my comment");
  });
});
