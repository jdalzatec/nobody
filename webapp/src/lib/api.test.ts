import { describe, it, expect, vi, beforeEach } from "vitest";

import { ApiError, fetchDocs, fetchMarkdown, saveMarkdown } from "./api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchDocs", () => {
  it("calls GET /api/docs and returns the parsed list", async () => {
    const docs = [{ id: "d1", title: "Plan", filename: "plan.md", dirPath: "/p", dirLabel: "p" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(docs) }),
    );
    await expect(fetchDocs()).resolves.toEqual(docs);
    expect(fetch).toHaveBeenCalledWith("/api/docs");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchDocs()).rejects.toThrow("Failed to fetch documents (500)");
  });
});

describe("fetchMarkdown", () => {
  it("calls GET /api/docs/:id and returns text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("# Hello"),
      }),
    );
    const result = await fetchMarkdown("abc123");
    expect(result).toBe("# Hello");
    expect(fetch).toHaveBeenCalledWith("/api/docs/abc123");
  });

  it("encodes the document id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("") }),
    );
    await fetchMarkdown("a/b c");
    expect(fetch).toHaveBeenCalledWith("/api/docs/a%2Fb%20c");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchMarkdown("abc123")).rejects.toThrow("Failed to fetch markdown (500)");
  });

  it("surfaces 410 as a distinguishable ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 410 }));
    await expect(fetchMarkdown("abc123")).rejects.toBeInstanceOf(ApiError);
    await expect(fetchMarkdown("abc123")).rejects.toMatchObject({ status: 410 });
  });
});

describe("saveMarkdown", () => {
  it("calls PUT /api/docs/:id with the body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    await saveMarkdown("abc123", "# Updated");
    expect(fetch).toHaveBeenCalledWith("/api/docs/abc123", {
      method: "PUT",
      body: "# Updated",
    });
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(saveMarkdown("abc123", "x")).rejects.toThrow("Failed to save markdown (403)");
  });

  it("surfaces 410 so a deleted document is not silently resurrected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 410 }));
    await expect(saveMarkdown("abc123", "x")).rejects.toMatchObject({ status: 410 });
  });
});
