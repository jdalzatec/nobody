export async function fetchMarkdown(): Promise<string> {
  const res = await fetch("/api/file");
  if (!res.ok) {
    throw new Error(`Failed to fetch markdown (${String(res.status)})`);
  }
  return res.text();
}

export async function saveMarkdown(content: string): Promise<void> {
  const res = await fetch("/api/file", {
    method: "PUT",
    body: content,
  });
  if (!res.ok) {
    throw new Error(`Failed to save markdown (${String(res.status)})`);
  }
}
