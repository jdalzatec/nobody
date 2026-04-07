import { useState, useCallback, useMemo, useLayoutEffect } from "react";

import {
  insertAnnotation,
  deleteAnnotation as deleteAnnotationOp,
  editAnnotation as editAnnotationOp,
} from "../../lib/annotation-ops";
import { applyHighlights, clearHighlights, clearPendingHighlights } from "../../lib/dom-highlight";
import { extractAnnotationsFromMarkdown, stripCriticMarkup } from "../../lib/remark-critic-markup";
import { canAnnotate, hasOverlap } from "../../lib/selection-validator";
import { findBlockElement, findSelectedTextInSource } from "../../lib/source-search";

import type { Annotation } from "../../types";

/**
 * Hook that manages annotation state: parsing, creating, editing, deleting,
 * and applying DOM highlights. Bridges the CriticMarkup source with the rendered DOM.
 */
export function useAnnotations(
  markdownSource: string,
  onSourceChange: (newSource: string) => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const annotations: Annotation[] = useMemo(() => {
    return extractAnnotationsFromMarkdown(markdownSource).map((a, i) => ({
      id: String(i),
      text: a.text,
      comment: a.comment,
      sourceStart: a.sourceStart,
      sourceEnd: a.sourceEnd,
    }));
  }, [markdownSource]);

  const strippedSource = useMemo(() => stripCriticMarkup(markdownSource), [markdownSource]);

  // Apply DOM highlights after React renders the stripped markdown
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    clearPendingHighlights(container);
    clearHighlights(container);
    applyHighlights(container, markdownSource);
  }, [markdownSource, containerRef]);

  const [pendingSelection, setPendingSelection] = useState<{
    sourceStart: number;
    sourceEnd: number;
    text: string;
  } | null>(null);

  const [editingAnnotationIndex, setEditingAnnotationIndex] = useState<number | null>(null);

  const handleTextSelected = useCallback(
    (range: Range): boolean => {
      const validation = canAnnotate(range);
      if (!validation.valid) return false;

      const blockElement = findBlockElement(range.startContainer);
      if (!blockElement) return false;

      // findSelectedTextInSource works with the stripped source since
      // the DOM data-start/data-end refer to the stripped markdown
      const result = findSelectedTextInSource(range, blockElement, strippedSource);
      if (!result) return false;

      // Convert stripped offsets to original-source offsets for insertion
      const originalStart = strippedToOriginal(markdownSource, result.start);
      const originalEnd = strippedToOriginal(markdownSource, result.end);

      if (hasOverlap(originalStart, originalEnd, markdownSource)) return false;

      setPendingSelection({
        sourceStart: originalStart,
        sourceEnd: originalEnd,
        text: range.toString(),
      });
      return true;
    },
    [markdownSource, strippedSource],
  );

  const saveAnnotation = useCallback(
    (comment: string) => {
      if (!pendingSelection) return;
      const newSource = insertAnnotation(
        markdownSource,
        pendingSelection.sourceStart,
        pendingSelection.sourceEnd,
        comment,
      );
      onSourceChange(newSource);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [pendingSelection, markdownSource, onSourceChange],
  );

  const cancelAnnotation = useCallback(() => {
    const container = containerRef.current;
    if (container) clearPendingHighlights(container);
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [containerRef]);

  const deleteAnnotation = useCallback(
    (index: number) => {
      const newSource = deleteAnnotationOp(markdownSource, index);
      onSourceChange(newSource);
      if (editingAnnotationIndex === index) {
        setEditingAnnotationIndex(null);
      }
    },
    [markdownSource, onSourceChange, editingAnnotationIndex],
  );

  const startEditing = useCallback((index: number) => {
    setEditingAnnotationIndex(index);
  }, []);

  const saveEdit = useCallback(
    (newComment: string) => {
      if (editingAnnotationIndex === null) return;
      const newSource = editAnnotationOp(markdownSource, editingAnnotationIndex, newComment);
      onSourceChange(newSource);
      setEditingAnnotationIndex(null);
    },
    [editingAnnotationIndex, markdownSource, onSourceChange],
  );

  const cancelEdit = useCallback(() => {
    setEditingAnnotationIndex(null);
  }, []);

  return {
    annotations,
    pendingSelection,
    editingAnnotationIndex,
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

/**
 * Convert a position in the stripped source back to the corresponding
 * position in the original source (which contains CriticMarkup).
 */
function strippedToOriginal(originalSource: string, strippedPos: number): number {
  const annotations = extractAnnotationsFromMarkdown(originalSource);
  let shift = 0;

  for (const ann of annotations) {
    const syntaxLen = ann.sourceEnd - ann.sourceStart - ann.text.length;
    const strippedAnnStart = ann.sourceStart - shift;

    if (strippedPos <= strippedAnnStart) break;

    const strippedAnnEnd = strippedAnnStart + ann.text.length;
    if (strippedPos <= strippedAnnEnd) {
      // Position is inside an existing annotation's text
      return strippedPos + shift + 3; // +3 for {== prefix
    }

    shift += syntaxLen;
  }

  return strippedPos + shift;
}
