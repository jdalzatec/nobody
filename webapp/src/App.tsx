import { Spin, Alert } from "antd";
import { useEffect, useState, useCallback, useRef } from "react";

import { AnnotationConnectors } from "./components/AnnotationConnectors";
import { AnnotationPopover } from "./components/AnnotationPopover";
import { AnnotationSidebar } from "./components/AnnotationSidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { useAnnotationLayout } from "./hooks/useAnnotationLayout";
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

  const sidebarRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const { positions, containerHeight, connectors, registerCard, unregisterCard } =
    useAnnotationLayout({
      annotations,
      containerRef,
      sidebarRef,
      layoutRef,
    });

  useEffect(() => {
    fetch("/file.md")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file.md (${String(res.status)})`);
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

  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    handleTextSelected(range, rect);

    const layoutRect = layoutRef.current?.getBoundingClientRect();
    if (layoutRect) {
      setPopoverPosition({
        top: rect.bottom - layoutRect.top + 8,
        left: rect.left - layoutRect.left,
      });
    }
  }, [containerRef, handleTextSelected, layoutRef]);

  if (loading) {
    return (
      <div className="centered-container">
        <Spin size="large" />
        <span>Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="centered-container">
        <Alert type="error" title={error} showIcon />
      </div>
    );
  }

  if (content === null) {
    return null;
  }

  return (
    <div className="app-layout" ref={layoutRef}>
      <div className="markdown-body markdown-column" ref={containerRef} onMouseUp={handleMouseUp}>
        <MarkdownViewer content={content} />
      </div>
      <AnnotationSidebar
        annotations={annotations}
        sidebarRef={sidebarRef}
        positions={positions}
        containerHeight={containerHeight}
        registerCard={registerCard}
        unregisterCard={unregisterCard}
      />
      <AnnotationConnectors connectors={connectors} />
      {pendingSelection && popoverPosition && (
        <AnnotationPopover
          position={popoverPosition}
          onSave={(comment: string) => {
            saveAnnotation(comment);
            setPopoverPosition(null);
          }}
          onCancel={() => {
            cancelAnnotation();
            setPopoverPosition(null);
          }}
        />
      )}
    </div>
  );
}
