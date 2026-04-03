import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
      className="absolute z-50 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      style={{ top: position.top, left: position.left }}
      onKeyDown={handleKeyDown}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">User</span>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="rounded p-0.5 text-gray-400 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        ref={textareaRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        className="min-h-[60px] resize-y text-sm"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!comment.trim()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
