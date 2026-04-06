import type { SerializedRange } from "../../types";

function getNodePath(node: Node, root: Node): number[] {
  const path: number[] = [];
  let current = node;
  while (current !== root) {
    const parent = current.parentNode;
    if (!parent) return [];
    path.unshift(Array.from(parent.childNodes).indexOf(current as ChildNode));
    current = parent;
  }
  return path;
}

function resolveNodePath(path: number[], root: Node): Node | null {
  let current: Node = root;
  for (const index of path) {
    if (index < 0 || index >= current.childNodes.length) return null;
    current = current.childNodes[index];
  }
  return current;
}

export function serializeRange(range: Range, container: HTMLElement): SerializedRange {
  return {
    startContainerPath: getNodePath(range.startContainer, container),
    startOffset: range.startOffset,
    endContainerPath: getNodePath(range.endContainer, container),
    endOffset: range.endOffset,
  };
}

export function removeHighlightById(container: HTMLElement, annotationId: string): void {
  const marks = container.querySelectorAll(`mark[data-annotation-id="${annotationId}"]`);
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

export function removePendingHighlight(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-annotation-id="pending"]');
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

export function highlightRange(
  serialized: SerializedRange,
  container: HTMLElement,
  annotationId: string,
  className: string = "annotation-highlight",
): void {
  const startNode = resolveNodePath(serialized.startContainerPath, container);
  const endNode = resolveNodePath(serialized.endContainerPath, container);
  if (!startNode || !endNode) return;

  const range = document.createRange();
  range.setStart(startNode, serialized.startOffset);
  range.setEnd(endNode, serialized.endOffset);

  const textNodes = getTextNodesInRange(range, container);

  for (let i = textNodes.length - 1; i >= 0; i--) {
    const { node, start, end } = textNodes[i];
    wrapTextNode(node, start, end, annotationId, className);
  }
}

function wrapTextNode(
  node: Text,
  start: number,
  end: number,
  annotationId: string,
  className: string,
): void {
  const text = node.data;
  const mark = document.createElement("mark");
  mark.className = className;
  mark.dataset.annotationId = annotationId;

  if (start === 0 && end === text.length) {
    mark.appendChild(node.cloneNode(true));
    node.parentNode?.replaceChild(mark, node);
  } else {
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);

    const fragment = document.createDocumentFragment();
    if (before) fragment.appendChild(document.createTextNode(before));
    mark.textContent = selected;
    fragment.appendChild(mark);
    if (after) fragment.appendChild(document.createTextNode(after));

    node.parentNode?.replaceChild(fragment, node);
  }
}

function getTextNodesInRange(
  range: Range,
  container: HTMLElement,
): { node: Text; start: number; end: number }[] {
  const results: { node: Text; start: number; end: number }[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!range.intersectsNode(node)) continue;

    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.data.length;

    if (start !== end) {
      results.push({ node, start, end });
    }
  }

  return results;
}
