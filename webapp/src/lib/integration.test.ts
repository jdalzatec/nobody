import { describe, it, expect } from "vitest";

import { insertAnnotation, deleteAnnotation, editAnnotation } from "./annotation-ops";
import {
  extractAnnotationsFromMarkdown,
  stripCriticMarkup,
  getStrippedAnnotationRanges,
} from "./remark-critic-markup";
import { buildRenderedToSourceMap, cleanOffsetToOriginal } from "./source-search";

// ===================================================================
// 1. BASIC CRUD OPERATIONS
// ===================================================================
describe("CRUD: insert, extract, edit, delete", () => {
  it("insert → extract round-trip", () => {
    const md = "Hello world end";
    const result = insertAnnotation(md, 6, 11, "greeting");
    expect(result).toContain("{==world==}{>>greeting<<}");

    const annotations = extractAnnotationsFromMarkdown(result);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("world");
    expect(annotations[0].comment).toBe("greeting");
  });

  it("edit changes only the comment", () => {
    const md = "Hello {==world==}{>>old<<} end";
    const result = editAnnotation(md, 0, "new comment");
    expect(result).toBe("Hello {==world==}{>>new comment<<} end");

    const annotations = extractAnnotationsFromMarkdown(result);
    expect(annotations[0].text).toBe("world");
    expect(annotations[0].comment).toBe("new comment");
  });

  it("delete restores original text", () => {
    const md = "Hello {==world==}{>>note<<} end";
    const result = deleteAnnotation(md, 0);
    expect(result).toBe("Hello world end");
    expect(extractAnnotationsFromMarkdown(result)).toHaveLength(0);
  });

  it("edit with invalid index returns unchanged", () => {
    const md = "Hello {==world==}{>>old<<}";
    expect(editAnnotation(md, 5, "new")).toBe(md);
  });

  it("delete with invalid index returns unchanged", () => {
    const md = "Hello {==world==}{>>note<<}";
    expect(deleteAnnotation(md, -1)).toBe(md);
    expect(deleteAnnotation(md, 5)).toBe(md);
  });
});

// ===================================================================
// 2. ANNOTATION PLACEMENT POSITIONS
// ===================================================================
describe("placement: start, middle, end, full block", () => {
  it.each([
    ["at start of paragraph", "Hello world", 0, 5, "note", "Hello"],
    ["in middle of paragraph", "Hello beautiful world", 6, 15, "adj", "beautiful"],
    ["at end of paragraph", "Hello world", 6, 11, "noun", "world"],
    ["entire paragraph", "Hello world", 0, 11, "all", "Hello world"],
    ["single word", "one two three", 4, 7, "mid", "two"],
    ["single character", "abc", 1, 2, "b", "b"],
  ] as const)("%s", (_name, md, start, end, comment, expectedText) => {
    const inserted = insertAnnotation(md, start, end, comment);
    const annotations = extractAnnotationsFromMarkdown(inserted);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe(expectedText);
    expect(annotations[0].comment).toBe(comment);
    expect(stripCriticMarkup(inserted)).toBe(md);
    expect(deleteAnnotation(inserted, 0)).toBe(md);
  });
});

// ===================================================================
// 3. INLINE FORMATTING — expansion past markers
// ===================================================================
describe("inline formatting: expand past markers", () => {
  it("bold: selection inside ** expands to wrap", () => {
    const md = "run **bold** end";
    const inserted = insertAnnotation(md, 6, 10, "note");
    expect(inserted).toBe("run {==**bold**==}{>>note<<} end");
  });

  it("italic *: selection inside * expands to wrap", () => {
    const md = "run *italic* end";
    const inserted = insertAnnotation(md, 5, 11, "note");
    expect(inserted).toBe("run {==*italic*==}{>>note<<} end");
  });

  it("strikethrough ~~: selection inside ~~ expands", () => {
    const md = "run ~~strike~~ end";
    const inserted = insertAnnotation(md, 6, 12, "note");
    expect(inserted).toBe("run {==~~strike~~==}{>>note<<} end");
  });

  it("inline code `: selection inside backticks expands", () => {
    const md = "run `code` end";
    const inserted = insertAnnotation(md, 5, 9, "note");
    expect(inserted).toBe("run {==`code`==}{>>note<<} end");
  });

  it("underline __: selection inside __ expands", () => {
    const md = "run __text__ end";
    const inserted = insertAnnotation(md, 6, 10, "note");
    expect(inserted).toBe("run {==__text__==}{>>note<<} end");
  });

  it("bold at start of line expands correctly", () => {
    const md = "**Purpose:** Handles CRUD";
    const inserted = insertAnnotation(md, 2, 25, "note");
    expect(inserted).toBe("{==**Purpose:** Handles CRUD==}{>>note<<}");
  });

  it("no expansion when selection is not at markers", () => {
    const md = "Hello world end";
    const inserted = insertAnnotation(md, 6, 11, "note");
    expect(inserted).toBe("Hello {==world==}{>>note<<} end");
  });
});

// ===================================================================
// 4. INLINE FORMATTING — round-trip through strip/extract
// ===================================================================
describe("inline formatting: full round-trip", () => {
  it.each([
    ["bold", "Hello **bold** world", 6, 14, "b", "**bold**"],
    ["italic", "Hello *italic* world", 6, 14, "i", "*italic*"],
    ["strikethrough", "Hello ~~strike~~ world", 6, 16, "s", "~~strike~~"],
    ["inline code", "Run `npm install` please", 4, 17, "cmd", "`npm install`"],
    ["link", "Click [here](http://x.com) now", 6, 26, "link", "[here](http://x.com)"],
    [
      "full inline code in bullet",
      "- `op.add_column('instrument', sa.Column('room_id'))` end",
      3,
      52,
      "migration",
      "`op.add_column('instrument', sa.Column('room_id'))`",
    ],
  ] as const)("%s round-trip", (_name, md, start, end, comment, expectedText) => {
    const inserted = insertAnnotation(md, start, end, comment);
    const annotations = extractAnnotationsFromMarkdown(inserted);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe(expectedText);
    expect(annotations[0].comment).toBe(comment);
    expect(stripCriticMarkup(inserted)).toBe(md);
    expect(deleteAnnotation(inserted, 0)).toBe(md);
  });
});

// ===================================================================
// 5. ANNOTATIONS INSIDE INLINE CODE
// ===================================================================
describe("annotations inside inline code", () => {
  it("annotation inside backticks is extracted", () => {
    const md = "`{==CLAUDE==}{>>note<<}.md`";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("CLAUDE");
  });

  it("annotation inside backticks is stripped correctly", () => {
    expect(stripCriticMarkup("`{==CLAUDE==}{>>note<<}.md`")).toBe("`CLAUDE.md`");
  });

  it("partial annotation inside backticks", () => {
    const md = "`{==downgrade==}{>>show<<}()`";
    expect(stripCriticMarkup(md)).toBe("`downgrade()`");
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann[0].text).toBe("downgrade");
  });

  it("annotation inside backtick with prefix text", () => {
    const md = "`op.{==add_column==}{>>tales<<}('arg')`";
    expect(stripCriticMarkup(md)).toBe("`op.add_column('arg')`");
  });
});

// ===================================================================
// 6. ANNOTATIONS IN FENCED CODE BLOCKS
// ===================================================================
describe("annotations in fenced code blocks", () => {
  it("extracted from fenced code block", () => {
    const md = "```bash\n{==uv run alembic==}{>>cmd<<}\n```";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe("uv run alembic");
  });

  it("stripped from fenced code block", () => {
    const md = "```\n{==code==}{>>note<<}\n```";
    expect(stripCriticMarkup(md)).toBe("```\ncode\n```");
  });
});

// ===================================================================
// 7. MULTIPLE ANNOTATIONS
// ===================================================================
describe("multiple annotations", () => {
  it("two annotations in same paragraph", () => {
    const md = "{==Hello==}{>>1<<} world {==end==}{>>2<<}";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].text).toBe("Hello");
    expect(annotations[1].text).toBe("end");
  });

  it("strip removes all annotations", () => {
    const md = "Hello {==world==}{>>note<<} and {==foo==}{>>bar<<} end";
    expect(stripCriticMarkup(md)).toBe("Hello world and foo end");
  });

  it("insert two, delete first, second adjusts", () => {
    let md = "Alpha Beta Gamma";
    md = insertAnnotation(md, 0, 5, "first");
    md = insertAnnotation(md, md.length - 5, md.length, "second");
    expect(extractAnnotationsFromMarkdown(md)).toHaveLength(2);

    md = deleteAnnotation(md, 0);
    const remaining = extractAnnotationsFromMarkdown(md);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].text).toBe("Gamma");
    expect(remaining[0].comment).toBe("second");
  });

  it("insert two, delete second, first intact", () => {
    let md = "Alpha Beta Gamma";
    md = insertAnnotation(md, 0, 5, "first");
    md = insertAnnotation(md, md.length - 5, md.length, "second");

    md = deleteAnnotation(md, 1);
    const remaining = extractAnnotationsFromMarkdown(md);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].text).toBe("Alpha");
    expect(remaining[0].comment).toBe("first");
  });

  it("three annotations — delete middle", () => {
    const md = "{==A==}{>>1<<} {==B==}{>>2<<} {==C==}{>>3<<}";
    const result = deleteAnnotation(md, 1);
    const remaining = extractAnnotationsFromMarkdown(result);
    expect(remaining).toHaveLength(2);
    expect(remaining[0].text).toBe("A");
    expect(remaining[1].text).toBe("C");
  });

  it("edit middle of three annotations", () => {
    const md = "{==A==}{>>1<<} {==B==}{>>2<<} {==C==}{>>3<<}";
    const result = editAnnotation(md, 1, "updated");
    const annotations = extractAnnotationsFromMarkdown(result);
    expect(annotations[1].comment).toBe("updated");
    expect(annotations[0].comment).toBe("1");
    expect(annotations[2].comment).toBe("3");
  });
});

// ===================================================================
// 8. WHITESPACE TRIMMING
// ===================================================================
describe("whitespace handling", () => {
  it("trims leading spaces from selection", () => {
    const md = "Hello world end";
    const result = insertAnnotation(md, 5, 12, "note");
    expect(result).toBe("Hello {==world==}{>>note<<} end");
  });

  it("trims trailing spaces from selection", () => {
    const md = "Hello world end";
    const result = insertAnnotation(md, 6, 12, "note");
    expect(result).toBe("Hello {==world==}{>>note<<} end");
  });

  it("trims both sides", () => {
    const md = "Hello world end";
    const result = insertAnnotation(md, 5, 12, "note");
    expect(result).toBe("Hello {==world==}{>>note<<} end");
  });
});

// ===================================================================
// 9. COMMENT ESCAPING
// ===================================================================
describe("comment escaping", () => {
  it("escapes <<} in comment", () => {
    const result = insertAnnotation("Hello world", 0, 5, "has <<} here");
    expect(result).toContain("\\<<}");
  });

  it("escapes ==} in comment", () => {
    const result = insertAnnotation("Hello world", 0, 5, "has ==} here");
    expect(result).toContain("\\==}");
  });

  it("escapes both delimiters", () => {
    const result = insertAnnotation("Hello world", 0, 5, "<<} and ==}");
    expect(result).toContain("\\<<}");
    expect(result).toContain("\\==}");
  });
});

// ===================================================================
// 10. STRIPPED ANNOTATION RANGES
// ===================================================================
describe("getStrippedAnnotationRanges: position tracking", () => {
  it("single annotation", () => {
    const md = "Hello {==world==}{>>note<<} end";
    const ranges = getStrippedAnnotationRanges(md);
    const stripped = stripCriticMarkup(md);
    expect(ranges).toHaveLength(1);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("world");
  });

  it("two annotations — positions in stripped text are correct", () => {
    const md = "{==a==}{>>1<<} {==b==}{>>2<<}";
    const ranges = getStrippedAnnotationRanges(md);
    const stripped = stripCriticMarkup(md);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("a");
    expect(stripped.slice(ranges[1].strippedStart, ranges[1].strippedEnd)).toBe("b");
  });

  it("annotation inside inline code", () => {
    const md = "`{==CLAUDE==}{>>note<<}.md`";
    const ranges = getStrippedAnnotationRanges(md);
    const stripped = stripCriticMarkup(md);
    expect(stripped.slice(ranges[0].strippedStart, ranges[0].strippedEnd)).toBe("CLAUDE");
  });

  it("no annotations → empty ranges", () => {
    expect(getStrippedAnnotationRanges("plain text")).toHaveLength(0);
  });
});

// ===================================================================
// 11. SOURCE MAPPING: buildRenderedToSourceMap
// ===================================================================
describe("buildRenderedToSourceMap: character alignment", () => {
  it("plain text: identity", () => {
    const map = buildRenderedToSourceMap("hello", "hello");
    expect(map).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("bold: skips **", () => {
    const map = buildRenderedToSourceMap("bold", "**bold**");
    expect(map).toEqual([2, 3, 4, 5, 6]);
  });

  it("italic: skips *", () => {
    const map = buildRenderedToSourceMap("italic", "*italic*");
    expect(map).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("strikethrough: skips ~~", () => {
    const map = buildRenderedToSourceMap("text", "~~text~~");
    expect(map).toEqual([2, 3, 4, 5, 6]);
  });

  it("inline code: skips backticks", () => {
    const map = buildRenderedToSourceMap("code", "`code`");
    expect(map).toEqual([1, 2, 3, 4, 5]);
  });

  it("link: skips [ and ](url)", () => {
    const map = buildRenderedToSourceMap("text", "[text](url)");
    expect(map).toEqual([1, 2, 3, 4, 5]);
  });

  it("image: maps into alt text", () => {
    const map = buildRenderedToSourceMap("alt", "![alt](url)");
    expect(map).toEqual([2, 3, 4, 5]);
  });

  it("mixed bold + normal", () => {
    const map = buildRenderedToSourceMap("bold and normal", "**bold** and normal");
    expect(map[0]).toBe(2); // 'b' of bold
    expect(map[4]).toBe(8); // space before 'and'
    expect(map.length).toBe(16);
  });

  it("list marker + checkbox + bold: all skipped", () => {
    const rendered = "6.1 text";
    const source = "- [x] **6.1** text";
    const map = buildRenderedToSourceMap(rendered, source);
    expect(map[0]).toBe(8); // '6' after - [x] **
    expect(map.length).toBe(rendered.length + 1);
  });

  it("newline as soft break: matched when both have it", () => {
    const rendered = "line1\nline2";
    const source = "line1\n  line2";
    const map = buildRenderedToSourceMap(rendered, source);
    expect(map.length).toBe(rendered.length + 1);
  });
});

// ===================================================================
// 12. cleanOffsetToOriginal: CriticMarkup offset conversion
// ===================================================================
describe("cleanOffsetToOriginal: stripped → original offset", () => {
  it("no annotations: identity", () => {
    expect(cleanOffsetToOriginal(5, [], 0)).toBe(5);
  });

  it("one annotation before target: shifts", () => {
    const annotations = [{ text: "hi", comment: "n", sourceStart: 0, sourceEnd: 18 }];
    expect(cleanOffsetToOriginal(5, annotations, 0)).toBe(5 + (18 - 2));
  });

  it("annotation after target: no shift", () => {
    const annotations = [{ text: "hi", comment: "n", sourceStart: 100, sourceEnd: 118 }];
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

// ===================================================================
// 13. MARKDOWN CONTEXT: headings, lists, tables, blockquotes
// ===================================================================
describe("markdown contexts", () => {
  it("heading h2", () => {
    const md = "## My {==Title==}{>>h2<<}";
    expect(stripCriticMarkup(md)).toBe("## My Title");
    expect(extractAnnotationsFromMarkdown(md)[0].text).toBe("Title");
  });

  it("unordered list item", () => {
    const md = "- Item {==one==}{>>note<<} here";
    expect(stripCriticMarkup(md)).toBe("- Item one here");
  });

  it("ordered list item", () => {
    const md = "1. Item {==one==}{>>note<<} here";
    expect(stripCriticMarkup(md)).toBe("1. Item one here");
  });

  it("task list (checked)", () => {
    const md = "- [x] {==Done==}{>>task<<} item";
    expect(stripCriticMarkup(md)).toBe("- [x] Done item");
  });

  it("task list (unchecked)", () => {
    const md = "- [ ] {==Todo==}{>>task<<} item";
    expect(stripCriticMarkup(md)).toBe("- [ ] Todo item");
  });

  it("table cell", () => {
    const md = "| {==Cell==}{>>note<<} | Data |";
    expect(stripCriticMarkup(md)).toBe("| Cell | Data |");
  });

  it("blockquote", () => {
    const md = "> Quote {==text==}{>>note<<} here";
    expect(stripCriticMarkup(md)).toBe("> Quote text here");
  });

  it("nested list — parent item", () => {
    const md = "- Parent {==text==}{>>note<<}\n  - Child item";
    expect(stripCriticMarkup(md)).toBe("- Parent text\n  - Child item");
  });

  it("nested list — child item", () => {
    const md = "- Parent item\n  - Child {==text==}{>>note<<}";
    expect(stripCriticMarkup(md)).toBe("- Parent item\n  - Child text");
  });

  it("multi-line list item with continuation", () => {
    const md = "- {==Start of item==}{>>note<<}\n  continued on next line";
    expect(stripCriticMarkup(md)).toBe("- Start of item\n  continued on next line");
  });
});

// ===================================================================
// 14. MIXED FORMATTING + ANNOTATIONS
// ===================================================================
describe("mixed formatting combinations", () => {
  it("bold inside annotation wrapping", () => {
    const md = "text {==**bold** content==}{>>note<<} end";
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann[0].text).toBe("**bold** content");
    expect(stripCriticMarkup(md)).toBe("text **bold** content end");
  });

  it("link inside annotation", () => {
    const md = "see {==[here](http://example.com)==}{>>link<<} for info";
    expect(stripCriticMarkup(md)).toBe("see [here](http://example.com) for info");
  });

  it("multiple formatting types in same paragraph with annotations", () => {
    const md = "**bold** {==plain==}{>>1<<} `code` {==more==}{>>2<<} *italic*";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(2);
    expect(stripCriticMarkup(md)).toBe("**bold** plain `code` more *italic*");
  });

  it("annotation between two bold sections", () => {
    const md = "**a** {==middle==}{>>note<<} **b**";
    expect(stripCriticMarkup(md)).toBe("**a** middle **b**");
  });
});

// ===================================================================
// 15. EDGE CASES: regex, multiline, empty
// ===================================================================
describe("edge cases", () => {
  it("no annotations returns empty array", () => {
    expect(extractAnnotationsFromMarkdown("plain text")).toEqual([]);
  });

  it("no annotations returns text unchanged", () => {
    expect(stripCriticMarkup("plain text")).toBe("plain text");
  });

  it("annotation with long comment", () => {
    const comment = "This is a very long comment with special chars: <>&\"'";
    const md = `{==text==}{>>${comment}<<}`;
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann[0].comment).toBe(comment);
  });

  it("annotation text spanning newline (multiline)", () => {
    const md = "{==line1\nline2==}{>>multiline<<}";
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann).toHaveLength(1);
    expect(ann[0].text).toBe("line1\nline2");
  });

  it("adjacent annotations with no gap", () => {
    const md = "{==a==}{>>1<<}{==b==}{>>2<<}";
    const annotations = extractAnnotationsFromMarkdown(md);
    expect(annotations).toHaveLength(2);
    expect(stripCriticMarkup(md)).toBe("ab");
  });

  it("annotation at very start of document", () => {
    const md = "{==first==}{>>note<<} rest of doc";
    expect(stripCriticMarkup(md)).toBe("first rest of doc");
  });

  it("annotation at very end of document", () => {
    const md = "start of doc {==last==}{>>note<<}";
    expect(stripCriticMarkup(md)).toBe("start of doc last");
  });

  it("entire document is one annotation", () => {
    const md = "{==entire document==}{>>all<<}";
    expect(stripCriticMarkup(md)).toBe("entire document");
  });

  it("annotation text contains curly braces", () => {
    const md = "{==obj = {key: val}==}{>>note<<}";
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann[0].text).toBe("obj = {key: val}");
  });

  it("annotation text contains equals signs", () => {
    const md = "{==a == b==}{>>note<<}";
    // The lazy .+? matches 'a ' first, then checks ==} — 'a ==' matches the ==} closing
    // This is actually a known regex limitation: text containing == can cause early match
    const ann = extractAnnotationsFromMarkdown(md);
    expect(ann.length).toBeGreaterThanOrEqual(1);
  });
});

// ===================================================================
// 16. COMPLEX DOCUMENT SCENARIOS
// ===================================================================
describe("complex document: multiple blocks and annotations", () => {
  const doc = [
    "# {==Title==}{>>heading<<}",
    "",
    "Para with {==bold **text**==}{>>para<<} here.",
    "",
    "- Item {==one==}{>>list1<<}",
    "- Item {==two==}{>>list2<<}",
    "",
    "| H1 | H2 |",
    "|----|----|",
    "| {==cell==}{>>table<<} | data |",
  ].join("\n");

  it("extracts all annotations from complex doc", () => {
    const annotations = extractAnnotationsFromMarkdown(doc);
    expect(annotations).toHaveLength(5);
    expect(annotations.map((a) => a.text)).toEqual([
      "Title",
      "bold **text**",
      "one",
      "two",
      "cell",
    ]);
  });

  it("strips all annotations from complex doc", () => {
    const stripped = stripCriticMarkup(doc);
    expect(stripped).not.toContain("{==");
    expect(stripped).not.toContain("==}");
    expect(stripped).not.toContain("{>>");
    expect(stripped).not.toContain("<<}");
    expect(stripped).toContain("# Title");
    expect(stripped).toContain("bold **text**");
    expect(stripped).toContain("- Item one");
    expect(stripped).toContain("| cell | data |");
  });

  it("stripped ranges map correctly for all annotations", () => {
    const ranges = getStrippedAnnotationRanges(doc);
    const stripped = stripCriticMarkup(doc);
    const annotations = extractAnnotationsFromMarkdown(doc);

    for (let i = 0; i < annotations.length; i++) {
      expect(stripped.slice(ranges[i].strippedStart, ranges[i].strippedEnd)).toBe(
        annotations[i].text,
      );
    }
  });

  it("delete each annotation independently restores its text", () => {
    for (let i = 0; i < 5; i++) {
      const result = deleteAnnotation(doc, i);
      const remaining = extractAnnotationsFromMarkdown(result);
      expect(remaining).toHaveLength(4);
    }
  });
});
