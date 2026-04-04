import { useState, useCallback, useRef } from "react";

import { serializeRange, highlightRange, removePendingHighlight } from "../../utils/range-utils";

import type { Annotation, SerializedRange } from "../../types";

const PENDING_ID = "pending";
const PENDING_CLASS = "annotation-highlight-pending";

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<{
    range: Range;
    rect: DOMRect;
    serialized: SerializedRange;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTextSelected = useCallback((range: Range, rect: DOMRect) => {
    if (!containerRef.current) return;

    // Clean up any existing pending highlight
    removePendingHighlight(containerRef.current);

    const serialized = serializeRange(range, containerRef.current);
    highlightRange(serialized, containerRef.current, PENDING_ID, PENDING_CLASS);

    setPendingSelection({ range, rect, serialized });
  }, []);

  const saveAnnotation = useCallback(
    (comment: string) => {
      if (!pendingSelection || !containerRef.current) return;

      // Remove pending green highlight, then apply permanent yellow
      removePendingHighlight(containerRef.current);

      const id = crypto.randomUUID();
      highlightRange(pendingSelection.serialized, containerRef.current, id);

      const newAnnotation: Annotation = {
        id,
        text: pendingSelection.range.toString(),
        comment,
        range: pendingSelection.serialized,
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [pendingSelection],
  );

  const cancelAnnotation = useCallback(() => {
    if (containerRef.current) {
      removePendingHighlight(containerRef.current);
    }
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return {
    annotations,
    pendingSelection,
    containerRef,
    handleTextSelected,
    saveAnnotation,
    cancelAnnotation,
  };
}
