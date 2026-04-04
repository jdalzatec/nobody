import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { AnnotationConnectors } from "./AnnotationConnectors";

import type { Connector } from "../../hooks/useAnnotationLayout";

describe("AnnotationConnectors", () => {
  it("renders nothing when connectors is empty", () => {
    // Act
    const { container } = render(<AnnotationConnectors connectors={[]} />);

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("renders an SVG element when at least one connector is provided", () => {
    // Arrange
    const connectors: Connector[] = [{ id: "a", path: "M 10 20 H 30 V 40 H 50" }];

    // Act
    const { container } = render(<AnnotationConnectors connectors={connectors} />);

    // Assert
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one path per connector with the correct d attribute", () => {
    // Arrange
    const connectors: Connector[] = [
      { id: "a", path: "M 10 20 H 30 V 40 H 50" },
      { id: "b", path: "M 10 60 H 30 V 80 H 50" },
    ];

    // Act
    const { container } = render(<AnnotationConnectors connectors={connectors} />);

    // Assert
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute("d")).toBe("M 10 20 H 30 V 40 H 50");
    expect(paths[1].getAttribute("d")).toBe("M 10 60 H 30 V 80 H 50");
  });
});
