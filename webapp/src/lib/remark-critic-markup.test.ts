import { describe, it, expect } from "vitest";

import {
  extractAnnotationsFromMarkdown,
  stripCriticMarkup,
  getStrippedAnnotationRanges,
} from "./remark-critic-markup";

describe("extractAnnotationsFromMarkdown", () => {
  it("returns correct text, comment, sourceStart, sourceEnd", () => {
    const md = "Hello {==world==}{>>greeting<<} end";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("world");
    expect(annotations[0].comment).toBe("greeting");
    expect(annotations[0].sourceStart).toBe(6);
    expect(annotations[0].sourceEnd).toBe(31);
  });

  it("returns empty array with no annotations", () => {
    expect(extractAnnotationsFromMarkdown("plain text")).toEqual([]);
  });

  it("returns all annotations with multiple", () => {
    const md = "{==a==}{>>1<<} {==b==}{>>2<<}";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].text).toBe("a");
    expect(annotations[1].text).toBe("b");
  });

  it("processes annotations inside inline code", () => {
    const md = "`{==code==}{>>note<<}` end";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("code");
  });

  it("processes annotations wrapping inline code", () => {
    const md = "{==`code`==}{>>note<<} end";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("`code`");
  });

  it("processes annotations inside fenced code blocks", () => {
    const md = "```\n{==code==}{>>note<<}\n``` {==real==}{>>ann<<}";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].text).toBe("code");
    expect(annotations[1].text).toBe("real");
  });
});

describe("stripCriticMarkup", () => {
  it("removes CriticMarkup syntax, keeps text", () => {
    expect(stripCriticMarkup("Hello {==world==}{>>note<<} end")).toBe("Hello world end");
  });

  it("returns input unchanged with no annotations", () => {
    expect(stripCriticMarkup("plain text")).toBe("plain text");
  });

  it("strips multiple annotations", () => {
    expect(stripCriticMarkup("{==a==}{>>1<<} and {==b==}{>>2<<}")).toBe("a and b");
  });

  it("strips annotations inside inline code", () => {
    expect(stripCriticMarkup("`{==CLAUDE==}{>>note<<}.md`")).toBe("`CLAUDE.md`");
  });

  it("strips annotations inside inline code with trailing text", () => {
    expect(stripCriticMarkup("`{==downgrade==}{>>show<<}()`")).toBe("`downgrade()`");
  });
});

describe("getStrippedAnnotationRanges", () => {
  it("returns correct positions for single annotation", () => {
    const md = "Hello {==world==}{>>note<<} end";
    const ranges = getStrippedAnnotationRanges(md);
    expect(ranges).toHaveLength(1);
    const stripped = stripCriticMarkup(md);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("world");
  });

  it("returns correct positions for multiple annotations", () => {
    const md = "{==a==}{>>1<<} {==b==}{>>2<<}";
    const ranges = getStrippedAnnotationRanges(md);
    expect(ranges).toHaveLength(2);
    const stripped = stripCriticMarkup(md);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("a");
    expect(stripped.slice(ranges[1].strippedStart, ranges[1].strippedEnd)).toBe("b");
  });

  it("returns empty for no annotations", () => {
    expect(getStrippedAnnotationRanges("plain text")).toHaveLength(0);
  });

  it("returns correct positions for annotations inside inline code", () => {
    const md = "`{==CLAUDE==}{>>note<<}.md`";
    const ranges = getStrippedAnnotationRanges(md);
    expect(ranges).toHaveLength(1);
    const stripped = stripCriticMarkup(md);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("CLAUDE");
  });
});
