import type { Doc } from "../types";

/** Carries the HTTP status so callers can distinguish 410 (deleted on disk). */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchDocs(): Promise<Doc[]> {
  const res = await fetch("/api/docs");
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch documents (${String(res.status)})`);
  }
  return res.json() as Promise<Doc[]>;
}

export async function fetchMarkdown(docId: string): Promise<string> {
  const res = await fetch(`/api/docs/${encodeURIComponent(docId)}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch markdown (${String(res.status)})`);
  }
  return res.text();
}

export async function saveMarkdown(docId: string, content: string): Promise<void> {
  const res = await fetch(`/api/docs/${encodeURIComponent(docId)}`, {
    method: "PUT",
    body: content,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to save markdown (${String(res.status)})`);
  }
}
