import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/source-search", () => ({
  findBlockElement: vi.fn(() => {
    const el = document.createElement("p");
    el.setAttribute("data-block-id", "0");
    el.setAttribute("data-start", "0");
    el.setAttribute("data-end", "11");
    el.textContent = "Hello world";
    return el;
  }),
  findSelectedTextInSource: vi.fn(() => ({ start: 0, end: 5 })),
}));

vi.mock("../../lib/selection-validator", () => ({
  canAnnotate: vi.fn(() => ({ valid: true })),
  hasOverlap: vi.fn(() => false),
}));

import { canAnnotate, hasOverlap } from "../../lib/selection-validator";
import { findSelectedTextInSource } from "../../lib/source-search";

import { useAnnotations } from "./useAnnotations";

function createMockRange(text: string): Range {
  const el = document.createElement("p");
  el.setAttribute("data-block-id", "0");
  const textNode = document.createTextNode(text);
  el.appendChild(textNode);
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, text.length);
  return range;
}

function setup(markdown = "Hello world") {
  const onSourceChange = vi.fn();
  const containerRef = { current: document.createElement("div") };
  const { result } = renderHook(() => useAnnotations(markdown, onSourceChange, containerRef));
  return { result, onSourceChange, containerRef };
}

describe("useAnnotations", () => {
  it("derives annotations from markdown source", () => {
    const { result } = setup("Hello {==world==}{>>note<<} end");
    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0].text).toBe("world");
    expect(result.current.annotations[0].comment).toBe("note");
    expect(result.current.annotations[0].id).toBe("0");
  });

  it("starts with no pending selection", () => {
    const { result } = setup();
    expect(result.current.pendingSelection).toBeNull();
  });

  it("sets pending selection on valid handleTextSelected", () => {
    const { result } = setup();
    act(() => {
      result.current.handleTextSelected(createMockRange("Hello"));
    });
    expect(result.current.pendingSelection).not.toBeNull();
    expect(result.current.pendingSelection?.text).toBe("Hello");
  });

  it("rejects selection when canAnnotate returns invalid", () => {
    vi.mocked(canAnnotate).mockReturnValueOnce({ valid: false, reason: "empty" });
    const { result } = setup();
    act(() => {
      result.current.handleTextSelected(createMockRange(""));
    });
    expect(result.current.pendingSelection).toBeNull();
  });

  it("rejects selection when findSelectedTextInSource returns null", () => {
    vi.mocked(findSelectedTextInSource).mockReturnValueOnce(null);
    const { result } = setup();
    act(() => {
      result.current.handleTextSelected(createMockRange("Hello"));
    });
    expect(result.current.pendingSelection).toBeNull();
  });

  it("rejects selection when hasOverlap returns true", () => {
    vi.mocked(hasOverlap).mockReturnValueOnce(true);
    const { result } = setup();
    act(() => {
      result.current.handleTextSelected(createMockRange("Hello"));
    });
    expect(result.current.pendingSelection).toBeNull();
  });

  it("calls onSourceChange with CriticMarkup on save", () => {
    const { result, onSourceChange } = setup("Hello world");
    act(() => {
      result.current.handleTextSelected(createMockRange("Hello"));
    });
    act(() => {
      result.current.saveAnnotation("my comment");
    });
    expect(onSourceChange).toHaveBeenCalledWith("{==Hello==}{>>my comment<<} world");
    expect(result.current.pendingSelection).toBeNull();
  });

  it("calls onSourceChange on delete", () => {
    const md = "Hello {==world==}{>>note<<} end";
    const { result, onSourceChange } = setup(md);
    act(() => {
      result.current.deleteAnnotation(0);
    });
    expect(onSourceChange).toHaveBeenCalledWith("Hello world end");
  });

  it("calls onSourceChange on edit", () => {
    const md = "Hello {==world==}{>>old<<} end";
    const { result, onSourceChange } = setup(md);
    act(() => {
      result.current.startEditing(0);
    });
    act(() => {
      result.current.saveEdit("new");
    });
    expect(onSourceChange).toHaveBeenCalledWith("Hello {==world==}{>>new<<} end");
    expect(result.current.editingAnnotationIndex).toBeNull();
  });

  it("clears pending selection on cancel", () => {
    const { result } = setup();
    act(() => {
      result.current.handleTextSelected(createMockRange("Hello"));
    });
    expect(result.current.pendingSelection).not.toBeNull();
    act(() => {
      result.current.cancelAnnotation();
    });
    expect(result.current.pendingSelection).toBeNull();
  });

  it("clears editingAnnotationIndex when the edited annotation is deleted", () => {
    const md = "Hello {==world==}{>>note<<} end";
    const { result } = setup(md);
    act(() => {
      result.current.startEditing(0);
    });
    expect(result.current.editingAnnotationIndex).toBe(0);
    act(() => {
      result.current.deleteAnnotation(0);
    });
    expect(result.current.editingAnnotationIndex).toBeNull();
  });
});
