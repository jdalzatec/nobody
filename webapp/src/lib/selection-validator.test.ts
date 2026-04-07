import { describe, it, expect } from "vitest";

import { canAnnotate, hasOverlap, isInsideMermaid } from "./selection-validator";

function createMockRange(opts: {
  text: string;
  startBlockId?: string | null;
  endBlockId?: string | null;
  mermaid?: boolean;
}): Range {
  const startBlock = document.createElement("p");
  if (opts.startBlockId !== undefined && opts.startBlockId !== null) {
    startBlock.setAttribute("data-block-id", opts.startBlockId);
  }
  if (opts.mermaid) {
    startBlock.classList.add("mermaid-diagram");
  }
  const textNode = document.createTextNode(opts.text);
  startBlock.appendChild(textNode);

  const endBlock =
    opts.endBlockId !== undefined && opts.endBlockId !== opts.startBlockId
      ? (() => {
          const el = document.createElement("p");
          if (opts.endBlockId !== null) {
            el.setAttribute("data-block-id", opts.endBlockId);
          }
          const t = document.createTextNode("end");
          el.appendChild(t);
          return { container: t, offset: 0 };
        })()
      : null;

  const range = document.createRange();
  range.setStart(textNode, 0);
  if (endBlock) {
    range.setEnd(endBlock.container, endBlock.offset);
  } else {
    range.setEnd(textNode, opts.text.length);
  }

  return range;
}

describe("canAnnotate", () => {
  it("valid single-block selection", () => {
    const range = createMockRange({ text: "hello", startBlockId: "0" });
    expect(canAnnotate(range)).toEqual({ valid: true });
  });

  it("rejects empty selection", () => {
    const range = createMockRange({ text: "   ", startBlockId: "0" });
    expect(canAnnotate(range).valid).toBe(false);
    expect(canAnnotate(range).reason).toContain("empty");
  });

  it("rejects multi-block selection", () => {
    const container = document.createElement("div");
    const p1 = document.createElement("p");
    p1.setAttribute("data-block-id", "0");
    p1.textContent = "first block";
    const p2 = document.createElement("p");
    p2.setAttribute("data-block-id", "1");
    p2.textContent = "second block";
    container.appendChild(p1);
    container.appendChild(p2);
    document.body.appendChild(container);

    const range = document.createRange();
    const startNode = p1.firstChild as Text;
    const endNode = p2.firstChild as Text;
    range.setStart(startNode, 0);
    range.setEnd(endNode, 5);
    const result = canAnnotate(range);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("single block");

    document.body.removeChild(container);
  });

  it("rejects mermaid selection", () => {
    const range = createMockRange({
      text: "hello",
      startBlockId: "0",
      mermaid: true,
    });
    expect(canAnnotate(range).valid).toBe(false);
    expect(canAnnotate(range).reason).toContain("mermaid");
  });
});

describe("hasOverlap", () => {
  it("returns false with no annotations", () => {
    expect(hasOverlap(0, 5, "plain text")).toBe(false);
  });

  it("returns false with non-overlapping range", () => {
    const md = "{==hi==}{>>note<<} world";
    expect(hasOverlap(19, 24, md)).toBe(false);
  });

  it("returns true with overlapping range", () => {
    const md = "ab{==cd==}{>>note<<}ef";
    expect(hasOverlap(1, 5, md)).toBe(true);
  });
});

describe("isInsideMermaid", () => {
  it("returns true for mermaid container descendant", () => {
    const div = document.createElement("div");
    div.classList.add("mermaid-diagram");
    const span = document.createElement("span");
    div.appendChild(span);
    expect(isInsideMermaid(span)).toBe(true);
  });

  it("returns false outside mermaid", () => {
    const p = document.createElement("p");
    expect(isInsideMermaid(p)).toBe(false);
  });
});
