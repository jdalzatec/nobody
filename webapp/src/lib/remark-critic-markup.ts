const CRITIC_RE = /\{==(.+?)==\}\{>>(.+?)<<\}/gs;

export interface ExtractedAnnotation {
  text: string;
  comment: string;
  sourceStart: number;
  sourceEnd: number;
}

/**
 * Parse all CriticMarkup annotations ({==text==}{>>comment<<}) from the
 * markdown string and return their text, comment, and source positions.
 */
export function extractAnnotationsFromMarkdown(markdown: string): ExtractedAnnotation[] {
  const results: ExtractedAnnotation[] = [];
  CRITIC_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CRITIC_RE.exec(markdown)) !== null) {
    results.push({
      text: match[1],
      comment: match[2],
      sourceStart: match.index,
      sourceEnd: match.index + match[0].length,
    });
  }
  return results;
}

/** Remove all CriticMarkup syntax, keeping only the annotated text. */
export function stripCriticMarkup(text: string): string {
  return text.replace(CRITIC_RE, "$1");
}

/**
 * For each annotation, returns the start/end positions of its text
 * in the stripped (CriticMarkup-free) version of the markdown.
 */
export function getStrippedAnnotationRanges(
  markdown: string,
): { strippedStart: number; strippedEnd: number }[] {
  const annotations = extractAnnotationsFromMarkdown(markdown);
  const result: { strippedStart: number; strippedEnd: number }[] = [];
  let totalRemoved = 0;

  for (const ann of annotations) {
    const syntaxLen = ann.sourceEnd - ann.sourceStart - ann.text.length;
    const strippedStart = ann.sourceStart - totalRemoved;
    const strippedEnd = strippedStart + ann.text.length;
    result.push({ strippedStart, strippedEnd });
    totalRemoved += syntaxLen;
  }

  return result;
}
