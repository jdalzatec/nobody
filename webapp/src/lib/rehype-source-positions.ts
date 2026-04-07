import { visit } from "unist-util-visit";

import type { Root, Element } from "hast";

const BLOCK_ELEMENTS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "pre",
  "table",
  "tr",
  "td",
  "th",
  "div",
  "section",
  "article",
]);

/**
 * Rehype plugin that stamps `data-start`, `data-end`, and `data-block-id`
 * attributes on HTML elements based on their source positions in the markdown.
 */
export default function rehypeSourcePositions() {
  return (tree: Root) => {
    let blockId = 0;

    visit(tree, "element", (node: Element) => {
      const pos = node.position;
      if (!pos) return;

      node.properties["data-start"] = pos.start.offset;
      node.properties["data-end"] = pos.end.offset;

      if (BLOCK_ELEMENTS.has(node.tagName)) {
        node.properties["data-block-id"] = String(blockId);
        blockId++;
      }
    });
  };
}
