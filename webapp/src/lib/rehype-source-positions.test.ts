import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, it, expect } from "vitest";

import rehypeSourcePositions from "./rehype-source-positions";

async function renderMarkdown(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSourcePositions)
    .use(rehypeStringify)
    .process(md);
  return String(result);
}

describe("rehypeSourcePositions", () => {
  it("stamps data-start, data-end, data-block-id on a paragraph", async () => {
    const html = await renderMarkdown("Hello world");
    expect(html).toContain("data-start=");
    expect(html).toContain("data-end=");
    expect(html).toContain('data-block-id="0"');
  });

  it("inline elements get data-start/data-end but not data-block-id", async () => {
    const html = await renderMarkdown("Hello **bold** world");
    expect(html).toMatch(/<strong data-start="\d+" data-end="\d+"/);
    expect(html).not.toMatch(/<strong[^>]*data-block-id/);
  });

  it("multiple blocks get incrementing data-block-id", async () => {
    const html = await renderMarkdown("First\n\nSecond\n\nThird");
    expect(html).toContain('data-block-id="0"');
    expect(html).toContain('data-block-id="1"');
    expect(html).toContain('data-block-id="2"');
  });

  it("nested block elements each get their own data-block-id", async () => {
    const html = await renderMarkdown("- item one\n- item two");
    const matches = html.match(/data-block-id/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
