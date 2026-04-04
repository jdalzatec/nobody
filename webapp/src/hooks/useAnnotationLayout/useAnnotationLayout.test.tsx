import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useAnnotationLayout } from "./useAnnotationLayout";

import type { Annotation } from "../../types";

const makeAnnotation = (id: string): Annotation => ({
  id,
  text: "text",
  comment: "comment",
  range: {
    startContainerPath: [0, 0],
    startOffset: 0,
    endContainerPath: [0, 0],
    endOffset: 5,
  },
});

let resizeCallbacks: ResizeObserverCallback[];
let observedElements: Set<Element>;
let disconnectSpy: () => void;

beforeEach(() => {
  resizeCallbacks = [];
  observedElements = new Set();
  disconnectSpy = vi.fn();

  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      resizeCallbacks.push(cb);
    }
    observe(el: Element) {
      observedElements.add(el);
    }
    unobserve(el: Element) {
      observedElements.delete(el);
    }
    disconnect() {
      disconnectSpy();
    }
  }
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

function makeRefs() {
  const container = document.createElement("div");
  const sidebar = document.createElement("div");
  const layout = document.createElement("div");
  const containerRef = { current: container };
  const sidebarRef = { current: sidebar };
  const layoutRef = { current: layout };
  return { container, sidebar, layout, containerRef, sidebarRef, layoutRef };
}

describe("useAnnotationLayout", () => {
  it("positions is empty on initial render when no annotations", () => {
    const { containerRef, sidebarRef, layoutRef } = makeRefs();

    const { result } = renderHook(() =>
      useAnnotationLayout({ annotations: [], containerRef, sidebarRef, layoutRef }),
    );

    expect(result.current.positions.size).toBe(0);
  });

  it("registerCard stores element and positions update after resize", () => {
    const { container, sidebar, containerRef, sidebarRef, layoutRef } = makeRefs();
    const annotations = [makeAnnotation("a")];

    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", "a");
    container.appendChild(mark);

    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 100, 20));
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 280, 1000));

    const { result } = renderHook(() =>
      useAnnotationLayout({ annotations, containerRef, sidebarRef, layoutRef }),
    );

    const cardEl = document.createElement("div");
    act(() => {
      result.current.registerCard("a", cardEl);
    });

    // Simulate ResizeObserver firing with a height
    const lastCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      lastCallback(
        [{ target: cardEl, contentRect: { height: 50 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    // midY = 200+10 - 100 = 110, desired = 110 - 50/2 = 85
    expect(result.current.positions.get("a")).toBe(85);
  });

  it("unregisterCard removes position when annotations change", () => {
    const { container, sidebar, containerRef, sidebarRef, layoutRef } = makeRefs();
    const annotations1 = [makeAnnotation("a")];

    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", "a");
    container.appendChild(mark);

    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 100, 20));
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 280, 1000));

    const { result, rerender } = renderHook(
      (props: { annotations: Annotation[] }) =>
        useAnnotationLayout({ ...props, containerRef, sidebarRef, layoutRef }),
      { initialProps: { annotations: annotations1 } },
    );

    const cardEl = document.createElement("div");
    act(() => {
      result.current.registerCard("a", cardEl);
    });

    const lastCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      lastCallback(
        [{ target: cardEl, contentRect: { height: 50 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(result.current.positions.get("a")).toBe(85);

    // Unregister and remove annotation (mirrors real usage)
    act(() => {
      result.current.unregisterCard("a");
    });
    rerender({ annotations: [] });

    expect(result.current.positions.has("a")).toBe(false);
  });

  it("updates positions when annotations change", () => {
    const { container, sidebar, containerRef, sidebarRef, layoutRef } = makeRefs();
    const annotations1 = [makeAnnotation("a")];

    const markA = document.createElement("mark");
    markA.setAttribute("data-annotation-id", "a");
    container.appendChild(markA);

    vi.spyOn(markA, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 100, 20));
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 280, 1000));

    const { result, rerender } = renderHook(
      (props: { annotations: Annotation[] }) =>
        useAnnotationLayout({ ...props, containerRef, sidebarRef, layoutRef }),
      { initialProps: { annotations: annotations1 } },
    );

    // Register card and trigger resize
    const cardEl = document.createElement("div");
    act(() => {
      result.current.registerCard("a", cardEl);
    });
    const lastCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      lastCallback(
        [{ target: cardEl, contentRect: { height: 50 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    // midY = 200+10 - 100 = 110, desired = 110 - 50/2 = 85
    expect(result.current.positions.get("a")).toBe(85);

    // Add a second annotation
    const markB = document.createElement("mark");
    markB.setAttribute("data-annotation-id", "b");
    container.appendChild(markB);
    vi.spyOn(markB, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 210, 100, 20));

    const annotations2 = [...annotations1, makeAnnotation("b")];

    const cardElB = document.createElement("div");
    act(() => {
      result.current.registerCard("b", cardElB);
    });

    rerender({ annotations: annotations2 });

    // Fire resize for card b
    const latestCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      latestCallback(
        [{ target: cardElB, contentRect: { height: 40 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(result.current.positions.has("a")).toBe(true);
    expect(result.current.positions.has("b")).toBe(true);
  });

  it("disconnects ResizeObservers on unmount", () => {
    const { containerRef, sidebarRef, layoutRef } = makeRefs();

    const { unmount } = renderHook(() =>
      useAnnotationLayout({ annotations: [], containerRef, sidebarRef, layoutRef }),
    );

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("connectors is empty when positions is empty", () => {
    const { containerRef, sidebarRef, layoutRef } = makeRefs();

    const { result } = renderHook(() =>
      useAnnotationLayout({ annotations: [], containerRef, sidebarRef, layoutRef }),
    );

    expect(result.current.connectors).toEqual([]);
  });

  it("computes stepped connector path relative to layout element", () => {
    const { container, sidebar, layout, containerRef, sidebarRef, layoutRef } = makeRefs();
    const annotations = [makeAnnotation("a")];

    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", "a");
    container.appendChild(mark);

    // container: right=850, mark: midY=210, sidebar: left=900, layout: left=50,top=50
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(50, 50, 800, 2000));
    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 80, 20));
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(new DOMRect(900, 50, 280, 1000));
    vi.spyOn(layout, "getBoundingClientRect").mockReturnValue(new DOMRect(50, 50, 1180, 2000));

    const { result } = renderHook(() =>
      useAnnotationLayout({ annotations, containerRef, sidebarRef, layoutRef }),
    );

    const cardEl = document.createElement("div");
    act(() => {
      result.current.registerCard("a", cardEl);
    });

    const lastCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      lastCallback(
        [{ target: cardEl, contentRect: { height: 60 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(result.current.connectors).toHaveLength(1);
    const c = result.current.connectors[0];
    expect(c.id).toBe("a");

    // xStart = containerRight - layoutLeft = 850 - 50 = 800
    // xEnd = sidebarLeft - layoutLeft = 900 - 50 = 850
    // xMid = (800 + 850) / 2 = 825
    // y1 = markMidY - layoutTop = 210 - 50 = 160
    // card top = highlightMidY(160) - cardHeight(60)/2 = 130 relative to sidebar
    // y2 = sidebarTop - layoutTop + cardTop + cardHeight/2 = 0 + 130 + 30 = 160
    expect(c.path).toContain("M 800 ");
    expect(c.path).toContain("H 825 ");
    expect(c.path).toContain("H 850");
  });

  it("produces no connector for annotations missing from positions", () => {
    const { container, sidebar, layout, containerRef, sidebarRef, layoutRef } = makeRefs();
    const annotations = [makeAnnotation("a"), makeAnnotation("b")];

    const markA = document.createElement("mark");
    markA.setAttribute("data-annotation-id", "a");
    container.appendChild(markA);
    // No mark for "b" in the DOM

    vi.spyOn(markA, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 80, 20));
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(new DOMRect(900, 50, 280, 1000));
    vi.spyOn(layout, "getBoundingClientRect").mockReturnValue(new DOMRect(50, 50, 1180, 2000));

    const { result } = renderHook(() =>
      useAnnotationLayout({ annotations, containerRef, sidebarRef, layoutRef }),
    );

    const cardElA = document.createElement("div");
    const cardElB = document.createElement("div");
    act(() => {
      result.current.registerCard("a", cardElA);
      result.current.registerCard("b", cardElB);
    });

    const lastCallback = resizeCallbacks[resizeCallbacks.length - 1];
    act(() => {
      lastCallback(
        [
          { target: cardElA, contentRect: { height: 60 } } as unknown as ResizeObserverEntry,
          { target: cardElB, contentRect: { height: 60 } } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    });

    // Only "a" should have a connector (b has no mark in DOM → no highlight top → not in positions)
    const ids = result.current.connectors.map((c) => c.id);
    expect(ids).toContain("a");
    expect(ids).not.toContain("b");
  });
});
