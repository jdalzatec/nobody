import { Card, Typography } from "antd";
import { useMemo } from "react";

import type { Annotation } from "../../types";

const { Text } = Typography;

interface AnnotationSidebarProps {
  annotations: Annotation[];
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  positions: Map<string, number>;
  containerHeight: number;
  registerCard: (id: string, el: HTMLElement) => void;
  unregisterCard: (id: string) => void;
}

export function AnnotationSidebar({
  annotations,
  sidebarRef,
  positions,
  containerHeight,
  registerCard,
  unregisterCard,
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
          }}
        >
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            style={{ borderLeft: "3px solid #6366f1", fontSize: 14 }}
          >
            <Text strong style={{ fontSize: 12, color: "#6b7280" }}>
              User
            </Text>
            <blockquote
              style={{
                borderLeft: "2px solid #d1d5db",
                paddingLeft: 8,
                margin: "4px 0 6px",
                fontSize: 12,
                fontStyle: "italic",
                color: "#6b7280",
              }}
            >
              {annotation.text}
            </blockquote>
            <Text style={{ lineHeight: 1.4, color: "#1f2937" }}>{annotation.comment}</Text>
          </Card>
        </div>
      ))}
    </aside>
  );
}
