import { Button, Input } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

interface AnnotationPopoverProps {
  position: { top: number; left: number };
  onSave: (comment: string) => void;
  onCancel: () => void;
}

export function AnnotationPopover({ position, onSave, onCancel }: AnnotationPopoverProps) {
  const [comment, setComment] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
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
      <Input.TextArea
        autoFocus
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
        }}
        placeholder="Add a comment..."
        rows={3}
        style={{ minHeight: 60, resize: "vertical", fontSize: 14 }}
      />
      <div className="popover-actions">
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="primary" size="small" onClick={handleSave} disabled={!comment.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
