import { extractAnnotationsFromMarkdown, stripCriticMarkup } from "./remark-critic-markup";

import type { ExtractedAnnotation } from "./remark-critic-markup";

/** Walk up from `node` to find the nearest ancestor with a `data-block-id` attribute. */
export function findBlockElement(node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute("data-block-id")) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

/** Extract the markdown source slice for a block element using its data-start/data-end attributes. */
export function getBlockSource(
  blockElement: HTMLElement,
  markdownSource: string,
): { slice: string; start: number } | null {
  const startAttr = blockElement.getAttribute("data-start");
  const endAttr = blockElement.getAttribute("data-end");
  if (startAttr === null || endAttr === null) return null;
  const start = Number(startAttr);
  const end = Number(endAttr);
  return { slice: markdownSource.slice(start, end), start };
}

/**
 * Build an array mapping each rendered-text index to its corresponding
 * source-text index using a two-pointer character walk.
 */
export function buildRenderedToSourceMap(renderedText: string, sourceText: string): number[] {
  const map: number[] = [];
  let si = 0;
  let ri = 0;

  while (ri < renderedText.length && si < sourceText.length) {
    if (sourceText[si] === renderedText[ri]) {
      map.push(si);
      si++;
      ri++;
    } else {
      si++;
    }
  }

  map.push(si);
  return map;
}

/**
 * Compute the character offset of a Range edge (start or end) relative
 * to the block element's text content.
 */
export function computeRenderedOffset(
  blockElement: HTMLElement,
  range: Range,
  edge: "start" | "end",
): number {
  const tempRange = document.createRange();
  tempRange.setStart(blockElement, 0);
  if (edge === "start") {
    tempRange.setEnd(range.startContainer, range.startOffset);
  } else {
    tempRange.setEnd(range.endContainer, range.endOffset);
  }
  return tempRange.toString().length;
}

/**
 * Convert an offset in the CriticMarkup-stripped source back to the
 * corresponding offset in the original source by accounting for the
 * syntax characters removed during stripping.
 */
export function cleanOffsetToOriginal(
  cleanOffset: number,
  annotations: ExtractedAnnotation[],
  blockStart: number,
): number {
  let shift = 0;
  for (const ann of annotations) {
    const relStart = ann.sourceStart - blockStart;
    const textLen = ann.text.length;
    const fullLen = ann.sourceEnd - ann.sourceStart;
    const syntaxLen = fullLen - textLen;

    const cleanAnnStart = relStart - shift;
    if (cleanAnnStart >= cleanOffset) break;

    shift += syntaxLen;
  }
  return cleanOffset + shift;
}

/**
 * When a block element (e.g. <li>) contains child block elements (e.g. a
 * nested <ul>), the textContent includes text from those children with
 * extra whitespace that doesn't exist in the source markdown. Restrict the
 * effective source range to end where the first child block begins.
 */
function getEffectiveBlockEnd(
  blockElement: HTMLElement,
  blockStart: number,
  blockEnd: number,
): number {
  const childBlock = blockElement.querySelector("[data-block-id]");
  if (!childBlock) return blockEnd;

  const childStartAttr = childBlock.getAttribute("data-start");
  if (childStartAttr === null) return blockEnd;
  const childStart = Number(childStartAttr);
  if (childStart > blockStart && childStart < blockEnd) {
    return childStart;
  }
  return blockEnd;
}

/**
 * Get the textContent of a block element excluding text from child block
 * elements (e.g. nested list items).
 */
function getDirectTextContent(blockElement: HTMLElement): string {
  const childBlock = blockElement.querySelector("[data-block-id]");
  if (!childBlock) return blockElement.textContent || "";

  // Walk text nodes, stop when we reach a child block element
  const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT);
  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    // Check if this text node is inside a child block element
    let ancestor: Node | null = node.parentNode;
    let insideChildBlock = false;
    while (ancestor && ancestor !== blockElement) {
      if (ancestor instanceof HTMLElement && ancestor.hasAttribute("data-block-id")) {
        insideChildBlock = true;
        break;
      }
      ancestor = ancestor.parentNode;
    }
    if (insideChildBlock) break;
    text += node.textContent ?? "";
  }
  // Trim trailing whitespace — the DOM inserts extra newlines between
  // the inline content and child block elements (e.g. <ul>) that don't
  // exist in the markdown source.
  return text.replace(/\s+$/, "");
}

/**
 * Map a DOM selection Range back to start/end offsets in the markdown source.
 * Handles the rendered → source offset conversion including CriticMarkup syntax.
 */
export function findSelectedTextInSource(
  range: Range,
  blockElement: HTMLElement,
  markdownSource: string,
): { start: number; end: number } | null {
  const blockSource = getBlockSource(blockElement, markdownSource);
  if (!blockSource) return null;

  const bStart = Number(blockElement.getAttribute("data-start"));
  const bEnd = Number(blockElement.getAttribute("data-end"));

  // Restrict to the direct content (exclude child blocks like nested lists)
  const effectiveEnd = getEffectiveBlockEnd(blockElement, bStart, bEnd);
  const effectiveSlice = markdownSource.slice(bStart, effectiveEnd);

  const blockAnnotations = extractAnnotationsFromMarkdown(effectiveSlice).map((a) => ({
    ...a,
    sourceStart: a.sourceStart + bStart,
    sourceEnd: a.sourceEnd + bStart,
  }));

  const cleanSource = stripCriticMarkup(effectiveSlice);
  const renderedText = getDirectTextContent(blockElement);

  const sourceMap = buildRenderedToSourceMap(renderedText, cleanSource);
  if (sourceMap.length <= renderedText.length) return null;

  const renderedStart = computeRenderedOffset(blockElement, range, "start");
  const renderedEnd = computeRenderedOffset(blockElement, range, "end");

  if (renderedStart >= sourceMap.length || renderedEnd >= sourceMap.length) return null;

  const cleanStart = sourceMap[renderedStart];
  const cleanEnd = sourceMap[renderedEnd];

  const originalStart = cleanOffsetToOriginal(cleanStart, blockAnnotations, bStart);
  const originalEnd = cleanOffsetToOriginal(cleanEnd, blockAnnotations, bStart);

  return {
    start: bStart + originalStart,
    end: bStart + originalEnd,
  };
}
