import { render, screen, waitFor } from "@testing-library/react";
import { App as AntdApp } from "antd";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { App } from "./App";
import * as clipboard from "./lib/clipboard";

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

function renderApp() {
  return render(
    <AntdApp>
      <App />
    </AntdApp>,
  );
}

function selectTextInNode(node: Node, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(globalThis.navigator, "clipboard", originalClipboard);
  } else {
    Reflect.deleteProperty(globalThis.navigator, "clipboard");
  }
});

describe("App", () => {
  it("shows loading state initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    renderApp();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders markdown content after successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("# Hello World", { status: 200 }));
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
    });
  });

  it("shows error message when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("Failed to fetch markdown (404)")).toBeInTheDocument();
    });
  });
});

describe("App clipboard integration", () => {
  it("copies the selected text when a valid selection is made", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Hello world paragraph", { status: 200 }),
    );

    renderApp();
    const paragraph = await screen.findByText("Hello world paragraph");
    const textNode = paragraph.firstChild;
    if (!textNode) throw new Error("no text node");

    selectTextInNode(textNode, 0, 5);
    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await waitFor(() => {
      expect(copySpy).toHaveBeenCalledWith("Hello");
    });
  });

  it("does not copy when the selection is collapsed", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Hello world paragraph", { status: 200 }),
    );

    renderApp();
    const paragraph = await screen.findByText("Hello world paragraph");
    window.getSelection()?.removeAllRanges();
    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 10));
    expect(copySpy).not.toHaveBeenCalled();
  });

  it("does not copy when the selection spans two different blocks", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("First paragraph\n\nSecond paragraph", { status: 200 }),
    );

    renderApp();
    const first = await screen.findByText("First paragraph");
    const second = await screen.findByText("Second paragraph");
    const firstText = first.firstChild;
    const secondText = second.firstChild;
    if (!firstText || !secondText) throw new Error("no text nodes");

    const range = document.createRange();
    range.setStart(firstText, 0);
    range.setEnd(secondText, 6);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    second.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 10));
    expect(copySpy).not.toHaveBeenCalled();
  });

  it("does not copy when the selection overlaps an existing annotation", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Hello {==world==}{>>note<<} end", { status: 200 }),
    );

    renderApp();
    const paragraph = await screen.findByText(
      (_, el) => el?.tagName === "P" && el.textContent.includes("Hello world end"),
    );

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 10));
    expect(copySpy).not.toHaveBeenCalled();
  });

  it("does not propagate clipboard rejection as an uncaught error", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockRejectedValue(new Error("denied"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Hello world paragraph", { status: 200 }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderApp();
    const paragraph = await screen.findByText("Hello world paragraph");
    const textNode = paragraph.firstChild;
    if (!textNode) throw new Error("no text node");

    selectTextInNode(textNode, 0, 5);
    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await waitFor(() => {
      expect(copySpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
