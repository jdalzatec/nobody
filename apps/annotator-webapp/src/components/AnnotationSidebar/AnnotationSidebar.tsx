import { Card, Typography } from "antd";
import type { Annotation } from "../../types";

const { Text } = Typography;

interface AnnotationSidebarProps {
  annotations: Annotation[];
}

export function AnnotationSidebar({ annotations }: AnnotationSidebarProps) {
  if (annotations.length === 0) return null;

  return (
    <aside className="annotation-sidebar">
      {annotations.map((annotation) => (
        <Card
          key={annotation.id}
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
          <Text style={{ lineHeight: 1.4, color: "#1f2937" }}>
            {annotation.comment}
          </Text>
        </Card>
      ))}
    </aside>
  );
}
