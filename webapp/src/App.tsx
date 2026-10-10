import { Spin, Alert, App as AntdApp } from "antd";
import { useEffect, useState, useCallback, useRef } from "react";

import { AnnotationConnectors } from "./components/AnnotationConnectors";
import { AnnotationPopover } from "./components/AnnotationPopover";
import { AnnotationSidebar } from "./components/AnnotationSidebar";
import { DocRail } from "./components/DocRail";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { useAnnotationLayout } from "./hooks/useAnnotationLayout";
import { useAnnotations } from "./hooks/useAnnotations";
import { useDocs } from "./hooks/useDocs";
import { ApiError, fetchMarkdown, saveMarkdown } from "./lib/api";
import { copySelectionText } from "./lib/clipboard";
import { applyPendingHighlight } from "./lib/dom-highlight";
import "./App.css";

const DELETED_MESSAGE = "This document no longer exists on disk";

function docIdFromPath(pathname: string): string | null {
  return /^\/d\/([^/]+)\/?$/.exec(pathname)?.[1] ?? null;
}

export function App() {
  const { message } = AntdApp.useApp();
  // Loaded content and errors are tagged with the document they belong to, so
  // switching documents shows a spinner rather than the previous one's body.
  const [loaded, setLoaded] = useState<{ docId: string; content: string } | null>(null);
  const [failure, setFailure] = useState<{ docId: string; message: string } | null>(null);
  const [routedDocId, setRoutedDocId] = useState<string | null>(() =>
    docIdFromPath(window.location.pathname),
  );

  const { docs, loading: docsLoading } = useDocs();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);

  // With no document in the URL, fall back to the first one the registry reports.
  const activeDocId = routedDocId ?? (docs.length > 0 ? docs[0].id : null);
  const content = loaded?.docId === activeDocId ? loaded.content : null;
  const error = failure?.docId === activeDocId ? failure.message : null;
  const loading = activeDocId !== null && content === null && error === null;

  useEffect(() => {
    const onPopState = () => {
      setRoutedDocId(docIdFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (routedDocId === null && activeDocId !== null) {
      window.history.replaceState(null, "", `/d/${activeDocId}`);
    }
  }, [routedDocId, activeDocId]);

  const selectDoc = useCallback((docId: string) => {
    window.history.pushState(null, "", `/d/${docId}`);
    setRoutedDocId(docId);
  }, []);

  const handleSourceChange = useCallback(
    (newSource: string) => {
      if (activeDocId === null) return;
      scrollRef.current = window.scrollY;
      setLoaded({ docId: activeDocId, content: newSource });
      saveMarkdown(activeDocId, newSource).catch((err: Error) => {
        console.error("Failed to save:", err.message);
      });
    },
    [activeDocId],
  );

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
    if (activeDocId === null) return;
    let cancelled = false;
    fetchMarkdown(activeDocId)
      .then((text) => {
        if (!cancelled) setLoaded({ docId: activeDocId, content: text });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setFailure({
          docId: activeDocId,
          message: err instanceof ApiError && err.status === 410 ? DELETED_MESSAGE : err.message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [activeDocId]);

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

  const rail = <DocRail docs={docs} activeDocId={activeDocId} onSelect={selectDoc} />;

  if (!docsLoading && docs.length === 0) {
    return (
      <div className="app-layout">
        {rail}
        <div className="centered-container">
          <span>
            No documents open — run <code>/annotate &lt;file&gt;</code> in a Claude session.
          </span>
        </div>
      </div>
    );
  }

  // The rail stays mounted through loading and error states: one unreadable
  // document must not blank the list of all the others.
  if (loading || activeDocId === null) {
    return (
      <div className="app-layout">
        {rail}
        <div className="centered-container">
          <Spin size="large" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        {rail}
        <div className="centered-container">
          <Alert type="error" title={error} showIcon />
        </div>
      </div>
    );
  }

  if (content === null) {
    return <div className="app-layout">{rail}</div>;
  }

  return (
    <div className="app-layout" ref={layoutRef}>
      {rail}
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
