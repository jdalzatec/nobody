import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { App } from "./App";
import * as clipboard from "./lib/clipboard";

import type { Doc } from "./types";

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

const DOC_ONE: Doc = {
  id: "doc1",
  title: "First Doc",
  filename: "plan.md",
  dirPath: "/repos/proj",
  dirLabel: "proj",
};

const DOC_TWO: Doc = {
  id: "doc2",
  title: "Second Doc",
  filename: "research.md",
  dirPath: "/repos/proj",
  dirLabel: "proj",
};

function renderApp() {
  return render(
    <AntdApp>
      <App />
    </AntdApp>,
  );
}

function stubApi(
  content: string | Record<string, string>,
  status = 200,
  docs: Doc[] = [DOC_ONE],
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url === "/api/docs") {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(docs) });
      }
      const id = url.replace("/api/docs/", "");
      const body = typeof content === "string" ? content : (content[id] ?? "");
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body),
      });
    }),
  );
}

function stubHangingApi(): void {
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));
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
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
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
    stubHangingApi();
    renderApp();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders markdown content after successful fetch", async () => {
    stubApi("# Hello World", 200);
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
    });
  });

  it("shows error message when fetch fails", async () => {
    stubApi("", 404);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("Failed to fetch markdown (404)")).toBeInTheDocument();
    });
  });
});

describe("App document routing", () => {
  it("defaults to the first document and puts it in the URL", async () => {
    stubApi({ doc1: "# First Doc" }, 200, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("First Doc");
    });
    expect(window.location.pathname).toBe("/d/doc1");
  });

  it("reads the active document id from /d/:id", async () => {
    window.history.replaceState(null, "", "/d/doc2");
    stubApi({ doc1: "# First Doc", doc2: "# Second Doc" }, 200, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Second Doc");
    });
  });

  it("lists every open document in the rail", async () => {
    stubApi({ doc1: "# First Doc" }, 200, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("First Doc")).toBeInTheDocument();
    });
    expect(screen.getByText("Second Doc")).toBeInTheDocument();
    expect(screen.getByText("research.md")).toBeInTheDocument();
  });

  it("pushes history and swaps content when a rail entry is clicked", async () => {
    const user = userEvent.setup();
    stubApi({ doc1: "# First Doc", doc2: "# Second Doc" }, 200, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("First Doc");
    });

    await user.click(screen.getByText("research.md"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Second Doc");
    });
    expect(window.location.pathname).toBe("/d/doc2");
  });

  it("restores the previous document on popstate", async () => {
    const user = userEvent.setup();
    stubApi({ doc1: "# First Doc", doc2: "# Second Doc" }, 200, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("First Doc");
    });

    await user.click(screen.getByText("research.md"));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/d/doc2");
    });

    window.history.replaceState(null, "", "/d/doc1");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("First Doc");
    });
  });

  it("renders the empty state when the registry has no documents", async () => {
    stubApi("", 200, []);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText(/No documents open/)).toBeInTheDocument();
    });
  });

  it("renders a 410 as a deleted-document message", async () => {
    stubApi("", 410, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("This document no longer exists on disk")).toBeInTheDocument();
    });
  });

  it("keeps the rail populated when the active document is gone", async () => {
    stubApi("", 410, [DOC_ONE, DOC_TWO]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("This document no longer exists on disk")).toBeInTheDocument();
    });
    expect(screen.getByText("First Doc")).toBeInTheDocument();
    expect(screen.getByText("Second Doc")).toBeInTheDocument();
  });
});

describe("App clipboard integration", () => {
  it("copies the selected text when a valid selection is made", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    stubApi("Hello world paragraph", 200);

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
    stubApi("Hello world paragraph", 200);

    renderApp();
    const paragraph = await screen.findByText("Hello world paragraph");
    window.getSelection()?.removeAllRanges();
    paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 10));
    expect(copySpy).not.toHaveBeenCalled();
  });

  it("does not copy when the selection spans two different blocks", async () => {
    const copySpy = vi.spyOn(clipboard, "copySelectionText").mockResolvedValue(undefined);
    stubApi("First paragraph\n\nSecond paragraph", 200);

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
    stubApi("Hello {==world==}{>>note<<} end", 200);

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
    stubApi("Hello world paragraph", 200);
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
