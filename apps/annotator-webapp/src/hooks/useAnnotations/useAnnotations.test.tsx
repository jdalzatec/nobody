import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAnnotations } from "./useAnnotations";

vi.mock("../../utils/range-utils", () => ({
  serializeRange: vi.fn(() => ({
    startContainerPath: [0, 0],
    startOffset: 0,
    endContainerPath: [0, 0],
    endOffset: 5,
  })),
  highlightRange: vi.fn(),
}));

function createMockRange(text: string): Range {
  const range = new Range();
  Object.defineProperty(range, "toString", { value: () => text });
  return range;
}

function createMockRect(): DOMRect {
  return new DOMRect(100, 200, 50, 20);
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
    const { result } = renderHook(() => useAnnotations());
    const range = createMockRange("hello");
    const rect = createMockRect();

    // Act
    act(() => {
      result.current.handleTextSelected(range, rect);
    });

    // Assert
    expect(result.current.pendingSelection).not.toBeNull();
    expect(result.current.pendingSelection!.range).toBe(range);
    expect(result.current.pendingSelection!.rect).toBe(rect);
  });

  it("clears pending selection on cancelAnnotation", () => {
    // Arrange
    const { result } = renderHook(() => useAnnotations());
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

  it("adds an annotation and clears pending selection on saveAnnotation", () => {
    // Arrange
    const { result } = renderHook(() => useAnnotations());
    const container = document.createElement("div");
    Object.defineProperty(result.current.containerRef, "current", {
      value: container,
      writable: true,
    });
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
});
