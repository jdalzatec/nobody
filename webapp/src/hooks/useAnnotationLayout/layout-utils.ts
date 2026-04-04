import type { Annotation } from "../../types";

const DEFAULT_GAP = 8;

export function measureHighlightTops(
  annotations: Annotation[],
  container: HTMLElement | null,
  sidebar: HTMLElement | null,
): Map<string, number> {
  const tops = new Map<string, number>();
  if (!container || !sidebar) return tops;

  const sidebarTop = sidebar.getBoundingClientRect().top;

  for (const annotation of annotations) {
    const mark = container.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (!mark) continue;
    const markRect = mark.getBoundingClientRect();
    const markMidY = markRect.top + markRect.height / 2;
    tops.set(annotation.id, markMidY - sidebarTop);
  }

  return tops;
}

export function resolveOverlaps(
  highlightTops: Map<string, number>,
  cardHeights: Map<string, number>,
  gap: number = DEFAULT_GAP,
): Map<string, number> {
  const positions = new Map<string, number>();

  const entries = [...highlightTops.entries()]
    .filter(([id]) => cardHeights.has(id))
    .sort((a, b) => a[1] - b[1]);

  let cursor = 0;

  for (const [id, highlightMidY] of entries) {
    const cardHeight = cardHeights.get(id) ?? 0;
    const desired = highlightMidY - cardHeight / 2;
    const actual = Math.max(desired, cursor);
    positions.set(id, actual);
    cursor = actual + cardHeight + gap;
  }

  return positions;
}
