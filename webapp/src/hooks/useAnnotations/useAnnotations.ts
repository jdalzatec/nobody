import { useState, useCallback, useRef } from "react";

import {
  serializeRange,
  highlightRange,
  removeHighlightById,
  removePendingHighlight,
} from "../../utils/range-utils";

import type { Annotation, SerializedRange } from "../../types";

const PENDING_ID = "pending";
const PENDING_CLASS = "annotation-highlight-pending";

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<{
    range: Range;
    rect: DOMRect;
    serialized: SerializedRange;
    text: string;
  } | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTextSelected = useCallback((range: Range, rect: DOMRect) => {
    if (!containerRef.current) return;

    removePendingHighlight(containerRef.current);

    const text = range.toString();
    const serialized = serializeRange(range, containerRef.current);
    highlightRange(serialized, containerRef.current, PENDING_ID, PENDING_CLASS);

    setPendingSelection({ range, rect, serialized, text });
  }, []);

  const saveAnnotation = useCallback(
    (comment: string) => {
      if (!pendingSelection || !containerRef.current) return;

      removePendingHighlight(containerRef.current);

      const id = crypto.randomUUID();
      highlightRange(pendingSelection.serialized, containerRef.current, id);

      const newAnnotation: Annotation = {
        id,
        text: pendingSelection.text,
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

  const deleteAnnotation = useCallback(
    (id: string) => {
      if (containerRef.current) {
        removeHighlightById(containerRef.current, id);
      }
      setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
      if (editingAnnotationId === id) {
        setEditingAnnotationId(null);
      }
    },
    [editingAnnotationId],
  );

  const startEditing = useCallback((id: string) => {
    setEditingAnnotationId(id);
  }, []);

  const saveEdit = useCallback(
    (newComment: string) => {
      if (!editingAnnotationId) return;
      setAnnotations((prev) =>
        prev.map((annotation) =>
          annotation.id === editingAnnotationId
            ? { ...annotation, comment: newComment }
            : annotation,
        ),
      );
      setEditingAnnotationId(null);
    },
    [editingAnnotationId],
  );

  const cancelEdit = useCallback(() => {
    setEditingAnnotationId(null);
  }, []);

  return {
    annotations,
    pendingSelection,
    editingAnnotationId,
    containerRef,
    handleTextSelected,
    saveAnnotation,
    cancelAnnotation,
    deleteAnnotation,
    startEditing,
    saveEdit,
    cancelEdit,
  };
}
