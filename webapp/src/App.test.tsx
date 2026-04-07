import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { App } from "./App";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows loading state initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders markdown content after successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("# Hello World", { status: 200 }));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
    });
  });

  it("shows error message when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Failed to fetch markdown (404)")).toBeInTheDocument();
    });
  });
});
