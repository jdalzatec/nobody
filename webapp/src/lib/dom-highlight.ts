import {
  extractAnnotationsFromMarkdown,
  getStrippedAnnotationRanges,
  stripCriticMarkup,
} from "./remark-critic-markup";

/**
 * Build a map from source offsets to rendered-text offsets.
 * The source still contains markdown formatting (**, `, etc.) but NOT
 * CriticMarkup. The rendered text is the browser textContent.
 */
function buildSourceToRenderedMap(renderedText: string, sourceText: string): Map<number, number> {
  const map = new Map<number, number>();
  let si = 0;
  let ri = 0;

  while (ri < renderedText.length && si < sourceText.length) {
    if (sourceText[si] === renderedText[ri]) {
      map.set(si, ri);
      si++;
      ri++;
    } else {
      si++;
    }
  }

  return map;
}

/**
 * Walk text nodes inside an element and find the text node + offset
 * for a given rendered-text character offset.
 */
function findTextPosition(
  element: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = 0;
  let lastNode: Text | null = null;

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const len = textNode.textContent.length;
    if (current + len > offset) {
      return { node: textNode, offset: offset - current };
    }
    current += len;
    lastNode = textNode;
  }

  // offset equals total text length — position at end of last node
  if (lastNode && current === offset) {
    return { node: lastNode, offset: lastNode.textContent.length };
  }

  return null;
}

/**
 * Wrap a DOM Range with <mark> elements. Handles ranges that span
 * multiple text nodes by wrapping each segment individually.
 */
function wrapRangeWithMark(range: Range, annotationId: string, comment: string): void {
  const ancestor = range.commonAncestorContainer;
  const root =
    ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as HTMLElement) : ancestor.parentElement;
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (range.intersectsNode(node)) {
      textNodes.push(node as Text);
    }
  }

  for (const textNode of textNodes) {
    let start = 0;
    let end = textNode.textContent.length;

    if (textNode === range.startContainer) start = range.startOffset;
    if (textNode === range.endContainer) end = range.endOffset;

    if (start >= end) continue;

    let target: Text = textNode;
    if (start > 0) {
      target = textNode.splitText(start);
      end -= start;
    }
    if (end < target.textContent.length) {
      target.splitText(end);
    }

    const mark = document.createElement("mark");
    mark.className = "annotation";
    mark.setAttribute("data-annotation-id", annotationId);
    mark.setAttribute("data-comment", comment);
    target.parentNode?.replaceChild(mark, target);
    mark.appendChild(target);
  }
}

/**
 * Look up a source offset in the map. If the exact position is a formatting
 * character (not in the map), search forward to find the first mapped position.
 */
function findRenderedStart(
  map: Map<number, number>,
  sourcePos: number,
  maxSearch: number,
): number | undefined {
  for (let i = sourcePos; i < sourcePos + maxSearch; i++) {
    const r = map.get(i);
    if (r !== undefined) return r;
  }
  return undefined;
}

/**
 * Look up a source offset for the end edge. If the exact position is a
 * formatting character, search backward to find the last mapped position.
 */
function findRenderedEnd(map: Map<number, number>, sourcePos: number): number | undefined {
  for (let i = sourcePos; i >= 0; i--) {
    const r = map.get(i);
    if (r !== undefined) return r + 1;
  }
  return undefined;
}

/**
 * Get the textContent of a block element excluding text from child block
 * elements (e.g. nested list items). Trims trailing whitespace introduced
 * by the DOM between inline content and child block elements.
 */
function getDirectTextContent(blockElement: HTMLElement): string {
  const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT);
  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
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
  return text.replace(/\s+$/, "");
}

/**
 * Apply highlight <mark> elements to the rendered DOM for all annotations.
 * Call this after React renders the stripped markdown.
 */
export function applyHighlights(container: HTMLElement, originalSource: string): void {
  const annotations = extractAnnotationsFromMarkdown(originalSource);
  if (annotations.length === 0) return;

  const strippedSource = stripCriticMarkup(originalSource);
  const strippedRanges = getStrippedAnnotationRanges(originalSource);

  const blocks = container.querySelectorAll<HTMLElement>("[data-block-id]");

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];
    const sr = strippedRanges[i];

    // Find the innermost block element that contains this annotation.
    // Use the smallest range to avoid selecting a parent <li> when a
    // child <li> (sub-bullet) is the correct container.
    let blockEl: HTMLElement | null = null;
    let smallestSize = Infinity;
    for (const block of blocks) {
      const bStart = Number(block.getAttribute("data-start"));
      const bEnd = Number(block.getAttribute("data-end"));
      if (sr.strippedStart >= bStart && sr.strippedEnd <= bEnd) {
        const size = bEnd - bStart;
        if (size < smallestSize) {
          blockEl = block;
          smallestSize = size;
        }
      }
    }
    if (!blockEl) continue;

    const bStart = Number(blockEl.getAttribute("data-start"));
    const bEnd = Number(blockEl.getAttribute("data-end"));

    // If the block has child block elements (e.g. nested list), restrict
    // to the direct content to avoid textContent/source misalignment.
    const childBlock = blockEl.querySelector("[data-block-id]");
    const childStartAttr = childBlock?.getAttribute("data-start");
    const effectiveEnd =
      childStartAttr !== null && childStartAttr !== undefined && Number(childStartAttr) > bStart
        ? Number(childStartAttr)
        : bEnd;
    const blockSource = strippedSource.slice(bStart, effectiveEnd);
    const renderedText = childBlock ? getDirectTextContent(blockEl) : blockEl.textContent || "";

    const sourceToRendered = buildSourceToRenderedMap(renderedText, blockSource);

    const localStart = sr.strippedStart - bStart;
    const localEnd = sr.strippedEnd - bStart;

    const renderedStart = findRenderedStart(
      sourceToRendered,
      localStart,
      blockSource.length - localStart,
    );
    const renderedEnd = findRenderedEnd(sourceToRendered, localEnd - 1);

    if (renderedStart === undefined || renderedEnd === undefined) continue;

    const startPos = findTextPosition(blockEl, renderedStart);
    const endPos = findTextPosition(blockEl, renderedEnd);
    if (!startPos || !endPos) continue;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);

    wrapRangeWithMark(range, String(i), ann.comment);
  }
}

/**
 * Remove all highlight <mark> elements, restoring original text nodes.
 */
export function clearHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll("mark.annotation");
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}

/**
 * Wrap a DOM Range with pending <mark> elements to preview the selection
 * before the annotation is saved.
 */
export function applyPendingHighlight(range: Range): void {
  const ancestor = range.commonAncestorContainer;
  const root =
    ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as HTMLElement) : ancestor.parentElement;
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (range.intersectsNode(node)) {
      textNodes.push(node as Text);
    }
  }

  for (const textNode of textNodes) {
    let start = 0;
    let end = textNode.textContent.length;

    if (textNode === range.startContainer) start = range.startOffset;
    if (textNode === range.endContainer) end = range.endOffset;

    if (start >= end) continue;

    let target: Text = textNode;
    if (start > 0) {
      target = textNode.splitText(start);
      end -= start;
    }
    if (end < target.textContent.length) {
      target.splitText(end);
    }

    const mark = document.createElement("mark");
    mark.className = "annotation-pending";
    target.parentNode?.replaceChild(mark, target);
    mark.appendChild(target);
  }
}

/**
 * Remove all pending highlight <mark> elements.
 */
export function clearPendingHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll("mark.annotation-pending");
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}
