import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { copySelectionText } from "./clipboard";

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

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

describe("copySelectionText", () => {
  it("calls navigator.clipboard.writeText with the given text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await copySelectionText("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("rejects when the clipboard API is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    await expect(copySelectionText("hello")).rejects.toBeInstanceOf(TypeError);
  });

  it("propagates rejection from writeText", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await expect(copySelectionText("x")).rejects.toThrow("denied");
  });
});
