import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchMarkdown, saveMarkdown } from "./api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchMarkdown", () => {
  it("calls GET /api/file and returns text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("# Hello") }),
    );
    const result = await fetchMarkdown();
    expect(result).toBe("# Hello");
    expect(fetch).toHaveBeenCalledWith("/api/file");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchMarkdown()).rejects.toThrow("Failed to fetch markdown (500)");
  });
});

describe("saveMarkdown", () => {
  it("calls PUT /api/file with correct body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await saveMarkdown("# Updated");
    expect(fetch).toHaveBeenCalledWith("/api/file", {
      method: "PUT",
      body: "# Updated",
    });
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(saveMarkdown("x")).rejects.toThrow("Failed to save markdown (403)");
  });
});
