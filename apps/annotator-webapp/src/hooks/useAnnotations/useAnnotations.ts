import { useState, useCallback, useRef } from "react";

import { serializeRange, highlightRange } from "../../utils/range-utils";

import type { Annotation } from "../../types";

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<{
    range: Range;
    rect: DOMRect;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTextSelected = useCallback((range: Range, rect: DOMRect) => {
    setPendingSelection({ range, rect });
  }, []);

  const saveAnnotation = useCallback(
    (comment: string) => {
      if (!pendingSelection || !containerRef.current) return;

      const serialized = serializeRange(pendingSelection.range, containerRef.current);
      const id = crypto.randomUUID();
      const newAnnotation: Annotation = {
        id,
        text: pendingSelection.range.toString(),
        comment,
        range: serialized,
      };

      highlightRange(serialized, containerRef.current, id);
      setAnnotations((prev) => [...prev, newAnnotation]);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [pendingSelection],
  );

  const cancelAnnotation = useCallback(() => {
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
