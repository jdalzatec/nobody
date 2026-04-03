import { describe, it, expect } from "vitest";
import { serializeRange, highlightRange } from "../src/utils/range-utils";

describe("serializeRange", () => {
  it("serializes a range within a single text node", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello world</p>";
    const textNode = container.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);

    // Act
    const serialized = serializeRange(range, container);

    // Assert
    expect(serialized.startContainerPath).toEqual([0, 0]);
    expect(serialized.startOffset).toBe(0);
    expect(serialized.endContainerPath).toEqual([0, 0]);
    expect(serialized.endOffset).toBe(5);
  });

  it("serializes a range spanning multiple elements", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello</p><p>World</p>";
    const firstText = container.children[0].firstChild!;
    const secondText = container.children[1].firstChild!;
    const range = document.createRange();
    range.setStart(firstText, 2);
    range.setEnd(secondText, 3);

    // Act
    const serialized = serializeRange(range, container);

    // Assert
    expect(serialized.startContainerPath).toEqual([0, 0]);
    expect(serialized.startOffset).toBe(2);
    expect(serialized.endContainerPath).toEqual([1, 0]);
    expect(serialized.endOffset).toBe(3);
  });
});

describe("highlightRange", () => {
  it("wraps a full text node in a <mark> element", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello</p>";
    const serialized = {
      startContainerPath: [0, 0],
      startOffset: 0,
      endContainerPath: [0, 0],
      endOffset: 5,
    };

    // Act
    highlightRange(serialized, container, "ann-1");

    // Assert
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe("Hello");
    expect(mark!.className).toBe("annotation-highlight");
    expect(mark!.dataset.annotationId).toBe("ann-1");
  });

  it("wraps a partial text node, preserving surrounding text", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello world</p>";
    const serialized = {
      startContainerPath: [0, 0],
      startOffset: 6,
      endContainerPath: [0, 0],
      endOffset: 11,
    };

    // Act
    highlightRange(serialized, container, "ann-2");

    // Assert
    const p = container.querySelector("p")!;
    expect(p.innerHTML).toBe(
      'Hello <mark class="annotation-highlight" data-annotation-id="ann-2">world</mark>',
    );
  });

  it("wraps text spanning across two elements", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p><span>Hello</span> world</p>";
    const serialized = {
      startContainerPath: [0, 0, 0],
      startOffset: 3,
      endContainerPath: [0, 1],
      endOffset: 4,
    };

    // Act
    highlightRange(serialized, container, "ann-3");

    // Assert
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(2);
  });

  it("does nothing if the path cannot be resolved", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello</p>";
    const serialized = {
      startContainerPath: [5, 0],
      startOffset: 0,
      endContainerPath: [5, 0],
      endOffset: 3,
    };

    // Act
    highlightRange(serialized, container, "ann-bad");

    // Assert
    expect(container.querySelectorAll("mark").length).toBe(0);
  });
});
