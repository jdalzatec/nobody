import { describe, it, expect } from "vitest";

import { buildRenderedToSourceMap, cleanOffsetToOriginal } from "./source-search";

describe("buildRenderedToSourceMap", () => {
  it("plain text: identity mapping", () => {
    const map = buildRenderedToSourceMap("hello", "hello");
    expect(map).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("bold: skips ** at both ends", () => {
    const map = buildRenderedToSourceMap("bold", "**bold**");
    expect(map).toEqual([2, 3, 4, 5, 6]);
  });

  it("italic: skips * at both ends", () => {
    const map = buildRenderedToSourceMap("italic", "*italic*");
    expect(map).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("link: skips [ and ](url)", () => {
    const map = buildRenderedToSourceMap("text", "[text](url)");
    expect(map).toEqual([1, 2, 3, 4, 5]);
  });

  it("inline code: skips backticks", () => {
    const map = buildRenderedToSourceMap("code", "`code`");
    expect(map).toEqual([1, 2, 3, 4, 5]);
  });

  it("strikethrough: skips ~~ at both ends", () => {
    const map = buildRenderedToSourceMap("text", "~~text~~");
    expect(map).toEqual([2, 3, 4, 5, 6]);
  });

  it("cross-boundary: bold and normal", () => {
    const map = buildRenderedToSourceMap("bold and normal", "**bold** and normal");
    expect(map[0]).toBe(2);
    expect(map[4]).toBe(8);
    expect(map[5]).toBe(9);
    expect(map.length).toBe(16);
  });

  it("mixed formatting", () => {
    const rendered = "bold with a link and italic";
    const source = "**bold** with [a link](url) and *italic*";
    const map = buildRenderedToSourceMap(rendered, source);
    expect(map.length).toBe(rendered.length + 1);
    expect(map[0]).toBe(2);
  });

  it("image: maps into alt text", () => {
    const map = buildRenderedToSourceMap("alt", "![alt](url)");
    expect(map).toEqual([2, 3, 4, 5]);
  });
});

describe("cleanOffsetToOriginal", () => {
  it("zero annotations: identity", () => {
    expect(cleanOffsetToOriginal(5, [], 0)).toBe(5);
  });

  it("one annotation before target: shifts correctly", () => {
    const annotations = [{ text: "hi", comment: "note", sourceStart: 0, sourceEnd: 18 }];
    const syntaxLen = 18 - 2;
    expect(cleanOffsetToOriginal(5, annotations, 0)).toBe(5 + syntaxLen);
  });

  it("annotation after target: no shift", () => {
    const annotations = [{ text: "hi", comment: "note", sourceStart: 100, sourceEnd: 118 }];
    expect(cleanOffsetToOriginal(5, annotations, 0)).toBe(5);
  });

  it("multiple annotations: cumulative shift", () => {
    const annotations = [
      { text: "a", comment: "1", sourceStart: 0, sourceEnd: 14 },
      { text: "b", comment: "2", sourceStart: 15, sourceEnd: 29 },
    ];
    const shift1 = 14 - 1;
    const shift2 = 14 - 1;
    expect(cleanOffsetToOriginal(10, annotations, 0)).toBe(10 + shift1 + shift2);
  });
});
