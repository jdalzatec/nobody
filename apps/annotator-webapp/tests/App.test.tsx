import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "../src/App";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows loading state initially", () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    // Act
    render(<App />);

    // Assert
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders markdown content after successful fetch", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# Hello World", { status: 200 }),
    );

    // Act
    render(<App />);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Hello World",
      );
    });
  });

  it("shows error message when fetch fails", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );

    // Act
    render(<App />);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load file.md (404)"),
      ).toBeInTheDocument();
    });
  });
});
