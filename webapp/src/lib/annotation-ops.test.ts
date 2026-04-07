import { describe, it, expect } from "vitest";

import { insertAnnotation, deleteAnnotation, editAnnotation } from "./annotation-ops";

describe("insertAnnotation", () => {
  it("inserts at start of paragraph", () => {
    const result = insertAnnotation("Hello world", 0, 5, "greeting");
    expect(result).toBe("{==Hello==}{>>greeting<<} world");
  });

  it("inserts at middle of paragraph", () => {
    const result = insertAnnotation("Hello beautiful world", 6, 15, "adj");
    expect(result).toBe("Hello {==beautiful==}{>>adj<<} world");
  });

  it("inserts at end of paragraph", () => {
    const result = insertAnnotation("Hello world", 6, 11, "noun");
    expect(result).toBe("Hello {==world==}{>>noun<<}");
  });

  it("preserves bold syntax in selection", () => {
    const md = "Hello **bold** world";
    const result = insertAnnotation(md, 6, 14, "note");
    expect(result).toBe("Hello {==**bold**==}{>>note<<} world");
  });

  it("preserves link syntax in selection", () => {
    const md = "Hello [link](http://x.com) world";
    const result = insertAnnotation(md, 6, 26, "note");
    expect(result).toBe("Hello {==[link](http://x.com)==}{>>note<<} world");
  });

  it("trims whitespace from boundaries", () => {
    const result = insertAnnotation("Hello world end", 5, 12, "note");
    expect(result).toBe("Hello {==world==}{>>note<<} end");
  });

  it("expands past bold markers when start is inside bold", () => {
    // User selects "Purpose:" which is inside **Purpose:**
    // Start offset 2 is right after **, end offset 40 is outside bold
    const md = "**Purpose:** Handles all CRUD operations";
    const result = insertAnnotation(md, 2, 40, "note");
    expect(result).toBe("{==**Purpose:** Handles all CRUD operations==}{>>note<<}");
  });

  it("expands past backtick when start is inside inline code", () => {
    // User selects "code" which is inside `code`
    const md = "run `code` end";
    const result = insertAnnotation(md, 5, 9, "note");
    expect(result).toBe("run {==`code`==}{>>note<<} end");
  });

  it("does not expand when formatting is not split", () => {
    const md = "Hello world end";
    const result = insertAnnotation(md, 6, 11, "note");
    expect(result).toBe("Hello {==world==}{>>note<<} end");
  });

  it("escapes dangerous chars in comment", () => {
    const result = insertAnnotation("Hello world", 0, 5, "has <<} and ==}");
    expect(result).toContain("\\<<}");
    expect(result).toContain("\\==}");
  });
});

describe("deleteAnnotation", () => {
  it("restores original text", () => {
    const md = "Hello {==world==}{>>note<<} end";
    expect(deleteAnnotation(md, 0)).toBe("Hello world end");
  });

  it("returns unchanged with invalid index", () => {
    const md = "Hello {==world==}{>>note<<}";
    expect(deleteAnnotation(md, 5)).toBe(md);
  });
});

describe("editAnnotation", () => {
  it("changes only the comment", () => {
    const md = "Hello {==world==}{>>old<<} end";
    const result = editAnnotation(md, 0, "new");
    expect(result).toBe("Hello {==world==}{>>new<<} end");
  });

  it("returns unchanged with invalid index", () => {
    const md = "Hello {==world==}{>>old<<}";
    expect(editAnnotation(md, 5, "new")).toBe(md);
  });
});
