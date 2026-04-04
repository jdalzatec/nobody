import { describe, it, expect, vi } from "vitest";

import { measureHighlightTops, resolveOverlaps } from "./layout-utils";

import type { Annotation } from "../../types";

const makeAnnotation = (id: string): Annotation => ({
  id,
  text: "text",
  comment: "comment",
  range: {
    startContainerPath: [0, 0],
    startOffset: 0,
    endContainerPath: [0, 0],
    endOffset: 5,
  },
});

describe("measureHighlightTops", () => {
  it("returns empty map when annotations is empty", () => {
    const container = document.createElement("div");
    const sidebar = document.createElement("div");

    const result = measureHighlightTops([], container, sidebar);

    expect(result.size).toBe(0);
  });

  it("returns empty map when container is null", () => {
    const sidebar = document.createElement("div");

    const result = measureHighlightTops([makeAnnotation("a")], null, sidebar);

    expect(result.size).toBe(0);
  });

  it("returns empty map when no matching marks exist", () => {
    const container = document.createElement("div");
    const sidebar = document.createElement("div");

    const result = measureHighlightTops([makeAnnotation("a")], container, sidebar);

    expect(result.size).toBe(0);
  });

  it("returns highlight midpoint Y relative to sidebar top", () => {
    const container = document.createElement("div");
    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", "a");
    container.appendChild(mark);

    const sidebar = document.createElement("div");

    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 150, 100, 20),
    );
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 50, 280, 1000),
    );

    const result = measureHighlightTops([makeAnnotation("a")], container, sidebar);

    // midY = 150 + 20/2 = 160, sidebarTop = 50 → 110
    expect(result.get("a")).toBe(110);
  });

  it("skips annotations whose mark is absent", () => {
    const container = document.createElement("div");
    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", "a");
    container.appendChild(mark);

    const sidebar = document.createElement("div");

    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 150, 100, 20),
    );
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 50, 280, 1000),
    );

    const result = measureHighlightTops(
      [makeAnnotation("a"), makeAnnotation("b")],
      container,
      sidebar,
    );

    expect(result.size).toBe(1);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(false);
  });
});

describe("resolveOverlaps", () => {
  it("returns empty map for empty input", () => {
    const result = resolveOverlaps(new Map(), new Map());

    expect(result.size).toBe(0);
  });

  it("centers a single card on its highlight midpoint", () => {
    // midY=100, cardHeight=40 → desired top = 100 - 20 = 80
    const midYs = new Map([["a", 100]]);
    const heights = new Map([["a", 40]]);

    const result = resolveOverlaps(midYs, heights);

    expect(result.get("a")).toBe(80);
  });

  it("centers two far-apart annotations independently", () => {
    // a: midY=100, h=40 → top=80; b: midY=300, h=40 → top=280
    const midYs = new Map([
      ["a", 100],
      ["b", 300],
    ]);
    const heights = new Map([
      ["a", 40],
      ["b", 40],
    ]);

    const result = resolveOverlaps(midYs, heights);

    expect(result.get("a")).toBe(80);
    expect(result.get("b")).toBe(280);
  });

  it("pushes second annotation below first when centering causes overlap", () => {
    // a: midY=100, h=60 → desired=70, cursor after a = 70+60+8=138
    // b: midY=110, h=40 → desired=90, but cursor=138 → placed at 138
    const midYs = new Map([
      ["a", 100],
      ["b", 110],
    ]);
    const heights = new Map([
      ["a", 60],
      ["b", 40],
    ]);

    const result = resolveOverlaps(midYs, heights);

    expect(result.get("a")).toBe(70);
    expect(result.get("b")).toBe(70 + 60 + 8);
  });

  it("cascades pushes through three annotations", () => {
    // a: midY=100, h=60 → desired=70
    // b: midY=110, h=60 → desired=80, cursor=70+60+8=138 → 138
    // c: midY=120, h=40 → desired=100, cursor=138+60+8=206 → 206
    const midYs = new Map([
      ["a", 100],
      ["b", 110],
      ["c", 120],
    ]);
    const heights = new Map([
      ["a", 60],
      ["b", 60],
      ["c", 40],
    ]);

    const result = resolveOverlaps(midYs, heights);

    const aTop = 70;
    expect(result.get("a")).toBe(aTop);
    const bTop = aTop + 60 + 8;
    expect(result.get("b")).toBe(bTop);
    const cTop = bTop + 60 + 8;
    expect(result.get("c")).toBe(cTop);
  });

  it("handles two annotations at the same highlight midpoint", () => {
    // a: midY=100, h=50 → desired=75, cursor after=75+50+8=133
    // b: midY=100, h=50 → desired=75, cursor=133 → 133
    const midYs = new Map([
      ["a", 100],
      ["b", 100],
    ]);
    const heights = new Map([
      ["a", 50],
      ["b", 50],
    ]);

    const result = resolveOverlaps(midYs, heights);

    expect(result.get("a")).toBe(75);
    expect(result.get("b")).toBe(75 + 50 + 8);
  });

  it("excludes annotations missing from cardHeights", () => {
    const midYs = new Map([
      ["a", 100],
      ["b", 200],
    ]);
    const heights = new Map([["a", 50]]);

    const result = resolveOverlaps(midYs, heights);

    expect(result.size).toBe(1);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(false);
  });

  it("respects custom gap value", () => {
    // a: midY=100, h=60 → desired=70, cursor after=70+60+20=150
    // b: midY=110, h=40 → desired=90, cursor=150 → 150
    const midYs = new Map([
      ["a", 100],
      ["b", 110],
    ]);
    const heights = new Map([
      ["a", 60],
      ["b", 40],
    ]);

    const result = resolveOverlaps(midYs, heights, 20);

    expect(result.get("a")).toBe(70);
    expect(result.get("b")).toBe(70 + 60 + 20);
  });
});
