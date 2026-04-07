import { extractAnnotationsFromMarkdown } from "./remark-critic-markup";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Walk up from `node` to find the nearest ancestor with a `data-block-id` attribute. */
export function findBlockId(node: Node): string | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute("data-block-id")) {
      return current.getAttribute("data-block-id");
    }
    current = current.parentNode;
  }
  return null;
}

/** Check whether `node` is inside a mermaid diagram container. */
export function isInsideMermaid(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (
      current instanceof HTMLElement &&
      (current.classList.contains("mermaid-diagram") || current.classList.contains("mermaid"))
    ) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

/**
 * Return true if the range [start, end) overlaps any existing annotation
 * in the markdown source.
 */
export function hasOverlap(start: number, end: number, markdownSource: string): boolean {
  const annotations = extractAnnotationsFromMarkdown(markdownSource);
  for (const ann of annotations) {
    if (start < ann.sourceEnd && end > ann.sourceStart) {
      return true;
    }
  }
  return false;
}

/**
 * Validate whether a DOM Range can receive an annotation.
 * Rejects empty selections, mermaid diagrams, and cross-block selections.
 */
export function canAnnotate(range: Range): ValidationResult {
  const text = range.toString();
  if (!text.trim()) {
    return { valid: false, reason: "Selection is empty" };
  }

  if (isInsideMermaid(range.commonAncestorContainer)) {
    return { valid: false, reason: "Cannot annotate mermaid diagrams" };
  }

  const startBlockId = findBlockId(range.startContainer);
  const endBlockId = findBlockId(range.endContainer);
  if (startBlockId === null || endBlockId === null || startBlockId !== endBlockId) {
    return { valid: false, reason: "Selection must be within a single block" };
  }

  return { valid: true };
}
