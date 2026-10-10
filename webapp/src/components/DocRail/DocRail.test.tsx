import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { DocRail } from "./DocRail";

import type { Doc } from "../../types";

const makeDoc = (overrides: Partial<Doc> = {}): Doc => ({
  id: "d1",
  title: "Implementation Plan",
  filename: "plan.md",
  dirPath: "/repos/nobody",
  dirLabel: "nobody",
  ...overrides,
});

function defaultProps(overrides: Partial<Parameters<typeof DocRail>[0]> = {}) {
  return {
    docs: [] as Doc[],
    activeDocId: null,
    onSelect: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("DocRail", () => {
  it("renders the empty state when there are no documents", () => {
    render(<DocRail {...defaultProps()} />);
    expect(screen.getByText("No documents open")).toBeInTheDocument();
  });

  it("renders a document's title and filename", () => {
    render(<DocRail {...defaultProps({ docs: [makeDoc()] })} />);
    expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
    expect(screen.getByText("plan.md")).toBeInTheDocument();
  });

  it("groups documents by directory label", () => {
    const docs = [
      makeDoc({ id: "d1", dirLabel: "nobody" }),
      makeDoc({ id: "d2", filename: "research.md", dirLabel: "nobody" }),
      makeDoc({ id: "d3", filename: "notes.md", dirLabel: "webapp" }),
    ];
    render(<DocRail {...defaultProps({ docs })} />);

    expect(screen.getByText("nobody")).toBeInTheDocument();
    expect(screen.getByText("webapp")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks the active document", () => {
    const docs = [makeDoc({ id: "d1" }), makeDoc({ id: "d2", filename: "research.md" })];
    render(<DocRail {...defaultProps({ docs, activeDocId: "d2" })} />);

    const active = screen.getByRole("button", { current: "page" });
    expect(active).toHaveTextContent("research.md");
  });

  it("marks nothing active when no document is selected", () => {
    render(<DocRail {...defaultProps({ docs: [makeDoc()] })} />);
    expect(screen.queryByRole("button", { current: "page" })).not.toBeInTheDocument();
  });

  it("calls onSelect with the document id when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const docs = [makeDoc({ id: "d1" }), makeDoc({ id: "d2", filename: "research.md" })];
    render(<DocRail {...defaultProps({ docs, onSelect })} />);

    await user.click(screen.getByText("research.md"));
    expect(onSelect).toHaveBeenCalledWith("d2");
  });

  it("hides the document list when collapsed", async () => {
    const user = userEvent.setup();
    render(<DocRail {...defaultProps({ docs: [makeDoc()] })} />);

    await user.click(screen.getByRole("button", { name: "Collapse document rail" }));
    expect(screen.queryByText("plan.md")).not.toBeInTheDocument();
  });

  it("persists the collapsed state", async () => {
    const user = userEvent.setup();
    render(<DocRail {...defaultProps({ docs: [makeDoc()] })} />);

    await user.click(screen.getByRole("button", { name: "Collapse document rail" }));
    expect(window.localStorage.getItem("nobody:rail-collapsed")).toBe("true");
  });

  it("restores the collapsed state on mount", () => {
    window.localStorage.setItem("nobody:rail-collapsed", "true");
    render(<DocRail {...defaultProps({ docs: [makeDoc()] })} />);
    expect(screen.queryByText("plan.md")).not.toBeInTheDocument();
  });
});
