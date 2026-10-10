import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDocs } from "./useDocs";

import type { Doc } from "../../types";

const makeDoc = (overrides: Partial<Doc> = {}): Doc => ({
  id: "d1",
  title: "Plan",
  filename: "plan.md",
  dirPath: "/repos/proj",
  dirLabel: "proj",
  ...overrides,
});

function stubDocs(docs: Doc[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(docs) }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useDocs", () => {
  it("starts in a loading state", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));
    const { result } = renderHook(() => useDocs());
    expect(result.current.loading).toBe(true);
    expect(result.current.docs).toEqual([]);
  });

  it("returns documents on success", async () => {
    const docs = [makeDoc({ id: "d1" }), makeDoc({ id: "d2", filename: "research.md" })];
    stubDocs(docs);
    const { result } = renderHook(() => useDocs());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.docs).toEqual(docs);
    expect(result.current.error).toBeNull();
  });

  it("treats an empty list as a valid non-error state", async () => {
    stubDocs([]);
    const { result } = renderHook(() => useDocs());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.docs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("exposes an error when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useDocs());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("Failed to fetch documents (500)");
  });

  it("clears a previous error on a successful reload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useDocs());
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    stubDocs([makeDoc()]);
    result.current.reload();
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    expect(result.current.docs).toHaveLength(1);
  });
});
