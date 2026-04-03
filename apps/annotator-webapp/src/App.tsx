import { useEffect, useState, useCallback } from "react";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { AnnotationPopover } from "./components/AnnotationPopover";
import { AnnotationSidebar } from "./components/AnnotationSidebar";
import { useAnnotations } from "./hooks/useAnnotations";
import "./App.css";

export function App() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    annotations,
    pendingSelection,
    containerRef,
    handleTextSelected,
    saveAnnotation,
    cancelAnnotation,
  } = useAnnotations();

  useEffect(() => {
    fetch("/file.md")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file.md (${res.status})`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    handleTextSelected(range, rect);
  }, [containerRef, handleTextSelected]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lg text-gray-500">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lg font-semibold text-red-600">
        {error}
      </div>
    );
  }

  if (content === null) {
    return null;
  }

  const popoverPosition = pendingSelection
    ? {
        top: pendingSelection.rect.bottom + window.scrollY + 8,
        left: pendingSelection.rect.left + window.scrollX,
      }
    : null;

  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,860px)_280px] gap-6 p-10">
      <div
        className="markdown-body relative rounded-lg bg-white p-10 shadow-sm"
        ref={containerRef}
        onMouseUp={handleMouseUp}
      >
        <MarkdownViewer content={content} />
      </div>
      <AnnotationSidebar annotations={annotations} />
      {pendingSelection && popoverPosition && (
        <AnnotationPopover
          position={popoverPosition}
          onSave={saveAnnotation}
          onCancel={cancelAnnotation}
        />
      )}
    </div>
  );
}
