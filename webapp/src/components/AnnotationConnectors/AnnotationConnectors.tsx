import { theme } from "antd";

import type { Connector } from "../../hooks/useAnnotationLayout";

interface AnnotationConnectorsProps {
  connectors: Connector[];
}

export function AnnotationConnectors({ connectors }: AnnotationConnectorsProps) {
  const { token } = theme.useToken();

  if (connectors.length === 0) return null;

  return (
    <svg className="annotation-connectors">
      {connectors.map((c) => (
        <path
          key={c.id}
          d={c.path}
          fill="none"
          stroke={token.colorPrimary}
          strokeWidth={1.5}
          opacity={0.4}
        />
      ))}
    </svg>
  );
}
