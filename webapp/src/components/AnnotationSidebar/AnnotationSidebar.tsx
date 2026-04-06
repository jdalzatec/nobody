import { CloseOutlined, EditOutlined, DeleteFilled } from "@ant-design/icons";
import { Button, Card, Input, Popconfirm, Typography, theme } from "antd";
import { useState, useCallback, useMemo } from "react";

import type { Annotation } from "../../types";

const { Text } = Typography;

interface AnnotationSidebarProps {
  annotations: Annotation[];
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  positions: Map<string, number>;
  containerHeight: number;
  registerCard: (id: string, el: HTMLElement) => void;
  unregisterCard: (id: string) => void;
  editingAnnotationId: string | null;
  onDelete: (id: string) => void;
  onStartEditing: (id: string) => void;
  onSaveEdit: (newComment: string) => void;
  onCancelEdit: () => void;
}

function EditableComment({
  annotation,
  onSaveEdit,
  onCancelEdit,
}: {
  annotation: Annotation;
  onSaveEdit: (newComment: string) => void;
  onCancelEdit: () => void;
}) {
  const [draft, setDraft] = useState(annotation.comment);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) {
      onSaveEdit(trimmed);
    }
  }, [draft, onSaveEdit]);

  return (
    <div>
      <Input.TextArea
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        rows={3}
        style={{ minHeight: 60, resize: "vertical", fontSize: 14 }}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Button size="small" onClick={onCancelEdit}>
          Cancel
        </Button>
        <Button type="primary" size="small" onClick={handleSave} disabled={!draft.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function AnnotationSidebar({
  annotations,
  sidebarRef,
  positions,
  containerHeight,
  registerCard,
  unregisterCard,
  editingAnnotationId,
  onDelete,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
}: AnnotationSidebarProps) {
  const refCallbacks = useMemo(() => {
    const map = new Map<string, (el: HTMLDivElement | null) => void>();
    for (const annotation of annotations) {
      const { id } = annotation;
      map.set(id, (el: HTMLDivElement | null) => {
        if (el) {
          registerCard(id, el);
        } else {
          unregisterCard(id);
        }
      });
    }
    return map;
  }, [annotations, registerCard, unregisterCard]);

  const { token } = theme.useToken();

  return (
    <aside
      className="annotation-sidebar"
      ref={sidebarRef}
      style={{ height: containerHeight || undefined }}
    >
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          ref={refCallbacks.get(annotation.id)}
          style={{
            position: "absolute",
            top: positions.get(annotation.id) ?? 0,
            width: "100%",
            visibility: positions.has(annotation.id) ? "visible" : "hidden",
          }}
        >
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            style={{ borderLeft: `3px solid ${token.colorPrimary}`, fontSize: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>
                Note
              </Text>
              <div style={{ display: "flex", gap: 4 }}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    onStartEditing(annotation.id);
                  }}
                  aria-label="Edit"
                />
                <Popconfirm
                  title="Delete note"
                  description="Are you sure you want to delete this note?"
                  onConfirm={() => {
                    onDelete(annotation.id);
                  }}
                  okText="Yes"
                  cancelText="No"
                  icon={<DeleteFilled />}
                >
                  <Button type="text" size="small" icon={<CloseOutlined />} aria-label="Delete" />
                </Popconfirm>
              </div>
            </div>
            <blockquote
              style={{
                borderLeft: `2px solid ${token.colorBorder}`,
                paddingLeft: 8,
                margin: "4px 0 6px",
                fontSize: 12,
                fontStyle: "italic",
                color: token.colorTextSecondary,
              }}
            >
              {annotation.text}
            </blockquote>
            {editingAnnotationId === annotation.id ? (
              <EditableComment
                annotation={annotation}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
              />
            ) : (
              <Text style={{ lineHeight: 1.4, color: token.colorText }}>{annotation.comment}</Text>
            )}
          </Card>
        </div>
      ))}
    </aside>
  );
}
