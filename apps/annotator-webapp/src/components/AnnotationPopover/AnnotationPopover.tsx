import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";

interface AnnotationPopoverProps {
  position: { top: number; left: number };
  onSave: (comment: string) => void;
  onCancel: () => void;
}

export function AnnotationPopover({
  position,
  onSave,
  onCancel,
}: AnnotationPopoverProps) {
  const [comment, setComment] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onCancel]);

  const handleSave = useCallback(() => {
    const trimmed = comment.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  }, [comment, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [onCancel, handleSave],
  );

  return (
    <div
      ref={popoverRef}
      className="popover-container"
      style={{ top: position.top, left: position.left }}
      onKeyDown={handleKeyDown}
    >
      <div className="popover-header">
        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
          User
        </span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onCancel}
          aria-label="Close"
        />
      </div>
      <Input.TextArea
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        style={{ minHeight: 60, resize: "vertical", fontSize: 14 }}
      />
      <div className="popover-actions">
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="primary"
          size="small"
          onClick={handleSave}
          disabled={!comment.trim()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
