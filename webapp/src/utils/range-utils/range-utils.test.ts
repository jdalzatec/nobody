import assert from "node:assert/strict";

import { describe, it, expect } from "vitest";

import {
  serializeRange,
  highlightRange,
  removeHighlightById,
  removePendingHighlight,
} from "./range-utils";

describe("serializeRange", () => {
  it("serializes a range within a single text node", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML = "<p>Hello world</p>";
    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    assert(p);
    const textNode = p.firstChild;
    assert(textNode instanceof Text);
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
    const firstText = container.children[0].firstChild;
    const secondText = container.children[1].firstChild;
    assert(firstText instanceof Text);
    assert(secondText instanceof Text);
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
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Hello");
    expect(marks[0].className).toBe("annotation-highlight");
    expect(marks[0].dataset.annotationId).toBe("ann-1");
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
    const paras = container.querySelectorAll("p");
    expect(paras.length).toBe(1);
    expect(paras[0].innerHTML).toBe(
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

  it("applies a custom CSS class when provided", () => {
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
    highlightRange(serialized, container, "ann-custom", "my-custom-class");

    // Assert
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.className).toBe("my-custom-class");
  });
});

describe("removePendingHighlight", () => {
  it("unwraps pending marks and restores text", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p>Hello <mark class="annotation-highlight-pending" data-annotation-id="pending">world</mark></p>';

    // Act
    removePendingHighlight(container);

    // Assert
    expect(container.querySelectorAll("mark").length).toBe(0);
    expect(container.querySelector("p")?.textContent).toBe("Hello world");
  });

  it("normalizes text nodes after unwrapping", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p>Hello <mark class="annotation-highlight-pending" data-annotation-id="pending">world</mark>!</p>';

    // Act
    removePendingHighlight(container);

    // Assert
    const p = container.querySelector("p");
    expect(p?.childNodes.length).toBe(1);
    expect(p?.textContent).toBe("Hello world!");
  });

  it("does not remove non-pending marks", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p><mark class="annotation-highlight" data-annotation-id="ann-1">Hello</mark> <mark class="annotation-highlight-pending" data-annotation-id="pending">world</mark></p>';

    // Act
    removePendingHighlight(container);

    // Assert
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Hello");
    expect(marks[0].dataset.annotationId).toBe("ann-1");
  });
});

describe("removeHighlightById", () => {
  it("removes marks matching the given annotation ID", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p><mark class="annotation-highlight" data-annotation-id="ann-1">Hello</mark> world</p>';

    // Act
    removeHighlightById(container, "ann-1");

    // Assert
    expect(container.querySelectorAll("mark").length).toBe(0);
    expect(container.querySelector("p")?.textContent).toBe("Hello world");
  });

  it("normalizes text nodes after unwrapping", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p>Say <mark class="annotation-highlight" data-annotation-id="ann-2">hello</mark> world</p>';

    // Act
    removeHighlightById(container, "ann-2");

    // Assert
    const p = container.querySelector("p");
    expect(p?.childNodes.length).toBe(1);
    expect(p?.textContent).toBe("Say hello world");
  });

  it("does not remove marks with a different annotation ID", () => {
    // Arrange
    const container = document.createElement("div");
    container.innerHTML =
      '<p><mark class="annotation-highlight" data-annotation-id="ann-1">Hello</mark> <mark class="annotation-highlight" data-annotation-id="ann-2">world</mark></p>';

    // Act
    removeHighlightById(container, "ann-1");

    // Assert
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("world");
    expect(marks[0].dataset.annotationId).toBe("ann-2");
  });
});
