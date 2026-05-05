import { Spin, Alert, App as AntdApp } from "antd";
import { useEffect, useState, useCallback, useRef } from "react";

import { AnnotationConnectors } from "./components/AnnotationConnectors";
import { AnnotationPopover } from "./components/AnnotationPopover";
import { AnnotationSidebar } from "./components/AnnotationSidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { useAnnotationLayout } from "./hooks/useAnnotationLayout";
import { useAnnotations } from "./hooks/useAnnotations";
import { fetchMarkdown, saveMarkdown } from "./lib/api";
import { copySelectionText } from "./lib/clipboard";
import { applyPendingHighlight } from "./lib/dom-highlight";
import "./App.css";

export function App() {
  const { message } = AntdApp.useApp();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);

  const handleSourceChange = useCallback((newSource: string) => {
    scrollRef.current = window.scrollY;
    setContent(newSource);
    saveMarkdown(newSource).catch((err: Error) => {
      console.error("Failed to save:", err.message);
    });
  }, []);

  const {
    annotations,
    pendingSelection,
    editingAnnotationIndex,
    handleTextSelected,
    saveAnnotation,
    cancelAnnotation,
    deleteAnnotation,
    startEditing,
    saveEdit,
    cancelEdit,
  } = useAnnotations(content ?? "", handleSourceChange, containerRef);

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
    fetchMarkdown()
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollRef.current);
      });
    }
  }, [content]);

  const [activeAnnotationId, setActiveAnnotationIdRaw] = useState<string | null>(null);
  const suppressActivationRef = useRef(false);
  const setActiveAnnotationId = useCallback((id: string | null) => {
    if (id !== null && suppressActivationRef.current) return;
    setActiveAnnotationIdRaw(id);
  }, []);

  useEffect(() => {
    if (!suppressActivationRef.current) return;
    const handleMouseMove = () => {
      suppressActivationRef.current = false;
    };
    document.addEventListener("mousemove", handleMouseMove, { once: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const marks = container.querySelectorAll("mark.annotation");
    for (const mark of marks) {
      if (
        activeAnnotationId !== null &&
        mark.getAttribute("data-annotation-id") === activeAnnotationId
      ) {
        mark.classList.add("active");
      } else {
        mark.classList.remove("active");
      }
    }
  }, [activeAnnotationId, content]);

  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const accepted = handleTextSelected(range);
    if (!accepted) return;

    const selectedText = range.toString();
    copySelectionText(selectedText)
      .then(() => {
        message.info("Copied to clipboard");
      })
      .catch((err: Error) => {
        console.error("Failed to copy to clipboard:", err.message);
        message.error("Failed to copy to clipboard");
      });

    applyPendingHighlight(range);
    selection.removeAllRanges();

    const layoutRect = layoutRef.current?.getBoundingClientRect();
    if (layoutRect) {
      setPopoverPosition({
        top: rect.bottom - layoutRect.top + 8,
        left: rect.left - layoutRect.left,
      });
    }
  }, [handleTextSelected, message]);

  const handleMouseOverMarks = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark.annotation");
      if (mark) {
        setActiveAnnotationId(mark.getAttribute("data-annotation-id"));
      }
    },
    [setActiveAnnotationId],
  );

  const handleMouseOutMarks = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark.annotation");
      if (mark) {
        setActiveAnnotationId(null);
      }
    },
    [setActiveAnnotationId],
  );

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
      <div
        className="markdown-body markdown-column"
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onMouseOver={handleMouseOverMarks}
        onMouseOut={handleMouseOutMarks}
      >
        <MarkdownViewer content={content} />
      </div>
      <AnnotationSidebar
        annotations={annotations}
        sidebarRef={sidebarRef}
        positions={positions}
        containerHeight={containerHeight}
        registerCard={registerCard}
        unregisterCard={unregisterCard}
        editingAnnotationIndex={editingAnnotationIndex}
        activeAnnotationId={activeAnnotationId}
        onActivate={setActiveAnnotationId}
        onDelete={(index: number) => {
          suppressActivationRef.current = true;
          deleteAnnotation(index);
          setActiveAnnotationIdRaw(null);
        }}
        onStartEditing={startEditing}
        onSaveEdit={(comment: string) => {
          saveEdit(comment);
          setActiveAnnotationId(null);
        }}
        onCancelEdit={() => {
          cancelEdit();
          setActiveAnnotationId(null);
        }}
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
