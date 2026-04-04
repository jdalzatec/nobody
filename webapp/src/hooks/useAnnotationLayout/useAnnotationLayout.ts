import { useState, useCallback, useEffect, useRef, useMemo } from "react";

import { measureHighlightTops, resolveOverlaps } from "./layout-utils";

import type { Annotation } from "../../types";

export interface Connector {
  id: string;
  path: string;
}

interface UseAnnotationLayoutParams {
  annotations: Annotation[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  layoutRef: React.RefObject<HTMLDivElement | null>;
}

export function useAnnotationLayout({
  annotations,
  containerRef,
  sidebarRef,
  layoutRef,
}: UseAnnotationLayoutParams) {
  const [positions, setPositions] = useState(new Map<string, number>());
  const [containerHeight, setContainerHeight] = useState(0);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const cardHeightsRef = useRef(new Map<string, number>());
  const cardRefsMap = useRef(new Map<string, HTMLElement>());
  const cardObserverRef = useRef<ResizeObserver | null>(null);

  const annotationsRef = useRef(annotations);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const annotationKey = useMemo(
    () => annotations.map((annotation) => annotation.id).join(","),
    [annotations],
  );

  const recomputeLayout = useCallback(() => {
    const tops = measureHighlightTops(
      annotationsRef.current,
      containerRef.current,
      sidebarRef.current,
    );
    const newPositions = resolveOverlaps(tops, cardHeightsRef.current);
    setPositions(newPositions);

    let maxBottom = 0;
    for (const [id, top] of newPositions) {
      const height = cardHeightsRef.current.get(id) ?? 0;
      maxBottom = Math.max(maxBottom, top + height);
    }
    setContainerHeight(maxBottom);

    const layout = layoutRef.current;
    const container = containerRef.current;
    const sidebar = sidebarRef.current;
    if (!layout || !container || !sidebar) {
      setConnectors([]);
      return;
    }

    const layoutRect = layout.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();

    const xStart = containerRect.right - layoutRect.left;
    const xEnd = sidebarRect.left - layoutRect.left;
    const xMid = (xStart + xEnd) / 2;

    const newConnectors: Connector[] = [];

    for (const [id, top] of newPositions) {
      const mark = container.querySelector(`[data-annotation-id="${id}"]`);
      if (!mark) continue;
      const markRect = mark.getBoundingClientRect();
      const cardHeight = cardHeightsRef.current.get(id) ?? 0;

      const y1 = markRect.top + markRect.height / 2 - layoutRect.top;
      const y2 = sidebarRect.top - layoutRect.top + top + cardHeight / 2;

      newConnectors.push({
        id,
        path: `M ${String(xStart)} ${String(y1)} H ${String(xMid)} V ${String(y2)} H ${String(xEnd)}`,
      });
    }

    setConnectors(newConnectors);
  }, [containerRef, sidebarRef, layoutRef]);

  const rebuildCardObserver = useCallback(() => {
    cardObserverRef.current?.disconnect();

    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const id = el.dataset.cardId;
        if (!id) continue;
        const height = entry.contentRect.height;
        if (cardHeightsRef.current.get(id) !== height) {
          cardHeightsRef.current.set(id, height);
          changed = true;
        }
      }
      if (changed) {
        recomputeLayout();
      }
    });

    for (const [, el] of cardRefsMap.current) {
      observer.observe(el);
    }

    cardObserverRef.current = observer;
  }, [recomputeLayout]);

  const registerCard = useCallback((id: string, el: HTMLElement) => {
    el.dataset.cardId = id;
    cardRefsMap.current.set(id, el);
  }, []);

  const unregisterCard = useCallback((id: string) => {
    cardRefsMap.current.delete(id);
    cardHeightsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      recomputeLayout();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, recomputeLayout]);

  useEffect(() => {
    rebuildCardObserver();
    recomputeLayout();
  }, [annotationKey, rebuildCardObserver, recomputeLayout]);

  useEffect(() => {
    return () => {
      cardObserverRef.current?.disconnect();
    };
  }, []);

  return { positions, containerHeight, connectors, registerCard, unregisterCard };
}
