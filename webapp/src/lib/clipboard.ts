export async function copySelectionText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
